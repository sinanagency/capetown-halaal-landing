'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, AlertTriangle, Clock, Mail, Phone, ExternalLink,
  XCircle, RefreshCw,
} from 'lucide-react'
import {
  PageShell, PageHeader, Card, StatCard, Pill, ButtonSecondary,
} from '@/components/chrome/PageChrome'

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

function shortItemName(name: string) {
  return name.includes('Friday') ? 'Friday' :
    name.includes('Saturday') ? 'Saturday' :
    name.includes('Sunday') ? 'Sunday' :
    name.includes('Weekend') ? 'Weekend' : name
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
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5E5E5]/60" />
        </div>
      </PageShell>
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
    <PageShell>
      <PageHeader
        kicker="Follow Up"
        title="Follow Up"
        subtitle="Failed payments, abandoned checkouts, and drop-offs"
        actions={
          <ButtonSecondary onClick={load} className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </ButtonSecondary>
        }
      />

      <div className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Failed Payments"
            value={failed.length}
            hint={failed.length > 0 ? formatCurrency(failed.reduce((s, o) => s + parseFloat(o.total), 0)) + ' lost revenue' : 'No failures'}
          />
          <StatCard
            label="Pending Orders"
            value={pending.length}
            hint={pending.length > 0 ? formatCurrency(pending.reduce((s, o) => s + parseFloat(o.total), 0)) + ' awaiting' : 'All clear'}
          />
          <StatCard
            label="Apply Drop-offs"
            value={applyDropoffs}
            hint="Visited apply but didn't submit"
          />
          <StatCard
            label="Submit Failures"
            value={submitDropoffs}
            hint="Started submit but didn't complete"
          />
        </div>

        {/* Failed orders: contact these buyers */}
        <Card padded={false} className="overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E5]/30 bg-[#cd2653]/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#bf3026]" />
              <h2 className="font-serif text-lg text-[#1B1A17]">Failed Payments, Contact These Buyers</h2>
            </div>
            <p className="text-xs text-[#1B1A17]/55 mt-1">These people tried to buy tickets but payment failed. Reach out to help them complete.</p>
          </div>
          {failed.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5]/15">
              {failed.map(order => (
                <div key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[#1B1A17]">
                        {order.billing.first_name} {order.billing.last_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-[#1B1A17]/55">
                        <a href={`mailto:${order.billing.email}`} className="flex items-center gap-1 text-[#cd2653] hover:underline">
                          <Mail className="w-3.5 h-3.5" /> {order.billing.email}
                        </a>
                        {order.billing.phone && (
                          <a href={`tel:${order.billing.phone}`} className="flex items-center gap-1 hover:text-[#1B1A17]">
                            <Phone className="w-3.5 h-3.5" /> {order.billing.phone}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#1B1A17]/45">
                        <span>{formatDate(order.date_created)}</span>
                        {order.billing.city && <span>{order.billing.city}</span>}
                        <span>{order.payment_method_title || 'Unknown method'}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-serif text-xl text-[#bf3026]">R{parseFloat(order.total).toFixed(0)}</p>
                      <div className="mt-1 space-y-0.5">
                        {order.line_items.map((item, i) => (
                          <p key={i} className="text-xs text-[#1B1A17]/55">{item.quantity}× {shortItemName(item.name)}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-[#1B1A17]/45 text-sm">No failed payments. All good.</div>
          )}
        </Card>

        {/* Pending orders */}
        <Card padded={false} className="overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E5]/30 bg-[#FAFAFA]/60">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#cd2653]" />
              <h2 className="font-serif text-lg text-[#1B1A17]">Pending / On-Hold Orders</h2>
            </div>
            <p className="text-xs text-[#1B1A17]/55 mt-1">Orders that started but haven&apos;t completed payment yet.</p>
          </div>
          {pending.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5]/15">
              {pending.map(order => (
                <div key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[#1B1A17]">
                        {order.billing.first_name} {order.billing.last_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-[#1B1A17]/55">
                        <a href={`mailto:${order.billing.email}`} className="flex items-center gap-1 text-[#cd2653] hover:underline">
                          <Mail className="w-3.5 h-3.5" /> {order.billing.email}
                        </a>
                        {order.billing.phone && (
                          <a href={`tel:${order.billing.phone}`} className="flex items-center gap-1 hover:text-[#1B1A17]">
                            <Phone className="w-3.5 h-3.5" /> {order.billing.phone}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Pill tone={order.status === 'pending' ? 'warn' : order.status === 'on-hold' ? 'brand' : 'neutral'}>
                          {order.status}
                        </Pill>
                        <span className="text-xs text-[#1B1A17]/45">{formatDate(order.date_created)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-serif text-xl text-[#cd2653]">R{parseFloat(order.total).toFixed(0)}</p>
                      <div className="mt-1 space-y-0.5">
                        {order.line_items.map((item, i) => (
                          <p key={i} className="text-xs text-[#1B1A17]/55">{item.quantity}× {shortItemName(item.name)}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-[#1B1A17]/45 text-sm">No pending orders.</div>
          )}
        </Card>

        {/* Captured emails: abandoned applications */}
        {(analyticsData?.capturedEmails?.length || 0) > 0 && (
          <Card padded={false} className="overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E5E5]/30 bg-[#FAFAFA]/60">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#E5E5E5]" />
                <h2 className="font-serif text-lg text-[#1B1A17]">Captured Emails, Started But Didn&apos;t Submit</h2>
              </div>
              <p className="text-xs text-[#1B1A17]/55 mt-1">These people entered their email on the apply form but abandoned. They&apos;ve been sent a follow-up email automatically.</p>
            </div>
            <div className="divide-y divide-[#E5E5E5]/15">
              {analyticsData!.capturedEmails.map((cap, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <a href={`mailto:${cap.email}`} className="text-sm font-medium text-[#cd2653] hover:underline">{cap.email}</a>
                    <p className="text-xs text-[#1B1A17]/45 mt-0.5">
                      {cap.name && <span>{cap.name}</span>}
                      {cap.name && cap.business && <span> · </span>}
                      {cap.business && <span>{cap.business}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-[#1B1A17]/45">{formatDate(cap.captured_at)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Vendor application funnel */}
        <Card>
          <h2 className="font-serif text-lg text-[#1B1A17] mb-1">Vendor Application Drop-off</h2>
          <p className="text-xs text-[#1B1A17]/55 mb-6">Where potential vendors abandon the application process</p>
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
                      <span className="text-sm font-medium text-[#1B1A17]/70">{step.step}</span>
                      <div className="flex items-center gap-3">
                        {i > 0 && dropped > 0 && (
                          <span className="text-xs text-[#bf3026]">-{dropped} ({dropPct}% drop)</span>
                        )}
                        <span className="text-sm font-bold text-[#1B1A17]">{step.count}</span>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-[#FAFAFA] rounded-full overflow-hidden">
                      <div className="h-full bg-[#cd2653] rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[#1B1A17]/45">Funnel data will appear as visitors use the apply page</p>
          )}
        </Card>

        {/* Quick actions */}
        <Card>
          <h2 className="font-serif text-lg text-[#1B1A17] mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <a href="https://tickets.youngatheart.co.za/wp-admin/edit.php?post_type=shop_order&post_status=wc-failed" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-[#E5E5E5]/40 hover:bg-[#FFFFFF] transition-colors">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-[#bf3026]" />
                <span className="text-sm font-medium text-[#1B1A17]/70">View Failed Orders in WooCommerce</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[#1B1A17]/45" />
            </a>
            <a href="https://tickets.youngatheart.co.za/wp-admin/edit.php?post_type=shop_order&post_status=wc-pending" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-[#E5E5E5]/40 hover:bg-[#FFFFFF] transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#cd2653]" />
                <span className="text-sm font-medium text-[#1B1A17]/70">View Pending Orders in WooCommerce</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[#1B1A17]/45" />
            </a>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
