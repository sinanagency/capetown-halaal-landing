'use client'

/**
 * ThreadView — full thread UI (header + history + composer with TemplatePicker
 * + on-demand AI summary). Reused by:
 *
 *   - The three-pane inbox (detail column)
 *   - The standalone /admin/inbox/thread/[channel]/[id] page
 *
 * The component is "self-loading": give it a way to identify the thread
 * (either `threadId` or `channel + key`) and it fetches via the new
 * /api/admin/inbox/thread endpoint. Composer wires to /api/admin/inbox/reply
 * (text or template mode) and the on-demand summarise button hits
 * /api/admin/inbox/summarize.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BellOff,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react'
import { TemplatePicker, type StagedTemplate } from './TemplatePicker'
import { cn } from '@/lib/utils'

interface ThreadMessage {
  id: string
  direction: 'in' | 'out'
  body: string
  status: string | null
  created_at: string
  subject?: string | null
  template_name?: string | null
}

interface ThreadHeader {
  id: string
  channel: 'wa' | 'mail'
  thread_key: string
  displayName: string
  status: string
  last_inbound_at: string | null
  last_handled_at: string | null
}

interface SummaryPayload {
  summary: string
  suggested_replies: string[]
  cached: boolean
  cached_at: string
}

export interface ThreadViewProps {
  threadId?: string
  channel?: 'wa' | 'mail'
  threadKey?: string
  // When inside the three-pane layout we want the back-to-list affordance.
  onClose?: () => void
  // Tells the parent "this thread just changed" so it can refresh its list.
  onChanged?: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ThreadView({ threadId, channel, threadKey, onChanged }: ThreadViewProps) {
  const [header, setHeader] = useState<ThreadHeader | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [summarising, setSummarising] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const queryString = useMemo(() => {
    if (threadId) return `thread_id=${encodeURIComponent(threadId)}`
    if (channel && threadKey)
      return `channel=${channel}&key=${encodeURIComponent(threadKey)}`
    return ''
  }, [threadId, channel, threadKey])

  const load = useCallback(async () => {
    if (!queryString) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/inbox/thread?${queryString}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'failed to load thread')
        return
      }
      setHeader(data.thread)
      setMessages(data.messages ?? [])
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    load()
    // Reset summary cache visibility on thread switch.
    setSummary(null)
    setReply('')
    setSubject('')
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function callReply(payload: Record<string, unknown>) {
    if (!header) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread_id: header.id, ...payload }),
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      await load()
      onChanged?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function handleSendText() {
    if (!reply.trim()) return
    await callReply({
      mode: 'text',
      body: reply.trim(),
      subject: header?.channel === 'mail' ? subject || undefined : undefined,
    })
    setReply('')
    setSubject('')
  }

  async function handleSendTemplate(staged: StagedTemplate) {
    await callReply({
      mode: 'template',
      template_key: staged.template_key,
      params: staged.params,
    })
  }

  async function handleMarkDone() {
    await callReply({ mode: 'text', body: '(marked done)', mark_done: true })
  }

  async function handleRelease() {
    if (!header) return
    await fetch('/api/admin/inbox/release', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ thread_id: header.id }),
    })
  }

  async function handleSummarise(force = false) {
    if (!header) return
    setSummarising(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/inbox/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread_id: header.id, force }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'summary failed')
        return
      }
      setSummary({
        summary: data.summary ?? '',
        suggested_replies: data.suggested_replies ?? [],
        cached: !!data.cached,
        cached_at: data.cached_at ?? new Date().toISOString(),
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSummarising(false)
    }
  }

  if (loading && !header) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (!header) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
        {error || 'Thread not found.'}
      </div>
    )
  }

  const ChannelIcon = header.channel === 'wa' ? MessageCircle : Mail
  const channelLabel = header.channel === 'wa' ? 'WhatsApp' : 'Email'

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <header className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ChannelIcon
              className={cn(
                'w-4 h-4',
                header.channel === 'wa' ? 'text-emerald-600' : 'text-sky-600'
              )}
            />
            <h1 className="text-base font-semibold text-neutral-900 truncate">
              {header.displayName}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">
            {channelLabel} · {header.thread_key}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleSummarise(false)}
            disabled={summarising}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            {summarising ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Summarise
          </button>
          <button
            type="button"
            onClick={handleRelease}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
          >
            <BellOff className="w-3.5 h-3.5" />
            Release bot
          </button>
          <button
            type="button"
            onClick={handleMarkDone}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark done
          </button>
        </div>
      </header>

      {summary && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-amber-900">{summary.summary}</p>
            <button
              type="button"
              onClick={() => handleSummarise(true)}
              className="text-[10px] text-amber-700 hover:text-amber-900 flex-shrink-0"
            >
              {summary.cached ? 'Refresh' : 'Re-run'}
            </button>
          </div>
          {summary.suggested_replies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {summary.suggested_replies.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReply((prev) => (prev ? `${prev} ${s}` : s))}
                  className="text-[11px] px-2 py-1 bg-white border border-amber-200 rounded-full text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-sm text-neutral-400 text-center py-12">
            No messages on this thread yet.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                  m.direction === 'out'
                    ? 'bg-[#cd2653] text-white'
                    : 'bg-neutral-50 border border-neutral-100 text-neutral-900'
                )}
              >
                {m.subject && m.direction === 'in' && (
                  <p className="text-[10px] font-semibold mb-1 text-neutral-500">
                    {m.subject}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={cn(
                    'text-[10px] mt-1',
                    m.direction === 'out' ? 'text-white/70' : 'text-neutral-400'
                  )}
                >
                  {formatTime(m.created_at)}
                  {m.template_name ? ` · template:${m.template_name}` : ''}
                  {m.status ? ` · ${m.status}` : ''}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-neutral-200 p-4">
        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}
        {header.channel === 'mail' && (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="w-full mb-2 px-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#cd2653]/40"
          />
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendText()
            }}
            placeholder="Type your reply..."
            rows={3}
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#cd2653]/30 focus:border-[#cd2653]"
          />
          <div className="flex flex-col gap-2">
            <TemplatePicker
              channel={header.channel}
              onInsert={({ body, subject: sub }) => {
                setReply(body)
                if (sub) setSubject(sub)
              }}
              onSendAsTemplate={handleSendTemplate}
            />
            <button
              type="button"
              onClick={handleSendText}
              disabled={sending || !reply.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#cd2653] rounded-md hover:bg-[#b71f48] transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
