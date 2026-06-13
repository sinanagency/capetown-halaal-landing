'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Loader2, MessageCircle, Crown, Star, ArrowRight } from 'lucide-react'
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
  messages: MsgRow[]
  handover: 'human' | 'bot'
  latestAt: string | null
  latestPreview: string
  lastInboundAt: string | null
  unreadCount: number
}

type Selection =
  | { kind: 'admin'; idx: number }
  | { kind: 'guest'; idx: number }

function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function BotInboxClient({
  adminThreads,
  guestThreads,
}: {
  adminThreads: AdminThread[]
  guestThreads: GuestThread[]
}) {
  const initialSelection: Selection | null = guestThreads.length > 0
    ? { kind: 'guest', idx: 0 }
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

  const active = useMemo<{ phone: string; label: string; messages: MsgRow[]; kind: 'admin' | 'guest'; handover?: 'human' | 'bot' } | null>(() => {
    if (!sel) return null
    if (sel.kind === 'admin') {
      const t = adminThreads[sel.idx]; if (!t) return null
      return { phone: t.admin.phone, label: t.admin.name, messages: t.messages, kind: 'admin' }
    }
    const t = guestThreads[sel.idx]; if (!t) return null
    return { phone: t.phone, label: t.label, messages: t.messages, kind: 'guest', handover: t.handover }
  }, [sel, adminThreads, guestThreads])

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
          {guestThreads.length > 0 && (
            <Card padded={false}>
              <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#cd2653]">Vendor / guest threads</p>
                <span className="text-[11px] text-neutral-500">{guestThreads.length}</span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[480px] overflow-y-auto">
                {guestThreads.map((t, i) => (
                  <button
                    key={t.phone}
                    onClick={() => setSel({ kind: 'guest', idx: i })}
                    className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${sel?.kind === 'guest' && sel.idx === i ? 'bg-[#cd2653]/5' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{t.label}</p>
                      {t.handover === 'human' && <Pill tone="brand">human</Pill>}
                      {t.unreadCount > 0 && <span className="text-[10px] font-bold bg-[#cd2653] text-white rounded-full px-1.5 py-0.5">{t.unreadCount}</span>}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate font-mono">{t.phone}</p>
                    <p className="text-xs text-neutral-600 truncate mt-1">{t.latestPreview}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{fmt(t.latestAt)}</p>
                  </button>
                ))}
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

          {guestThreads.length === 0 && adminThreads.length === 0 && (
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
  active: { phone: string; label: string; messages: MsgRow[]; kind: 'admin' | 'guest'; handover?: 'human' | 'bot' }
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
            {active.kind === 'guest' && active.handover === 'human' && <Pill tone="brand">human handling</Pill>}
            {active.kind === 'guest' && active.handover === 'bot' && <Pill tone="neutral">auto-bot</Pill>}
            {active.kind === 'admin' && <Pill tone="neutral">admin</Pill>}
          </div>
        </div>
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
