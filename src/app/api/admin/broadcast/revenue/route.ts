// =============================================================================
// /api/admin/broadcast/revenue
//
// Returns "Money In" KPIs for the broadcast console header:
//   - tickets_total, tickets_30d   (WooCommerce, completed orders, after=2026)
//   - vendors_total, vendors_30d   (vendor_applications.payment_amount where
//                                   payment_status='paid' for 2026 cycle)
//   - total_in, total_30d          (sum of both)
//
// Auth: mirrors /api/admin/sales (Law 2). 401 unauth, 403 non-admin.
// WC: getOrders() carries `after=` via lib/woocommerce.ts (Law 6).
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrders } from '@/lib/woocommerce'

export const dynamic = 'force-dynamic'

const CYCLE_START = '2026-01-01T00:00:00Z'

interface VendorAppRow {
  payment_status: string | null
  payment_amount: number | string | null
  paid_at: string | null
  updated_at: string | null
  created_at: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase
      .from('admin_users').select().eq('id', user.id).single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    // Tickets (WooCommerce completed orders, 2026 cycle via Law 6 default).
    let tickets_total = 0
    let tickets_30d = 0
    let ticketError: string | undefined
    try {
      const orders = await getOrders({ status: 'completed' })
      for (const o of orders) {
        const amt = parseFloat(o.total) || 0
        tickets_total += amt
        const ts = Date.parse(o.date_created)
        if (!isNaN(ts) && ts >= thirtyDaysAgo) tickets_30d += amt
      }
    } catch (e) {
      ticketError = String(e)
      console.error('[admin/broadcast/revenue] WC fetch failed:', ticketError)
    }

    // Vendor revenue from vendor_applications (mirrors /api/admin/sales).
    const { data: appsRaw } = await admin
      .from('vendor_applications')
      .select('payment_status, payment_amount, paid_at, updated_at, created_at')
    const apps: VendorAppRow[] = appsRaw || []

    let vendors_total = 0
    let vendors_30d = 0
    for (const a of apps) {
      if (a.payment_status !== 'paid') continue
      const amt = Number(a.payment_amount || 0)
      if (!amt) continue
      // Restrict to the 2026 cycle so legacy paid rows do not double-count.
      const refTs = Date.parse(a.paid_at || a.updated_at || a.created_at || '')
      const cycleStartTs = Date.parse(CYCLE_START)
      if (isNaN(refTs) || refTs < cycleStartTs) continue
      vendors_total += amt
      if (refTs >= thirtyDaysAgo) vendors_30d += amt
    }

    return NextResponse.json({
      tickets_total: Math.round(tickets_total),
      tickets_30d: Math.round(tickets_30d),
      vendors_total: Math.round(vendors_total),
      vendors_30d: Math.round(vendors_30d),
      total_in: Math.round(tickets_total + vendors_total),
      total_30d: Math.round(tickets_30d + vendors_30d),
      ticket_error: ticketError,
    })
  } catch (error) {
    console.error('[admin/broadcast/revenue] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
