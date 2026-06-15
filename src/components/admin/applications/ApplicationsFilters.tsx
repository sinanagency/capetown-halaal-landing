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
// dropdown mirrors reality. Falls back to the legacy single-value `sector`
// column when an older row only carries that field.
function discoverSectors(rows: WorkbenchApplication[]): string[] {
  const seen = new Set<string>()
  for (const r of rows) {
    for (const c of r.product_categories || []) if (c) seen.add(c)
    if (r.sector) seen.add(r.sector)
  }
  return [...seen].sort()
}

const STATUS_OPTIONS: { key: StatusGroup; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'info_requested', label: 'Info requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All statuses' },
]

const SCORE_OPTIONS: { key: ScoreBucket; label: string }[] = [
  { key: 'all', label: 'All scores' },
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
      label: `Status: ${STATUS_OPTIONS.find((s) => s.key === status)?.label ?? status}`,
      clear: () => setStatus('open'),
    })
  }
  if (sector) activeChips.push({ key: `sec:${sector}`, label: `Sector: ${sector}`, clear: () => setSector(null) })
  if (score !== 'all') {
    activeChips.push({
      key: `sc:${score}`,
      label: `Score: ${SCORE_OPTIONS.find((s) => s.key === score)?.label ?? score}`,
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

  const clearAll = () => {
    setStatus('open')
    setSector(null)
    setScore('all')
    setTier(null)
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-neutral-400 pr-1">Filter</span>

        <Select
          value={status}
          onChange={(v) => setStatus(v as StatusGroup)}
          options={STATUS_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        />

        <Select
          value={sector ?? ''}
          onChange={(v) => setSector(v === '' ? null : v)}
          options={[
            { value: '', label: 'All sectors' },
            ...sectors.map((s) => ({ value: s, label: s })),
          ]}
          disabled={sectors.length === 0}
        />

        <Select
          value={score}
          onChange={(v) => setScore(v as ScoreBucket)}
          options={SCORE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        />

        <Select
          value={tier ?? ''}
          onChange={(v) => setTier(v === '' ? null : v)}
          options={[
            { value: '', label: 'All tiers' },
            ...tierKeys.map((t) => ({ value: t, label: TIER_META[t].label })),
          ]}
        />

        {anyActive && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto text-xs text-neutral-500 hover:text-[#cd2653] underline"
          >
            Clear all
          </button>
        )}
      </div>

      {anyActive && (
        <div className="mt-2 pt-2 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#cd2653] text-white text-[11px] font-medium hover:bg-[#b51f48] transition-colors"
            >
              {c.label}
              <span aria-hidden className="text-white/70">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'h-8 rounded-md border border-neutral-200 bg-white px-2 pr-7 text-xs font-medium text-neutral-700',
        'focus:outline-none focus:ring-2 focus:ring-[#cd2653]/30 focus:border-[#cd2653]',
        'hover:border-neutral-400 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'appearance-none bg-no-repeat bg-[right_0.4rem_center] bg-[length:0.7em_0.7em]',
        '[background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27%23737373%27%3E%3Cpath%20d=%27M5.23%207.21a.75.75%200%20011.06.02L10%2011.06l3.71-3.83a.75.75%200%20111.08%201.04l-4.25%204.39a.75.75%200%2001-1.08%200L5.21%208.27a.75.75%200%2001.02-1.06z%27/%3E%3C/svg%3E")]'
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
