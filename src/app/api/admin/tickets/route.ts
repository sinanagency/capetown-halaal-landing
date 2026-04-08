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

    const stats = await getTicketStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Tickets stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket data' }, { status: 500 })
  }
}
