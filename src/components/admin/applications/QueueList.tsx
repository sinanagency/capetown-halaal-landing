'use client'

// Compact left-pane row list. Keyboard-driven: j/k changes focus, x toggles
// bulk-select on the focused row, Enter opens detail.
//
// Rendering rule: every row is one line, fixed-height (40px) so 50 rows fit on
// a 13" laptop without scroll-jumping. Bigger surfaces (description,
// special_requirements, ai sector suggestions) live in the right-rail preview.

import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SECTOR_CYCLE, type WorkbenchApplication } from './types'
import { Z_CLASS } from '@/lib/z'

type RowAction =
  | { kind: 'approve' }
  | { kind: 'reject'; reason: string }
  | { kind: 'request_info'; reason: string }
  | { kind: 'tag'; sector: string }

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-rose-500',
  info_requested: 'bg-sky-500',
}

function daysAgo(iso: string): number {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400_000))
}

function CompletenessDot({ score }: { score: number | null | undefined }) {
  const s = typeof score === 'number' ? score : 0
  const tone =
    s >= 80 ? 'bg-emerald-500'
    : s >= 50 ? 'bg-amber-500'
    : 'bg-rose-500'
  return (
    <span className="inline-flex items-center gap-1 tabular-nums text-[10px] text-neutral-500">
      <span className={cn('w-1.5 h-1.5 rounded-full', tone)} />
      {s}
    </span>
  )
}

export function QueueList({
  rows,
  focusedId,
  selectedIds,
  onFocus,
  onOpen,
  onAction,
}: {
  rows: WorkbenchApplication[]
  focusedId: string | null
  selectedIds: Set<string>
  onFocus: (id: string) => void
  onOpen: (id: string) => void
  /**
   * Mobile-only row actions. Desktop keeps the keyboard layer the page owns;
   * mobile users get the same set of intents via a per-row kebab menu so they
   * can triage on phone without a hardware keyboard.
   */
  onAction?: (id: string, action: RowAction) => void
}) {
  // Track which row currently has its action menu open. Single open at a
  // time, click anywhere else closes it.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [tagPickerId, setTagPickerId] = useState<string | null>(null)
  useEffect(() => {
    if (!openMenuId && !tagPickerId) return
    function close() { setOpenMenuId(null); setTagPickerId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId, tagPickerId])
  // Keep the focused row in view when j/k changes focus to a row that
  // scrolled out of the viewport.
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusedId || !containerRef.current) return
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-row-id="${focusedId}"]`
    )
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedId])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-sm">
        Queue is clear.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto h-full divide-y divide-neutral-100"
      role="listbox"
      aria-label="Application queue"
    >
      {rows.map((r) => {
        const isFocused = r.id === focusedId
        const isSelected = selectedIds.has(r.id)
        const age = daysAgo(r.created_at)
        const menuOpen = openMenuId === r.id
        const tagOpen = tagPickerId === r.id

        function fireAction(action: RowAction) {
          setOpenMenuId(null)
          setTagPickerId(null)
          onAction?.(r.id, action)
        }

        return (
          <div
            key={r.id}
            data-row-id={r.id}
            role="option"
            aria-selected={isFocused}
            tabIndex={-1}
            onClick={() => onFocus(r.id)}
            onDoubleClick={() => onOpen(r.id)}
            className={cn(
              'group relative w-full text-left px-3 py-2 grid grid-cols-[8px_1fr_auto] items-center gap-2 hover:bg-neutral-50 transition-colors cursor-pointer',
              isFocused && 'bg-[#cd2653]/5 ring-1 ring-inset ring-[#cd2653]/30',
              isSelected && 'bg-amber-50/60'
            )}
          >
            <span
              className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[r.status] ?? 'bg-neutral-300')}
              aria-label={r.status}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-neutral-900">
                {r.business_name}
                {r.is_duplicate && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
                    dup
                  </span>
                )}
              </span>
              <span className="block truncate text-[11px] text-neutral-500">
                {r.contact_name} · {r.phone || 'no phone'}
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] tabular-nums text-neutral-400">
                {age}d
              </span>
              <CompletenessDot score={r.completeness_score} />
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
              {/* Mobile-only row kebab. Desktop hides it, since `j/k/a/r/i/t`
                  on the keyboard already cover the same intents. */}
              {onAction && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFocus(r.id)
                    setOpenMenuId(menuOpen ? null : r.id)
                    setTagPickerId(null)
                  }}
                  aria-label={`Actions for ${r.business_name}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="md:hidden p-1.5 -m-1.5 text-neutral-500 hover:text-neutral-900"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </span>

            {/* Mobile action popover. Lives inside the row so positioning is
                anchored to it without portal gymnastics. */}
            {menuOpen && onAction && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'md:hidden absolute right-2 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg min-w-[180px] overflow-hidden',
                  Z_CLASS.dropdown
                )}
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => fireAction({ kind: 'approve' })}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-50"
                  role="menuitem"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt(
                      'Info-request reason:',
                      'We still need your halaal certificate and trading licence to finalise review.'
                    )
                    if (reason === null) return
                    fireAction({ kind: 'request_info', reason })
                  }}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-50"
                  role="menuitem"
                >
                  Request info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt('Reason for reject?') ?? ''
                    if (!reason.trim()) return
                    fireAction({ kind: 'reject', reason })
                  }}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-50 text-rose-700"
                  role="menuitem"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null)
                    setTagPickerId(r.id)
                  }}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-50"
                  role="menuitem"
                >
                  Tag sector...
                </button>
              </div>
            )}

            {tagOpen && onAction && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'md:hidden absolute right-2 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg min-w-[160px] overflow-hidden',
                  Z_CLASS.dropdown
                )}
                role="menu"
              >
                {SECTOR_CYCLE.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => fireAction({ kind: 'tag', sector: s })}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-50"
                    role="menuitem"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
