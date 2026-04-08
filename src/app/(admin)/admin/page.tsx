'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VendorApplication } from '@/lib/supabase/types'
import {
  Ticket, Users, DollarSign, TrendingUp, ArrowRight,
  Loader2, FileText, CheckCircle, Clock, XCircle, Eye
} from 'lucide-react'

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
}

function formatCurrency(amount: number) {
  return 'R' + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatCard({ label, value, icon, color, href }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; href?: string
}) {
  const card = (
    <div className={`bg-white rounded-2xl border border-neutral-200 p-6 hover:border-neutral-300 transition-all ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-neutral-900 tracking-tight">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

export default function AdminDashboard() {
  const router = useRouter()
  const [vendorStats, setVendorStats] = useState<Stats | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [recentApps, setRecentApps] = useState<VendorApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, ticketRes, appsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/tickets'),
          fetch('/api/applications?status=pending'),
        ])

        // Redirect to login if unauthorized
        if (statsRes.status === 401 || appsRes.status === 401) {
          router.push('/admin/login')
          return
        }

        if (statsRes.ok) {
          const data = await statsRes.json()
          setVendorStats(data.stats)
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
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">Young at Heart Festival 2026 — Overview</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Ticket Revenue"
          value={formatCurrency(ticketStats?.totalRevenue || 0)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          color="bg-green-50"
          href="/admin/tickets"
        />
        <StatCard
          label="Tickets Sold"
          value={ticketStats?.totalTickets || 0}
          icon={<Ticket className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50"
          href="/admin/tickets"
        />
        <StatCard
          label="Vendor Applications"
          value={vendorStats?.total || 0}
          icon={<Users className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50"
          href="/admin/applications"
        />
        <StatCard
          label="Pending Review"
          value={vendorStats?.pending || 0}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50"
          href="/admin/applications?status=pending"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Recent Orders + Apps */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Ticket Orders */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Recent Orders</h2>
              <Link href="/admin/tickets" className="text-sm text-[#cd2653] hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {ticketStats?.recentOrders && ticketStats.recentOrders.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {ticketStats.recentOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Ticket className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {order.billing.first_name} {order.billing.last_name}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {order.line_items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-semibold text-neutral-900">R{parseFloat(order.total).toFixed(0)}</p>
                      <p className="text-xs text-neutral-400">{formatDate(order.date_created)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-neutral-400 text-sm">No orders yet</div>
            )}
          </div>

          {/* Pending Applications */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Pending Applications</h2>
              <Link href="/admin/applications?status=pending" className="text-sm text-[#cd2653] hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {recentApps.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {recentApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/admin/applications/${app.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{app.business_name}</p>
                      <p className="text-xs text-neutral-500">{app.contact_name} · {app.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        Pending
                      </span>
                      <Eye className="w-4 h-4 text-neutral-300" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-neutral-400 text-sm">No pending applications</div>
            )}
          </div>
        </div>

        {/* Right: Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Breakdown */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Ticket Breakdown</h2>
            {ticketStats?.ticketBreakdown && Object.keys(ticketStats.ticketBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(ticketStats.ticketBreakdown).map(([name, data]) => {
                  const shortName = name.includes('Friday') ? 'Friday' :
                    name.includes('Saturday') ? 'Saturday' :
                    name.includes('Sunday') ? 'Sunday' :
                    name.includes('Weekend') ? 'Weekend Pass' : name
                  return (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#cd2653]" />
                        <span className="text-sm text-neutral-700">{shortName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-neutral-900">{data.qty} sold</span>
                        <span className="text-xs text-neutral-400 ml-2">{formatCurrency(data.revenue)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No sales data yet</p>
            )}
          </div>

          {/* Vendor Stats */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Vendor Pipeline</h2>
            <div className="space-y-3">
              {[
                { label: 'Pending', value: vendorStats?.pending || 0, color: 'bg-amber-500' },
                { label: 'Approved', value: vendorStats?.approved || 0, color: 'bg-green-500' },
                { label: 'Rejected', value: vendorStats?.rejected || 0, color: 'bg-red-500' },
                { label: 'Info Requested', value: vendorStats?.info_requested || 0, color: 'bg-blue-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-neutral-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">{item.value}</span>
                </div>
              ))}
            </div>
            {vendorStats && vendorStats.total > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden flex">
                  {vendorStats.approved > 0 && (
                    <div className="bg-green-500 h-full" style={{ width: `${(vendorStats.approved / vendorStats.total) * 100}%` }} />
                  )}
                  {vendorStats.pending > 0 && (
                    <div className="bg-amber-500 h-full" style={{ width: `${(vendorStats.pending / vendorStats.total) * 100}%` }} />
                  )}
                  {vendorStats.rejected > 0 && (
                    <div className="bg-red-500 h-full" style={{ width: `${(vendorStats.rejected / vendorStats.total) * 100}%` }} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Quick Links</h2>
            <div className="space-y-2">
              {[
                { label: 'Ticket Store', href: 'https://tickets.youngatheart.co.za', external: true },
                { label: 'Main Website', href: 'https://cthalaal.co.za', external: true },
                { label: 'Vendor Applications', href: '/admin/applications' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors text-sm"
                >
                  <span className="text-neutral-700 font-medium">{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
