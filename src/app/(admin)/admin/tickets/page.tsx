'use client'

import { useEffect, useState } from 'react'
import { Loader2, ArrowUpRight, Calendar, Mail, Phone, X, TrendingUp, ExternalLink } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { AdminPage } from '@/components/admin/AdminPage'
import {
  Card, StatCard, Tabs, ButtonPrimary,
} from '@/components/chrome/PageChrome'

interface Order {
  id: number
  status: string
  total: string
  date_created: string
  billing: {
    first_name: string
    last_name: string
    email: string
    phone: string
    city: string
  }
  payment_method_title: string
  line_items: Array<{ name: string; quantity: number; total: string }>
}

interface TicketData {
  totalRevenue: number
  totalTickets: number
  totalOrders: number
  ticketBreakdown: Record<string, { qty: number; revenue: number }>
  salesByDate: Record<string, { orders: number; revenue: number; tickets: number }>
  recentOrders: Order[]
  failedOrders?: Order[]
  pendingOrders?: Order[]
  failedCount?: number
  pendingCount?: number
}

function formatCurrency(amount: number) {
  return 'R' + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short',
  })
}

function shortItemName(name: string) {
  return name.includes('Friday') ? 'Friday' :
    name.includes('Saturday') ? 'Saturday' :
    name.includes('Sunday') ? 'Sunday' :
    name.includes('Weekend') ? 'Weekend' : name
}

type TabType = 'completed' | 'failed' | 'pending'

export default function TicketsPage() {
  const [data, setData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('completed')
  const [revenueData, setRevenueData] = useState<{
    tickets_total: number; tickets_30d: number;
    vendors_total: number; vendors_30d: number;
    total_in: number; total_30d: number;
  } | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [ticketRes, revenueRes] = await Promise.all([
        fetch('/api/admin/tickets'),
        fetch('/api/admin/broadcast/revenue'),
      ])
      if (ticketRes.status === 401) {
        window.location.href = '/admin/login'
        return
      }
      if (ticketRes.status === 403) {
        window.location.href = '/admin/login?error=not_admin'
        return
      }
      if (ticketRes.status === 502) {
        const body = await ticketRes.json().catch(() => ({}))
        setError(body.error || 'Ticket store unavailable. The WooCommerce API may be down.')
        return
      }
      if (!ticketRes.ok) {
        setError(`Server returned ${ticketRes.status}`)
        return
      }
      setData(await ticketRes.json())

      if (revenueRes.ok) {
        const r = await revenueRes.json()
        if (r?.vendors_total !== undefined) setRevenueData(r)
      }
    } catch (e) {
      console.error('Failed to load tickets:', e)
      setError('Network error. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-neutral-500">{error || 'Failed to load ticket data.'}</p>
        <ButtonPrimary onClick={load}>Retry</ButtonPrimary>
      </div>
    )
  }

  const chartData = Object.entries(data.salesByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-21)
    .map(([date, d]) => ({
      date: formatShortDate(date),
      revenue: d.revenue,
      tickets: d.tickets,
      orders: d.orders,
    }))

  const ticketTypes = Object.entries(data.ticketBreakdown).map(([name, d]) => {
    const shortName = name.includes('Friday') ? 'Friday Pass' :
      name.includes('Saturday') ? 'Saturday Pass' :
      name.includes('Sunday') ? 'Sunday Pass' :
      name.includes('Weekend') ? 'Weekend Pass' : name
    return { name: shortName, qty: d.qty, revenue: d.revenue }
  })

  const orders = activeTab === 'completed' ? data.recentOrders :
    activeTab === 'failed' ? (data.failedOrders || []) :
    (data.pendingOrders || [])

  const wcAction = (
    <a
      href="https://tickets.youngatheart.co.za/wp-admin/edit.php?post_type=shop_order"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-white border border-neutral-200 hover:border-[#cd2653]/50 text-neutral-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
    >
      WooCommerce <ExternalLink className="w-3.5 h-3.5" />
    </a>
  )

  return (
    <AdminPage title="Ticket Sales" caption="Tickets" subtitle="Live from tickets.youngatheart.co.za" actions={wcAction}>

      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Revenue" value={formatCurrency(data.totalRevenue)} />
          <StatCard label="Tickets" value={data.totalTickets} />
          <StatCard label="Orders" value={data.totalOrders} />
          <StatCard
            label="Avg Order"
            value={data.totalOrders > 0 ? formatCurrency(data.totalRevenue / data.totalOrders) : 'R0'}
          />
        </div>

        {/* Money In breakdown — from tickets + vendor payments */}
        {revenueData && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Tickets Revenue" value={formatCurrency(revenueData.tickets_total)} hint={`${formatCurrency(revenueData.tickets_30d)} last 30d`} />
            <StatCard label="Vendor Revenue" value={formatCurrency(revenueData.vendors_total)} hint={`${formatCurrency(revenueData.vendors_30d)} last 30d`} />
            <StatCard label="Total In" value={formatCurrency(revenueData.total_in)} hint={`${formatCurrency(revenueData.total_30d)} last 30d`} />
          </div>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue area chart */}
          <Card className="lg:col-span-2">
            <h2 className="font-serif text-lg text-[#1B1A17] mb-6">Daily Revenue</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ticketRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cd2653" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#cd2653" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DCC4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5DCC4', background: '#FFFFFF' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#cd2653" strokeWidth={2} fill="url(#ticketRevenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-[#1B1A17]/35 text-sm">No data</div>
            )}
          </Card>

          {/* Ticket type breakdown */}
          <Card>
            <h2 className="font-serif text-lg text-[#1B1A17] mb-4">By Ticket Type</h2>
            <div className="space-y-4">
              {ticketTypes.map((t) => {
                const pct = data.totalTickets > 0 ? (t.qty / data.totalTickets) * 100 : 0
                return (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-[#1B1A17]/70 font-medium">{t.name}</span>
                      <span className="text-sm font-bold text-[#1B1A17]">{t.qty}</span>
                    </div>
                    <div className="w-full h-2 bg-[#FAFAFA] rounded-full overflow-hidden">
                      <div className="h-full bg-[#cd2653] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-[#1B1A17]/45 mt-1">{formatCurrency(t.revenue)} · {pct.toFixed(0)}%</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Orders with tabs */}
        <div>
          <Tabs
            items={[
              { k: 'completed', label: `Completed (${data.totalOrders})` },
              { k: 'failed', label: `Failed (${data.failedCount || 0})` },
              { k: 'pending', label: `Pending (${data.pendingCount || 0})` },
            ]}
            active={activeTab}
            onChange={(k) => setActiveTab(k as TabType)}
          />
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#1B1A17]/55 border-b border-[#E5E5E5]/30 bg-[#FFFFFF]/40">
                    <th className="p-3 font-bold">Customer</th>
                    <th className="p-3 font-bold">Tickets</th>
                    <th className="p-3 font-bold">Payment</th>
                    <th className="p-3 font-bold text-right">Amount</th>
                    <th className="p-3 font-bold text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[#E5E5E5]/15 last:border-b-0 hover:bg-[#FFFFFF]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    >
                      <td className="p-3">
                        <p className="text-sm font-medium text-[#1B1A17]">{order.billing.first_name} {order.billing.last_name}</p>
                        <p className="text-xs text-[#1B1A17]/45">{order.billing.email}</p>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {order.line_items.map((item, i) => (
                            <p key={i} className="text-sm text-[#1B1A17]/70">
                              {item.quantity}× {shortItemName(item.name)}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[#1B1A17]/70">{order.payment_method_title || 'N/A'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm font-semibold text-[#1B1A17]">R{parseFloat(order.total).toFixed(0)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm text-[#1B1A17]/55">{formatDate(order.date_created)}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#1B1A17]/45 text-sm">
                        No {activeTab} orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5E5]/40 p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-[#1B1A17]">Order #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg bg-[#FAFAFA] flex items-center justify-center hover:bg-[#E5DCC4] transition-colors">
                <X className="w-4 h-4 text-[#1B1A17]/55" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#1B1A17]/70">
                <Mail className="w-4 h-4 text-[#E5E5E5]" />
                <span>{selectedOrder.billing.email}</span>
              </div>
              {selectedOrder.billing.phone && (
                <div className="flex items-center gap-2 text-[#1B1A17]/70">
                  <Phone className="w-4 h-4 text-[#E5E5E5]" />
                  <span>{selectedOrder.billing.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[#1B1A17]/70">
                <Calendar className="w-4 h-4 text-[#E5E5E5]" />
                <span>{formatDate(selectedOrder.date_created)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E5E5]/15 space-y-2">
              {selectedOrder.line_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#1B1A17]/70">{item.quantity}× {item.name}</span>
                  <span className="font-medium">R{parseFloat(item.total).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold pt-3 border-t border-[#E5E5E5]/15">
                <span>Total</span>
                <span className="text-[#cd2653]">R{parseFloat(selectedOrder.total).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  )
}
