'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Inbox, Search, MessageCircle, Mail, CheckCircle2, Clock, AlertTriangle,
  Send, ChevronRight, Filter, Loader2, BellOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Bucket = 'needs' | 'open' | 'snoozed' | 'done'
type ChannelFilter = 'all' | 'wa' | 'mail'

interface ThreadCard {
  id: string
  channel: 'wa' | 'mail'
  thread_key: string
  displayName: string
  initials: string
  preview: string
  last_inbound_at: string | null
  last_handled_at: string | null
  unread: boolean
  needsYou: boolean
  slaBreach: boolean
  status: 'open' | 'snoozed' | 'done'
}

interface Counts {
  needs: number
  open: number
  snoozed: number
  done: number
}

interface SearchHit {
  thread_id: string
  channel: 'wa' | 'mail'
  thread_key: string
  displayName: string
  snippet: string
  matched_in: 'message' | 'business'
}

function relTime(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString()
}

const BUCKETS: Array<{ id: Bucket; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'needs', label: 'Needs you', icon: AlertTriangle },
  { id: 'open', label: 'Open', icon: Inbox },
  { id: 'snoozed', label: 'Snoozed', icon: Clock },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
]

const CHANNELS: Array<{ id: ChannelFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'wa', label: 'WhatsApp' },
  { id: 'mail', label: 'Mail' },
]

export function InboxClient() {
  const [bucket, setBucket] = useState<Bucket>('needs')
  const [channel, setChannel] = useState<ChannelFilter>('all')
  const [counts, setCounts] = useState<Counts>({ needs: 0, open: 0, snoozed: 0, done: 0 })
  const [threads, setThreads] = useState<ThreadCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/admin/inbox/threads?bucket=${bucket}&channel=${channel}`
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      setCounts(data.counts ?? { needs: 0, open: 0, snoozed: 0, done: 0 })
      setThreads(data.threads ?? [])
    } catch {
      // swallow
    } finally {
      setLoading(false)
    }
  }, [bucket, channel])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Debounced search
  useEffect(() => {
    const q = searchQ.trim()
    if (q.length < 2) {
      setHits(null)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/inbox/search?q=${encodeURIComponent(q)}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        setHits(data.hits ?? [])
      } catch {
        setHits([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [searchQ])

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId]
  )

  const displayedThreads = useMemo(() => {
    if (hits) {
      return hits.map<ThreadCard>((h) => ({
        id: h.thread_id,
        channel: h.channel,
        thread_key: h.thread_key,
        displayName: h.displayName,
        initials: (h.displayName || '?').slice(0, 2).toUpperCase(),
        preview: h.snippet,
        last_inbound_at: null,
        last_handled_at: null,
        unread: false,
        needsYou: false,
        slaBreach: false,
        status: 'open' as const,
      }))
    }
    return threads
  }, [hits, threads])

  const handleMarkDone = async () => {
    if (!selected) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread_id: selected.id, body: '(marked done)', mark_done: true }),
      })
      if (res.ok) await loadThreads()
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread_id: selected.id, body: reply.trim() }),
      })
      if (res.ok) {
        setReply('')
        await loadThreads()
      }
    } finally {
      setSending(false)
    }
  }

  const handleRelease = async () => {
    if (!selected) return
    await fetch('/api/admin/inbox/release', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ thread_id: selected.id }),
    })
  }

  return (
    <div className="flex h-screen bg-[#f8f8f8]">
      {/* Sidebar */}
      <aside className="w-60 border-r border-neutral-200 bg-white p-4 flex flex-col">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Inbox className="w-4 h-4" /> Unified Inbox
        </h2>

        <nav className="space-y-1 mb-6">
          {BUCKETS.map((b) => {
            const Icon = b.icon
            const active = bucket === b.id
            const count = counts[b.id]
            return (
              <button
                key={b.id}
                onClick={() => setBucket(b.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-[#cd2653] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {b.label}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    active ? 'text-white/90' : 'text-neutral-500'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-neutral-100 pt-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Channel
          </p>
          <div className="space-y-1">
            {CHANNELS.map((c) => {
              const active = channel === c.id
              const Icon = c.id === 'wa' ? MessageCircle : c.id === 'mail' ? Mail : Filter
              return (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* Thread list */}
      <section className="w-[360px] border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-3 border-b border-neutral-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search messages, vendors..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cd2653]/30 focus:border-[#cd2653]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : displayedThreads.length === 0 ? (
            <div className="px-4 py-8 text-sm text-neutral-500 text-center">
              {hits ? 'No matches.' : 'No threads in this view.'}
            </div>
          ) : (
            <ul>
              {displayedThreads.map((t) => {
                const isSelected = selectedId === t.id
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        'w-full text-left px-3 py-3 border-b border-neutral-100 flex gap-3 transition-colors',
                        isSelected ? 'bg-[#cd2653]/5' : 'hover:bg-neutral-50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                          t.channel === 'wa'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        )}
                      >
                        {t.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-neutral-900 truncate">
                            {t.displayName}
                          </span>
                          {t.channel === 'wa' ? (
                            <MessageCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Mail className="w-3 h-3 text-sky-600 flex-shrink-0" />
                          )}
                          {t.unread && (
                            <span className="w-2 h-2 rounded-full bg-[#cd2653] flex-shrink-0" />
                          )}
                          {t.slaBreach && (
                            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-neutral-500 truncate pr-2">
                            {t.preview || t.thread_key}
                          </span>
                          <span className="text-[10px] text-neutral-400 tabular-nums flex-shrink-0">
                            {relTime(t.last_inbound_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 self-center" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Detail pane */}
      <section className="flex-1 flex flex-col bg-white">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
            Pick a thread to start.
          </div>
        ) : (
          <>
            <header className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-neutral-900">
                  {selected.displayName}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selected.channel === 'wa' ? 'WhatsApp' : 'Email'} · {selected.thread_key}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRelease}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Release bot
                </button>
                <button
                  onClick={handleMarkDone}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark done
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-neutral-500">
                Message history loads here when the thread-detail endpoint ships.
              </p>
            </div>

            <footer className="border-t border-neutral-200 p-4">
              <div className="flex gap-2 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#cd2653]/30 focus:border-[#cd2653]"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#cd2653] rounded-md hover:bg-[#b71f48] transition-colors disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
