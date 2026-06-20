'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminPage } from '@/components/admin/AdminPage'
import {
  Loader2, Mail, MessageCircle, Search, Send, ChevronDown, Star, MailOpen,
  MoreHorizontal, Check, Clock, RotateCcw, UserPlus, Sparkles, Wand2, MessageSquarePlus,
  FileText, Paperclip, ListChecks, X, ExternalLink, Bot, UserCheck, Tag as TagIcon, StickyNote,
  IdCard, CreditCard, MapPin, FileCheck,
} from 'lucide-react'

type Tab = 'all' | 'mine' | 'open' | 'snoozed' | 'resolved' | 'unread'
type Channel = 'all' | 'whatsapp' | 'email'
const INBOX_TAGS = ['payment', 'load-in', 'badges', 'contract', 'refund', 'general'] as const
type InboxTag = (typeof INBOX_TAGS)[number]

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
  last_direction: 'in' | 'out' | null
  unread: boolean
  starred: boolean
  tag: string | null
  assignee_id: string | null
  application_id: string | null
  status: string
  bot_paused: boolean
}

interface CommItem {
  id: string
  channel: 'whatsapp' | 'email'
  direction: 'in' | 'out'
  bot?: boolean
  body: string
  at: string
  from: string
  subject?: string
}

interface Operator { id: string; email: string }

type AiAction = 'smart_reply' | 'tone_adjust' | 'follow_up' | 'summarize' | 'attachments' | 'status_update'
const AI_CARDS: Array<{ action: AiAction; label: string; short: string; icon: typeof Sparkles }> = [
  { action: 'smart_reply', label: 'Smart Reply', short: 'Reply', icon: MessageSquarePlus },
  { action: 'tone_adjust', label: 'Tone Adjustment', short: 'Tone', icon: Wand2 },
  { action: 'follow_up', label: 'Follow-Up Suggestions', short: 'Follow-up', icon: Sparkles },
  { action: 'summarize', label: 'Message Summarization', short: 'Summary', icon: FileText },
  { action: 'attachments', label: 'Suggested Attachments', short: 'Links', icon: Paperclip },
  { action: 'status_update', label: 'Automated Status Updates', short: 'Status', icon: ListChecks },
]

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`
}
function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return ''
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
function statusChip(s: string): { label: string; cls: string } {
  if (s === 'resolved') return { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (s === 'snoozed') return { label: 'Snoozed', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Open', cls: 'bg-sky-50 text-sky-700 border-sky-200' }
}
function tagCls(t: string): string {
  switch (t) {
    case 'payment': return 'bg-green-50 text-green-700 border-green-200'
    case 'load-in': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'badges': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'contract': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'refund': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-neutral-100 text-neutral-600 border-neutral-200'
  }
}

interface CannedReply { slug: string; label: string; subject: string | null; body: string }
interface Note { at: string; by: string; text: string }
interface VendorContext {
  status: string; tier: string | null; sector: string | null
  payment: { status: string; amount: number | null; paid_at: string | null }
  stall: string | null; docs_complete: boolean; contract_signed: boolean
}

export function CustomerInboxClient({ currentUserId, operators }: { currentUserId: string; operators: Operator[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [sortWaiting, setSortWaiting] = useState(false)
  const [tagFilter, setTagFilter] = useState<InboxTag | null>(null)
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
  const [aiBusy, setAiBusy] = useState<AiAction | null>(null)
  const [aiResult, setAiResult] = useState<{ title: string; text: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [windowClosed, setWindowClosed] = useState(false)
  const [handoverBusy, setHandoverBusy] = useState(false)
  const [canned, setCanned] = useState<CannedReply[]>([])
  const [cannedOpen, setCannedOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteText, setNoteText] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [attachment, setAttachment] = useState<{ filename: string; contentType: string; dataBase64: string } | null>(null)
  const [ctx, setCtx] = useState<VendorContext | null>(null)
  const [ctxOpen, setCtxOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const prevSearch = useRef('')
  const autoOpened = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/inbox/unified?channel=${channel}`)
      const j = await res.json()
      if (res.ok) { setContacts(j.contacts || []); setCounts(j.counts || null) }
    } finally { setLoading(false) }
  }, [channel])

  useEffect(() => { load() }, [load])

  // Server-side search: when there's a query, fetch the whole base (matched
  // vendors beyond the recency cap); when cleared, restore the recency list.
  useEffect(() => {
    const term = search.trim()
    if (!term) { if (prevSearch.current) load(); prevSearch.current = ''; return }
    prevSearch.current = term
    const t = setTimeout(() => {
      fetch(`/api/admin/inbox/unified?channel=${channel}&q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j) { setContacts(j.contacts || []); setCounts(j.counts || null) } })
        .catch(() => { /* keep last */ })
    }, 350)
    return () => clearTimeout(t)
  }, [search, channel, load])

  // Canned replies (reused from the support inbox) — load once.
  useEffect(() => {
    fetch('/api/admin/support-inbox/canned')
      .then((r) => (r.ok ? r.json() : { replies: [] }))
      .then((j) => setCanned(j.replies || []))
      .catch(() => { /* optional */ })
  }, [])

  // Silent refreshers for polling (no spinners, no state resets).
  const loadSilent = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/inbox/unified?channel=${channel}`)
      const j = await res.json()
      if (res.ok) { setContacts(j.contacts || []); setCounts(j.counts || null) }
    } catch { /* keep last good */ }
  }, [channel])

  const refreshMessages = useCallback(async (c: Contact) => {
    try {
      const params = new URLSearchParams()
      if (c.phone) params.set('phone', c.phone)
      if (c.email) params.set('email', c.email)
      const res = await fetch(`/api/admin/inbox/unified/messages?${params}`)
      const j = await res.json()
      if (res.ok) setMessages((prev) => {
        const next: CommItem[] = j.messages || []
        return next.length !== prev.length ? next : prev
      })
    } catch { /* keep last good */ }
  }, [])

  // Refs so the poll interval reads current state without resetting itself.
  const activeIdRef = useRef<string | null>(null); activeIdRef.current = activeId
  const contactsRef = useRef<Contact[]>([]); contactsRef.current = contacts

  // Live refresh: pull the list + open thread every 15s when the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      loadSilent()
      const c = contactsRef.current.find((x) => x.id === activeIdRef.current)
      if (c) refreshMessages(c)
    }, 15000)
    return () => clearInterval(id)
  }, [loadSilent, refreshMessages])

  const active = useMemo(() => contacts.find((c) => c.id === activeId) || null, [contacts, activeId])
  const nameOf = (c: Contact) => c.business_name || c.contact_name || c.phone || c.email || 'Unknown'

  const filtered = useMemo(() => {
    let list = contacts
    if (tab === 'unread') list = list.filter((c) => c.unread)
    else if (tab === 'mine') list = list.filter((c) => c.assignee_id === currentUserId)
    else if (tab !== 'all') list = list.filter((c) => c.status === tab)
    if (tagFilter) list = list.filter((c) => c.tag === tagFilter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) =>
      nameOf(c).toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q))
    if (sortWaiting) {
      // Longest-waiting first: conversations awaiting our reply (unread), oldest
      // at the top; everything else falls below in recency order.
      const waitKey = (c: Contact) => (c.unread && c.last_message_at ? new Date(c.last_message_at).getTime() : Infinity)
      list = [...list].sort((a, b) => waitKey(a) - waitKey(b))
    }
    return list
  }, [contacts, tab, search, tagFilter, sortWaiting, currentUserId])

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

  // Mark a contact read (optimistic + persist) when its conversation opens.
  const markRead = useCallback(async (c: Contact) => {
    if (!c.unread) return
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: false } : x)))
    setCounts((p) => (p ? { ...p, unread: Math.max(0, p.unread - 1) } : p))
    try {
      await fetch('/api/admin/inbox/unified/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', applicationId: c.application_id || undefined, phone: c.phone || undefined, email: c.email || undefined }),
      })
    } catch { /* best effort */ }
  }, [])

  // Open the most recent conversation automatically so the inbox "opens well".
  useEffect(() => {
    if (!autoOpened.current && !loading && filtered.length > 0 && !activeId) {
      autoOpened.current = true
      setActiveId(filtered[0].id)
    }
  }, [loading, filtered, activeId])

  // Run ONLY when the opened conversation changes (keyed on the stable id, not
  // the derived `active` object). Keying on `active` would re-fire this on every
  // optimistic contacts update (star/resolve/snooze/mark-read), reloading the
  // thread and wiping the AI result strip mid-read. So depend on activeId alone.
  useEffect(() => {
    const c = contacts.find((x) => x.id === activeId)
    if (!c) return
    loadMessages(c)
    setReplyChannel(c.phone ? 'whatsapp' : 'email')
    setSendMsg(null); setAiResult(null); setMenuOpen(false); setAssignOpen(false); setWindowClosed(false)
    setCannedOpen(false); setTagOpen(false); setNotesOpen(false); setNoteText(''); setNotes([])
    setAttachment(null); setCtx(null); setCtxOpen(false)
    if (c.application_id) {
      fetch(`/api/admin/inbox/unified/notes?applicationId=${c.application_id}`)
        .then((r) => (r.ok ? r.json() : { notes: [] }))
        .then((j) => setNotes(j.notes || []))
        .catch(() => { /* optional */ })
      fetch(`/api/admin/inbox/unified/context?applicationId=${c.application_id}`)
        .then((r) => (r.ok ? r.json() : { context: null }))
        .then((j) => setCtx(j.context || null))
        .catch(() => { /* optional */ })
    }
    markRead(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Auto-grow the composer with its content, up to ~8 lines, so a multi-line
  // reply is fully visible without scrolling inside a tiny box.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 192)}px`
  }, [reply, activeId])

  const onPickFile = useCallback((file: File | null) => {
    if (!file) return
    if (file.size > 4_500_000) { setSendMsg('File too large (max ~4.5MB).'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result || '')
      const base64 = res.includes(',') ? res.split(',')[1] : res
      setAttachment({ filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64: base64 })
    }
    reader.readAsDataURL(file)
  }, [])

  const submitReply = useCallback(async () => {
    if (!active || (!reply.trim() && !attachment)) return
    setSending(true); setSendMsg(null)
    try {
      const res = await fetch('/api/admin/inbox/unified/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: replyChannel,
          phone: replyChannel === 'whatsapp' ? active.phone : undefined,
          email: replyChannel === 'email' ? active.email : undefined,
          text: reply.trim() || undefined,
          attachment: attachment || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) {
        setSendMsg(j.message || j.error || 'Send failed.')
        if (j.windowClosed) setWindowClosed(true)
        return
      }
      setReply(''); setAttachment(null); setWindowClosed(false); await loadMessages(active)
    } catch { setSendMsg('Send failed.') } finally { setSending(false) }
  }, [active, reply, replyChannel, attachment, loadMessages])

  // Outside the 24h window: send the same text as an approved announcement template.
  const sendAsTemplate = useCallback(async () => {
    if (!active?.phone || !reply.trim()) return
    setSending(true); setSendMsg(null)
    try {
      const res = await fetch('/api/admin/inbox/unified/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'whatsapp', mode: 'template', phone: active.phone, text: reply.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) { setSendMsg(j.message || j.error || 'Template send failed.'); return }
      setReply(''); setWindowClosed(false); await loadMessages(active)
    } catch { setSendMsg('Template send failed.') } finally { setSending(false) }
  }, [active, reply, loadMessages])

  // Take the conversation off the auto-bot (human handling) or hand it back.
  const toggleHandover = useCallback(async () => {
    if (!active?.phone || handoverBusy) return
    const taking = !active.bot_paused
    setHandoverBusy(true)
    setContacts((prev) => prev.map((c) => (c.id === active.id ? { ...c, bot_paused: taking } : c)))
    try {
      await fetch('/api/admin/inbox/unified/handover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: active.phone, action: taking ? 'take_over' : 'hand_back' }),
      })
    } catch { /* optimistic */ } finally { setHandoverBusy(false) }
  }, [active, handoverBusy])

  const runAI = useCallback(async (action: AiAction) => {
    if (!active || aiBusy) return
    setAiBusy(action); setAiResult(null); setSendMsg(null)
    try {
      const res = await fetch('/api/admin/inbox/unified/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, phone: active.phone || undefined, email: active.email || undefined, draft: reply.trim() || undefined }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j.ok === false) { setSendMsg(j.message || j.error || 'AI could not run.'); return }
      if (j.fillsComposer) setReply(j.text)
      else setAiResult({ title: AI_CARDS.find((c) => c.action === action)?.label || 'AI', text: j.text })
    } catch { setSendMsg('AI could not run.') } finally { setAiBusy(null) }
  }, [active, aiBusy, reply])

  const doStatus = useCallback(async (
    action: 'resolve' | 'snooze' | 'reopen' | 'star' | 'unstar' | 'unread' | 'assign' | 'tag' | 'untag',
    extra?: { assigneeId?: string | null; tag?: InboxTag },
  ) => {
    if (!active) return
    setMenuOpen(false); setAssignOpen(false); setTagOpen(false)
    setContacts((prev) => prev.map((c) => {
      if (c.id !== active.id) return c
      if (action === 'resolve') return { ...c, status: 'resolved' }
      if (action === 'snooze') return { ...c, status: 'snoozed' }
      if (action === 'reopen') return { ...c, status: 'open' }
      if (action === 'star') return { ...c, starred: true }
      if (action === 'unstar') return { ...c, starred: false }
      if (action === 'unread') return { ...c, unread: true }
      if (action === 'assign') return { ...c, assignee_id: extra?.assigneeId ?? null }
      if (action === 'tag') return { ...c, tag: extra?.tag ?? null }
      if (action === 'untag') return { ...c, tag: null }
      return c
    }))
    try {
      await fetch('/api/admin/inbox/unified/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, applicationId: active.application_id || undefined, phone: active.phone || undefined, email: active.email || undefined, assigneeId: extra?.assigneeId, tag: extra?.tag }),
      })
    } catch { /* optimistic */ }
  }, [active])

  const addNote = useCallback(async () => {
    if (!active?.application_id || !noteText.trim()) return
    const text = noteText.trim()
    setNoteText('')
    try {
      const res = await fetch('/api/admin/inbox/unified/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: active.application_id, text }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.notes) setNotes(j.notes)
    } catch { /* keep draft cleared, refetch on reopen */ }
  }, [active, noteText])

  // Group messages by day for date separators.
  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: CommItem[] }> = []
    for (const m of messages) {
      const day = fmtDay(m.at)
      const last = out[out.length - 1]
      if (last && last.day === day) last.items.push(m)
      else out.push({ day, items: [m] })
    }
    return out
  }, [messages])

  const assigneeEmail = (id: string | null) => operators.find((o) => o.id === id)?.email || null

  return (
    <AdminPage fill title="Inbox" caption="UNIFIED" subtitle="Every WhatsApp, bot and email conversation in one place.">
      <div className="grid lg:grid-cols-[1fr_380px] grid-rows-[minmax(0,1fr)] h-[calc(100dvh-12rem)] lg:h-full gap-4">

        {/* LEFT: conversation */}
        <div className="flex flex-col min-h-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageCircle className="w-8 h-8 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-400">Select a conversation from the list.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center text-sm font-bold">{initials(nameOf(active))}</div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex gap-0.5">
                      {active.channels.includes('whatsapp') && <MessageCircle className="w-3.5 h-3.5 text-emerald-600 bg-white rounded-full" />}
                      {active.channels.includes('email') && <Mail className="w-3.5 h-3.5 text-blue-600 bg-white rounded-full" />}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-neutral-900 leading-tight truncate">{nameOf(active)}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-neutral-500">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${statusChip(active.status).cls}`}>{statusChip(active.status).label}</span>
                      {active.identity !== 'unknown' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-neutral-50 text-neutral-600">{active.identity === 'vendor' ? 'Vendor' : 'Ticket buyer'}</span>}
                      {active.tag && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${tagCls(active.tag)}`}>{active.tag}</span>}
                      {active.phone && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${active.bot_paused ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}>
                          {active.bot_paused ? <><UserCheck className="w-3 h-3" />Human handling</> : <><Bot className="w-3 h-3" />Bot active</>}
                        </span>
                      )}
                      {active.phone && <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3 text-emerald-600" />{active.phone}</span>}
                      {active.email && <span className="inline-flex items-center gap-1 truncate max-w-[180px]"><Mail className="w-3 h-3 text-blue-600" />{active.email}</span>}
                      {active.assignee_id && <span className="text-[10px] text-neutral-500">· {assigneeEmail(active.assignee_id)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {active.phone && (
                    <button onClick={toggleHandover} disabled={handoverBusy}
                      title={active.bot_paused ? 'Hand back to bot' : 'Take over from bot'}
                      className="h-8 px-2 rounded-lg border border-neutral-200 hover:bg-neutral-100 flex items-center gap-1 text-[11px] font-semibold text-neutral-600 disabled:opacity-50">
                      {handoverBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active.bot_paused ? <Bot className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      {active.bot_paused ? 'Hand back' : 'Take over'}
                    </button>
                  )}
                  <button title={active.starred ? 'Unstar' : 'Star'} onClick={() => doStatus(active.starred ? 'unstar' : 'star')}
                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center">
                    <Star className={`w-4 h-4 ${active.starred ? 'fill-amber-400 text-amber-400' : 'text-neutral-400'}`} />
                  </button>
                  <button title="Mark unread" onClick={() => doStatus('unread')} className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center">
                    <MailOpen className="w-4 h-4 text-neutral-400" />
                  </button>
                  <div className="relative">
                    <button title="More" onClick={() => setMenuOpen((v) => !v)} className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center">
                      <MoreHorizontal className="w-4 h-4 text-neutral-500" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-9 z-20 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 text-sm">
                        {active.status !== 'resolved'
                          ? <button onClick={() => doStatus('resolve')} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" />Resolve</button>
                          : <button onClick={() => doStatus('reopen')} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-sky-600" />Reopen</button>}
                        {active.status !== 'snoozed'
                          ? <button onClick={() => doStatus('snooze')} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" />Snooze</button>
                          : <button onClick={() => doStatus('reopen')} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-sky-600" />Reopen</button>}
                        <div className="relative">
                          <button onClick={() => setAssignOpen((v) => !v)} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><UserPlus className="w-4 h-4 text-neutral-500" />Assign…</button>
                          {assignOpen && (
                            <div className="absolute right-full top-0 mr-1 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto">
                              <button onClick={() => doStatus('assign', { assigneeId: null })} className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-xs text-neutral-500">Unassigned</button>
                              {operators.map((o) => (
                                <button key={o.id} onClick={() => doStatus('assign', { assigneeId: o.id })} className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-xs truncate">{o.email}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <button onClick={() => setTagOpen((v) => !v)} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><TagIcon className="w-4 h-4 text-neutral-500" />Tag…</button>
                          {tagOpen && (
                            <div className="absolute right-full top-0 mr-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg py-1">
                              {active.tag && <button onClick={() => doStatus('untag')} className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-xs text-neutral-500">Clear tag</button>}
                              {INBOX_TAGS.map((t) => (
                                <button key={t} onClick={() => doStatus('tag', { tag: t })} className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-xs capitalize flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${tagCls(t).split(' ')[0]}`} />{t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {active.application_id && (
                          <button onClick={() => { setCtxOpen((v) => !v); setMenuOpen(false) }} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><IdCard className="w-4 h-4 text-neutral-500" />{ctxOpen ? 'Hide vendor context' : 'Vendor context'}</button>
                        )}
                        <button onClick={() => { setNotesOpen((v) => !v); setMenuOpen(false) }} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"><FileText className="w-4 h-4 text-neutral-500" />{notesOpen ? 'Hide notes' : 'Internal notes'}{notes.length ? ` (${notes.length})` : ''}</button>
                        {active.application_id && (
                          <a href={`/admin/applications?focus=${active.application_id}`} className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 text-neutral-600"><ExternalLink className="w-4 h-4" />Open application</a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vendor context (at-a-glance facts) */}
              {ctxOpen && active.application_id && (
                <div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-3">
                  {!ctx ? (
                    <p className="text-xs text-neutral-400">Loading context…</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${statusChip(ctx.status === 'approved' ? 'open' : ctx.status).cls}`}>Status: {ctx.status}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${ctx.payment.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                        <CreditCard className="w-3 h-3" />{ctx.payment.status}{ctx.payment.amount ? ` · R${ctx.payment.amount.toLocaleString()}` : ''}
                      </span>
                      {ctx.tier && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-white text-neutral-600 border-neutral-200">{ctx.tier}</span>}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-white text-neutral-600 border-neutral-200"><MapPin className="w-3 h-3" />{ctx.stall ? `Stall ${ctx.stall}` : 'No stall yet'}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${ctx.docs_complete ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}><FileCheck className="w-3 h-3" />Docs {ctx.docs_complete ? 'complete' : 'pending'}</span>
                      {ctx.contract_signed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">Contract signed</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Internal notes (private to the team) */}
              {notesOpen && (
                <div className="border-b border-neutral-100 bg-amber-50/40 px-5 py-3 max-h-44 overflow-y-auto">
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-700"><StickyNote className="w-3.5 h-3.5" />Internal notes</div>
                  {!active.application_id ? (
                    <p className="text-xs text-neutral-400">Internal notes are available for vendor contacts.</p>
                  ) : (
                    <>
                      <div className="space-y-1 mb-2">
                        {notes.length === 0
                          ? <p className="text-xs text-neutral-400">No notes yet.</p>
                          : notes.map((n, i) => (
                            <div key={i} className="text-xs text-neutral-700 leading-relaxed">
                              <span className="text-neutral-400">{n.by.split('@')[0]} · {timeAgo(n.at)}</span> {n.text}
                            </div>
                          ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }}
                          placeholder="Add a private note…"
                          className="flex-1 text-xs rounded-lg border border-neutral-200 px-2 py-1.5 outline-none focus:border-amber-500" />
                        <button onClick={addNote} disabled={!noteText.trim()} className="text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-2.5 disabled:opacity-50">Add</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-neutral-50/40 min-h-0">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic text-center py-8">No messages yet.</p>
                ) : grouped.map((g) => (
                  <div key={g.day} className="space-y-4">
                    <div className="flex items-center justify-center"><span className="text-[10px] font-semibold text-neutral-400 bg-white border border-neutral-200 rounded-full px-2.5 py-0.5">{g.day}</span></div>
                    {g.items.map((m) => (
                      <div key={m.id} className={`flex flex-col ${m.direction === 'out' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-400">
                          {m.channel === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-emerald-600" /> : <Mail className="w-3 h-3 text-blue-600" />}
                          {m.bot && <Bot className="w-3 h-3 text-neutral-400" />}
                          <span>{m.from}</span><span>·</span><span>{fmtTime(m.at)}</span>
                        </div>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.direction === 'out' ? 'bg-[#cd2653] text-white rounded-tr-sm' : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-sm'}`}>
                          {m.subject && m.channel === 'email' && <p className="text-[11px] font-semibold opacity-70 mb-1">{m.subject}</p>}
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* AI result strip */}
              {aiResult && (
                <div className="mx-4 mb-2 rounded-xl border border-[#cd2653]/20 bg-[#cd2653]/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#cd2653] flex items-center gap-1.5 mb-1"><Sparkles className="w-3 h-3" />{aiResult.title}</p>
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{aiResult.text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setReply((r) => (r ? r + '\n' + aiResult.text : aiResult.text)); setAiResult(null) }} title="Insert into reply" className="text-[11px] font-semibold text-[#cd2653] hover:underline px-1">Use</button>
                      <button onClick={() => setAiResult(null)} className="w-6 h-6 rounded hover:bg-neutral-100 flex items-center justify-center"><X className="w-3.5 h-3.5 text-neutral-400" /></button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI assist — compact icon row so the chat keeps its height */}
              <div className="px-4 pt-2 flex items-center gap-1.5 overflow-x-auto">
                <Sparkles className="w-3.5 h-3.5 text-[#cd2653] shrink-0" />
                {AI_CARDS.map(({ action, label, short, icon: Icon }) => (
                  <button key={action} onClick={() => runAI(action)} disabled={!!aiBusy} title={label}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50/60 hover:bg-white hover:border-[#cd2653]/40 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 disabled:opacity-50 transition">
                    {aiBusy === action ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#cd2653]" /> : <Icon className="w-3.5 h-3.5 text-[#cd2653]" />}
                    {short}
                  </button>
                ))}
              </div>

              {/* Outside-24h-window template prompt */}
              {windowClosed && active.phone && (
                <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-amber-800 leading-tight">Outside the 24h WhatsApp window. Send it as an approved announcement template instead.</p>
                  <button onClick={sendAsTemplate} disabled={sending || !reply.trim()}
                    className="shrink-0 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                    Send as template
                  </button>
                </div>
              )}

              {/* Composer */}
              <div className="px-4 py-3">
                {sendMsg && <div className="mb-2 text-[11px] text-[#cd2653]">{sendMsg}</div>}
                {canned.length > 0 && (
                  <div className="relative mb-2 inline-block">
                    <button onClick={() => setCannedOpen((v) => !v)}
                      className="text-[11px] font-semibold text-neutral-500 hover:text-[#cd2653] inline-flex items-center gap-1 border border-neutral-200 rounded-lg px-2 py-1">
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Canned replies
                    </button>
                    {cannedOpen && (
                      <div className="absolute bottom-9 left-0 z-20 w-72 max-h-56 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg py-1">
                        {canned.map((c) => (
                          <button key={c.slug} onClick={() => { setReply((r) => (r ? r + '\n' + c.body : c.body)); setCannedOpen(false) }}
                            className="w-full px-3 py-2 text-left hover:bg-neutral-50">
                            <p className="text-xs font-semibold text-neutral-800">{c.label}</p>
                            <p className="text-[11px] text-neutral-400 truncate">{c.body}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {attachment && (
                  <div className="mb-2 inline-flex items-center gap-2 text-[11px] bg-neutral-100 border border-neutral-200 rounded-lg px-2 py-1">
                    <Paperclip className="w-3 h-3 text-neutral-500" />
                    <span className="max-w-[200px] truncate">{attachment.filename}</span>
                    <button onClick={() => setAttachment(null)} className="text-neutral-400 hover:text-neutral-700"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden"
                  onChange={(e) => { onPickFile(e.target.files?.[0] || null); if (fileRef.current) fileRef.current.value = '' }} />
                <div className="flex items-end gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:border-[#cd2653]">
                  {active.phone && active.email && (
                    <select value={replyChannel} onChange={(e) => setReplyChannel(e.target.value as 'whatsapp' | 'email')}
                      className="h-8 text-xs rounded-lg border border-neutral-200 bg-white px-2 outline-none self-center">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                  )}
                  <button onClick={() => fileRef.current?.click()} title="Attach a file"
                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center self-center">
                    <Paperclip className="w-4 h-4 text-neutral-400" />
                  </button>
                  <textarea ref={taRef} value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() } }}
                    placeholder={`Reply via ${replyChannel}…`}
                    className="flex-1 resize-none py-1.5 text-sm outline-none bg-transparent leading-relaxed" />
                  <button onClick={() => runAI('smart_reply')} disabled={!!aiBusy} title="Smart reply"
                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center self-center disabled:opacity-50">
                    {aiBusy === 'smart_reply' ? <Loader2 className="w-4 h-4 animate-spin text-[#cd2653]" /> : <Sparkles className="w-4 h-4 text-[#cd2653]" />}
                  </button>
                  <button onClick={submitReply} disabled={sending || (!reply.trim() && !attachment)}
                    className="w-9 h-9 rounded-lg bg-[#cd2653] text-white hover:bg-[#b31f47] disabled:opacity-50 flex items-center justify-center self-center">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 text-center mt-2">Zanii AI can make mistakes. Check important info before sending.</p>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: list */}
        <div className="flex flex-col min-h-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-serif text-neutral-900">All messages</h2>
              <div className="flex items-center gap-2">
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
            </div>
            <div className="flex gap-0.5 rounded-lg bg-neutral-100 p-0.5">
              {(['all', 'mine', 'unread', 'open', 'snoozed', 'resolved'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 text-[11px] font-semibold px-1 py-1 rounded-md capitalize ${tab === t ? 'bg-white text-[#cd2653] shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
                  {t}{t === 'unread' && counts?.unread ? ` ${counts.unread}` : ''}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email…"
                className="w-full rounded-lg bg-neutral-50 border border-neutral-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#cd2653] focus:bg-white" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setSortWaiting((v) => !v)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${sortWaiting ? 'bg-[#cd2653] text-white border-[#cd2653]' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'}`}>
                {sortWaiting ? '⏱ Longest waiting' : 'Most recent'}
              </button>
              <span className="w-px h-4 bg-neutral-200" />
              {INBOX_TAGS.map((t) => (
                <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${tagFilter === t ? tagCls(t) + ' ring-1 ring-current' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'}`}>
                  {t}
                </button>
              ))}
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
                          <p className={`text-sm truncate ${c.unread ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}>{name}</p>
                          <span className="text-[11px] text-neutral-400 shrink-0 flex items-center gap-1">
                            {c.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                            {timeAgo(c.last_message_at)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${c.unread ? 'text-neutral-700 font-medium' : 'text-neutral-500'}`}>{c.last_preview || c.email || c.phone || ''}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusChip(c.status).cls}`}>{statusChip(c.status).label}</span>
                          {c.tag && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${tagCls(c.tag)}`}>{c.tag}</span>}
                          {c.identity !== 'unknown' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-neutral-50 text-neutral-600">{c.identity === 'vendor' ? 'vendor' : 'ticket'}</span>}
                          {c.unread && <span className="ml-auto w-2 h-2 rounded-full bg-[#cd2653]" />}
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
