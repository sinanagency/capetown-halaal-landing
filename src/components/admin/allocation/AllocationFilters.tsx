'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TIER_META, TYPE_META, type StallType } from '@/lib/stalls'
import type { MapStall } from '@/components/admin/StallMap'

export type StatusFilter = 'all' | 'available' | 'held' | 'allocated'

export interface AppRowLite {
  id: string
  business_name: string
  categories: string[]
  tier: string | null
  app_status: string
  stall: string | null
}

interface Props {
  stalls: MapStall[]
  applications: AppRowLite[]
  capacity: Record<StallType, number>
  sector: string | null
  setSector: (v: string | null) => void
  tier: string | null
  setTier: (v: string | null) => void
  status: StatusFilter
  setStatus: (v: StatusFilter) => void
}

// Discover sectors from the live application set; never hard-code.
function discoverSectors(apps: AppRowLite[]): string[] {
  const seen = new Set<string>()
  for (const a of apps) for (const c of a.categories || []) if (c) seen.add(c)
  return [...seen].sort()
}

export default function AllocationFilters({
  stalls,
  applications,
  capacity,
  sector,
  setSector,
  tier,
  setTier,
  status,
  setStatus,
}: Props) {
  const sectors = useMemo(() => discoverSectors(applications), [applications])
  const tierKeys = useMemo(() => Object.keys(TIER_META), [])

  // Countdown: "X / Y available" for the active filter slice.
  // - If a tier filter is set, the denominator is the inventory of that tier's
  //   suggested zone (FT/FS/TS/BS). If no tier filter, denominator is the whole
  //   floor.
  // - Numerator is stalls whose status matches the chosen status filter, scoped
  //   to the same zone if a tier is selected.
  const count = useMemo(() => {
    const zone: StallType | null = tier ? TIER_META[tier]?.suggestZone ?? null : null
    const inZone = (s: MapStall) => (zone ? s.type === zone : true)
    const matchesStatus = (s: MapStall) => {
      const st = s.status || 'available'
      if (status === 'all') return true
      return st === status
    }
    const total = zone ? (capacity[zone] || 0) : stalls.length
    const numerator = stalls.filter((s) => inZone(s) && matchesStatus(s)).length
    return { numerator, total, zone }
  }, [stalls, capacity, tier, status])

  const countdownLabel = useMemo(() => {
    if (status === 'available') return 'available'
    if (status === 'allocated') return 'allocated'
    if (status === 'held') return 'held'
    return 'total'
  }, [status])

  const activeChips: { key: string; label: string; clear: () => void }[] = []
  if (sector) activeChips.push({ key: `sec:${sector}`, label: `Sector: ${sector}`, clear: () => setSector(null) })
  if (tier) activeChips.push({ key: `tier:${tier}`, label: `Tier: ${TIER_META[tier]?.label || tier}`, clear: () => setTier(null) })
  if (status !== 'all') activeChips.push({ key: `st:${status}`, label: `Status: ${status}`, clear: () => setStatus('all') })

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: count.numerator === 0 ? '#cd2653' : '#047857' }}
            aria-live="polite"
          >
            {count.numerator}
          </span>
          <span className="text-neutral-400 text-2xl">/</span>
          <span className="text-2xl font-semibold text-neutral-700 tabular-nums">{count.total}</span>
          <span className="text-sm text-neutral-500">
            {countdownLabel}
            {count.zone ? ` in ${TYPE_META[count.zone].label}` : ''}
          </span>
        </div>
        {activeChips.length > 0 && (
          <button
            type="button"
            onClick={() => { setSector(null); setTier(null); setStatus('all') }}
            className="text-xs text-neutral-500 hover:text-[#cd2653] underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <Row title="Status">
          {(['all', 'available', 'held', 'allocated'] as StatusFilter[]).map((s) => (
            <Chip key={s} on={status === s} onClick={() => setStatus(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
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
          {sectors.length === 0 && <span className="text-xs text-neutral-400">No applications yet</span>}
        </Row>

        <Row title="Booth tier">
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
      <span className="text-[11px] uppercase tracking-wide text-neutral-400 w-20 shrink-0 pt-1">{title}</span>
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
