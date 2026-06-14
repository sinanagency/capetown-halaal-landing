'use client'

/**
 * UnifiedTimeline — chronological feed of every comms touchpoint for one
 * contact, across WhatsApp + email + admin notes. Used by the Vendor Profile
 * Hub and the Follow-up Chase context drawer.
 *
 * Props:
 *   contactId : vendor_applications row id (drives admin-notes pull)
 *   phone     : E.164-ish phone string (last 9 digits used for wa_messages match)
 *   email     : raw email (lower-cased server-side for support_inbox match)
 *
 * Data source: /api/admin/comms/timeline (this slice).
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessageCircle, Mail, StickyNote, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react'

const PAGE_SIZE = 50

interface Row {
  id: string
  channel: 'whatsapp' | 'email' | 'note'
  direction: 'in' | 'out' | 'note'
  body: string
  at: string
  source: string
  source_label: string
  meta?: {
    template_name?: string
    status?: string
    error?: string
    subject?: string
    from?: string
    to?: string
    provider?: string
  }
}

interface Props {
  contactId: string
  phone?: string
  email?: string
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = +new Date(iso)
  const sec = Math.round((now - then) / 1000)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  const d = Math.round(sec / 86400)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function absoluteTime(iso: string): string {
  try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }
  catch { return iso }
}

const TRUNCATE_AT = 240

export function UnifiedTimeline({ contactId, phone, email }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fetch one page. When `append=true` we keep prior rows; otherwise reset.
  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean): Promise<void> => {
      const sp = new URLSearchParams()
      if (contactId) sp.set('contactId', contactId)
      if (phone) sp.set('phone', phone)
      if (email) sp.set('email', email)
      sp.set('limit', String(PAGE_SIZE))
      sp.set('offset', String(pageOffset))
      try {
        const r = await fetch(`/api/admin/comms/timeline?${sp.toString()}`)
        const d = await r.json()
        const pageRows: Row[] = d.rows || []
        setRows((prev) => (append && prev ? [...prev, ...pageRows] : pageRows))
        setHasMore(!!d.pagination?.has_more)
        setOffset(pageOffset + pageRows.length)
      } catch (e) {
        setError(String((e as Error)?.message || e))
      }
    },
    [contactId, phone, email]
  )

  useEffect(() => {
    let cancelled = false
    setRows(null)
    setError(null)
    setOffset(0)
    setHasMore(false)
    ;(async () => {
      await fetchPage(0, false)
      if (cancelled) return
    })()
    return () => { cancelled = true }
  }, [fetchPage])

  if (error) {
    return <p className="text-sm text-red-600">Failed to load timeline: {error}</p>
  }
  if (!rows) {
    return <p className="text-sm text-neutral-500">Loading timeline...</p>
  }
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">No comms yet across WhatsApp, email, or notes.</p>
  }

  async function loadOlder() {
    setLoadingMore(true)
    try {
      await fetchPage(offset, true)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
    <ol className="space-y-2.5">
      {rows.map((r) => {
        const isExp = expanded.has(r.id)
        const isLong = r.body.length > TRUNCATE_AT
        const body = isLong && !isExp ? r.body.slice(0, TRUNCATE_AT) + '...' : r.body
        return (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3"
          >
            <ChannelIcon channel={r.channel} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-neutral-500">
                <DirectionBadge direction={r.direction} />
                <span title={absoluteTime(r.at)} className="cursor-help">
                  {relativeTime(r.at)}
                </span>
                <span className="text-neutral-300">·</span>
                <span className="truncate max-w-[200px]" title={r.source_label}>{r.source_label}</span>
                {r.meta?.template_name && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] uppercase tracking-wide font-medium">
                    {r.meta.template_name}
                  </span>
                )}
                {r.meta?.status && r.meta.status !== 'sent' && r.meta.status !== 'delivered' && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px]">
                    {r.meta.status}
                  </span>
                )}
              </div>
              {r.meta?.subject && r.channel === 'email' && (
                <p className="text-xs font-medium text-neutral-700 mt-1 truncate">{r.meta.subject}</p>
              )}
              <p className="text-sm text-neutral-900 mt-1 whitespace-pre-wrap break-words leading-snug">
                {body}
              </p>
              {isLong && (
                <button
                  onClick={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev)
                      if (next.has(r.id)) next.delete(r.id)
                      else next.add(r.id)
                      return next
                    })
                  }}
                  className="mt-1 text-xs text-[#cd2653] hover:underline inline-flex items-center gap-0.5"
                >
                  {isExp ? <>Less <ChevronUp className="w-3 h-3" /></> : <>More <ChevronDown className="w-3 h-3" /></>}
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
    {hasMore && (
      <div className="pt-3 flex justify-center">
        <button
          onClick={loadOlder}
          disabled={loadingMore}
          className="text-xs text-neutral-600 hover:text-[#cd2653] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 hover:border-neutral-400 disabled:opacity-60"
        >
          {loadingMore && <Loader2 className="w-3 h-3 animate-spin" />}
          {loadingMore ? 'Loading...' : 'Load older'}
        </button>
      </div>
    )}
    </>
  )
}

function ChannelIcon({ channel }: { channel: Row['channel'] }) {
  const cfg = {
    whatsapp: { Icon: MessageCircle, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    email:    { Icon: Mail,          bg: 'bg-blue-50',    fg: 'text-blue-600' },
    note:     { Icon: StickyNote,    bg: 'bg-neutral-100',fg: 'text-neutral-500' },
  }[channel]
  const Icon = cfg.Icon
  return (
    <span className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center`}>
      <Icon className={`w-4 h-4 ${cfg.fg}`} />
    </span>
  )
}

function DirectionBadge({ direction }: { direction: Row['direction'] }) {
  if (direction === 'note') {
    return <span className="text-neutral-400 text-[10px] uppercase tracking-wide font-medium">Note</span>
  }
  const Icon = direction === 'in' ? ArrowDownLeft : ArrowUpRight
  const tone = direction === 'in' ? 'text-emerald-600' : 'text-[#cd2653]'
  return (
    <span className={`inline-flex items-center gap-0.5 ${tone} text-[10px] uppercase tracking-wide font-medium`}>
      <Icon className="w-3 h-3" />
      {direction === 'in' ? 'In' : 'Out'}
    </span>
  )
}
