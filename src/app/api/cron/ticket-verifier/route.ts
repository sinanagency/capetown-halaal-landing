/**
 * GET /api/cron/ticket-verifier
 *
 * Every 6h: pull every WC ticket-product order in the 2026 cycle, parse the
 * FooEvents per-ticket meta, validate (signature + holder data + festival
 * date), and upsert one row per ticket into `ticket_verifications`.
 *
 * Two distinct states tracked in the table:
 *   verified_at    -> pre-event, set HERE on validate-OK
 *   checked_in_at  -> day-of, set by Express Check-in / admin gate (NOT here)
 *
 * Law 4: WC + FooEvents are source of truth. We only mirror.
 * Law 6: every orders.list call carries `after=` (enforced inside getOrders).
 *
 * Auth: Vercel cron POSTs Authorization: Bearer ${CRON_SECRET}. We verify in
 * constant time via lib/security/cron-auth.ts. Operator can also trigger
 * manually by hitting the same URL with the same header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import { runFullVerification } from '@/lib/tickets/verifier-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Cron runs every 6h. 100+ orders + WC pagination + supabase upserts can take
// a while; raise the function ceiling so a long sweep doesn't get killed.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  try {
    const summary = await runFullVerification(db, 'auto_cron', null)

    // Log a row to site_events so the admin dashboard surfaces cron health.
    // Best-effort; never throws.
    try {
      await db.from('site_events').insert({
        session_id: 'cron:ticket-verifier',
        event_type: 'ticket_verifier_run',
        metadata: {
          scanned_orders: summary.scannedOrders,
          rows_upserted: summary.rowsUpserted,
          verified: summary.verifiedCount,
          errored: summary.erroredCount,
          duration_ms: summary.durationMs,
          first_errors: summary.errors.slice(0, 5),
        },
      })
    } catch (e) {
      console.warn('[ticket-verifier] site_events log failed:', (e as Error).message)
    }

    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    console.error('[ticket-verifier] run failed:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    )
  }
}
