import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState } from '@/lib/portal-state'
import { getOrders, type WCOrder } from '@/lib/woocommerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PaymentRow {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  status: string | null
  payment_status: string | null
  payment_amount: number | null
  payment_due_date: string | null
  paid_at: string | null
  admin_notes: string | null
  preferred_booth_tier: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const paymentFilter = (searchParams.get('payment') || '').trim()

    // Fetch all vendors with payment info
    let q = admin
      .from('vendor_applications')
      .select(
        'id, business_name, contact_name, email, phone, status, payment_status, payment_amount, payment_due_date, paid_at, admin_notes, preferred_booth_tier, created_at'
      )
      .in('status', ['approved', 'pending', 'info_requested'])

    if (paymentFilter === 'paid') {
      q = q.eq('payment_status', 'paid')
    } else if (paymentFilter === 'pending') {
      q = q.eq('payment_status', 'pending')
    } else if (paymentFilter === 'overdue') {
      q = q.not('payment_status', 'eq', 'paid')
        .not('payment_status', 'eq', 'none')
        .not('payment_status', 'is', null)
    } else if (paymentFilter === 'none') {
      q = q.or('payment_status.is.null,payment_status.eq.none')
    }

    const { data: vendors, error } = await q
      .order('business_name', { ascending: true })
    if (error) {
      console.error('[admin/finance] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }

    const rows = (vendors ?? []) as PaymentRow[]

    // Enrich with portal state
    const payments = rows.map((v) => {
      const portal = parsePortalState(v.admin_notes || '')
      const p = portal.payment || {}
      const paidAt = v.paid_at || p.paid_at || null
      const amount = v.payment_amount || p.amount || null
      const dueDate = v.payment_due_date || p.due || null
      const paymentStatus = v.payment_status || p.status || 'none'

      let overdue = false
      if (paymentStatus === 'pending' && dueDate) {
        overdue = new Date(dueDate) < new Date()
      }

      return {
        id: v.id,
        business_name: v.business_name || 'Unnamed',
        contact_name: v.contact_name,
        email: v.email,
        phone: v.phone,
        status: v.status,
        payment_status: paymentStatus,
        payment_amount: amount,
        payment_due_date: dueDate,
        paid_at: paidAt,
        preferred_booth_tier: v.preferred_booth_tier,
        created_at: v.created_at,
        overdue,
      }
    })

    // Stats
    const totalPaid = payments.filter(p => p.payment_status === 'paid').length
    const totalPending = payments.filter(p => p.payment_status === 'pending' || p.payment_status === 'deferred').length
    const totalNone = payments.filter(p => p.payment_status === 'none').length
    const totalOverdue = payments.filter(p => p.overdue).length
    const totalRevenue = payments
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0)

    // WooCommerce reconciliation: fetch completed orders for comparison
    let wcOrders: WCOrder[] = []
    try {
      wcOrders = await getOrders({ status: 'completed' })
    } catch (err) {
      console.warn('[admin/finance] WC fetch failed:', err)
    }

    // Match WC orders to vendors by email
    const wcMatched = payments
      .filter(p => p.email)
      .map(p => {
        const matches = wcOrders.filter(o =>
          o.billing?.email?.toLowerCase() === p.email?.toLowerCase()
        )
        const totalWc = matches.reduce((s, o) => s + parseFloat(o.total || '0'), 0)
        return {
          vendor_id: p.id,
          business_name: p.business_name,
          email: p.email,
          payment_status: p.payment_status,
          vendor_amount: p.payment_amount,
          wc_order_count: matches.length,
          wc_total: totalWc,
          reconciled: p.payment_status === 'paid' && totalWc > 0,
        }
      })

    const unmatchedWc = wcOrders
      .filter(o => {
        const email = o.billing?.email?.toLowerCase()
        return !email || !payments.some(p => p.email?.toLowerCase() === email)
      })
      .map(o => ({
        order_id: o.id,
        name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
        email: o.billing?.email,
        total: o.total,
        date: o.date_created,
      }))

    return NextResponse.json({
      payments,
      reconciliation: {
        matched: wcMatched.filter(r => r.reconciled).length,
        unmatched: wcMatched.filter(r => !r.reconciled).length,
        matched_rows: wcMatched,
        unmatched_orders: unmatchedWc,
      },
      stats: {
        total_vendors: payments.length,
        total_paid: totalPaid,
        total_pending: totalPending,
        total_none: totalNone,
        total_overdue: totalOverdue,
        total_revenue: totalRevenue,
      },
    })
  } catch (err) {
    console.error('[admin/finance] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
