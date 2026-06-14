// Single-row triage action endpoint for the workbench.
// Wired from the keyboard layer on /admin/applications:
//   a = approve · r = reject · i = info_requested · t = tag sector · s = snooze 24h
// Writes the canonical lifecycle columns AND a vendor_application_events row
// so the audit log on the right rail can show "who did what when".
//
// IMPORTANT: this endpoint is auth-gated to admin_users with role
// 'owner' | 'operator'. Email-send, WA-template fire, and account
// provisioning still live on /api/applications/[id] PATCH so we do NOT
// duplicate them here. Workbench callers needing the side-effects should
// hit PATCH after this endpoint succeeds (or use the bulk endpoint, which
// piggybacks on the existing /api/applications/bulk path).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { capJsonbSize } from '@/lib/audit/cap'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIONS = ['approve', 'reject', 'request_info', 'tag', 'snooze'] as const
type Action = (typeof ACTIONS)[number]

const bodySchema = z.object({
  action: z.enum(ACTIONS),
  reason: z.string().max(2000).optional(),
  sector: z.string().max(64).optional(),       // for action='tag'
  snooze_hours: z.number().int().positive().max(24 * 30).optional(), // default 24h
})

interface AppRow {
  id: string
  status: string | null
  sector: string | null
  reviewed_at: string | null
  approved_at: string | null
  admin_notes: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id, role, email')
      .eq('id', user.id)
      .single()
    if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const role = (adminUser.role || 'operator') as string
    if (!['owner', 'operator'].includes(role)) {
      return NextResponse.json({ error: 'insufficient_role' }, { status: 403 })
    }
    const actorEmail = (adminUser.email as string | null) || user.email || null

    const body = await request.json()
    const parsed = bodySchema.parse(body)
    const { action } = parsed

    // Snapshot before so we can write a meaningful before_value diff.
    const { data: before, error: beforeErr } = await admin
      .from('vendor_applications')
      .select('id, status, sector, reviewed_at, approved_at, admin_notes')
      .eq('id', id)
      .single<AppRow>()
    if (beforeErr || !before) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    const update: Record<string, unknown> = {}
    let eventType: string
    let note: string | null = null

    switch (action) {
      case 'approve': {
        update.status = 'approved'
        update.approved_at = nowIso
        if (!before.reviewed_at) update.reviewed_at = nowIso
        eventType = 'approved'
        break
      }
      case 'reject': {
        update.status = 'rejected'
        update.reviewed_at = nowIso
        eventType = 'rejected'
        note = parsed.reason || null
        break
      }
      case 'request_info': {
        update.status = 'info_requested'
        update.reviewed_at = nowIso
        eventType = 'info_requested'
        note = parsed.reason || null
        break
      }
      case 'tag': {
        const sector = (parsed.sector ?? '').trim()
        if (!sector) {
          return NextResponse.json(
            { error: 'sector required for action=tag' },
            { status: 400 }
          )
        }
        update.sector = sector
        eventType = 'tagged'
        break
      }
      case 'snooze': {
        const hours = parsed.snooze_hours ?? 24
        const snoozedUntil = new Date(Date.now() + hours * 3600_000).toISOString()
        // No dedicated column for snooze — encode it into admin_notes as a
        // ⟦SNOOZE:iso⟧ marker, same pattern as Law 8 ⟦STALL:code⟧.
        // Strip any prior snooze marker first.
        const existing = (before.admin_notes || '').replace(/⟦SNOOZE:[^⟧]+⟧\s*/g, '')
        update.admin_notes = `⟦SNOOZE:${snoozedUntil}⟧${existing ? ' ' + existing : ''}`
        eventType = 'snoozed'
        note = `until ${snoozedUntil}`
        break
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Apply update.
    const { data: after, error: updErr } = await admin
      .from('vendor_applications')
      .update(update)
      .eq('id', id)
      .select('id, status, sector, reviewed_at, approved_at, admin_notes')
      .single<AppRow>()
    if (updErr || !after) {
      return NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 })
    }

    // Audit row.
    await writeEvent(admin, {
      application_id: id,
      event_type: eventType,
      before_value: capJsonbSize(diffSubset(before, update)),
      after_value: capJsonbSize(diffSubset(after, update)),
      actor_email: actorEmail,
      actor_role: 'operator',
      note,
    })

    return NextResponse.json({ success: true, application: after, action })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    console.error('[action] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Reduce a row to only the fields that the update touched, so the audit
// jsonb is a clean diff rather than "the whole row, twice".
function diffSubset(row: AppRow, update: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(update)) {
    out[key] = (row as unknown as Record<string, unknown>)[key] ?? null
  }
  return out
}

interface EventRow {
  application_id: string
  event_type: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  actor_email: string | null
  actor_role: string
  note: string | null
}

async function writeEvent(
  db: ReturnType<typeof createAdminClient>,
  ev: EventRow
): Promise<void> {
  try {
    await db.from('vendor_application_events').insert(ev)
  } catch (e) {
    console.error('[action] event insert failed:', (e as Error).message)
  }
}
