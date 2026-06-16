'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPage } from '@/components/admin/AdminPage'
import { StatusPill } from '@/components/chrome/StatusPill'
import { Loader2, Mail, MessageCircle, Search, Clock, UserCheck, CheckCircle2, RotateCcw, PanelRightClose } from 'lucide-react'

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
function fmt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return `${d.getDate()} ${MONTH[d.getMonth()]}`
}

function fmtFull(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
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
  const [actionBusy, setActionBusy] = useState<string | null>(null)

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
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
          {(['open', 'snoozed', 'resolved', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setActiveId(null) }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                tab === t ? 'bg-white text-[#cd2653] shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t === 'open' ? 'Open' : t === 'snoozed' ? 'Snoozed' : t === 'resolved' ? 'Resolved' : 'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors, contacts..."
            className="w-full rounded-lg bg-white border border-neutral-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#cd2653]"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] flex-1 min-h-0 border border-neutral-200 rounded-lg overflow-hidden bg-white">
        {/* Ticket list */}
        <div className="border-r border-neutral-200 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-neutral-400 text-center">No tickets match.</p>
            ) : (
              filtered.map((t) => {
                const isActive = active?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left p-3.5 hover:bg-neutral-50 transition-colors ${isActive ? 'bg-[#cd2653]/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {t.business_name || t.ticket_buyer_email || 'Unknown'}
                      </p>
                      <span className="text-[11px] text-neutral-400 shrink-0">{fmt(t.last_message_at)}</span>
                    </div>
                    {t.contact_name && (
                      <p className="text-[11px] text-neutral-500 truncate">{t.contact_name}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <StatusPill tone={statusTone(t.status)} label={t.status} />
                      {t.tag && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-neutral-50 text-neutral-600">
                          {t.tag}
                        </span>
                      )}
                      {t.unread_count > 0 && (
                        <span className="ml-auto text-[10px] font-bold bg-[#cd2653] text-white rounded-full px-1.5 py-0.5">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Thread view */}
        <div className="flex flex-col min-h-0 h-full">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
              Select a ticket on the left.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-neutral-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-neutral-900 truncate">
                      {active.business_name || active.ticket_buyer_email || 'Unknown'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-neutral-600">
                      {active.contact_name && <span>{active.contact_name}</span>}
                      {active.ticket_buyer_email && <span>{active.ticket_buyer_email}</span>}
                      <StatusPill tone={statusTone(active.status)} label={active.status} />
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-1.5 min-h-[40px] flex-wrap">
                  {active.status !== 'resolved' ? (
                    <button
                      onClick={() => act('status', 'resolved')}
                      className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => act('status', 'open')}
                      className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Reopen
                    </button>
                  )}

                  <button
                    onClick={() => act('status', 'snoozed')}
                    className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" /> Snooze
                  </button>

                  <select
                    value={active.assigned_to || ''}
                    onChange={(e) => act('assign', e.target.value || '')}
                    className="h-7 text-[11px] rounded-md border border-neutral-200 bg-white px-2 outline-none focus:border-[#cd2653]"
                  >
                    <option value="">Unassigned</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.email}{op.id === currentUserId ? ' (me)' : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => act('assign', currentUserId)}
                    className="h-7 text-[11px] font-medium px-2.5 rounded-md border border-neutral-200 bg-white hover:border-[#cd2653]/40 flex items-center gap-1"
                  >
                    <UserCheck className="w-3 h-3" /> Assign me
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-neutral-50/30 min-h-0">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic">No messages recorded for this ticket.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        m.direction === 'out'
                          ? 'bg-[#cd2653] text-white'
                          : 'bg-white text-neutral-900 border border-neutral-200'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {m.channel === 'whatsapp' ? (
                            <MessageCircle className={`w-3 h-3 ${m.direction === 'out' ? 'text-white/70' : 'text-emerald-600'}`} />
                          ) : (
                            <Mail className={`w-3 h-3 ${m.direction === 'out' ? 'text-white/70' : 'text-blue-600'}`} />
                          )}
                          <span className={`text-[10px] ${m.direction === 'out' ? 'text-white/60' : 'text-neutral-400'}`}>
                            {m.channel}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${m.direction === 'out' ? 'text-white/70' : 'text-neutral-400'}`}>
                          {m.from} · {fmtFull(m.at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminPage>
  )
}
