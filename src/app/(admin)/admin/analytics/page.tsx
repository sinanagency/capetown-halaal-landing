'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Globe, Monitor, Smartphone, Tablet, Users, Eye, MousePointer,
  TrendingUp, MapPin, ArrowRight, BarChart3
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

interface Analytics {
  overview: {
    totalPageViews: number
    totalVisitors: number
    weeklyPageViews: number
    weeklyVisitors: number
    totalEvents: number
    totalApplications: number
  }
  dailyStats: Array<{ date: string; views: number; visitors: number }>
  topPages: Array<{ path: string; views: number }>
  topCountries: Array<{ country: string; views: number }>
  topCities: Array<{ city: string; views: number }>
  devices: Record<string, number>
  browsers: Record<string, number>
  os: Record<string, number>
  topReferrers: Array<{ source: string; views: number }>
  vendorFunnel: Array<{ step: string; count: number }>
  eventCounts: Record<string, number>
  utmSources: Record<string, number>
}

const COLORS = ['#cd2653', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const COUNTRY_NAMES: Record<string, string> = {
  ZA: 'South Africa', US: 'United States', GB: 'United Kingdom', AE: 'UAE',
  IN: 'India', NG: 'Nigeria', KE: 'Kenya', DE: 'Germany', FR: 'France',
  AU: 'Australia', CA: 'Canada', SA: 'Saudi Arabia', EG: 'Egypt',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function DeviceIcon({ type }: { type: string }) {
  if (type === 'mobile') return <Smartphone className="w-4 h-4" />
  if (type === 'tablet') return <Tablet className="w-4 h-4" />
  return <Monitor className="w-4 h-4" />
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/analytics')
        if (res.ok) setData(await res.json())
      } catch (e) {
        console.error('Analytics load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Failed to load analytics data.
      </div>
    )
  }

  const { overview, dailyStats, topPages, topCountries, topCities, devices, browsers, topReferrers, vendorFunnel, eventCounts } = data

  const chartData = dailyStats.map(d => ({ ...d, date: formatDate(d.date) }))

  const deviceData = Object.entries(devices).map(([name, value]) => ({ name, value }))
  const browserData = Object.entries(browsers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  const funnelMax = vendorFunnel[0]?.count || 1

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Analytics</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Last 30 days of visitor data</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Page Views</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{overview.totalPageViews.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-1">{overview.weeklyPageViews} this week</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Unique Visitors</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{overview.totalVisitors.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-1">{overview.weeklyVisitors} this week</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Events</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <MousePointer className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{overview.totalEvents.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-1">User interactions</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Applications</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{overview.totalApplications}</p>
          <p className="text-xs text-neutral-400 mt-1">Vendor applications</p>
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-neutral-900">Traffic</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Page views and unique visitors</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#cd2653]" /> Views</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Visitors</span>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cd2653" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#cd2653" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5' }} />
              <Area type="monotone" dataKey="views" name="Views" stroke="#cd2653" strokeWidth={2} fill="url(#viewsGrad)" />
              <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#60a5fa" strokeWidth={2} fill="url(#visitorsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-neutral-300 text-sm">No traffic data yet. Data will appear as visitors browse the site.</div>
        )}
      </div>

      {/* Second Row: Pages + Geo + Devices */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4">Top Pages</h2>
          {topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.map((p, i) => (
                <div key={p.path} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs text-neutral-400 w-4">{i + 1}</span>
                    <span className="text-sm text-neutral-700 truncate">{p.path}</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 flex-shrink-0 ml-2">{p.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">No data yet</p>
          )}
        </div>

        {/* Geography */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-neutral-400" />
            <h2 className="font-semibold text-neutral-900">Countries</h2>
          </div>
          {topCountries.length > 0 ? (
            <div className="space-y-3">
              {topCountries.map((c) => {
                const pct = overview.totalPageViews > 0 ? (c.views / overview.totalPageViews) * 100 : 0
                return (
                  <div key={c.country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-neutral-700">{COUNTRY_NAMES[c.country] || c.country}</span>
                      <span className="text-xs text-neutral-500">{c.views} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#cd2653] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">No geo data yet</p>
          )}

          {topCities.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-6 mb-3">
                <MapPin className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-semibold text-neutral-900">Top Cities</h3>
              </div>
              <div className="space-y-2">
                {topCities.slice(0, 5).map(c => (
                  <div key={c.city} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">{c.city}</span>
                    <span className="text-xs font-medium text-neutral-500">{c.views}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Devices + Browsers */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4">Devices</h2>
          {deviceData.length > 0 ? (
            <>
              <div className="flex justify-center mb-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {deviceData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <DeviceIcon type={d.name} />
                      <span className="text-sm text-neutral-600 capitalize">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">{d.value}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-neutral-900 mt-6 mb-3">Browsers</h3>
              <div className="space-y-2">
                {browserData.map(b => (
                  <div key={b.name} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">{b.name}</span>
                    <span className="text-xs font-medium text-neutral-500">{b.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-400">No device data yet</p>
          )}
        </div>
      </div>

      {/* Third Row: Funnel + Referrers + Events */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Vendor Application Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-neutral-400" />
            <h2 className="font-semibold text-neutral-900">Vendor Application Funnel</h2>
          </div>
          {vendorFunnel[0]?.count > 0 ? (
            <div className="space-y-4">
              {vendorFunnel.map((step, i) => {
                const pct = funnelMax > 0 ? (step.count / funnelMax) * 100 : 0
                const dropoff = i > 0 && vendorFunnel[i - 1].count > 0
                  ? ((vendorFunnel[i - 1].count - step.count) / vendorFunnel[i - 1].count * 100).toFixed(0)
                  : null
                return (
                  <div key={step.step}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-700">{step.step}</span>
                        {dropoff && parseInt(dropoff) > 0 && (
                          <span className="text-[11px] text-red-500">{dropoff}% drop</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-neutral-900">{step.count}</span>
                    </div>
                    <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-neutral-300 text-sm">
              Funnel data will appear as visitors interact with the site
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4">Traffic Sources</h2>
          {topReferrers.length > 0 ? (
            <div className="space-y-3">
              {topReferrers.map(r => (
                <div key={r.source} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 truncate mr-2">{r.source}</span>
                  <span className="text-sm font-semibold text-neutral-900 flex-shrink-0">{r.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">No referrer data yet</p>
          )}

          {Object.keys(eventCounts).length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-neutral-900 mt-6 mb-3">Event Activity</h3>
              <div className="space-y-2">
                {Object.entries(eventCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([event, count]) => (
                    <div key={event} className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">{event.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-medium text-neutral-500">{count}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
