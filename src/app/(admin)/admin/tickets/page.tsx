'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Ticket, DollarSign, ShoppingCart, ArrowUpRight,
  Calendar, Mail, Phone, X, AlertTriangle, Clock
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

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

type TabType = 'completed' | 'failed' | 'pending'

export default function TicketsPage() {
  const [data, setData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('completed')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/tickets')
        if (res.ok) setData(await res.json())
      } catch (e) {
        console.error('Failed to load tickets:', e)
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
        Failed to load ticket data. Check WooCommerce API credentials.
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

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Ticket Sales</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Live from tickets.youngatheart.co.za</p>
        </div>
        <a
          href="https://tickets.youngatheart.co.za/wp-admin/edit.php?post_type=shop_order"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
        >
          WooCommerce <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Tickets</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">{data.totalTickets}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Orders</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">{data.totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Order</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-neutral-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">
            {data.totalOrders > 0 ? formatCurrency(data.totalRevenue / data.totalOrders) : 'R0'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-6">Daily Revenue</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ticketRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cd2653" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#cd2653" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#cd2653" strokeWidth={2} fill="url(#ticketRevenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-neutral-300 text-sm">No data</div>
          )}
        </div>

        {/* Ticket Type Breakdown */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4">By Ticket Type</h2>
          <div className="space-y-4">
            {ticketTypes.map((t) => {
              const pct = data.totalTickets > 0 ? (t.qty / data.totalTickets) * 100 : 0
              return (
                <div key={t.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-neutral-700 font-medium">{t.name}</span>
                    <span className="text-sm font-bold text-neutral-900">{t.qty}</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#cd2653] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{formatCurrency(t.revenue)} · {pct.toFixed(0)}%</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Orders Table with Tabs */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center gap-0 px-5 border-b border-neutral-100">
          {([
            { key: 'completed' as TabType, label: 'Completed', count: data.totalOrders },
            { key: 'failed' as TabType, label: 'Failed', count: data.failedCount || 0 },
            { key: 'pending' as TabType, label: 'Pending', count: data.pendingCount || 0 },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#cd2653] text-[#cd2653]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  activeTab === tab.key ? 'bg-[#cd2653]/10 text-[#cd2653]' :
                  tab.key === 'failed' && tab.count > 0 ? 'bg-red-50 text-red-600' :
                  'bg-neutral-100 text-neutral-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tickets</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Payment</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Amount</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {orders.length > 0 ? orders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-neutral-900">{order.billing.first_name} {order.billing.last_name}</p>
                    <p className="text-xs text-neutral-400">{order.billing.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      {order.line_items.map((item, i) => (
                        <p key={i} className="text-sm text-neutral-600">
                          {item.quantity}× {item.name.includes('Friday') ? 'Friday' : item.name.includes('Saturday') ? 'Saturday' : item.name.includes('Sunday') ? 'Sunday' : item.name.includes('Weekend') ? 'Weekend' : item.name}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-neutral-600">{order.payment_method_title || 'N/A'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-semibold text-neutral-900">R{parseFloat(order.total).toFixed(0)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm text-neutral-500">{formatDate(order.date_created)}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-neutral-300 text-sm">
                    No {activeTab} orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl border border-neutral-200 p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">Order #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-neutral-600">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span>{selectedOrder.billing.email}</span>
              </div>
              {selectedOrder.billing.phone && (
                <div className="flex items-center gap-2 text-neutral-600">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <span>{selectedOrder.billing.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-600">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>{formatDate(selectedOrder.date_created)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
              {selectedOrder.line_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-600">{item.quantity}× {item.name}</span>
                  <span className="font-medium">R{parseFloat(item.total).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold pt-3 border-t border-neutral-100">
                <span>Total</span>
                <span className="text-[#cd2653]">R{parseFloat(selectedOrder.total).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
