'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TIER_META } from '@/lib/stalls'
import type { WorkbenchApplication } from './types'

export type StatusGroup = 'open' | 'pending' | 'info_requested' | 'approved' | 'rejected' | 'all'
export type ScoreBucket = 'all' | 'low' | 'mid' | 'high'

interface Props {
  rows: WorkbenchApplication[]
  status: StatusGroup
  setStatus: (v: StatusGroup) => void
  sector: string | null
  setSector: (v: string | null) => void
  score: ScoreBucket
  setScore: (v: ScoreBucket) => void
  tier: string | null
  setTier: (v: string | null) => void
}

// Pull the union of every product_categories entry off the loaded rows so the
// chip strip mirrors reality. Falls back to the legacy single-value `sector`
// column when an older row only carries that field.
function discoverSectors(rows: WorkbenchApplication[]): string[] {
  const seen = new Set<string>()
  for (const r of rows) {
    for (const c of r.product_categories || []) if (c) seen.add(c)
    if (r.sector) seen.add(r.sector)
  }
  return [...seen].sort()
}

const STATUS_CHIPS: { key: StatusGroup; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'info_requested', label: 'Info requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const SCORE_CHIPS: { key: ScoreBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High (80+)' },
  { key: 'mid', label: 'Mid (40 to 79)' },
  { key: 'low', label: 'Low (under 40)' },
]

export default function ApplicationsFilters({
  rows,
  status,
  setStatus,
  sector,
  setSector,
  score,
  setScore,
  tier,
  setTier,
}: Props) {
  const sectors = useMemo(() => discoverSectors(rows), [rows])
  const tierKeys = useMemo(() => Object.keys(TIER_META), [])

  const activeChips: { key: string; label: string; clear: () => void }[] = []
  if (status !== 'open') {
    activeChips.push({
      key: `st:${status}`,
      label: `Status: ${STATUS_CHIPS.find((s) => s.key === status)?.label ?? status}`,
      clear: () => setStatus('open'),
    })
  }
  if (sector) activeChips.push({ key: `sec:${sector}`, label: `Sector: ${sector}`, clear: () => setSector(null) })
  if (score !== 'all') {
    activeChips.push({
      key: `sc:${score}`,
      label: `Score: ${SCORE_CHIPS.find((s) => s.key === score)?.label ?? score}`,
      clear: () => setScore('all'),
    })
  }
  if (tier) {
    activeChips.push({
      key: `tier:${tier}`,
      label: `Tier: ${TIER_META[tier]?.label || tier}`,
      clear: () => setTier(null),
    })
  }

  const anyActive = activeChips.length > 0

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
      {anyActive && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#cd2653] text-white text-[11px] font-medium"
            >
              {c.label}
              <span aria-hidden className="text-white/70">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setStatus('open')
              setSector(null)
              setScore('all')
              setTier(null)
            }}
            className="ml-1 text-xs text-neutral-500 hover:text-[#cd2653] underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className={cn('space-y-2', anyActive && 'pt-2 border-t border-neutral-100')}>
        <Row title="Status">
          {STATUS_CHIPS.map((s) => (
            <Chip key={s.key} on={status === s.key} onClick={() => setStatus(s.key)}>
              {s.label}
            </Chip>
          ))}
        </Row>

        <Row title="Sector">
          <Chip on={sector === null} onClick={() => setSector(null)}>All</Chip>
          {sectors.map((s) => (
            <Chip key={s} on={sector === s} onClick={() => setSector(s)}>
              {s}
            </Chip>
          ))}
          {sectors.length === 0 && (
            <span className="text-xs text-neutral-400">No sectors on visible rows</span>
          )}
        </Row>

        <Row title="Score">
          {SCORE_CHIPS.map((s) => (
            <Chip key={s.key} on={score === s.key} onClick={() => setScore(s.key)}>
              {s.label}
            </Chip>
          ))}
        </Row>

        <Row title="Tier">
          <Chip on={tier === null} onClick={() => setTier(null)}>All</Chip>
          {tierKeys.map((t) => (
            <Chip key={t} on={tier === t} onClick={() => setTier(t)}>
              {TIER_META[t].label}
            </Chip>
          ))}
        </Row>
      </div>
    </div>
  )
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-wide text-neutral-400 w-16 shrink-0 pt-1">{title}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full border text-xs font-medium transition-colors',
        on
          ? 'bg-[#cd2653] text-white border-[#cd2653]'
          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
      )}
    >
      {children}
    </button>
  )
}
