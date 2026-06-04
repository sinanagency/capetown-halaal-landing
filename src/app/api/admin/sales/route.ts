import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTicketStats } from '@/lib/woocommerce'

export const dynamic = 'force-dynamic'

// Consolidated sales endpoint. Booth revenue is derived from the live
// vendor_applications table (payment_status / payment_amount columns, v5/v7);
// ticket revenue comes from the same WooCommerce source /api/admin/tickets uses.
// (Previously this read phantom booth_bookings / ticket_sales tables that exist
// in no migration, so it always returned zeros — fixed 2026-06-04.)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase.from('admin_users').select().eq('id', user.id).single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Vendor applications are the source of truth for booth/vendor pipeline + fees.
    const { data: applications } = await admin
      .from('vendor_applications')
      .select('*')
      .order('created_at', { ascending: false })

    const apps = applications || []
    const paidBooths = apps.filter(a => a.payment_status === 'paid')
    const boothRevenue = paidBooths.reduce((sum, a) => sum + Number(a.payment_amount || 0), 0)

    // Tickets come from WooCommerce (best-effort; never fail the whole report on it).
    let ticketRevenue = 0
    let totalTicketsSold = 0
    let ticketError: string | undefined
    try {
      const wc = await getTicketStats()
      ticketRevenue = wc.totalRevenue || 0
      totalTicketsSold = wc.totalTickets || 0
    } catch (e) {
      ticketError = String(e)
      console.error('[admin/sales] WooCommerce fetch failed:', ticketError)
    }

    return NextResponse.json({
      stats: {
        totalApplications: apps.length,
        pendingApplications: apps.filter(a => a.status === 'pending').length,
        approvedApplications: apps.filter(a => a.status === 'approved').length,
        rejectedApplications: apps.filter(a => a.status === 'rejected').length,
        paidBooths: paidBooths.length,
        deferredBooths: apps.filter(a => a.payment_status === 'deferred').length,
        boothRevenue,
        totalTicketsSold,
        ticketRevenue,
        totalRevenue: boothRevenue + ticketRevenue,
      },
      applications: apps,
      ticketError,
    })
  } catch (error) {
    console.error('Admin sales error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
