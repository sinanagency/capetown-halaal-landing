import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import {
  sendWhatsAppTemplate,
  templateKeyForStatus,
} from '@/lib/wa/send-template'

const ACTIONS = [
  'approve',
  'reject',
  'request_info',
  'send_template',
] as const

type BulkAction = (typeof ACTIONS)[number]

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(ACTIONS),
  template_key: z.string().min(1).max(64).optional(),
  dry_run: z.boolean().optional(),
})

interface RowResult {
  id: string
  ok: boolean
  error?: string
  template?: { status: string; error?: string }
}

const PAUSE_BETWEEN_SENDS_MS = 250

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = bulkSchema.parse(body)
    const { ids, action, template_key, dry_run } = parsed

    if (action === 'send_template' && !template_key) {
      return NextResponse.json(
        { error: 'template_key required for send_template action' },
        { status: 400 }
      )
    }

    // Pull rows once so we know who to send to and can log per row.
    const { data: rows, error: fetchErr } = await admin
      .from('vendor_applications')
      .select('id, email, phone, status, business_name, contact_name')
      .in('id', ids)
    if (fetchErr) {
      return NextResponse.json(
        { error: 'Failed to load applications' },
        { status: 500 }
      )
    }
    const rowsById = new Map((rows ?? []).map((r) => [r.id, r]))

    if (dry_run) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        count: rowsById.size,
        action,
        template_key: action === 'send_template' ? template_key : derivedTemplate(action),
      })
    }

    const results: RowResult[] = []
    const nowIso = new Date().toISOString()
    const newStatus = statusForAction(action)
    const tplKey =
      action === 'send_template'
        ? (template_key as string)
        : (templateKeyForStatus(newStatus ?? '') as string | null)

    for (const id of ids) {
      const row = rowsById.get(id)
      if (!row) {
        results.push({ id, ok: false, error: 'not found' })
        continue
      }

      try {
        // Apply status update if action mutates state.
        if (newStatus) {
          const { error: updErr } = await admin
            .from('vendor_applications')
            .update({
              status: newStatus,
              reviewed_at: nowIso,
              reviewed_by: user.id,
            })
            .eq('id', id)
          if (updErr) {
            results.push({ id, ok: false, error: updErr.message })
            await logSiteEvent(admin, user.id, action, id, 'failed', {
              error: updErr.message,
            })
            continue
          }
        }

        // Fire WA template if applicable.
        let tplResult: RowResult['template']
        if (tplKey && row.phone) {
          const sendRes = await sendWhatsAppTemplate({
            phone: row.phone,
            templateKey: tplKey,
            applicationId: id,
            variables: {
              '1': row.contact_name || row.business_name || 'there',
              '2': row.business_name || '',
            },
          })
          tplResult = { status: sendRes.status, error: sendRes.error }
          // Throttle to avoid Meta rate limits.
          await sleep(PAUSE_BETWEEN_SENDS_MS)
        }

        await logSiteEvent(admin, user.id, action, id, 'ok', {
          template_key: tplKey,
          template_status: tplResult?.status,
        })

        results.push({ id, ok: true, template: tplResult })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ id, ok: false, error: msg })
        await logSiteEvent(admin, user.id, action, id, 'failed', { error: msg })
      }
    }

    const okCount = results.filter((r) => r.ok).length
    return NextResponse.json({
      success: true,
      action,
      processed: results.length,
      ok: okCount,
      failed: results.length - okCount,
      results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Bulk applications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function statusForAction(action: BulkAction): string | null {
  switch (action) {
    case 'approve':
      return 'approved'
    case 'reject':
      return 'rejected'
    case 'request_info':
      return 'info_requested'
    case 'send_template':
      return null
  }
}

function derivedTemplate(action: BulkAction): string | null {
  const s = statusForAction(action)
  if (!s) return null
  return templateKeyForStatus(s)
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

async function logSiteEvent(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  action: BulkAction,
  targetId: string,
  result: 'ok' | 'failed',
  payload: Record<string, unknown>
) {
  try {
    await admin.from('site_events').insert({
      event_type: `applications.bulk.${action}`,
      actor_id: actorId,
      target_type: 'vendor_application',
      target_id: targetId,
      payload,
      result,
    })
  } catch (err) {
    console.error('site_events insert failed:', err)
  }
}
