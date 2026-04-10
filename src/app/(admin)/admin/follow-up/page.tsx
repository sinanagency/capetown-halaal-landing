'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, AlertTriangle, Clock, Mail, Phone, ExternalLink,
  XCircle, RefreshCw, Users, ShoppingCart
} from 'lucide-react'

interface Order {
  id: number
  status: string
  total: string
  date_created: string
  billing: { first_name: string; last_name: string; email: string; phone: string; city: string }
  line_items: Array<{ name: string; quantity: number; total: string }>
  payment_method_title: string
}

interface TicketData {
  failedOrders: Order[]
  pendingOrders: Order[]
  failedCount: number
  pendingCount: number
}

interface CapturedEmail {
  email: string
  name: string
  business: string
  captured_at: string
}

interface AnalyticsData {
  vendorFunnel: Array<{ step: string; count: number }>
  eventCounts: Record<string, number>
  capturedEmails: CapturedEmail[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(n: number) {
  return 'R' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function FollowUpPage() {
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ticketRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/tickets'),
        fetch('/api/admin/analytics'),
      ])
      if (ticketRes.ok) {
        const d = await ticketRes.json()
        setTicketData(d)
      }
      if (analyticsRes.ok) {
        const d = await analyticsRes.json()
        setAnalyticsData(d)
      }
    } catch (e) {
      console.error('Follow-up load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
      </div>
    )
  }

  const failed = ticketData?.failedOrders || []
  const pending = ticketData?.pendingOrders || []

  // Vendor funnel drop-offs
  const funnel = analyticsData?.vendorFunnel || []
  const viewedApply = funnel.find(f => f.step === 'Viewed Apply')?.count || 0
  const submitted = funnel.find(f => f.step === 'Started Submit')?.count || 0
  const completed = funnel.find(f => f.step === 'Completed')?.count || 0
  const applyDropoffs = viewedApply - submitted
  const submitDropoffs = submitted - completed

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Follow Up</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Failed payments, abandoned checkouts, and drop-offs</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Failed Payments</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{failed.length}</p>
          <p className="text-xs text-red-500 mt-1">
            {failed.length > 0 ? formatCurrency(failed.reduce((s, o) => s + parseFloat(o.total), 0)) + ' lost revenue' : 'No failures'}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">Pending Orders</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{pending.length}</p>
          <p className="text-xs text-amber-600 mt-1">
            {pending.length > 0 ? formatCurrency(pending.reduce((s, o) => s + parseFloat(o.total), 0)) + ' awaiting' : 'All clear'}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Apply Drop-offs</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{applyDropoffs}</p>
          <p className="text-xs text-purple-500 mt-1">Visited apply but didn't submit</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Submit Failures</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{submitDropoffs}</p>
          <p className="text-xs text-blue-500 mt-1">Started submit but didn't complete</p>
        </div>
      </div>

      {/* Failed Orders — Contact These People */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 bg-red-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-neutral-900">Failed Payments — Contact These Buyers</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">These people tried to buy tickets but payment failed. Reach out to help them complete.</p>
        </div>
        {failed.length > 0 ? (
          <div className="divide-y divide-neutral-50">
            {failed.map(order => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {order.billing.first_name} {order.billing.last_name}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-neutral-500">
                      <a href={`mailto:${order.billing.email}`} className="flex items-center gap-1 text-[#cd2653] hover:underline">
                        <Mail className="w-3.5 h-3.5" /> {order.billing.email}
                      </a>
                      {order.billing.phone && (
                        <a href={`tel:${order.billing.phone}`} className="flex items-center gap-1 hover:text-neutral-700">
                          <Phone className="w-3.5 h-3.5" /> {order.billing.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                      <span>{formatDate(order.date_created)}</span>
                      {order.billing.city && <span>{order.billing.city}</span>}
                      <span>{order.payment_method_title || 'Unknown method'}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold text-red-600">R{parseFloat(order.total).toFixed(0)}</p>
                    <div className="mt-1 space-y-0.5">
                      {order.line_items.map((item, i) => (
                        <p key={i} className="text-xs text-neutral-500">{item.quantity}× {item.name.includes('Friday') ? 'Friday' : item.name.includes('Saturday') ? 'Saturday' : item.name.includes('Sunday') ? 'Sunday' : item.name.includes('Weekend') ? 'Weekend' : item.name}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-neutral-400 text-sm">No failed payments. All good.</div>
        )}
      </div>

      {/* Pending Orders */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-neutral-900">Pending / On-Hold Orders</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">Orders that started but haven't completed payment yet.</p>
        </div>
        {pending.length > 0 ? (
          <div className="divide-y divide-neutral-50">
            {pending.map(order => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {order.billing.first_name} {order.billing.last_name}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-neutral-500">
                      <a href={`mailto:${order.billing.email}`} className="flex items-center gap-1 text-[#cd2653] hover:underline">
                        <Mail className="w-3.5 h-3.5" /> {order.billing.email}
                      </a>
                      {order.billing.phone && (
                        <a href={`tel:${order.billing.phone}`} className="flex items-center gap-1 hover:text-neutral-700">
                          <Phone className="w-3.5 h-3.5" /> {order.billing.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        order.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        order.status === 'on-hold' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-neutral-50 text-neutral-600 border border-neutral-200'
                      }`}>
                        {order.status}
                      </span>
                      <span className="text-xs text-neutral-400">{formatDate(order.date_created)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold text-amber-600">R{parseFloat(order.total).toFixed(0)}</p>
                    <div className="mt-1 space-y-0.5">
                      {order.line_items.map((item, i) => (
                        <p key={i} className="text-xs text-neutral-500">{item.quantity}× {item.name.includes('Friday') ? 'Friday' : item.name.includes('Saturday') ? 'Saturday' : item.name.includes('Sunday') ? 'Sunday' : item.name.includes('Weekend') ? 'Weekend' : item.name}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-neutral-400 text-sm">No pending orders.</div>
        )}
      </div>

      {/* Captured Emails — Abandoned Applications */}
      {(analyticsData?.capturedEmails?.length || 0) > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-purple-50/50">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-neutral-900">Captured Emails — Started But Didn't Submit</h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">These people entered their email on the apply form but abandoned. They've been sent a follow-up email automatically.</p>
          </div>
          <div className="divide-y divide-neutral-50">
            {analyticsData!.capturedEmails.map((cap, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <a href={`mailto:${cap.email}`} className="text-sm font-medium text-[#cd2653] hover:underline">{cap.email}</a>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {cap.name && <span>{cap.name}</span>}
                    {cap.name && cap.business && <span> · </span>}
                    {cap.business && <span>{cap.business}</span>}
                  </p>
                </div>
                <span className="text-xs text-neutral-400">{formatDate(cap.captured_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Application Funnel */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="font-semibold text-neutral-900 mb-2">Vendor Application Drop-off</h2>
        <p className="text-xs text-neutral-500 mb-6">Where potential vendors abandon the application process</p>
        {funnel.length > 0 && funnel[0].count > 0 ? (
          <div className="space-y-4">
            {funnel.map((step, i) => {
              const max = funnel[0].count
              const pct = max > 0 ? (step.count / max) * 100 : 0
              const prev = i > 0 ? funnel[i - 1].count : step.count
              const dropped = prev - step.count
              const dropPct = prev > 0 ? ((dropped / prev) * 100).toFixed(0) : '0'
              return (
                <div key={step.step}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-neutral-700">{step.step}</span>
                    <div className="flex items-center gap-3">
                      {i > 0 && dropped > 0 && (
                        <span className="text-xs text-red-500">-{dropped} ({dropPct}% drop)</span>
                      )}
                      <span className="text-sm font-bold text-neutral-900">{step.count}</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#cd2653] rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Funnel data will appear as visitors use the apply page</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <a href="https://tickets.youngatheart.co.za/wp-admin/edit.php?post_type=shop_order&post_status=wc-failed" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-neutral-700">View Failed Orders in WooCommerce</span>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400" />
          </a>
          <a href="https://tickets.youngatheart.co.za/wp-admin/edit.php?post_type=shop_order&post_status=wc-pending" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-neutral-700">View Pending Orders in WooCommerce</span>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400" />
          </a>
        </div>
      </div>
    </div>
  )
}
