// Bulk triage action endpoint for the workbench.
// Same actions as /api/admin/applications/[id]/action, but applied across
// N selected rows. Each row gets its own vendor_application_events audit row
// so the trail stays per-application.
//
// NOTE: this is the *admin* bulk endpoint. There is a pre-existing
// /api/applications/bulk route that handles the legacy "send_template" path
// + WhatsApp template firing — we keep that one untouched. This endpoint
// is the lean, audit-first one wired into the keyboard workbench.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { capJsonbSize } from '@/lib/audit/cap'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIONS = ['approve', 'reject', 'request_info', 'tag'] as const
type Action = (typeof ACTIONS)[number]

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(ACTIONS),
  reason: z.string().max(2000).optional(),
  sector: z.string().max(64).optional(),
})

// H2: per-admin bulk rate limit. 10 bulk actions per minute, in-memory map.
const bulkRateBuckets = new Map<string, { count: number; resetAt: number }>()
const BULK_RATE_WINDOW_MS = 60_000
const BULK_RATE_MAX = 10
function checkBulkRate(actorKey: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now()
  const bucket = bulkRateBuckets.get(actorKey)
  if (!bucket || bucket.resetAt <= now) {
    bulkRateBuckets.set(actorKey, { count: 1, resetAt: now + BULK_RATE_WINDOW_MS })
    if (bulkRateBuckets.size > 500) {
      for (const [k, v] of bulkRateBuckets) if (v.resetAt <= now) bulkRateBuckets.delete(k)
    }
    return { ok: true }
  }
  if (bucket.count >= BULK_RATE_MAX) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count++
  return { ok: true }
}

interface Result {
  id: string
  ok: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  try {
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

    // H2: per-admin bulk rate limit (10/min).
    const rate = checkBulkRate(`bulk:${user.id}`)
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'rate_limited', retry_after_seconds: rate.retryAfter },
        { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
      )
    }

    const body = await request.json()
    const parsed = bulkSchema.parse(body)
    const { ids, action } = parsed

    if (action === 'tag' && !(parsed.sector || '').trim()) {
      return NextResponse.json({ error: 'sector required for action=tag' }, { status: 400 })
    }

    // Snapshot existing rows once. We need before-values for the audit log
    // and we want to skip rows that don't exist rather than hit the network
    // N times.
    const { data: rows, error: loadErr } = await admin
      .from('vendor_applications')
      .select('id, status, sector, reviewed_at, approved_at, admin_notes')
      .in('id', ids)
    if (loadErr) {
      return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
    }
    const rowsById = new Map((rows ?? []).map((r) => [r.id as string, r]))

    const nowIso = new Date().toISOString()
    const results: Result[] = []
    const events: Array<{
      application_id: string
      event_type: string
      before_value: Record<string, unknown> | null
      after_value: Record<string, unknown> | null
      actor_email: string | null
      actor_role: string
      note: string | null
    }> = []

    for (const id of ids) {
      const before = rowsById.get(id)
      if (!before) {
        results.push({ id, ok: false, error: 'not found' })
        continue
      }

      const update: Record<string, unknown> = {}
      let eventType: string
      let note: string | null = null

      switch (action) {
        case 'approve':
          update.status = 'approved'
          update.approved_at = nowIso
          if (!before.reviewed_at) update.reviewed_at = nowIso
          eventType = 'approved'
          break
        case 'reject':
          update.status = 'rejected'
          update.reviewed_at = nowIso
          eventType = 'rejected'
          note = parsed.reason || null
          break
        case 'request_info':
          update.status = 'info_requested'
          update.reviewed_at = nowIso
          eventType = 'info_requested'
          note = parsed.reason || null
          break
        case 'tag':
          update.sector = (parsed.sector as string).trim()
          eventType = 'tagged'
          break
        default:
          results.push({ id, ok: false, error: 'unknown action' })
          continue
      }

      const { data: after, error: updErr } = await admin
        .from('vendor_applications')
        .update(update)
        .eq('id', id)
        .select('id, status, sector, reviewed_at, approved_at, admin_notes')
        .single()
      if (updErr || !after) {
        results.push({ id, ok: false, error: updErr?.message || 'update failed' })
        continue
      }

      const beforeSubset: Record<string, unknown> = {}
      const afterSubset: Record<string, unknown> = {}
      for (const k of Object.keys(update)) {
        beforeSubset[k] = (before as unknown as Record<string, unknown>)[k] ?? null
        afterSubset[k] = (after as unknown as Record<string, unknown>)[k] ?? null
      }
      events.push({
        application_id: id,
        event_type: eventType,
        before_value: capJsonbSize(beforeSubset),
        after_value: capJsonbSize(afterSubset),
        actor_email: actorEmail,
        actor_role: 'operator',
        note,
      })
      results.push({ id, ok: true })
    }

    // Batch-insert events. Audit insert failure should not flip a successful
    // mutation — but it MUST be logged so we know we have an audit gap.
    if (events.length > 0) {
      const { error: evErr } = await admin.from('vendor_application_events').insert(events)
      if (evErr) console.error('[bulk] vendor_application_events insert failed:', evErr.message)
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
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    console.error('[bulk] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
