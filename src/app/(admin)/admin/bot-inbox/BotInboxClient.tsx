'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Loader2, MessageCircle, Crown, Star, ArrowRight, Clock, UserCheck, CheckCircle2, RotateCcw, Search, Tag, Link2 } from 'lucide-react'
import type { BotAdmin } from '@/lib/bot/admins'
import { PageShell, PageHeader, Card, Pill } from '@/components/chrome/PageChrome'

interface MsgRow {
  id: string
  wa_phone: string
  direction: 'in' | 'out'
  body: string | null
  status: string | null
  created_at: string
  provider_message_id: string | null
}

export interface AdminThread {
  admin: BotAdmin
  messages: MsgRow[]
  latestAt: string | null
  latestPreview: string
  lastInboundAt: string | null
  unreadCount: number
}

export interface GuestThread {
  phone: string
  label: string
  sublabel: string
  /** vendor | ticket_buyer | unknown — drives the small contact badge. */
  badge: 'vendor' | 'ticket_buyer' | 'unknown'
  vendorApplicationId: string | null
  ticketBuyerEmail: string | null
  messages: MsgRow[]
  handover: 'human' | 'bot'
  latestAt: string | null
  latestPreview: string
  lastInboundAt: string | null
  unreadCount: number
}

export interface MailMsgRow {
  id: string
  direction: 'in' | 'out'
  from_addr: string
  to_addr: string
  subject: string | null
  body: string | null
  created_at: string
}

export interface MailThread {
  peer: string
  subject: string
  messages: MailMsgRow[]
  latestAt: string | null
  latestPreview: string
  lastInboundAt: string | null
  unreadCount: number
}

type Selection =
  | { kind: 'admin'; idx: number }
  | { kind: 'guest'; idx: number }
  | { kind: 'mail'; idx: number }

function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function BotInboxClient({
  adminThreads,
  guestThreads,
  mailThreads = [],
}: {
  adminThreads: AdminThread[]
  guestThreads: GuestThread[]
  mailThreads?: MailThread[]
}) {
  const initialSelection: Selection | null = guestThreads.length > 0
    ? { kind: 'guest', idx: 0 }
    : mailThreads.length > 0
    ? { kind: 'mail', idx: 0 }
    : adminThreads.length > 0
    ? { kind: 'admin', idx: 0 }
    : null
  const [sel, setSel] = useState<Selection | null>(initialSelection)
  const router = useRouter()

  // Poll for new messages every 15 s. router.refresh() re-runs the page's
  // server function which re-fetches wa_messages, so we get every new inbound
  // without a hard reload. Pauses when the tab is hidden.
  useEffect(() => {
    const tick = () => { if (!document.hidden) router.refresh() }
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [router])

  const active = useMemo<{
    phone: string
    label: string
    messages: MsgRow[]
    kind: 'admin' | 'guest' | 'mail'
    handover?: 'human' | 'bot'
    subject?: string
    badge?: 'vendor' | 'ticket_buyer' | 'unknown'
    vendorApplicationId?: string | null
    ticketBuyerEmail?: string | null
  } | null>(() => {
    if (!sel) return null
    if (sel.kind === 'admin') {
      const t = adminThreads[sel.idx]; if (!t) return null
      return { phone: t.admin.phone, label: t.admin.name, messages: t.messages, kind: 'admin' }
    }
    if (sel.kind === 'mail') {
      const t = mailThreads[sel.idx]; if (!t) return null
      // Adapt MailMsgRow → MsgRow shape so ActiveThread renders without a
      // second component. wa_phone holds the email peer; direction matches.
      const messages: MsgRow[] = t.messages.map((m) => ({
        id: m.id,
        wa_phone: t.peer,
        direction: m.direction,
        body: m.body,
        status: null,
        created_at: m.created_at,
        provider_message_id: null,
      }))
      return { phone: t.peer, label: t.peer, messages, kind: 'mail', subject: t.subject }
    }
    const t = guestThreads[sel.idx]; if (!t) return null
    return {
      phone: t.phone,
      label: t.label,
      messages: t.messages,
      kind: 'guest' as const,
      handover: t.handover,
      badge: t.badge,
      vendorApplicationId: t.vendorApplicationId,
      ticketBuyerEmail: t.ticketBuyerEmail,
    }
  }, [sel, adminThreads, guestThreads, mailThreads])

  // Search across vendor/guest threads. Matches against display label, raw
  // phone, and the latest preview body.
  const [search, setSearch] = useState('')
  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return guestThreads
    return guestThreads.filter((t) =>
      t.label.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      t.latestPreview.toLowerCase().includes(q)
    )
  }, [search, guestThreads])
  const filteredMail = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mailThreads
    return mailThreads.filter((t) =>
      t.peer.toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      t.latestPreview.toLowerCase().includes(q)
    )
  }, [search, mailThreads])

  return (
    <PageShell>
      <PageHeader
        kicker="WhatsApp"
        title="Bot Inbox"
        subtitle="Every conversation with the YAH WhatsApp bot, in one place. Click a thread to read it, see the AI summary, pick a suggested reply or type your own."
      />

      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        {/* LEFT: thread list */}
        <div className="space-y-5">
          <Card padded={false}>
            <div className="p-3">
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
          </Card>

          {filteredGuests.length > 0 && (
            <Card padded={false}>
              <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#cd2653]">Vendor / guest threads</p>
                <span className="text-[11px] text-neutral-500">{filteredGuests.length}</span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[480px] overflow-y-auto">
                {filteredGuests.map((t) => {
                  const i = guestThreads.indexOf(t)
                  return (
                  <button
                    key={t.phone}
                    onClick={() => setSel({ kind: 'guest', idx: i })}
                    className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${sel?.kind === 'guest' && sel.idx === i ? 'bg-[#cd2653]/5' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{t.label}</p>
                      {t.badge === 'vendor' && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">vendor</span>}
                      {t.badge === 'ticket_buyer' && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">ticket</span>}
                      {t.badge === 'unknown' && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-50 text-neutral-500 border border-neutral-200">unknown</span>}
                      {t.handover === 'human' && <Pill tone="brand">human</Pill>}
                      {t.unreadCount > 0 && <span className="text-[10px] font-bold bg-[#cd2653] text-white rounded-full px-1.5 py-0.5">{t.unreadCount}</span>}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate font-mono">{t.phone}</p>
                    <p className="text-xs text-neutral-600 truncate mt-1">{t.latestPreview}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{fmt(t.latestAt)}</p>
                  </button>
                )})}
              </div>
            </Card>
          )}

          {filteredMail.length > 0 && (
            <Card padded={false}>
              <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1B6E8E]">Mail threads</p>
                <span className="text-[11px] text-neutral-500">{filteredMail.length}</span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[360px] overflow-y-auto">
                {filteredMail.map((t) => {
                  const i = mailThreads.indexOf(t)
                  return (
                  <button
                    key={t.peer}
                    onClick={() => setSel({ kind: 'mail', idx: i })}
                    className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${sel?.kind === 'mail' && sel.idx === i ? 'bg-[#1B6E8E]/5' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{t.peer}</p>
                      {t.unreadCount > 0 && <span className="text-[10px] font-bold bg-[#1B6E8E] text-white rounded-full px-1.5 py-0.5">{t.unreadCount}</span>}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate italic">{t.subject}</p>
                    <p className="text-xs text-neutral-600 truncate mt-1">{t.latestPreview}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{fmt(t.latestAt)}</p>
                  </button>
                )})}
              </div>
            </Card>
          )}

          {adminThreads.length > 0 && (
            <Card padded={false}>
              <div className="px-4 py-3 border-b border-neutral-200">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-600">Admin threads</p>
              </div>
              <div className="divide-y divide-neutral-100">
                {adminThreads.map((t, i) => (
                  <button
                    key={t.admin.phone}
                    onClick={() => setSel({ kind: 'admin', idx: i })}
                    className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${sel?.kind === 'admin' && sel.idx === i ? 'bg-[#cd2653]/5' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {t.admin.role === 'master' ? <Crown className="w-3.5 h-3.5 text-[#cd2653]" /> : <Star className="w-3.5 h-3.5 text-[#cd2653]" />}
                      <p className="text-sm font-semibold text-neutral-900">{t.admin.name}</p>
                      {t.unreadCount > 0 && <span className="ml-auto text-[10px] font-bold bg-[#cd2653] text-white rounded-full px-1.5 py-0.5">{t.unreadCount}</span>}
                    </div>
                    <p className="text-xs text-neutral-600 truncate mt-1">{t.latestPreview}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{fmt(t.latestAt)}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {guestThreads.length === 0 && adminThreads.length === 0 && mailThreads.length === 0 && (
            <Card>
              <div className="flex items-center gap-3 text-neutral-500 text-sm">
                <MessageCircle className="w-5 h-5" />
                No conversations yet.
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: active thread */}
        <div>
          {active ? (
            <ActiveThread key={active.phone} active={active} />
          ) : (
            <Card>
              <p className="text-sm text-neutral-500">Pick a thread on the left.</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  )
}

// -------------------- ActiveThread (right pane) --------------------

interface ActiveThreadProps {
  active: {
    phone: string
    label: string
    messages: MsgRow[]
    kind: 'admin' | 'guest' | 'mail'
    handover?: 'human' | 'bot'
    subject?: string
    badge?: 'vendor' | 'ticket_buyer' | 'unknown'
    vendorApplicationId?: string | null
    ticketBuyerEmail?: string | null
  }
}

function ActiveThread({ active }: ActiveThreadProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [summary, setSummary] = useState<{ summary: string; context: string; suggestions: string[] } | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const sorted = useMemo(() => [...active.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)), [active.messages])

  async function doSend() {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/bot-inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: active.phone, body: text }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'send failed')
      setText('')
      // hard reload to pick up the new outbound row
      window.location.reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'send failed')
    } finally {
      setSending(false)
    }
  }

  async function fetchSummary() {
    setSummarizing(true)
    try {
      const res = await fetch('/api/admin/bot-inbox/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: active.phone }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'summary failed')
      setSummary({ summary: j.summary || '', context: j.context || '', suggestions: j.suggestions || [] })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'summary failed')
    } finally {
      setSummarizing(false)
    }
  }

  useEffect(() => {
    setSummary(null)
    if (active.kind === 'guest' && sorted.length > 0) {
      // auto-summarize on thread switch (one shot, cheap)
      fetchSummary()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.phone])

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Thread</p>
            <p className="font-serif text-2xl text-neutral-900">{active.label}</p>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">{active.phone}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {active.kind === 'guest' && active.badge === 'vendor' && (
              <Pill tone="brand">vendor</Pill>
            )}
            {active.kind === 'guest' && active.badge === 'ticket_buyer' && (
              <Pill tone="neutral">ticket buyer</Pill>
            )}
            {active.kind === 'guest' && active.badge === 'unknown' && (
              <Pill tone="neutral">unknown</Pill>
            )}
            {active.kind === 'guest' && active.handover === 'human' && <Pill tone="brand">human handling</Pill>}
            {active.kind === 'guest' && active.handover === 'bot' && <Pill tone="neutral">auto-bot</Pill>}
            {active.kind === 'admin' && <Pill tone="neutral">admin</Pill>}
          </div>
        </div>
        <ThreadActions
          threadKey={active.phone}
          channel="wa"
          vendorApplicationId={active.vendorApplicationId ?? null}
          ticketBuyerEmail={active.ticketBuyerEmail ?? null}
        />
      </Card>

      {/* AI summary + suggestions (guest threads only) */}
      {active.kind === 'guest' && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#cd2653]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#cd2653]">AI summary &amp; suggested replies</p>
            <button
              onClick={fetchSummary}
              disabled={summarizing}
              className="ml-auto text-[11px] font-semibold text-[#cd2653] hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {summarizing ? 'Thinking…' : 'Refresh'}
            </button>
          </div>
          {summary ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-900 font-medium">{summary.summary || 'No summary.'}</p>
              {summary.context && <p className="text-xs text-neutral-600">{summary.context}</p>}
              {summary.suggestions.length > 0 && (
                <div className="space-y-2">
                  {summary.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setText(s)}
                      className="w-full text-left bg-neutral-50 hover:bg-[#cd2653]/5 border border-neutral-200 hover:border-[#cd2653]/40 rounded-lg px-3 py-2 text-sm text-neutral-700 transition-colors flex items-start gap-2 group"
                    >
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-neutral-400 group-hover:text-[#cd2653]" />
                      <span className="flex-1">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">{summarizing ? 'Thinking…' : 'No summary yet.'}</p>
          )}
        </Card>
      )}

      {/* Conversation */}
      <Card padded={false}>
        <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2">
          {sorted.length === 0 && <p className="text-sm text-neutral-500 italic">No messages.</p>}
          {sorted.map((m) => (
            <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${m.direction === 'out' ? 'bg-[#cd2653] text-white' : 'bg-neutral-100 text-neutral-900'}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.direction === 'out' ? 'text-white/60' : 'text-neutral-400'}`}>{fmt(m.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-200 p-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() } }}
            placeholder="Type your reply…"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]"
          />
          <button
            onClick={doSend}
            disabled={sending || !text.trim()}
            className="bg-[#cd2653] hover:bg-[#bf3026] text-white rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </Card>
    </div>
  )
}

// Multi-tool thread actions per Taona Message 12. Wire-up to wa_threads via
// /api/admin/bot-inbox/thread/action. Each button posts an action and
// re-fetches the row to keep the status pill honest. Kept inline because the
// state is per-thread and the parent already owns the active thread.
type WaTag = 'payment' | 'load-in' | 'badges' | 'contract' | 'refund' | 'general'
const WA_TAG_LIST: WaTag[] = ['payment', 'load-in', 'badges', 'contract', 'refund', 'general']

function ThreadActions({
  threadKey,
  channel,
  vendorApplicationId,
  ticketBuyerEmail,
}: {
  threadKey: string
  channel: 'wa' | 'mail'
  vendorApplicationId: string | null
  ticketBuyerEmail: string | null
}) {
  const [status, setStatus] = useState<'open' | 'snoozed' | 'done' | null>(null)
  const [snoozedUntil, setSnoozedUntil] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [assignee, setAssignee] = useState<string | null>(null)
  const [tag, setTag] = useState<WaTag | null>(null)
  const [linkedVendor, setLinkedVendor] = useState<string | null>(vendorApplicationId)
  const [linkedTicket, setLinkedTicket] = useState<string | null>(ticketBuyerEmail)
  const [linkPicker, setLinkPicker] = useState<'vendor' | 'ticket' | null>(null)
  const [linkQuery, setLinkQuery] = useState('')
  const [linkHits, setLinkHits] = useState<Array<{ id?: string; email?: string; business_name?: string | null; contact_name?: string | null; name?: string | null }>>([])

  async function refresh() {
    try {
      const res = await fetch(`/api/admin/bot-inbox/thread/action?channel=${channel}&threadKey=${encodeURIComponent(threadKey)}`)
      const j = await res.json()
      const t = j?.thread
      setStatus((t?.status as 'open' | 'snoozed' | 'done') ?? 'open')
      setSnoozedUntil(t?.snoozed_until ?? null)
      setAssignee(t?.assignee_id ?? null)
      setTag((t?.tag as WaTag) ?? null)
      setLinkedVendor(t?.vendor_application_id ?? vendorApplicationId)
      setLinkedTicket(t?.ticket_buyer_email ?? ticketBuyerEmail)
    } catch {
      // silent — actions still work, just no pill state
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [threadKey, channel])

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/bot-inbox/thread/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadKey, channel, action, ...extra }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `${action} failed`)
      const t = j.thread
      setStatus((t?.status as 'open' | 'snoozed' | 'done') ?? 'open')
      setSnoozedUntil(t?.snoozed_until ?? null)
      setAssignee(t?.assignee_id ?? null)
      setTag((t?.tag as WaTag) ?? null)
      setLinkedVendor(t?.vendor_application_id ?? null)
      setLinkedTicket(t?.ticket_buyer_email ?? null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'action failed')
    } finally {
      setBusy(null)
    }
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

  const Btn = (props: { onClick: () => void; disabled?: boolean; children: React.ReactNode; active?: boolean }) => (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5 disabled:opacity-50 transition-colors ${
        props.active
          ? 'bg-[#cd2653] border-[#cd2653] text-white'
          : 'bg-white border-neutral-200 text-neutral-700 hover:border-[#cd2653]/40 hover:text-[#cd2653]'
      }`}
    >
      {props.children}
    </button>
  )

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2 flex-wrap">
      {status === 'snoozed' && snoozedUntil && (
        <Pill tone="brand">snoozed until {new Date(snoozedUntil).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Pill>
      )}
      {status === 'done' && <Pill tone="neutral">done</Pill>}
      {assignee && <Pill tone="neutral">assigned</Pill>}

      <Btn onClick={() => act('snooze', { snoozeHours: 4 })} disabled={busy === 'snooze'} active={status === 'snoozed'}>
        {busy === 'snooze' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
        Snooze 4h
      </Btn>
      <Btn onClick={() => act('assign_me')} disabled={busy === 'assign_me'} active={!!assignee}>
        {busy === 'assign_me' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
        Assign me
      </Btn>
      {status !== 'done' ? (
        <Btn onClick={() => act('done')} disabled={busy === 'done'}>
          {busy === 'done' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Mark done
        </Btn>
      ) : (
        <Btn onClick={() => act('reopen')} disabled={busy === 'reopen'}>
          {busy === 'reopen' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Reopen
        </Btn>
      )}

      {/* Tag picker */}
      <div className="flex items-center gap-1">
        <Tag className="w-3 h-3 text-neutral-400" />
        <select
          value={tag || ''}
          onChange={(e) => act('tag', { tag: e.target.value || null })}
          disabled={busy === 'tag'}
          className="text-xs rounded-full border border-neutral-200 bg-white px-2 py-1 outline-none focus:border-[#cd2653]"
        >
          <option value="">No tag</option>
          {WA_TAG_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Link to application / ticket */}
      <Btn onClick={() => { setLinkPicker('vendor'); setLinkQuery('') }}>
        <Link2 className="w-3 h-3" />
        {linkedVendor ? 'Linked vendor' : 'Link application'}
      </Btn>
      <Btn onClick={() => { setLinkPicker('ticket'); setLinkQuery('') }}>
        <Link2 className="w-3 h-3" />
        {linkedTicket ? 'Linked ticket' : 'Link ticket'}
      </Btn>

      {linkPicker && (
        <div className="basis-full mt-2 border border-neutral-200 rounded-lg p-2 bg-neutral-50">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <input
              autoFocus
              value={linkQuery}
              onChange={(e) => setLinkQuery(e.target.value)}
              placeholder={linkPicker === 'vendor' ? 'Search vendor applications.' : 'Search ticket buyers.'}
              className="flex-1 bg-white border border-neutral-200 rounded px-2 py-1 text-xs outline-none focus:border-[#cd2653]"
            />
            <button
              onClick={() => {
                if (linkPicker === 'vendor') act('link_vendor', { vendorApplicationId: null })
                else act('link_ticket', { ticketBuyerEmail: null })
                setLinkPicker(null)
              }}
              className="text-[11px] text-neutral-600 hover:text-[#cd2653]"
            >Unlink</button>
            <button onClick={() => setLinkPicker(null)} className="text-[11px] text-neutral-500 hover:text-neutral-900">Close</button>
          </div>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {linkHits.map((h, i) => (
              <button
                key={(h.id || h.email || i).toString()}
                onClick={() => {
                  if (linkPicker === 'vendor' && h.id) act('link_vendor', { vendorApplicationId: h.id })
                  else if (linkPicker === 'ticket' && h.email) act('link_ticket', { ticketBuyerEmail: h.email })
                  setLinkPicker(null)
                }}
                className="w-full text-left text-xs bg-white border border-neutral-200 rounded px-2 py-1.5 hover:border-[#cd2653]/40"
              >
                <span className="font-semibold">{h.business_name || h.name || h.email}</span>
                <span className="text-neutral-500"> · {h.contact_name || h.email || ''}</span>
              </button>
            ))}
            {linkHits.length === 0 && linkQuery.length >= 2 && (
              <p className="text-[11px] text-neutral-400 italic px-2">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
