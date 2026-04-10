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

    // Get full application data for stats + revenue estimation
    const { data: applications } = await admin
      .from('vendor_applications')
      .select('status, preferred_booth_tier, special_requirements, product_categories')

    // Booth tier price map for revenue estimation
    const TIER_PRICES: Record<string, number> = {
      'marquee-table-2x2': 3700,
      'marquee-full-3x3': 6500,
      'marquee-table-double-4x2': 6500,
      'marquee-full-double-6x3': 12000,
      'outdoor-bedouin-2x3': 3750,
      'food-gazebo-3x3': 4800,
      'mini-dessert-truck-3.5m': 5000,
      'food-truck-4.5m': 6500,
      'food-truck-6m': 7500,
      'food-truck-8m': 8500,
    }

    const stats = {
      total: applications?.length || 0,
      pending: applications?.filter(a => a.status === 'pending').length || 0,
      approved: applications?.filter(a => a.status === 'approved').length || 0,
      rejected: applications?.filter(a => a.status === 'rejected').length || 0,
      info_requested: applications?.filter(a => a.status === 'info_requested').length || 0,
    }

    // Estimated revenue from all non-rejected applications
    let estimatedRevenue = 0
    const categoryBreakdown: Record<string, number> = {}
    for (const app of (applications || [])) {
      if (app.status !== 'rejected') {
        const tier = app.preferred_booth_tier || ''
        estimatedRevenue += TIER_PRICES[tier] || 0

        // Try to get stall_price from special_requirements JSON
        if (!TIER_PRICES[tier] && app.special_requirements) {
          try {
            const sr = JSON.parse(app.special_requirements)
            if (sr.stall_price) estimatedRevenue += Number(sr.stall_price) || 0
          } catch {}
        }
      }

      // Category breakdown
      const cats = app.product_categories || []
      for (const cat of cats) {
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
      }
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
      estimatedRevenue,
      categoryBreakdown,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
