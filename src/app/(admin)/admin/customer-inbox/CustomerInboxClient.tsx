'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPage } from '@/components/admin/AdminPage'
import { StatusPill } from '@/components/chrome/StatusPill'
import { Loader2, Mail, MessageCircle, Search, Clock, UserCheck, CheckCircle2, RotateCcw } from 'lucide-react'

type Tab = 'open' | 'snoozed' | 'resolved' | 'all'

interface Ticket {
  id: string
  vendor_application_id: string | null
  ticket_buyer_email: string | null
  status: string
  assigned_to: string | null
  tag: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
  business_name?: string | null
  contact_name?: string | null
}

interface CommItem {
  id: string
  channel: 'whatsapp' | 'email'
  direction: 'in' | 'out'
  body: string
  at: string
  from: string
  subject?: string
}

interface Operator { id: string; email: string }

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtFull(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (secs < 60) return 'now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function statusTone(status: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'open': return 'info'
    case 'snoozed': return 'warn'
    case 'resolved': return 'success'
    default: return 'neutral'
  }
}

export function CustomerInboxClient({ currentUserId, operators }: { currentUserId: string; operators: Operator[] }) {
  const [tab, setTab] = useState<Tab>('open')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CommItem[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [, setActionBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tab })
      const res = await fetch(`/api/admin/vendor-tickets?${params}`)
      const j = await res.json()
      if (res.ok) setTickets(j.tickets || [])
    } catch (e) {
      console.error('Failed to load tickets:', e)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  const loadMessages = useCallback(async (ticketId: string) => {
    setMsgsLoading(true)
    try {
      const res = await fetch(`/api/admin/vendor-tickets/${ticketId}/messages`)
      const j = await res.json()
      if (res.ok) setMessages(j.messages || [])
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      setMsgsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeId) loadMessages(activeId)
  }, [activeId, loadMessages])

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets
    const q = search.toLowerCase()
    return tickets.filter((t) =>
      (t.business_name || '').toLowerCase().includes(q) ||
      (t.contact_name || '').toLowerCase().includes(q) ||
      (t.ticket_buyer_email || '').toLowerCase().includes(q)
    )
  }, [tickets, search])

  const active = useMemo(() => tickets.find((t) => t.id === activeId) || null, [tickets, activeId])

  const nameOf = (t: Ticket) => t.business_name || t.contact_name || t.ticket_buyer_email || 'Unknown'

  async function act(action: string, value?: string) {
    if (!activeId) return
    setActionBusy(action)
    try {
      const res = await fetch(`/api/admin/vendor-tickets/${activeId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value }),
      })
      if (res.ok) await load()
    } catch (e) {
      console.error('Action failed:', e)
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <AdminPage title="Customer Inbox" caption="UNIFIED TICKETS" subtitle="Every vendor conversation across WhatsApp and email, grouped by ticket.">
      {/* Bounded shell: conversation LEFT (wide), message list RIGHT (narrow).
          Fixed viewport-relative height so each pane scrolls internally — the
          page itself never grows (no infinite scroll). */}
      <div className="grid lg:grid-cols-[1fr_380px] grid-rows-[minmax(0,1fr)] h-[calc(100dvh-15rem)] gap-4">

        {/* ─────────── LEFT: conversation ─────────── */}
        <div className="flex flex-col min-h-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageCircle className="w-8 h-8 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">Select a conversation from the list on the right.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center text-sm font-bold shrink-0">
                    {initials(nameOf(active))}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-neutral-900 leading-tight truncate">{nameOf(active)}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-neutral-500">
                      {active.contact_name && <span className="truncate">{active.contact_name}</span>}
                      {active.ticket_buyer_email && <span className="truncate">{active.ticket_buyer_email}</span>}
                      {active.last_message_at && <span>Last: {fmtFull(active.last_message_at)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {active.status !== 'resolved' ? (
                    <button onClick={() => act('status', 'resolved')}
                      className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  ) : (
                    <button onClick={() => act('status', 'open')}
                      className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Reopen
                    </button>
                  )}
                  <button onClick={() => act('status', 'snoozed')}
                    className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Snooze
                  </button>
                  <select value={active.assigned_to || ''} onChange={(e) => act('assign', e.target.value || '')}
                    className="h-7 text-[11px] rounded-md border border-neutral-200 bg-white px-2 outline-none focus:border-[#cd2653] max-w-[140px]">
                    <option value="">Unassigned</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>{op.email}{op.id === currentUserId ? ' (me)' : ''}</option>
                    ))}
                  </select>
                  <button onClick={() => act('assign', currentUserId)}
                    className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Me
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-neutral-50/40 min-h-0">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic text-center py-8">No messages recorded for this ticket.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.direction === 'out' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-400">
                        {m.channel === 'whatsapp'
                          ? <MessageCircle className="w-3 h-3 text-emerald-600" />
                          : <Mail className="w-3 h-3 text-blue-600" />}
                        <span>{m.from}</span>
                        <span>·</span>
                        <span>{fmtFull(m.at)}</span>
                      </div>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        m.direction === 'out'
                          ? 'bg-[#cd2653] text-white rounded-tr-sm'
                          : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Composer placeholder — replies currently go out via the WhatsApp
                  handover / swipe-reply flow; a direct send box is the next step. */}
              <div className="px-5 py-3 border-t border-neutral-100 bg-white">
                <div className="text-[11px] text-neutral-400">
                  Reply from WhatsApp (swipe-reply) for now. Direct reply box coming next.
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─────────── RIGHT: message list ─────────── */}
        <div className="flex flex-col min-h-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-serif text-neutral-900">All messages</h2>
              <div className="flex gap-0.5 rounded-lg bg-neutral-100 p-0.5">
                {(['open', 'snoozed', 'resolved', 'all'] as const).map((t) => (
                  <button key={t} onClick={() => { setTab(t); setActiveId(null) }}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-colors capitalize ${
                      tab === t ? 'bg-white text-[#cd2653] shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors, contacts..."
                className="w-full rounded-lg bg-neutral-50 border border-neutral-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#cd2653] focus:bg-white" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-neutral-400 text-center">No conversations match.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filtered.map((t) => {
                  const isActive = active?.id === t.id
                  const name = nameOf(t)
                  return (
                    <button key={t.id} onClick={() => setActiveId(t.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${isActive ? 'bg-[#cd2653]/5' : 'hover:bg-neutral-50'}`}>
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-xs font-bold">
                          {initials(name)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                          {t.ticket_buyer_email && !t.vendor_application_id
                            ? <Mail className="w-2.5 h-2.5 text-blue-600" />
                            : <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
                          <span className="text-[11px] text-neutral-400 shrink-0">{timeAgo(t.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {t.contact_name && t.contact_name !== name ? t.contact_name : (t.ticket_buyer_email || 'No contact on file')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <StatusPill tone={statusTone(t.status)} label={t.status} />
                          {t.tag && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-neutral-50 text-neutral-600">{t.tag}</span>
                          )}
                          {t.unread_count > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-[#cd2653] text-white rounded-full min-w-[18px] text-center px-1.5 py-0.5">
                              {t.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
