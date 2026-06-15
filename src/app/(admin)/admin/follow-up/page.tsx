'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, AlertTriangle, Clock, Mail, Phone, ExternalLink,
  XCircle, RefreshCw, Send,
} from 'lucide-react'
import {
  PageHeader, Card, StatCard, Pill, ButtonSecondary,
} from '@/components/chrome/PageChrome'
import { ChaseComposer, type ChaseRecipient } from '@/components/admin/follow-up/ChaseComposer'
import type { TemplateKey } from '@/lib/mail/templates'

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

// Stable key per row so we can select across mixed sections.
type ChaseRowKey = string
type ChaseRow = ChaseRecipient & { key: ChaseRowKey; section: 'failed' | 'pending' | 'captured' }

function orderToRow(o: Order, section: 'failed' | 'pending'): ChaseRow {
  return {
    key: `${section}:${o.id}`,
    section,
    email: o.billing.email || null,
    phone: o.billing.phone || null,
    name: `${o.billing.first_name} ${o.billing.last_name}`.trim() || null,
    business_name: null,
    stall: null,
  }
}

function capturedToRow(c: CapturedEmail): ChaseRow {
  return {
    key: `captured:${c.email}`,
    section: 'captured',
    email: c.email || null,
    phone: null,
    name: c.name || null,
    business_name: c.business || null,
    stall: null,
  }
}

export default function FollowUpPage() {
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<ChaseRowKey>>(new Set())
  const [composerFor, setComposerFor] = useState<{ recipients: ChaseRecipient[]; template?: TemplateKey } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [ticketRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/tickets'),
        fetch('/api/admin/analytics'),
      ])
      if (ticketRes.ok) setTicketData(await ticketRes.json())
      if (analyticsRes.ok) setAnalyticsData(await analyticsRes.json())
    } catch (e) {
      console.error('Follow-up load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Hash-link from Vendor Hub: /admin/follow-up?chase=<urlencoded params>
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const chase = sp.get('chase')
    if (!chase) return
    try {
      const inner = new URLSearchParams(chase)
      const recipient: ChaseRecipient = {
        id: inner.get('target') || undefined,
        email: inner.get('email') || undefined,
        phone: inner.get('phone') || undefined,
        name: inner.get('first_name') || undefined,
        business_name: inner.get('business_name') || undefined,
        stall: inner.get('stall_code') || undefined,
      }
      const template = inner.get('template') as TemplateKey | null
      setComposerFor({ recipients: [recipient], template: template || undefined })
    } catch (e) {
      console.warn('follow-up: bad chase param', e)
    }
  }, [])

  // All derived data + hooks MUST run on every render. Do not place
  // useMemo / useEffect below an early `return`, that is a hooks-rules
  // violation that crashes the client with "Rendered fewer hooks than
  // expected" the first time `loading` flips false.
  const failed = ticketData?.failedOrders || []
  const pending = ticketData?.pendingOrders || []
  const captured = analyticsData?.capturedEmails || []

  // Vendor funnel drop-offs (kept from prior page).
  const funnel = analyticsData?.vendorFunnel || []
  const viewedApply = funnel.find(f => f.step === 'Viewed Apply')?.count || 0
  const submitted = funnel.find(f => f.step === 'Started Submit')?.count || 0
  const completed = funnel.find(f => f.step === 'Completed')?.count || 0
  const applyDropoffs = viewedApply - submitted
  const submitDropoffs = submitted - completed

  // All selectable rows by key, for bulk Chase action.
  const allRows: ChaseRow[] = useMemo(() => [
    ...failed.map((o) => orderToRow(o, 'failed')),
    ...pending.map((o) => orderToRow(o, 'pending')),
    ...captured.map(capturedToRow),
  ], [failed, pending, captured])
  const rowMap = useMemo(() => {
    const m = new Map<ChaseRowKey, ChaseRow>()
    for (const r of allRows) m.set(r.key, r)
    return m
  }, [allRows])

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-[#FFFFFF] text-[#1B1A17]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8 h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5E5E5]/60" />
        </div>
      </div>
    )
  }

  function toggleSelected(key: ChaseRowKey) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openChaseFor(rows: ChaseRow[], template?: TemplateKey) {
    if (rows.length === 0) return
    setComposerFor({
      recipients: rows.map((r) => ({
        id: r.id,
        email: r.email,
        phone: r.phone,
        name: r.name,
        business_name: r.business_name,
        stall: r.stall,
      })),
      template,
    })
  }

  function openBulkChase() {
    const rows = Array.from(selected).map((k) => rowMap.get(k)).filter(Boolean) as ChaseRow[]
    openChaseFor(rows)
  }

  return (
    <div className="h-screen overflow-hidden bg-[#FFFFFF] text-[#1B1A17] flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-10 pt-8 flex-shrink-0">
      <PageHeader
        kicker="Follow Up"
        title="Follow Up"
        subtitle="Failed payments, abandoned checkouts, and drop-offs"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openBulkChase}
              disabled={selected.size === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ${
                selected.size === 0
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-[#cd2653] text-white hover:bg-[#b01f45]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Chase {selected.size} selected
            </button>
            <ButtonSecondary onClick={load} className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </ButtonSecondary>
          </div>
        }
      />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-10 pb-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Failed Payments" value={failed.length}
            hint={failed.length > 0 ? formatCurrency(failed.reduce((s, o) => s + parseFloat(o.total), 0)) + ' lost revenue' : 'No failures'} />
          <StatCard label="Pending Orders" value={pending.length}
            hint={pending.length > 0 ? formatCurrency(pending.reduce((s, o) => s + parseFloat(o.total), 0)) + ' awaiting' : 'All clear'} />
          <StatCard label="Apply Drop-offs" value={applyDropoffs} hint="Visited apply but didn't submit" />
          <StatCard label="Submit Failures" value={submitDropoffs} hint="Started submit but didn't complete" />
        </div>

        <div className="space-y-6">
        {/* Failed orders */}
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
              {failed.map(order => {
                const row = orderToRow(order, 'failed')
                return (
                  <div key={order.id} className="px-6 py-4 flex items-start gap-4">
                    <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggleSelected(row.key)}
                      className="mt-1.5 rounded border-neutral-300" aria-label={`Select ${row.name}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[#1B1A17]">{order.billing.first_name} {order.billing.last_name}</p>
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
                          <button onClick={() => openChaseFor([row], 'payment_reminder')}
                            className="mt-2 inline-flex items-center gap-1 text-xs bg-[#cd2653] hover:bg-[#b01f45] text-white px-2.5 py-1 rounded-md">
                            <Send className="w-3 h-3" /> Chase
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
              {pending.map(order => {
                const row = orderToRow(order, 'pending')
                return (
                  <div key={order.id} className="px-6 py-4 flex items-start gap-4">
                    <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggleSelected(row.key)}
                      className="mt-1.5 rounded border-neutral-300" aria-label={`Select ${row.name}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[#1B1A17]">{order.billing.first_name} {order.billing.last_name}</p>
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
                            <Pill tone={order.status === 'pending' ? 'warn' : order.status === 'on-hold' ? 'brand' : 'neutral'}>{order.status}</Pill>
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
                          <button onClick={() => openChaseFor([row], 'payment_reminder')}
                            className="mt-2 inline-flex items-center gap-1 text-xs bg-[#cd2653] hover:bg-[#b01f45] text-white px-2.5 py-1 rounded-md">
                            <Send className="w-3 h-3" /> Chase
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-[#1B1A17]/45 text-sm">No pending orders.</div>
          )}
        </Card>

        {/* Captured emails (apply drop-offs) */}
        {captured.length > 0 && (
          <Card padded={false} className="overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E5E5]/30 bg-[#FAFAFA]/60">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#E5E5E5]" />
                <h2 className="font-serif text-lg text-[#1B1A17]">Captured Emails, Started But Didn&apos;t Submit</h2>
              </div>
              <p className="text-xs text-[#1B1A17]/55 mt-1">Pre-application emails. Chase them with doc_chase or a custom note.</p>
            </div>
            <div className="divide-y divide-[#E5E5E5]/15">
              {captured.map((cap) => {
                const row = capturedToRow(cap)
                return (
                  <div key={`${cap.email}-${cap.captured_at}`} className="px-6 py-3 flex items-center gap-4">
                    <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggleSelected(row.key)}
                      className="rounded border-neutral-300" aria-label={`Select ${cap.email}`} />
                    <div className="flex-1 min-w-0">
                      <a href={`mailto:${cap.email}`} className="text-sm font-medium text-[#cd2653] hover:underline">{cap.email}</a>
                      <p className="text-xs text-[#1B1A17]/45 mt-0.5">
                        {cap.name && <span>{cap.name}</span>}
                        {cap.name && cap.business && <span> · </span>}
                        {cap.business && <span>{cap.business}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-[#1B1A17]/45">{formatDate(cap.captured_at)}</span>
                    <button onClick={() => openChaseFor([row], 'doc_chase')}
                      className="text-xs bg-[#cd2653] hover:bg-[#b01f45] text-white px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                      <Send className="w-3 h-3" /> Chase
                    </button>
                  </div>
                )
              })}
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
        </div>
      </div>

      {composerFor && (
        <ChaseComposer
          recipients={composerFor.recipients}
          initialTemplate={composerFor.template}
          onClose={() => setComposerFor(null)}
        />
      )}
    </div>
  )
}
