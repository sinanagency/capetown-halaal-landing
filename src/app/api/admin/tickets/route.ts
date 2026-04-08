import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTicketStats, getOrders } from '@/lib/woocommerce'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select()
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const stats = await getTicketStats()
      return NextResponse.json(stats)
    } catch (wcError) {
      console.error('WooCommerce fetch error:', wcError)
      // Return partial data so dashboard doesn't completely break
      return NextResponse.json({
        totalRevenue: 0,
        totalTickets: 0,
        totalOrders: 0,
        ticketBreakdown: {},
        salesByDate: {},
        recentOrders: [],
        failedOrders: [],
        pendingOrders: [],
        failedCount: 0,
        pendingCount: 0,
        error: 'WooCommerce API temporarily unavailable',
      })
    }
  } catch (error) {
    console.error('Tickets stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket data' }, { status: 500 })
  }
}
