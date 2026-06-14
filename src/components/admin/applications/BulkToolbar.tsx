'use client'

// Top bulk-action toolbar. Appears when >=1 row is selected.
// One templated reason is chosen once and applies to all rows when running
// Approve N / Reject N as spam / Request-info N / Tag-sector N.

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, HelpCircle, Tag, Loader2, X } from 'lucide-react'
import { INFO_REQUEST_TEMPLATES, SECTOR_CYCLE } from './types'

type Run = (action: 'approve' | 'reject' | 'request_info' | 'tag', payload?: { reason?: string; sector?: string }) => Promise<void>

export function BulkToolbar({
  count,
  busy,
  onRun,
  onClear,
}: {
  count: number
  busy: boolean
  onRun: Run
  onClear: () => void
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 bg-neutral-900 text-white rounded-lg px-3 py-1.5 shadow-md">
      {/* aria-live so screen readers + accessibility tooling pick up the
          selection-count change as the operator presses `x`. Without this, the
          number flips silently. */}
      <span role="status" aria-live="polite" className="text-sm font-medium px-1">
        {count} selected
      </span>
      <span className="w-px h-5 bg-neutral-700" />

      <button
        disabled={busy}
        onClick={() => onRun('approve')}
        aria-label={`Approve ${count} selected applications`}
        className="px-2.5 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Approve {count}
      </button>

      <div className="relative">
        <button
          disabled={busy}
          onClick={() => setInfoOpen((v) => !v)}
          aria-label={`Request info from ${count} selected applications`}
          aria-haspopup="menu"
          aria-expanded={infoOpen}
          className={cn(
            'px-2.5 py-1 text-xs rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 inline-flex items-center gap-1.5'
          )}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Request info {count}
        </button>
        {infoOpen && (
          <div className="absolute top-full mt-1 left-0 bg-white text-neutral-900 rounded-md shadow-lg border border-neutral-200 min-w-[260px] overflow-hidden z-10">
            {INFO_REQUEST_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setInfoOpen(false)
                  onRun('request_info', { reason: t.body })
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-xs"
              >
                <div className="font-medium text-neutral-900">{t.label}</div>
                <div className="text-[11px] text-neutral-500 truncate">{t.body}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        disabled={busy}
        onClick={() => {
          if (!window.confirm(`Reject ${count} applications as spam?`)) return
          onRun('reject', { reason: 'spam' })
        }}
        aria-label={`Reject ${count} selected applications as spam`}
        className="px-2.5 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        <XCircle className="w-3.5 h-3.5" /> Reject as spam
      </button>

      <div className="relative">
        <button
          disabled={busy}
          onClick={() => setTagOpen((v) => !v)}
          aria-label={`Tag sector on ${count} selected applications`}
          aria-haspopup="menu"
          aria-expanded={tagOpen}
          className="px-2.5 py-1 text-xs rounded-md bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Tag className="w-3.5 h-3.5" /> Tag sector
        </button>
        {tagOpen && (
          <div className="absolute top-full mt-1 left-0 bg-white text-neutral-900 rounded-md shadow-lg border border-neutral-200 min-w-[160px] overflow-hidden z-10">
            {SECTOR_CYCLE.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setTagOpen(false)
                  onRun('tag', { sector: s })
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 text-xs"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="w-px h-5 bg-neutral-700" />
      <button
        onClick={onClear}
        aria-label="Clear selection"
        className="px-2 py-1 text-xs rounded-md hover:bg-neutral-800 inline-flex items-center gap-1"
      >
        <X className="w-3.5 h-3.5" /> Clear
      </button>
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />}
    </div>
  )
}
