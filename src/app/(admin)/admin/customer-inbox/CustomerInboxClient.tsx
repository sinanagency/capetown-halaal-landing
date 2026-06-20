'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminPage } from '@/components/admin/AdminPage'
import { StatusPill } from '@/components/chrome/StatusPill'
import { Loader2, Mail, MessageCircle, Search, Send, ChevronDown } from 'lucide-react'

type Tab = 'open' | 'snoozed' | 'resolved' | 'all'
type Channel = 'all' | 'whatsapp' | 'email'

interface Contact {
  id: string
  business_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  channels: Array<'whatsapp' | 'email'>
  identity: 'vendor' | 'ticket_buyer' | 'unknown'
  last_message_at: string | null
  last_preview: string | null
  unread_count: number
  application_id: string | null
  status: string
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
  return `${d.getDate()} ${MONTH[d.getMonth()]}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 60) return 'now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const dd = Math.floor(h / 24); if (dd < 30) return `${dd}d`
  return `${Math.floor(dd / 30)}mo`
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
function statusTone(s: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  if (s === 'resolved') return 'success'
  if (s === 'snoozed') return 'warn'
  if (s === 'open') return 'info'
  return 'neutral'
}

export function CustomerInboxClient(_props: { currentUserId: string; operators: Operator[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [channel, setChannel] = useState<Channel>('all')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [counts, setCounts] = useState<{ all: number; whatsapp: number; email: number; unread: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CommItem[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [replyChannel, setReplyChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/inbox/unified?channel=${channel}`)
      const j = await res.json()
      if (res.ok) { setContacts(j.contacts || []); setCounts(j.counts || null) }
    } finally { setLoading(false) }
  }, [channel])

  useEffect(() => { load() }, [load])

  const active = useMemo(() => contacts.find((c) => c.id === activeId) || null, [contacts, activeId])

  const loadMessages = useCallback(async (c: Contact) => {
    setMsgsLoading(true)
    try {
      const params = new URLSearchParams()
      if (c.phone) params.set('phone', c.phone)
      if (c.email) params.set('email', c.email)
      const res = await fetch(`/api/admin/inbox/unified/messages?${params}`)
      const j = await res.json()
      if (res.ok) setMessages(j.messages || [])
    } finally { setMsgsLoading(false) }
  }, [])

  useEffect(() => {
    if (active) {
      loadMessages(active)
      setReplyChannel(active.phone ? 'whatsapp' : 'email')
      setSendMsg(null)
    }
  }, [active, loadMessages])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const nameOf = (c: Contact) => c.business_name || c.contact_name || c.phone || c.email || 'Unknown'

  const filtered = useMemo(() => {
    let list = contacts
    if (tab !== 'all') list = list.filter((c) => c.status === tab)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) =>
      nameOf(c).toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q),
    )
    return list
  }, [contacts, tab, search])

  const submitReply = useCallback(async () => {
    if (!active || !reply.trim()) return
    setSending(true); setSendMsg(null)
    try {
      const res = await fetch('/api/admin/inbox/unified/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: replyChannel,
          phone: replyChannel === 'whatsapp' ? active.phone : undefined,
          email: replyChannel === 'email' ? active.email : undefined,
          text: reply.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) { setSendMsg(j.message || j.error || 'Send failed.'); return }
      setReply('')
      await loadMessages(active)
    } catch { setSendMsg('Send failed.') } finally { setSending(false) }
  }, [active, reply, replyChannel, loadMessages])

  return (
    <AdminPage title="Inbox" caption="UNIFIED" subtitle="Every vendor and guest conversation across WhatsApp and email, in one place.">
      <div className="grid lg:grid-cols-[1fr_400px] grid-rows-[minmax(0,1fr)] h-[calc(100dvh-15rem)] gap-4">

        {/* LEFT: conversation */}
        <div className="flex flex-col min-h-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageCircle className="w-8 h-8 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">Select a conversation from the list.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center text-sm font-bold shrink-0">
                    {initials(nameOf(active))}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-neutral-900 leading-tight truncate">{nameOf(active)}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-neutral-500">
                      {active.phone && <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3 text-emerald-600" />{active.phone}</span>}
                      {active.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3 text-blue-600" />{active.email}</span>}
                      <StatusPill tone={statusTone(active.status)} label={active.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-neutral-50/40 min-h-0">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic text-center py-8">No messages yet.</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.direction === 'out' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-400">
                      {m.channel === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-emerald-600" /> : <Mail className="w-3 h-3 text-blue-600" />}
                      <span>{m.from}</span><span>·</span><span>{fmtFull(m.at)}</span>
                    </div>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.direction === 'out' ? 'bg-[#cd2653] text-white rounded-tr-sm' : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div className="px-4 py-3 border-t border-neutral-100 bg-white">
                {sendMsg && <div className="mb-2 text-[11px] text-[#cd2653]">{sendMsg}</div>}
                <div className="flex items-end gap-2">
                  {active.phone && active.email && (
                    <select value={replyChannel} onChange={(e) => setReplyChannel(e.target.value as 'whatsapp' | 'email')}
                      className="h-9 text-xs rounded-lg border border-neutral-200 bg-white px-2 outline-none">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                  )}
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={1}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() } }}
                    placeholder={`Reply via ${replyChannel}…`}
                    className="flex-1 resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653] max-h-32" />
                  <button onClick={submitReply} disabled={sending || !reply.trim()}
                    className="h-9 px-3 rounded-lg bg-[#cd2653] text-white hover:bg-[#b31f47] disabled:opacity-50 flex items-center gap-1.5 text-sm">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: list */}
        <div className="flex flex-col min-h-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-serif text-neutral-900">All messages</h2>
              <div className="relative">
                <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}
                  className="appearance-none text-xs font-semibold text-[#cd2653] bg-transparent pr-5 outline-none cursor-pointer">
                  <option value="all">All Platforms{counts ? ` (${counts.all})` : ''}</option>
                  <option value="whatsapp">WhatsApp{counts ? ` (${counts.whatsapp})` : ''}</option>
                  <option value="email">Email{counts ? ` (${counts.email})` : ''}</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#cd2653] absolute right-0 top-0.5 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-0.5 rounded-lg bg-neutral-100 p-0.5">
              {(['all', 'open', 'snoozed', 'resolved'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 text-[11px] font-semibold px-2 py-1 rounded-md capitalize ${tab === t ? 'bg-white text-[#cd2653] shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>{t}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email…"
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
                {filtered.map((c) => {
                  const isActive = active?.id === c.id
                  const name = nameOf(c)
                  return (
                    <button key={c.id} onClick={() => setActiveId(c.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 ${isActive ? 'bg-[#cd2653]/5' : 'hover:bg-neutral-50'}`}>
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-xs font-bold">{initials(name)}</div>
                        <span className="absolute -bottom-0.5 -right-0.5 flex gap-0.5">
                          {c.channels.includes('whatsapp') && <MessageCircle className="w-3 h-3 text-emerald-600 bg-white rounded-full" />}
                          {c.channels.includes('email') && <Mail className="w-3 h-3 text-blue-600 bg-white rounded-full" />}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{name}</p>
                          <span className="text-[11px] text-neutral-400 shrink-0">{timeAgo(c.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{c.last_preview || c.email || c.phone || ''}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <StatusPill tone={statusTone(c.status)} label={c.status} />
                          {c.identity !== 'unknown' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-neutral-50 text-neutral-600">{c.identity === 'vendor' ? 'vendor' : 'ticket'}</span>}
                          {c.unread_count > 0 && <span className="ml-auto text-[10px] font-bold bg-[#cd2653] text-white rounded-full min-w-[18px] text-center px-1.5 py-0.5">{c.unread_count}</span>}
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
