'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VendorApplication } from '@/lib/supabase/types'
import {
  ArrowRight, Loader2, Clock, Eye, AlertTriangle, BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  PageShell, PageHeader, Card, StatCard, Pill,
} from '@/components/chrome/PageChrome'

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  info_requested: number
}

interface TicketStats {
  totalRevenue: number
  totalTickets: number
  totalOrders: number
  ticketBreakdown: Record<string, { qty: number; revenue: number }>
  salesByDate: Record<string, { orders: number; revenue: number; tickets: number }>
  recentOrders: Array<{
    id: number
    status: string
    total: string
    date_created: string
    billing: { first_name: string; last_name: string; email: string }
    line_items: Array<{ name: string; quantity: number; total: string }>
  }>
  failedOrders: Array<{ id: number; status: string; total: string; date_created: string; billing: { first_name: string; last_name: string; email: string } }>
  pendingOrders: Array<{ id: number; status: string; total: string; date_created: string; billing: { first_name: string; last_name: string; email: string } }>
  failedCount: number
  pendingCount: number
}

function formatCurrency(amount: number) {
  return 'R' + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short',
  })
}

function formatFullDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const PIPELINE_COLORS = {
  approved: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
  info_requested: '#3b82f6',
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1B1A17] text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-[#1B1A17]">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-semibold">
          {entry.name === 'revenue' ? formatCurrency(entry.value) : `${entry.value} tickets`}
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [vendorStats, setVendorStats] = useState<Stats | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [recentApps, setRecentApps] = useState<VendorApplication[]>([])
  const [recentCount, setRecentCount] = useState(0)
  const [estimatedRevenue, setEstimatedRevenue] = useState(0)
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, ticketRes, appsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/tickets'),
          fetch('/api/applications?status=pending'),
        ])

        if (statsRes.status === 401 || appsRes.status === 401) {
          router.push('/admin/login')
          return
        }

        if (statsRes.ok) {
          const data = await statsRes.json()
          setVendorStats(data.stats)
          setRecentCount(data.recentCount || 0)
          setEstimatedRevenue(data.estimatedRevenue || 0)
          setCategoryBreakdown(data.categoryBreakdown || {})
        }
        if (ticketRes.ok) {
          const data = await ticketRes.json()
          setTicketStats(data)
        }
        if (appsRes.ok) {
          const data = await appsRes.json()
          setRecentApps(data.applications?.slice(0, 5) || [])
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  const chartData = useMemo(() => {
    if (!ticketStats?.salesByDate) return []
    return Object.entries(ticketStats.salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-21)
      .map(([date, d]) => ({
        date: formatDate(date),
        revenue: d.revenue,
        tickets: d.tickets,
        orders: d.orders,
      }))
  }, [ticketStats])

  const pipelineData = useMemo(() => {
    if (!vendorStats) return []
    return [
      { name: 'Approved', value: vendorStats.approved, color: PIPELINE_COLORS.approved },
      { name: 'Pending', value: vendorStats.pending, color: PIPELINE_COLORS.pending },
      { name: 'Rejected', value: vendorStats.rejected, color: PIPELINE_COLORS.rejected },
      { name: 'Info Requested', value: vendorStats.info_requested, color: PIPELINE_COLORS.info_requested },
    ].filter(d => d.value > 0)
  }, [vendorStats])

  const ticketTypeData = useMemo(() => {
    if (!ticketStats?.ticketBreakdown) return []
    return Object.entries(ticketStats.ticketBreakdown).map(([name, d]) => ({
      name: name.includes('Friday') ? 'Fri' :
        name.includes('Saturday') ? 'Sat' :
        name.includes('Sunday') ? 'Sun' :
        name.includes('Weekend') ? 'Wknd' : name.slice(0, 8),
      fullName: name.includes('Friday') ? 'Friday Pass' :
        name.includes('Saturday') ? 'Saturday Pass' :
        name.includes('Sunday') ? 'Sunday Pass' :
        name.includes('Weekend') ? 'Weekend Pass' : name,
      qty: d.qty,
      revenue: d.revenue,
    }))
  }, [ticketStats])

  const avgOrderValue = ticketStats && ticketStats.totalOrders > 0
    ? ticketStats.totalRevenue / ticketStats.totalOrders
    : 0

  const conversionRate = ticketStats
    ? ((ticketStats.totalOrders) / (ticketStats.totalOrders + (ticketStats.failedCount || 0) + (ticketStats.pendingCount || 0)) * 100) || 0
    : 0

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5E5E5]" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Admin"
        title="Dashboard"
        subtitle="Young at Heart Festival 2026"
        actions={<Pill tone="success">Live</Pill>}
      />

      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Link href="/admin/tickets" className="block">
            <StatCard
              label="Revenue"
              value={formatCurrency(ticketStats?.totalRevenue || 0)}
              hint={`${ticketStats?.totalOrders || 0} orders`}
            />
          </Link>
          <Link href="/admin/tickets" className="block">
            <StatCard
              label="Tickets Sold"
              value={ticketStats?.totalTickets || 0}
              hint={`Avg ${formatCurrency(avgOrderValue)}/order`}
            />
          </Link>
          <Link href="/admin/applications" className="block">
            <StatCard
              label="Vendors"
              value={vendorStats?.total || 0}
              hint={`Est. ${formatCurrency(estimatedRevenue)} revenue`}
            />
          </Link>
          <Link href="/admin/applications?status=pending" className="block">
            <StatCard
              label="Pending"
              value={vendorStats?.pending || 0}
              hint="Needs review"
            />
          </Link>
          <StatCard
            label="Conversion"
            value={`${conversionRate.toFixed(0)}%`}
            hint={`${ticketStats?.failedCount || 0} failed`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-lg text-[#1B1A17]">Revenue Trend</h2>
                <p className="text-xs text-[#1B1A17]/50 mt-0.5">Last 21 days</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#1B1A17]/55">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#cd2653]" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Tickets</span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cd2653" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#cd2653" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FAFAFA" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="revenue" stroke="#cd2653" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-[#1B1A17]/40 text-sm">No sales data yet</div>
            )}
          </Card>

          {/* Vendor Pipeline */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-[#1B1A17]">Vendor Pipeline</h2>
              <Link href="/admin/applications" className="text-xs text-[#cd2653] hover:underline">View all</Link>
            </div>
            {pipelineData.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={pipelineData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pipelineData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}`, '']}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5DCC4' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 mt-2">
                  {pipelineData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-[#1B1A17]/65">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1B1A17]">{item.value}</span>
                        <span className="text-xs text-[#1B1A17]/45">
                          {vendorStats && vendorStats.total > 0 ? `${((item.value / vendorStats.total) * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-[#1B1A17]/40 text-sm">No applications yet</div>
            )}
          </Card>
        </div>

        {/* Second Row: Ticket Types + Alerts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sales by Ticket Type */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-lg text-[#1B1A17]">Sales by Ticket Type</h2>
                <p className="text-xs text-[#1B1A17]/50 mt-0.5">{ticketStats?.totalTickets || 0} total sold</p>
              </div>
              <BarChart3 className="w-4 h-4 text-[#E5E5E5]" />
            </div>
            {ticketTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ticketTypeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FAFAFA" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#737373' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5DCC4' }}
                    labelFormatter={(label) => ticketTypeData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="qty" name="qty" fill="#cd2653" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[#1B1A17]/40 text-sm">No ticket data</div>
            )}
            {ticketTypeData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E5E5E5]/20">
                {ticketTypeData.map((t) => (
                  <div key={t.name} className="text-center">
                    <p className="font-serif text-lg text-[#1B1A17]">{t.qty}</p>
                    <p className="text-xs text-[#1B1A17]/55">{t.fullName}</p>
                    <p className="text-xs text-[#1B1A17]/45">{formatCurrency(t.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Alerts + Quick Stats */}
          <div className="space-y-4">
            {(ticketStats?.failedCount || 0) > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#bf3026]" />
                    <h3 className="text-sm font-semibold text-[#1B1A17]">Failed Orders</h3>
                  </div>
                  <Pill tone="danger">Attention</Pill>
                </div>
                <p className="font-serif text-3xl text-[#bf3026]">{ticketStats?.failedCount}</p>
                <p className="text-xs text-[#1B1A17]/55 mt-1">Payment failures need attention</p>
              </Card>
            )}

            {(ticketStats?.pendingCount || 0) > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#cd2653]" />
                    <h3 className="text-sm font-semibold text-[#1B1A17]">Pending Orders</h3>
                  </div>
                  <Pill tone="warn">Waiting</Pill>
                </div>
                <p className="font-serif text-3xl text-[#cd2653]">{ticketStats?.pendingCount}</p>
                <p className="text-xs text-[#1B1A17]/55 mt-1">Awaiting payment or processing</p>
              </Card>
            )}

            <Card>
              <h3 className="text-[11px] font-semibold text-[#1B1A17]/55 uppercase tracking-[0.18em] mb-3">Approval Rate</h3>
              {vendorStats && vendorStats.total > 0 ? (
                <>
                  <p className="font-serif text-3xl text-[#1B1A17]">
                    {((vendorStats.approved / vendorStats.total) * 100).toFixed(0)}%
                  </p>
                  <div className="w-full h-2 bg-[#FAFAFA] rounded-full overflow-hidden flex mt-3">
                    <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(vendorStats.approved / vendorStats.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-[#1B1A17]/50 mt-2">{vendorStats.approved} of {vendorStats.total} approved</p>
                </>
              ) : (
                <p className="text-sm text-[#1B1A17]/45">No data</p>
              )}
            </Card>

            <Card>
              <h3 className="text-[11px] font-semibold text-[#1B1A17]/55 uppercase tracking-[0.18em] mb-3">Booth Capacity</h3>
              <p className="font-serif text-3xl text-[#1B1A17]">{vendorStats?.approved || 0}<span className="text-lg text-[#1B1A17]/45 font-sans"> / 264</span></p>
              <div className="w-full h-2 bg-[#FAFAFA] rounded-full overflow-hidden mt-3">
                <div className="bg-[#cd2653] h-full rounded-full transition-all" style={{ width: `${Math.min(((vendorStats?.approved || 0) / 264) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-[#1B1A17]/50 mt-2">{264 - (vendorStats?.approved || 0)} booths remaining</p>
            </Card>
          </div>
        </div>

        {/* Vendor Categories */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <Card>
            <h2 className="font-serif text-lg text-[#1B1A17] mb-4">Vendor Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <div key={cat} className="bg-[#FFFFFF] rounded-lg px-4 py-3 text-center">
                    <p className="font-serif text-lg text-[#1B1A17]">{count}</p>
                    <p className="text-xs text-[#1B1A17]/55">{cat}</p>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Bottom Row: Recent Orders + Pending Apps */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]/20">
              <h2 className="font-serif text-base text-[#1B1A17]">Recent Orders</h2>
              <Link href="/admin/tickets" className="text-xs text-[#cd2653] hover:underline flex items-center gap-1">
                All orders <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {ticketStats?.recentOrders && ticketStats.recentOrders.length > 0 ? (
              <div className="divide-y divide-[#E5E5E5]/10">
                {ticketStats.recentOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#FAFAFA] flex items-center justify-center flex-shrink-0 text-xs font-semibold text-[#1B1A17]/55">
                        {order.billing.first_name[0]}{order.billing.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1B1A17] truncate">
                          {order.billing.first_name} {order.billing.last_name}
                        </p>
                        <p className="text-xs text-[#1B1A17]/45 truncate">
                          {order.line_items.map(i => `${i.quantity}× ${i.name.includes('Friday') ? 'Fri' : i.name.includes('Saturday') ? 'Sat' : i.name.includes('Sunday') ? 'Sun' : i.name.includes('Weekend') ? 'Wknd' : i.name}`).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-[#1B1A17]">R{parseFloat(order.total).toFixed(0)}</p>
                      <p className="text-[11px] text-[#1B1A17]/45">{formatFullDate(order.date_created)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[#1B1A17]/40 text-sm">No orders yet</div>
            )}
          </Card>

          {/* Pending Applications */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]/20">
              <h2 className="font-serif text-base text-[#1B1A17]">Pending Applications</h2>
              <Link href="/admin/applications?status=pending" className="text-xs text-[#cd2653] hover:underline flex items-center gap-1">
                Review all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentApps.length > 0 ? (
              <div className="divide-y divide-[#E5E5E5]/10">
                {recentApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/admin/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#FFFFFF]/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1B1A17]">{app.business_name}</p>
                      <p className="text-xs text-[#1B1A17]/45">{app.contact_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Pill tone="warn">Pending</Pill>
                      <Eye className="w-3.5 h-3.5 text-[#E5E5E5]" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[#1B1A17]/40 text-sm">All caught up</div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
