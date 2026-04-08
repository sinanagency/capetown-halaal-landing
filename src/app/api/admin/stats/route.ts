import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin
    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select()
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get counts by status (use admin client to bypass RLS)
    const { data: applications } = await admin
      .from('vendor_applications')
      .select('status')

    const stats = {
      total: applications?.length || 0,
      pending: applications?.filter(a => a.status === 'pending').length || 0,
      approved: applications?.filter(a => a.status === 'approved').length || 0,
      rejected: applications?.filter(a => a.status === 'rejected').length || 0,
      info_requested: applications?.filter(a => a.status === 'info_requested').length || 0,
    }

    // Get recent applications (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: recentApps } = await admin
      .from('vendor_applications')
      .select('created_at')
      .gte('created_at', weekAgo.toISOString())

    stats.total = applications?.length || 0

    return NextResponse.json({
      stats,
      recentCount: recentApps?.length || 0,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
