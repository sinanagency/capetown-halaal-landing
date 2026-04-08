'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Ticket, DollarSign, ShoppingCart, Download,
  ArrowUpRight, Calendar, Mail, Phone
} from 'lucide-react'

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

export default function TicketsPage() {
  const [data, setData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

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

  const sortedDates = Object.entries(data.salesByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)

  const maxRevenue = Math.max(...sortedDates.map(([, d]) => d.revenue), 1)

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Ticket Sales</h1>
          <p className="text-neutral-500 text-sm mt-1">Live data from tickets.youngatheart.co.za</p>
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
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-neutral-500">Revenue</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 tracking-tight">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-neutral-500">Tickets Sold</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 tracking-tight">{data.totalTickets}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-neutral-500">Orders</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 tracking-tight">{data.totalOrders}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-6">Sales (Last 14 Days)</h2>
          {sortedDates.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {sortedDates.map(([date, d]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group" title={`${date}: ${formatCurrency(d.revenue)} (${d.tickets} tickets)`}>
                  <span className="text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(d.revenue)}
                  </span>
                  <div
                    className="w-full bg-[#cd2653] rounded-t-sm transition-all group-hover:bg-[#b01f45] min-h-[4px]"
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 3)}%` }}
                  />
                  <span className="text-[9px] text-neutral-400 rotate-[-45deg] origin-top-left mt-1 whitespace-nowrap">
                    {formatShortDate(date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-neutral-400 text-sm">No sales data</div>
          )}
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4">By Ticket Type</h2>
          <div className="space-y-4">
            {Object.entries(data.ticketBreakdown).map(([name, d]) => {
              const shortName = name.includes('Friday') ? 'Friday Pass' :
                name.includes('Saturday') ? 'Saturday Pass' :
                name.includes('Sunday') ? 'Sunday Pass' :
                name.includes('Weekend') ? 'Weekend Pass' : name
              const pct = data.totalTickets > 0 ? (d.qty / data.totalTickets) * 100 : 0
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-neutral-700 font-medium">{shortName}</span>
                    <span className="text-sm font-semibold text-neutral-900">{d.qty}</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#cd2653] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{formatCurrency(d.revenue)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">All Orders</h2>
          <span className="text-sm text-neutral-400">{data.recentOrders.length} orders</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tickets</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Payment</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Amount</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-neutral-900">{order.billing.first_name} {order.billing.last_name}</p>
                    <p className="text-xs text-neutral-500">{order.billing.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      {order.line_items.map((item, i) => (
                        <p key={i} className="text-sm text-neutral-700">
                          {item.quantity}× {item.name.includes('Friday') ? 'Friday' : item.name.includes('Saturday') ? 'Saturday' : item.name.includes('Sunday') ? 'Sunday' : item.name.includes('Weekend') ? 'Weekend' : item.name}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-neutral-600">{order.payment_method_title || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-neutral-900">R{parseFloat(order.total).toFixed(0)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-neutral-500">{formatDate(order.date_created)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">Order #{selectedOrder.id}</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 capitalize">{selectedOrder.status}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-neutral-600">
                <Mail className="w-4 h-4" />
                <span>{selectedOrder.billing.email}</span>
              </div>
              {selectedOrder.billing.phone && (
                <div className="flex items-center gap-2 text-neutral-600">
                  <Phone className="w-4 h-4" />
                  <span>{selectedOrder.billing.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(selectedOrder.date_created)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
              {selectedOrder.line_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-700">{item.quantity}× {item.name}</span>
                  <span className="font-medium">R{parseFloat(item.total).toFixed(0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-100">
                <span>Total</span>
                <span className="text-[#cd2653]">R{parseFloat(selectedOrder.total).toFixed(0)}</span>
              </div>
            </div>
            <button onClick={() => setSelectedOrder(null)} className="w-full mt-4 py-2.5 bg-neutral-100 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
