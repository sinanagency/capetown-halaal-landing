'use client'

// Right-rail preview pane. Shows the full application context for the
// currently focused row without navigating. j/k swaps the focused row,
// this pane re-renders against the new id.
//
// Pulls AI suggestions from Agent 2's endpoint:
//   GET /api/admin/applications/suggest?id=<uuid>
//     -> { sector_suggestions, completeness_score, dupe_of }
// Failure: render without suggestions, never block the row.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Mail, Phone, Building2, Tag, AlertTriangle, ExternalLink } from 'lucide-react'
import type {
  WorkbenchApplication,
  SuggestResponse,
  AuditEvent,
} from './types'

function daysAgo(iso: string): number {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400_000))
}

function last9(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D+/g, '')
  return digits.slice(-9)
}

function CompletenessBadge({ score }: { score: number | null | undefined }) {
  const s = typeof score === 'number' ? score : 0
  const tone =
    s >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold tabular-nums', tone)}>
      {s}/100
    </span>
  )
}

export function PreviewPane({
  row,
  duplicateSiblings,
}: {
  row: WorkbenchApplication | null
  duplicateSiblings: WorkbenchApplication[]
}) {
  const [suggest, setSuggest] = useState<SuggestResponse | null>(null)
  const [suggestErr, setSuggestErr] = useState(false)
  const [events, setEvents] = useState<AuditEvent[]>([])

  // Pull suggestions whenever the focused row changes. Best-effort.
  useEffect(() => {
    if (!row) {
      setSuggest(null)
      setSuggestErr(false)
      setEvents([])
      return
    }
    let abort = false
    setSuggest(null)
    setSuggestErr(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/applications/suggest?id=${row.id}`)
        if (!abort && res.ok) {
          const data = (await res.json()) as SuggestResponse
          setSuggest(data)
        } else if (!abort) {
          setSuggestErr(true)
        }
      } catch {
        if (!abort) setSuggestErr(true)
      }
    })()
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/applications/events?application_id=${row.id}&limit=20`)
        if (!abort && res.ok) {
          const data = await res.json()
          setEvents(data.events ?? [])
        }
      } catch {
        if (!abort) setEvents([])
      }
    })()
    return () => {
      abort = true
    }
  }, [row?.id])

  if (!row) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-neutral-400">
        Select a row to preview.
      </div>
    )
  }

  const age = daysAgo(row.created_at)
  const phoneLast9 = last9(row.phone)
  const isDupeFromPhone = duplicateSiblings.length > 0
  const isDuplicate = row.is_duplicate || isDupeFromPhone

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-neutral-900 truncate">{row.business_name}</h2>
              <p className="text-sm text-neutral-500 truncate">{row.contact_name}</p>
            </div>
            <Link
              href={`/admin/applications/${row.id}`}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-neutral-200 hover:border-neutral-400 text-neutral-700"
            >
              Open full <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 text-[11px] text-neutral-700 capitalize">
              {row.status.replace('_', ' ')}
            </span>
            <CompletenessBadge score={suggest?.completeness_score ?? row.completeness_score} />
            <span className="text-[11px] tabular-nums text-neutral-500">{age}d old</span>
            {isDuplicate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">
                <AlertTriangle className="w-3 h-3" /> possible duplicate
              </span>
            )}
          </div>
        </div>

        {/* Contact + categories */}
        <section className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-neutral-700">
            <Mail className="w-3.5 h-3.5 text-neutral-400" />
            <a className="hover:underline truncate" href={`mailto:${row.email}`}>{row.email}</a>
          </div>
          <div className="flex items-center gap-2 text-neutral-700">
            <Phone className="w-3.5 h-3.5 text-neutral-400" />
            <span className="tabular-nums">{row.phone || '—'}</span>
            {phoneLast9 && (
              <span className="text-[10px] text-neutral-400">…{phoneLast9}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-neutral-700">
            <Building2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>{row.preferred_booth_tier || 'no tier preference'}</span>
          </div>
        </section>

        {/* Product categories */}
        <section className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Categories</div>
          <div className="flex flex-wrap gap-1.5">
            {(row.product_categories ?? []).length > 0 ? (
              row.product_categories!.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-full bg-neutral-100 text-[11px] text-neutral-700">
                  {c}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-neutral-400">none</span>
            )}
          </div>
          {row.sector && (
            <div className="text-[11px] text-neutral-500 pt-1">
              Sector: <span className="font-medium text-neutral-700">{row.sector}</span>
            </div>
          )}
        </section>

        {/* AI suggestions */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">AI suggested sector</div>
            {suggestErr && (
              <span className="text-[10px] text-neutral-400">suggest offline</span>
            )}
          </div>
          {suggest?.sector_suggestions?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {suggest.sector_suggestions.map((s) => (
                <span
                  key={s.value}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[11px]"
                >
                  <Tag className="w-3 h-3" />
                  {s.value}
                  <span className="text-[10px] text-violet-500 tabular-nums">
                    {Math.round(s.confidence * 100)}%
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-neutral-400">
              {suggest === null && !suggestErr ? 'loading…' : 'no suggestion'}
            </div>
          )}
        </section>

        {/* Business description */}
        <section className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Description</div>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">
            {row.business_description?.trim() || <span className="text-neutral-400">not provided</span>}
          </p>
        </section>

        {/* Special requirements */}
        {row.special_requirements && (
          <section className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Special requirements</div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{row.special_requirements}</p>
          </section>
        )}

        {/* Duplicate siblings */}
        {duplicateSiblings.length > 0 && (
          <section className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">
              Same phone (last 9): {duplicateSiblings.length} other row(s)
            </div>
            <ul className="text-[12px] text-neutral-700 space-y-0.5">
              {duplicateSiblings.map((d) => (
                <li key={d.id} className="truncate">
                  <Link href={`/admin/applications/${d.id}`} className="hover:underline">
                    {d.business_name}
                  </Link>
                  <span className="text-neutral-400"> · {d.status} · {daysAgo(d.created_at)}d</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Audit log */}
        <section className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Activity</div>
          {events.length === 0 ? (
            <div className="text-[11px] text-neutral-400">No activity yet.</div>
          ) : (
            <ul className="space-y-1">
              {events.map((ev) => (
                <li key={ev.id} className="text-[12px] text-neutral-700">
                  <span className="font-medium">{ev.event_type}</span>
                  {ev.actor_email && (
                    <span className="text-neutral-500"> by {ev.actor_email}</span>
                  )}
                  <span className="text-neutral-400"> · {new Date(ev.created_at).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {ev.note && <div className="text-neutral-500 italic truncate">{ev.note}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
