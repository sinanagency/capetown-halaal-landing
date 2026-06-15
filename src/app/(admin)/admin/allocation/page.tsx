'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import FloorCommand, { type FloorBooth, type FloorApp, type FloorStatus } from '@/components/floor/FloorCommand'
import type { MapStall } from '@/components/admin/StallMap'
import AllocationFilters, { type StatusFilter, type AppRowLite } from '@/components/admin/allocation/AllocationFilters'
import { TIER_META, type StallType } from '@/lib/stalls'

interface AppRow extends AppRowLite {
  contact_name: string | null
  phone: string | null
  email: string | null
  tier_label: string
  stall_status: string | null
}
interface Avail { total: number; allocated: number; held: number; available: number }
interface StallsResponse {
  stalls: MapStall[]
  availability: Record<StallType, Avail>
  applications: AppRow[]
  grid: { cols: number; rows: number }
  zones: { label: string; col: number; row: number; w: number; h: number }[]
}

// Booth allocation page. Renders the EXACT SAME map component the vendor portal
// (/exhibitor/portal/stand) uses — FloorCommand — so admin sees the clean
// fit-to-view rendering, dashed-available chips, and brand-red palette.
// Persistence still routes through /api/admin/stalls (⟦STALL:..⟧ marker,
// stall-allocation law). FloorCommand's onAllocate yields a business_name;
// we resolve it back to application_id via data.applications.
export default function AllocationPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<StallsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter state — controls the live countdown above the map.
  const [sector, setSector] = useState<string | null>(null)
  const [tier, setTier] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stalls')
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      toast.error(`Could not load stalls: ${e instanceof Error ? e.message : 'error'}`)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) { router.push('/admin/login'); return }
      setReady(true)
      load()
    })()
    return () => { active = false }
  }, [router, load])

  // Tier filter narrows which stalls render on the map (countdown applies the
  // sector + status filters too).
  const filteredStalls = useMemo<MapStall[]>(() => {
    if (!data) return []
    const zone: StallType | null = tier ? TIER_META[tier]?.suggestZone ?? null : null
    return data.stalls.filter((s) => (zone ? s.type === zone : true))
  }, [data, tier])

  // For countdown, apply sector + status too.
  const countdownStalls = useMemo<MapStall[]>(() => {
    if (!data) return []
    const zone: StallType | null = tier ? TIER_META[tier]?.suggestZone ?? null : null
    return data.stalls.filter((s) => {
      if (zone && s.type !== zone) return false
      if (status !== 'all') {
        const st = s.status || 'available'
        if (st !== status) return false
      }
      if (sector) {
        const occ = s.occupant as { id?: string } | null
        if (!occ?.id) return false
        const app = data.applications.find((a) => a.id === occ.id)
        if (!app || !(app.categories || []).includes(sector)) return false
      }
      return true
    })
  }, [data, tier, sector, status])

  // ---- Adapter: MapStall[] + zones -> FloorBooth[] (same shape StandView builds) ----
  const booths = useMemo<FloorBooth[]>(() => {
    if (!data) return []
    const stallBooths: FloorBooth[] = filteredStalls.map((s) => {
      const occ = s.occupant as { id?: string; business_name?: string } | null
      return {
        code: s.code,
        type: s.type as FloorBooth['type'],
        col: s.col,
        row: s.row,
        w: s.w,
        h: s.h,
        zone: data.zones.find(
          (z) => s.col >= z.col && s.col < z.col + z.w && s.row >= z.row && s.row < z.row + z.h,
        )?.label || '',
        status: (s.status === 'held' ? 'reserved' : (s.status || 'available')) as FloorStatus,
        vendor: occ?.business_name || null,
        applicationId: occ?.id || null,
      }
    })
    const zoneBooths: FloorBooth[] = data.zones.map((z) => ({
      code: `Z-${z.label.replace(/\s+/g, '-')}`,
      type: 'facility' as const,
      col: z.col,
      row: z.row,
      w: z.w,
      h: z.h,
      zone: z.label,
      status: 'facility' as FloorStatus,
      vendor: null,
      applicationId: null,
    }))
    return [...stallBooths, ...zoneBooths]
  }, [data, filteredStalls])

  // Approved-vendor pool for FloorCommand's vendor-name input + datalist.
  // Filtered by sector + tier so Samreen's narrowing still drives the picker.
  const floorApps = useMemo<FloorApp[]>(() => {
    if (!data) return []
    return data.applications
      .filter((a) => {
        if (a.app_status !== 'approved' && !a.stall) return false
        if (sector && !(a.categories || []).includes(sector)) return false
        if (tier && a.tier !== tier) return false
        return true
      })
      .map((a) => ({
        id: a.id,
        business_name: a.business_name,
        tier_label: a.tier_label,
        stall: a.stall,
      }))
  }, [data, sector, tier])

  // ---- Persistence callbacks wired to /api/admin/stalls ----
  const postStall = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/stalls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
    return j
  }, [])

  const handleAllocate = useCallback(async (
    boothCode: string,
    vendorName: string,
    nextStatus: 'allocated' | 'reserved',
  ) => {
    if (!data) return
    const matched = data.applications.find(
      (a) => a.business_name.toLowerCase() === vendorName.toLowerCase(),
    ) || data.applications.find(
      (a) => a.business_name.toLowerCase().includes(vendorName.toLowerCase()),
    )
    if (!matched) {
      throw new Error(`No approved vendor named "${vendorName}". Approve them under Applications first.`)
    }
    await postStall({ stall_code: boothCode, application_id: matched.id, status: nextStatus })
    await load()
  }, [data, postStall, load])

  const handleRelease = useCallback(async (boothCode: string) => {
    await postStall({ stall_code: boothCode, status: 'clear' })
    await load()
  }, [postStall, load])

  const handleToggleBlock = useCallback(async (boothCode: string, nextBlocked: boolean) => {
    await postStall({ stall_code: boothCode, status: nextBlocked ? 'blocked' : 'clear' })
    await load()
  }, [postStall, load])

  if (!ready) {
    return (
      <div className="h-screen overflow-hidden flex items-center justify-center text-neutral-400 bg-neutral-50">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-neutral-50">
      <div className="flex-shrink-0 px-6 py-3 border-b border-neutral-200 bg-white flex items-center gap-4">
        <div className="flex-shrink-0">
          <p className="text-[10px] font-semibold text-[#cd2653] uppercase tracking-[0.2em]">Booth allocation</p>
          <h1 className="text-base font-bold text-neutral-900 leading-tight">Floor plan</h1>
        </div>
        {!loading && data && (
          <div className="ml-auto min-w-0 flex-1">
            <AllocationFilters
              stalls={countdownStalls}
              applications={data.applications}
              capacity={Object.fromEntries(
                (Object.keys(data.availability) as StallType[]).map((t) => [t, data.availability[t].total])
              ) as Record<StallType, number>}
              sector={sector}
              setSector={setSector}
              tier={tier}
              setTier={setTier}
              status={status}
              setStatus={setStatus}
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-white">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2 text-neutral-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading live allocation...
          </div>
        )}
        {!loading && data && (
          <FloorCommand
            mode="admin"
            hideModeSwitch
            booths={booths}
            grid={data.grid}
            applications={floorApps}
            onAllocate={handleAllocate}
            onRelease={handleRelease}
            onToggleBlock={handleToggleBlock}
          />
        )}
      </div>
    </div>
  )
}
