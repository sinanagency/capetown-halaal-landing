'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Send, Search, Tag, UserCheck, Clock, CheckCircle2, RotateCcw,
  Link2, Sparkles, Mail, AlertCircle,
} from 'lucide-react'
import { PageShell, PageHeader, Card, Pill, ButtonPrimary, Empty } from '@/components/chrome/PageChrome'

type Status = 'open' | 'snoozed' | 'resolved'
type Tag = 'payment' | 'load-in' | 'badges' | 'contract' | 'refund' | 'general'

interface SupportMessage {
  id: string
  thread_id: string
  direction: 'in' | 'out'
  from_address: string
  from_name: string | null
  to_address: string
  subject: string | null
  body_text: string | null
  received_at: string
  provider: string | null
}

interface SupportThread {
  id: string
  peer_email: string
  peer_name: string | null
  subject: string | null
  status: Status
  snoozed_until: string | null
  assignee_id: string | null
  tag: Tag | null
  vendor_application_id: string | null
  ticket_buyer_id: string | null
  last_inbound_at: string | null
  last_handled_at: string | null
  unread_count: number
  messages: SupportMessage[]
}

interface Operator { id: string; email: string; name: string }
interface CannedReply { slug: string; label: string; subject: string; body: string }

interface VendorHit {
  id: string; business_name: string | null; contact_name: string | null; email: string | null
}
interface TicketHit { email: string; name: string | null; phone: string | null }

const ALL_TAGS: Tag[] = ['payment', 'load-in', 'badges', 'contract', 'refund', 'general']

function fmt(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function tagColor(t: Tag): string {
  switch (t) {
    case 'payment':  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'load-in':  return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'badges':   return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'contract': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'refund':   return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'general':  return 'bg-neutral-50 text-neutral-700 border-neutral-200'
  }
}

export function SupportInboxClient({ currentUserId }: { currentUserId: string }) {
  const [threads, setThreads] = useState<SupportThread[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('open')
  const [tagFilter, setTagFilter] = useState<Tag | null>(null)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [operators, setOperators] = useState<Operator[]>([])
  const [canned, setCanned] = useState<CannedReply[]>([])
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [linkPicker, setLinkPicker] = useState<'vendor' | 'ticket' | null>(null)
  const [linkQuery, setLinkQuery] = useState('')
  const [linkHits, setLinkHits] = useState<(VendorHit | TicketHit)[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (tagFilter) params.set('tag', tagFilter)
      const res = await fetch(`/api/admin/support-inbox/threads?${params.toString()}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setThreads(j.threads || [])
    } catch (e) {
      toast.error(`Load failed, ${e instanceof Error ? e.message : 'error'}`)
    } finally { setLoading(false) }
  }, [statusFilter, tagFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/admin/support-inbox/operators')
      .then((r) => r.json())
      .then((j) => setOperators(j.operators || []))
      .catch(() => { /* swallow */ })
    fetch('/api/admin/support-inbox/canned')
      .then((r) => r.json())
      .then((j) => setCanned(j.replies || []))
      .catch(() => { /* swallow */ })
  }, [])

  const active = useMemo(() => threads.find((t) => t.id === activeId) || null, [threads, activeId])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) =>
      t.peer_email.toLowerCase().includes(q) ||
      (t.peer_name || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      t.messages.some((m) => (m.body_text || '').toLowerCase().includes(q))
    )
  }, [threads, search])

  const totalUnread = threads.reduce((s, t) => s + (t.unread_count || 0), 0)

  async function send() {
    if (!active || !reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support-inbox/${active.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setReply('')
      toast.success('Reply sent')
      await load()
    } catch (e) {
      toast.error(`Send failed, ${e instanceof Error ? e.message : 'error'}`)
    } finally { setSending(false) }
  }

  async function act(action: string, body: Record<string, unknown> = {}) {
    if (!active) return
    setActionBusy(action)
    try {
      const res = await fetch(`/api/admin/support-inbox/${active.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      await load()
    } catch (e) {
      toast.error(`Action failed, ${e instanceof Error ? e.message : 'error'}`)
    } finally { setActionBusy(null) }
  }

  useEffect(() => {
    if (!linkPicker) { setLinkHits([]); return }
    const q = linkQuery.trim()
    if (q.length < 2) { setLinkHits([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/support-inbox/search?type=${linkPicker}&q=${encodeURIComponent(q)}`)
        const j = await res.json()
        if (!res.ok) throw new Error(j.error)
        setLinkHits(j.results || [])
      } catch { setLinkHits([]) }
    }, 200)
    return () => clearTimeout(timer)
  }, [linkPicker, linkQuery])

  function applyCanned(c: CannedReply) {
    setReply(c.body)
  }

  return (
    <PageShell>
      <PageHeader
        kicker="Festival Email"
        title="Support Inbox"
        subtitle="Mail to support@youngatheart.co.za. Tag it, assign it, snooze it, or reply."
        actions={
          <>
            {totalUnread > 0 && <Pill tone="danger">{totalUnread} unread</Pill>}
            <Pill tone="success">live</Pill>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
          {(['open', 'snoozed', 'resolved', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === s ? 'bg-white text-[#cd2653] shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <Tag className="w-3.5 h-3.5 text-neutral-400" />
          <button
            onClick={() => setTagFilter(null)}
            className={`text-[11px] font-medium px-2 py-1 rounded-full border ${
              tagFilter === null ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
            }`}
          >
            all
          </button>
          {ALL_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t === tagFilter ? null : t)}
              className={`text-[11px] font-medium px-2 py-1 rounded-full border ${
                tagFilter === t ? `${tagColor(t)} border-current` : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 text-sm py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading support inbox.
        </div>
      ) : threads.length === 0 ? (
        <Empty title="No mail matching this filter." hint="Try changing the status or tag filter above." />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="grid lg:grid-cols-[360px_1fr] min-h-[70vh]">
            {/* Thread list */}
            <div className="border-r border-neutral-200 flex flex-col">
              <div className="p-3 border-b border-neutral-200">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search threads."
                    className="w-full rounded-lg bg-white border border-neutral-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#cd2653]"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
                {filtered.map((t) => {
                  const isActive = active?.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left p-3.5 hover:bg-neutral-50 transition-colors ${isActive ? 'bg-[#cd2653]/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{t.peer_name || t.peer_email}</p>
                        <span className="text-[11px] text-neutral-400 shrink-0">{fmt(t.last_inbound_at)}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">{t.peer_email}</p>
                      <p className="text-xs text-neutral-700 truncate mt-1 italic">{t.subject || '(no subject)'}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {t.tag && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${tagColor(t.tag)}`}>{t.tag}</span>}
                        {t.status === 'snoozed' && <span className="text-[10px] text-amber-700">snoozed</span>}
                        {t.status === 'resolved' && <span className="text-[10px] text-emerald-700">resolved</span>}
                        {t.vendor_application_id && <span className="text-[10px] text-blue-700">vendor</span>}
                        {t.ticket_buyer_id && <span className="text-[10px] text-indigo-700">ticket</span>}
                        {t.unread_count > 0 && (
                          <span className="ml-auto text-[10px] font-bold bg-[#cd2653] text-white rounded-full px-1.5 py-0.5">{t.unread_count}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
                {filtered.length === 0 && (
                  <p className="p-6 text-sm text-neutral-400 text-center">No threads match.</p>
                )}
              </div>
            </div>

            {/* Thread view */}
            <div className="flex flex-col min-h-[70vh]">
              {!active ? (
                <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
                  Select a thread on the left.
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-neutral-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-serif text-lg text-neutral-900 truncate">{active.peer_name || active.peer_email}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-neutral-600">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {active.peer_email}</span>
                          {active.subject && <span className="italic">{active.subject}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {active.status === 'snoozed' && active.snoozed_until && (
                          <Pill tone="brand">snoozed {fmt(active.snoozed_until)}</Pill>
                        )}
                        {active.status === 'resolved' && <Pill tone="success">resolved</Pill>}
                      </div>
                    </div>

                    {/* Tool row */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Assign */}
                      <select
                        value={active.assignee_id || ''}
                        onChange={(e) => act('assign', { assigneeId: e.target.value || null })}
                        disabled={actionBusy === 'assign'}
                        className="text-xs rounded-full border border-neutral-200 bg-white px-3 py-1.5 outline-none focus:border-[#cd2653]"
                      >
                        <option value="">Unassigned</option>
                        {operators.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.name || op.email}{op.id === currentUserId ? ' (me)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Tag */}
                      <select
                        value={active.tag || ''}
                        onChange={(e) => act('tag', { tag: e.target.value || null })}
                        disabled={actionBusy === 'tag'}
                        className="text-xs rounded-full border border-neutral-200 bg-white px-3 py-1.5 outline-none focus:border-[#cd2653]"
                      >
                        <option value="">No tag</option>
                        {ALL_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>

                      {/* Snooze */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => act('snooze', { snoozeHours: 4 })}
                          disabled={actionBusy === 'snooze'}
                          className="text-xs font-medium px-3 py-1.5 rounded-l-full border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                        >
                          {actionBusy === 'snooze' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />} 4h
                        </button>
                        <button
                          onClick={() => act('snooze', { snoozeHours: 24 })}
                          className="text-xs font-medium px-2.5 py-1.5 border-y border-neutral-200 bg-white hover:border-[#cd2653]/40"
                        >1d</button>
                        <button
                          onClick={() => act('snooze', { snoozeHours: 0 })}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-r-full border border-neutral-200 bg-white hover:border-[#cd2653]/40"
                        >AM</button>
                      </div>

                      {/* Resolve / reopen */}
                      {active.status !== 'resolved' ? (
                        <button
                          onClick={() => act('resolve')}
                          disabled={actionBusy === 'resolve'}
                          className="text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 flex items-center gap-1"
                        >
                          {actionBusy === 'resolve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Resolve
                        </button>
                      ) : (
                        <button
                          onClick={() => act('reopen')}
                          disabled={actionBusy === 'reopen'}
                          className="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                        >
                          {actionBusy === 'reopen' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Reopen
                        </button>
                      )}

                      {/* Assign to me shortcut */}
                      <button
                        onClick={() => act('assign', { assigneeId: currentUserId })}
                        disabled={actionBusy === 'assign' || active.assignee_id === currentUserId}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 bg-white hover:border-[#cd2653]/40 disabled:opacity-50 flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" /> Assign to me
                      </button>

                      {/* Link to vendor / ticket */}
                      <button
                        onClick={() => { setLinkPicker('vendor'); setLinkQuery('') }}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                      >
                        <Link2 className="w-3 h-3" /> {active.vendor_application_id ? 'Linked vendor' : 'Link vendor'}
                      </button>
                      <button
                        onClick={() => { setLinkPicker('ticket'); setLinkQuery('') }}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                      >
                        <Link2 className="w-3 h-3" /> {active.ticket_buyer_id ? 'Linked ticket' : 'Link ticket'}
                      </button>
                    </div>

                    {/* Link picker (inline) */}
                    {linkPicker && (
                      <div className="mt-2 border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="w-3.5 h-3.5 text-neutral-400" />
                          <input
                            autoFocus
                            value={linkQuery}
                            onChange={(e) => setLinkQuery(e.target.value)}
                            placeholder={linkPicker === 'vendor' ? 'Search approved vendors.' : 'Search ticket buyers.'}
                            className="flex-1 bg-white border border-neutral-200 rounded px-2 py-1 text-xs outline-none focus:border-[#cd2653]"
                          />
                          <button
                            onClick={() => {
                              if (linkPicker === 'vendor') act('link_vendor', { vendorApplicationId: null })
                              else act('link_ticket', { ticketBuyerEmail: null })
                              setLinkPicker(null)
                            }}
                            className="text-[11px] text-neutral-600 hover:text-[#cd2653]"
                          >
                            Unlink
                          </button>
                          <button onClick={() => setLinkPicker(null)} className="text-[11px] text-neutral-500 hover:text-neutral-900">Close</button>
                        </div>
                        <div className="space-y-1 max-h-44 overflow-y-auto">
                          {linkHits.map((h, i) => {
                            if (linkPicker === 'vendor') {
                              const v = h as VendorHit
                              return (
                                <button
                                  key={v.id || i}
                                  onClick={() => { act('link_vendor', { vendorApplicationId: v.id }); setLinkPicker(null) }}
                                  className="w-full text-left text-xs bg-white border border-neutral-200 rounded px-2 py-1.5 hover:border-[#cd2653]/40"
                                >
                                  <span className="font-semibold">{v.business_name}</span>
                                  <span className="text-neutral-500"> · {v.contact_name || v.email}</span>
                                </button>
                              )
                            }
                            const t = h as TicketHit
                            return (
                              <button
                                key={t.email || i}
                                onClick={() => { act('link_ticket', { ticketBuyerEmail: t.email }); setLinkPicker(null) }}
                                className="w-full text-left text-xs bg-white border border-neutral-200 rounded px-2 py-1.5 hover:border-[#cd2653]/40"
                              >
                                <span className="font-semibold">{t.name || t.email}</span>
                                <span className="text-neutral-500"> · {t.email}</span>
                              </button>
                            )
                          })}
                          {linkHits.length === 0 && linkQuery.length >= 2 && (
                            <p className="text-[11px] text-neutral-400 italic px-2">No matches.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-neutral-50/30">
                    {active.messages.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.direction === 'out' ? 'bg-[#cd2653] text-white' : 'bg-white text-neutral-900 border border-neutral-200'}`}>
                          {m.subject && m.direction === 'in' && (
                            <p className="text-[11px] font-semibold mb-1 text-neutral-500">{m.subject}</p>
                          )}
                          <p className="whitespace-pre-wrap">{m.body_text}</p>
                          <p className={`text-[10px] mt-1 ${m.direction === 'out' ? 'text-white/70' : 'text-neutral-400'}`}>
                            {m.direction === 'out' ? 'You' : (m.from_name || m.from_address)} · {new Date(m.received_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {active.messages.length === 0 && (
                      <p className="text-sm text-neutral-400 italic">No messages.</p>
                    )}
                  </div>

                  {/* Canned + composer */}
                  <div className="border-t border-neutral-200 bg-white">
                    {canned.length > 0 && (
                      <div className="px-3 py-2 border-b border-neutral-100 flex flex-wrap gap-1.5 items-center">
                        <Sparkles className="w-3 h-3 text-[#cd2653]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#cd2653]">Canned</span>
                        {canned.map((c) => (
                          <button
                            key={c.slug}
                            onClick={() => applyCanned(c)}
                            className="text-[11px] px-2 py-1 rounded-full border border-neutral-200 bg-white hover:border-[#cd2653]/40 hover:text-[#cd2653]"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <form
                      onSubmit={(e) => { e.preventDefault(); send() }}
                      className="p-3 flex items-end gap-2"
                    >
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() } }}
                        rows={3}
                        placeholder="Reply via Resend. Cmd+Enter to send."
                        className="flex-1 rounded-lg bg-white border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653] resize-none"
                      />
                      <ButtonPrimary
                        type="submit"
                        disabled={sending || !reply.trim()}
                        className="flex items-center gap-1.5"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send
                      </ButtonPrimary>
                    </form>
                    <p className="px-4 pb-3 text-[11px] text-neutral-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> Sends from support@youngatheart.co.za via Resend. Lands in their inbox.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  )
}
