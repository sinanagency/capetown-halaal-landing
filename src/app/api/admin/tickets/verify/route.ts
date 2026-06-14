/**
 * POST /api/admin/tickets/verify
 *
 * Manual re-verify of a single WC order (and optionally a single ticket on it).
 * Used by the Admin Verifier UI's "Re-verify this ticket" button.
 *
 * Body: { wc_order_id: number, fooevents_ticket_id?: string }
 *
 * Returns: { ok, summary, verifications }
 *
 * Auth: admin_users + role IN ('owner','operator').
 *
 * Law 4: WC is the source of truth; we re-pull the order from WC and re-run
 * validation. We don't trust any client-supplied holder data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runSingleOrderVerification } from '@/lib/tickets/verifier-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const role = ((adminUser as { role?: string }).role || 'operator').toLowerCase()
  if (!['owner', 'operator'].includes(role)) {
    return NextResponse.json({ error: 'insufficient_role' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const wcOrderIdRaw = body.wc_order_id
  const wcOrderId = typeof wcOrderIdRaw === 'number' ? wcOrderIdRaw : Number(wcOrderIdRaw)
  if (!Number.isFinite(wcOrderId) || wcOrderId <= 0) {
    return NextResponse.json({ error: 'wc_order_id required' }, { status: 400 })
  }
  const fooeventsTicketId =
    typeof body.fooevents_ticket_id === 'string' && body.fooevents_ticket_id.length > 0
      ? body.fooevents_ticket_id
      : null

  try {
    const summary = await runSingleOrderVerification(
      db,
      wcOrderId,
      fooeventsTicketId,
      'admin_manual',
      user.email || null,
    )

    // Return the freshly-upserted rows for this order so the UI can re-render
    // without a second round-trip.
    let q = db
      .from('ticket_verifications')
      .select('*')
      .eq('wc_order_id', wcOrderId)
    if (fooeventsTicketId) q = q.eq('fooevents_ticket_id', fooeventsTicketId)
    const { data: verifications } = await q

    return NextResponse.json({ ok: true, summary, verifications: verifications || [] })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    )
  }
}
