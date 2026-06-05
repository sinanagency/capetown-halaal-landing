'use client'

import { useMemo, useState } from 'react'
import { Send, Clock, Crown, Star } from 'lucide-react'
import type { BotAdmin } from '@/lib/bot/admins'

export interface AdminThread {
  admin: BotAdmin
  messages: Array<{
    id: string
    wa_phone: string
    direction: 'in' | 'out'
    body: string | null
    status: string | null
    created_at: string
    provider_message_id: string | null
  }>
  latestAt: string | null
  latestPreview: string
  lastInboundAt: string | null
  unreadCount: number
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / 3.6e6
}

export function BotInboxClient({ threads }: { threads: AdminThread[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const active = threads[activeIdx]

  return (
    <div className="flex h-screen">
      {/* Thread list */}
      <aside className="w-80 border-r border-neutral-200 bg-white">
        <div className="px-6 py-5 border-b border-neutral-200">
          <h1 className="text-xl font-bold text-neutral-900">Bot Inbox</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Admin conversations only — vendors/customers don't show here.</p>
        </div>
        <div>
          {threads.map((t, i) => (
            <button
              key={t.admin.phone}
              onClick={() => setActiveIdx(i)}
              className={`w-full text-left px-6 py-4 border-b border-neutral-100 transition-colors ${
                i === activeIdx ? 'bg-[#cd2653]/5 border-l-4 border-l-[#cd2653]' : 'hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {t.admin.role === 'master' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Star className="w-3.5 h-3.5 text-[#cd2653]" />
                  )}
                  <span className="font-semibold text-neutral-900 text-sm">{t.admin.name}</span>
                </div>
                {t.unreadCount > 0 && (
                  <span className="bg-[#cd2653] text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                    {t.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 truncate">{t.latestPreview || '(no messages yet)'}</p>
              <p className="text-[10px] text-neutral-400 mt-1">{formatTime(t.latestAt)}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation pane */}
      <main className="flex-1 flex flex-col bg-[#f8f8f8]">
        {active ? <ConversationPane thread={active} /> : <EmptyState />}
      </main>
    </div>
  )
}

function ConversationPane({ thread }: { thread: AdminThread }) {
  const sorted = useMemo(
    () => [...thread.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [thread]
  )
  const windowHours = hoursSince(thread.lastInboundAt)
  const inWindow = windowHours !== null && windowHours < 24
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimistic, setOptimistic] = useState<typeof sorted>([])

  async function handleSend() {
    if (!reply.trim() || sending) return
    setSending(true)
    setError(null)
    const body = reply.trim()
    try {
      const res = await fetch('/api/admin/bot-inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: thread.admin.phone, body }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setOptimistic((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          wa_phone: thread.admin.phone,
          direction: 'out',
          body,
          status: 'sent',
          created_at: new Date().toISOString(),
          provider_message_id: null,
        },
      ])
      setReply('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const all = [...sorted, ...optimistic]

  return (
    <>
      <header className="px-8 py-5 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{thread.admin.name}</h2>
            <p className="text-xs text-neutral-500">
              {thread.admin.role === 'master' ? 'Master admin' : 'Festival owner'} · {thread.admin.phone}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              {windowHours === null ? (
                <span className="text-neutral-500">No inbound yet</span>
              ) : inWindow ? (
                <span className="text-emerald-600">24h window open ({windowHours.toFixed(1)}h ago)</span>
              ) : (
                <span className="text-amber-600">Outside 24h window — use a template</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-3">
        {all.length === 0 && (
          <div className="text-center text-neutral-400 text-sm py-12">No messages yet.</div>
        )}
        {all.map((m) => (
          <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                m.direction === 'out'
                  ? 'bg-[#cd2653] text-white'
                  : 'bg-white border border-neutral-200 text-neutral-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p
                className={`text-[10px] mt-1 ${
                  m.direction === 'out' ? 'text-white/70' : 'text-neutral-400'
                }`}
              >
                {formatTime(m.created_at)} · {m.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      <footer className="px-8 py-4 bg-white border-t border-neutral-200">
        {!inWindow && (
          <p className="text-xs text-amber-600 mb-2">
            Their last inbound was over 24h ago — free-form sends will be blocked by Meta. Send an
            approved template from Broadcast to re-open the window.
          </p>
        )}
        <div className="flex gap-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
            }}
            placeholder={inWindow ? 'Reply to ' + thread.admin.name.split(' ')[0] + '… (⌘↵ to send)' : 'Window closed'}
            disabled={!inWindow || sending}
            rows={2}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#cd2653]/30 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
          <button
            onClick={handleSend}
            disabled={!inWindow || sending || !reply.trim()}
            className="bg-[#cd2653] text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </footer>
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
      Pick an admin on the left to see the conversation.
    </div>
  )
}
