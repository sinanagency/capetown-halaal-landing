import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase.from('admin_users').select().eq('id', user.id).single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Get all vendor profiles
    const { data: vendors } = await admin.from('vendor_profiles').select('*').order('created_at', { ascending: false })

    // Get all booth bookings
    const { data: bookings } = await admin.from('booth_bookings').select('*').order('created_at', { ascending: false })

    // Get all ticket sales
    const { data: tickets } = await admin.from('ticket_sales').select('*').order('created_at', { ascending: false })

    // Get vendor applications
    const { data: applications } = await admin.from('vendor_applications').select('*').order('created_at', { ascending: false })

    // Calculate stats
    const boothRevenue = (bookings || []).filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.price_paid || 0), 0)
    const ticketRevenue = (tickets || []).reduce((sum, t) => sum + Number(t.total_price || 0), 0)
    const totalTicketsSold = (tickets || []).reduce((sum, t) => sum + (t.quantity || 0), 0)

    return NextResponse.json({
      stats: {
        totalVendors: (vendors || []).length,
        totalApplications: (applications || []).length,
        pendingApplications: (applications || []).filter(a => a.status === 'pending').length,
        approvedApplications: (applications || []).filter(a => a.status === 'approved').length,
        totalBookings: (bookings || []).length,
        paidBookings: (bookings || []).filter(b => b.payment_status === 'paid').length,
        boothRevenue,
        totalTicketsSold,
        ticketRevenue,
        totalRevenue: boothRevenue + ticketRevenue,
      },
      vendors: vendors || [],
      bookings: bookings || [],
      tickets: tickets || [],
      applications: applications || [],
    })
  } catch (error) {
    console.error('Admin sales error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
