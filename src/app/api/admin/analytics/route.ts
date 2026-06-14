import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: adminUser } = await admin.from('admin_users').select().eq('id', user.id).single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch all data in parallel. The aggregate queries (pageViews / events) use
    // .range(0, 49999) so we get real totals instead of the Supabase default 1000-row
    // cap (the cap was surfacing as "1000 page views / 1000 events" in the KPI cards).
    // The exact totals come back via { count } on a head:true query.
    const [
      { data: pageViews, count: pageViewsCount },
      { data: recentViews, count: recentViewsCount },
      { data: events, count: eventsCount },
      { data: applications, count: applicationsCount },
    ] = await Promise.all([
      admin.from('page_views').select('*', { count: 'exact' }).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }).range(0, 49999),
      admin.from('page_views').select('*', { count: 'exact' }).gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }).range(0, 49999),
      admin.from('site_events').select('*', { count: 'exact' }).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }).range(0, 49999),
      admin.from('vendor_applications').select('status, created_at, email, contact_name, business_name', { count: 'exact' }).order('created_at', { ascending: false }).range(0, 49999),
    ])

    const allViews = pageViews || []
    const recent = recentViews || []
    const allEvents = events || []
    const allApps = applications || []

    // ---- VISITORS ----
    const uniqueSessions = new Set(allViews.map(v => v.session_id))
    const uniqueSessionsWeek = new Set(recent.map(v => v.session_id))

    // Views by day (last 30 days)
    const viewsByDay: Record<string, { views: number; sessions: Set<string> }> = {}
    for (const v of allViews) {
      const day = v.created_at.split('T')[0]
      if (!viewsByDay[day]) viewsByDay[day] = { views: 0, sessions: new Set() }
      viewsByDay[day].views++
      viewsByDay[day].sessions.add(v.session_id)
    }
    const dailyStats = Object.entries(viewsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, views: d.views, visitors: d.sessions.size }))

    // ---- TOP PAGES ----
    const pageCounts: Record<string, number> = {}
    for (const v of allViews) {
      pageCounts[v.path] = (pageCounts[v.path] || 0) + 1
    }
    const topPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }))

    // ---- GEO ----
    const countryCounts: Record<string, number> = {}
    const cityCounts: Record<string, number> = {}
    for (const v of allViews) {
      if (v.country) countryCounts[v.country] = (countryCounts[v.country] || 0) + 1
      if (v.city) cityCounts[v.city] = (cityCounts[v.city] || 0) + 1
    }
    const topCountries = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, views]) => ({ country, views }))
    const topCities = Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([city, views]) => ({ city, views }))

    // ---- DEVICES ----
    const deviceCounts: Record<string, number> = {}
    const browserCounts: Record<string, number> = {}
    const osCounts: Record<string, number> = {}
    for (const v of allViews) {
      if (v.device_type) deviceCounts[v.device_type] = (deviceCounts[v.device_type] || 0) + 1
      if (v.browser) browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1
      if (v.os) osCounts[v.os] = (osCounts[v.os] || 0) + 1
    }

    // ---- REFERRERS ----
    const refCounts: Record<string, number> = {}
    for (const v of allViews) {
      if (v.referrer) {
        try {
          const host = new URL(v.referrer).hostname.replace('www.', '')
          refCounts[host] = (refCounts[host] || 0) + 1
        } catch {
          refCounts[v.referrer] = (refCounts[v.referrer] || 0) + 1
        }
      }
    }
    const topReferrers = Object.entries(refCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([source, views]) => ({ source, views }))

    // ---- FUNNELS ----
    const sessionPaths: Record<string, Set<string>> = {}
    for (const v of allViews) {
      if (!sessionPaths[v.session_id]) sessionPaths[v.session_id] = new Set()
      sessionPaths[v.session_id].add(v.path)
    }
    for (const e of allEvents) {
      if (!sessionPaths[e.session_id]) sessionPaths[e.session_id] = new Set()
      sessionPaths[e.session_id].add(`event:${e.event_type}`)
    }

    const totalSessions = Object.keys(sessionPaths).length
    const visitedApply = Object.values(sessionPaths).filter(p => p.has('/apply')).length
    const submittedApp = allEvents.filter(e => e.event_type === 'apply_submit').length
    const appSuccess = allEvents.filter(e => e.event_type === 'apply_success').length

    const visitedCheckout = Object.values(sessionPaths).filter(p => p.has('/checkout')).length

    const vendorFunnel = [
      { step: 'Site Visit', count: totalSessions },
      { step: 'Viewed Apply', count: visitedApply },
      { step: 'Started Submit', count: submittedApp },
      { step: 'Completed', count: appSuccess },
    ]

    // ---- EVENT COUNTS ----
    const eventCounts: Record<string, number> = {}
    for (const e of allEvents) {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1
    }

    // ---- CAPTURED EMAILS (abandoned applications) ----
    const capturedEmails = allEvents
      .filter(e => e.event_type === 'apply_email_captured' && e.metadata?.email)
      .map(e => ({
        email: e.metadata.email,
        name: e.metadata.name || '',
        business: e.metadata.business || '',
        captured_at: e.created_at,
      }))

    // ---- UTM ----
    const utmSources: Record<string, number> = {}
    for (const v of allViews) {
      if (v.utm_source) utmSources[v.utm_source] = (utmSources[v.utm_source] || 0) + 1
    }

    return NextResponse.json({
      overview: {
        totalPageViews: pageViewsCount ?? allViews.length,
        totalVisitors: uniqueSessions.size,
        weeklyPageViews: recentViewsCount ?? recent.length,
        weeklyVisitors: uniqueSessionsWeek.size,
        totalEvents: eventsCount ?? allEvents.length,
        totalApplications: applicationsCount ?? allApps.length,
      },
      dailyStats,
      topPages,
      topCountries,
      topCities,
      devices: deviceCounts,
      browsers: browserCounts,
      os: osCounts,
      topReferrers,
      vendorFunnel,
      eventCounts,
      utmSources,
      capturedEmails,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
