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
  // - If a sector filter is set, both numerator and denominator are scoped to
  //   stalls occupied by an application whose categories include that sector.
  // - Numerator is stalls whose status matches the chosen status filter, scoped
  //   to the same zone (and sector) if those filters are set.
  const count = useMemo(() => {
    const zone: StallType | null = tier ? TIER_META[tier]?.suggestZone ?? null : null
    const sectorStallCodes: Set<string> | null = sector
      ? new Set(
          applications
            .filter((a) => (a.categories || []).includes(sector) && a.stall)
            .map((a) => a.stall as string)
        )
      : null
    const inZone = (s: MapStall) => (zone ? s.type === zone : true)
    const inSector = (s: MapStall) => (sectorStallCodes ? sectorStallCodes.has(s.code) : true)
    const matchesStatus = (s: MapStall) => {
      const st = s.status || 'available'
      if (status === 'all') return true
      return st === status
    }
    const inUniverse = (s: MapStall) => inZone(s) && inSector(s)
    const total = sectorStallCodes
      ? stalls.filter(inUniverse).length
      : zone
      ? capacity[zone] || 0
      : stalls.length
    const numerator = stalls.filter((s) => inUniverse(s) && matchesStatus(s)).length
    return { numerator, total, zone }
  }, [stalls, capacity, tier, status, sector, applications])

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

  const selectCls = 'h-8 rounded-md border border-neutral-200 bg-white px-2 pr-7 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#cd2653]/30 focus:border-[#cd2653] appearance-none bg-no-repeat'
  const selectChevron: React.CSSProperties = {
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23737373' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundSize: '10px 6px',
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3 mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-neutral-400 pr-1">Filter</span>

        <select className={selectCls} style={selectChevron} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="held">Held</option>
          <option value="allocated">Allocated</option>
        </select>

        <select className={selectCls} style={selectChevron} value={sector ?? ''} onChange={(e) => setSector(e.target.value === '' ? null : e.target.value)}>
          <option value="">All sectors</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className={selectCls} style={selectChevron} value={tier ?? ''} onChange={(e) => setTier(e.target.value === '' ? null : e.target.value)}>
          <option value="">All tiers</option>
          {tierKeys.map((t) => <option key={t} value={t}>{TIER_META[t].label}</option>)}
        </select>

        <span
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 tabular-nums"
          aria-live="polite"
        >
          <span className="font-semibold" style={{ color: count.numerator === 0 ? '#cd2653' : '#047857' }}>
            {count.numerator}
          </span>
          <span className="text-neutral-400">of</span>
          <span className="font-semibold">{count.total}</span>
          <span className="text-neutral-500">{countdownLabel}{count.zone ? ` in ${TYPE_META[count.zone].label}` : ''}</span>
        </span>

        {activeChips.length > 0 && (
          <button
            type="button"
            onClick={() => { setSector(null); setTier(null); setStatus('all') }}
            className="text-xs text-neutral-500 hover:text-[#cd2653] underline"
          >
            Clear all
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-100">
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

      {/* legacy chip rows hidden — kept rendering paths below for downstream reuse */}
      <div className="hidden">
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
