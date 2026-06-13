'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Inbox, Search, MessageCircle, Mail, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Filter, Loader2, ExternalLink, X, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThreadView } from '@/components/admin/ThreadView'
import { TemplatePicker, type StagedTemplate } from '@/components/admin/TemplatePicker'

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

// Bulk replies are paced: small delay between threads to keep Resend / Meta
// rate limits happy and to avoid a thundering-herd on the WA window check.
const BULK_PACE_MS = 350

export function InboxClient() {
  const [bucket, setBucket] = useState<Bucket>('needs')
  const [channel, setChannel] = useState<ChannelFilter>('all')
  const [counts, setCounts] = useState<Counts>({ needs: 0, open: 0, snoozed: 0, done: 0 })
  const [threads, setThreads] = useState<ThreadCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

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

  // Wipe multi-select when the active bucket/channel changes; threads change.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [bucket, channel])

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

  const displayedThreads = useMemo<ThreadCard[]>(() => {
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

  // Bulk selection covers the currently rendered list, scoped to the
  // operator's intent (you can't bulk threads from a different channel by
  // accident — they are filtered already by ChannelFilter).
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  // Selected threads, deduplicated and resolved.
  const selectedThreads = useMemo(
    () => displayedThreads.filter((t) => selectedIds.has(t.id)),
    [displayedThreads, selectedIds]
  )

  // Bulk channel: if every selected thread is wa OR every one is mail, that
  // channel; otherwise null and the bulk template picker is disabled (Meta and
  // mail templates can't share a payload).
  const bulkChannel: 'wa' | 'mail' | null = useMemo(() => {
    if (selectedThreads.length === 0) return null
    const first = selectedThreads[0].channel
    return selectedThreads.every((t) => t.channel === first) ? first : null
  }, [selectedThreads])

  async function runBulkAction(action: (threadId: string) => Promise<void>) {
    if (selectedThreads.length === 0) return
    setBulkRunning(true)
    setBulkProgress({ done: 0, total: selectedThreads.length })
    let done = 0
    for (const t of selectedThreads) {
      try {
        await action(t.id)
      } catch {
        // swallow; this is best-effort bulk
      }
      done += 1
      setBulkProgress({ done, total: selectedThreads.length })
      if (done < selectedThreads.length) {
        await new Promise((r) => setTimeout(r, BULK_PACE_MS))
      }
    }
    setBulkRunning(false)
    setBulkProgress(null)
    clearSelection()
    await loadThreads()
  }

  async function bulkSendTemplate(staged: StagedTemplate) {
    await runBulkAction(async (threadId) => {
      await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          mode: 'template',
          template_key: staged.template_key,
          params: staged.params,
        }),
      })
    })
  }

  async function bulkMarkDone() {
    await runBulkAction(async (threadId) => {
      await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          mode: 'text',
          body: '(marked done)',
          mark_done: true,
        }),
      })
    })
  }

  async function bulkSnooze(hours: number) {
    await runBulkAction(async (threadId) => {
      // Defensive: if there's no dedicated snooze endpoint, fall through to
      // setting last_handled_at via the reply endpoint with a noop. Operators
      // can still escalate via release.
      await fetch('/api/admin/inbox/release', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, snooze_hours: hours }),
      })
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
                const isChecked = selectedIds.has(t.id)
                return (
                  <li key={t.id}>
                    <div
                      className={cn(
                        'w-full text-left px-3 py-3 border-b border-neutral-100 flex gap-2 transition-colors group',
                        isSelected ? 'bg-[#cd2653]/5' : 'hover:bg-neutral-50',
                        isChecked && 'bg-amber-50/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(t.id)}
                        className="mt-3 accent-[#cd2653] flex-shrink-0"
                        aria-label={`Select ${t.displayName}`}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className="flex flex-1 gap-3 min-w-0 text-left"
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
                      </button>
                      <Link
                        href={`/admin/inbox/thread/${t.channel}/${encodeURIComponent(t.thread_key)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-center text-neutral-300 hover:text-[#cd2653] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Open standalone view"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <ChevronRight className="w-4 h-4 text-neutral-300 self-center flex-shrink-0" />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="sticky bottom-0 border-t border-neutral-200 bg-white px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-neutral-900">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto text-neutral-400 hover:text-neutral-700"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {bulkRunning && bulkProgress ? (
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending {bulkProgress.done} of {bulkProgress.total}...
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {bulkChannel ? (
                  <TemplatePicker
                    channel={bulkChannel}
                    onInsert={() => {
                      /* insert is meaningless in bulk; the picker still shows it for parity */
                    }}
                    onSendAsTemplate={bulkSendTemplate}
                  />
                ) : (
                  <span className="text-[11px] text-amber-700">
                    Mixed channels — clear to bulk-send a template
                  </span>
                )}
                <button
                  type="button"
                  onClick={bulkMarkDone}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 border border-neutral-200 rounded hover:bg-neutral-50"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Mark done
                </button>
                <details className="relative">
                  <summary className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 border border-neutral-200 rounded hover:bg-neutral-50 cursor-pointer list-none">
                    <Clock className="w-3 h-3" />
                    Snooze
                  </summary>
                  <div className="absolute bottom-full mb-1 left-0 z-20 bg-white border border-neutral-200 rounded shadow-lg py-1 min-w-[100px]">
                    {[1, 3, 24].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => bulkSnooze(h)}
                        className="w-full text-left px-3 py-1 text-[11px] hover:bg-neutral-50"
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Detail pane */}
      {!selectedId ? (
        <section className="flex-1 flex items-center justify-center text-sm text-neutral-400 bg-white">
          <div className="text-center">
            <Send className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p>Pick a thread to start.</p>
          </div>
        </section>
      ) : (
        <ThreadView threadId={selectedId} onChanged={loadThreads} />
      )}
    </div>
  )
}
