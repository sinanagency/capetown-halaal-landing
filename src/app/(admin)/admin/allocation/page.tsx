'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, MessageSquare, ExternalLink, ArrowRight } from 'lucide-react'
import { AdminPage } from '@/components/admin/AdminPage'
import { RightDrawer } from '@/components/chrome/RightDrawer'
import { StatusPill } from '@/components/chrome/StatusPill'
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
  payment_status?: string
  payment_amount?: number
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
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null)
  const [vendorSearch, setVendorSearch] = useState('')
  const [stallDrawerCode, setStallDrawerCode] = useState<string | null>(null)
  const [drawerDocCount, setDrawerDocCount] = useState(0)
  const [loadingDocs, setLoadingDocs] = useState(false)

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

  // Stall drawer — find the matching application for the clicked stall.
  const drawerApplication = useMemo<AppRow | null>(() => {
    if (!stallDrawerCode || !data) return null
    const stall = data.stalls.find((s) => s.code === stallDrawerCode)
    if (!stall) return null
    const occ = stall.occupant as { id?: string } | null
    if (!occ?.id) return null
    return data.applications.find((a) => a.id === occ.id) || null
  }, [stallDrawerCode, data])

  // Load documents count when drawer opens for an allocated stall.
  useEffect(() => {
    if (!drawerApplication?.id) { setDrawerDocCount(0); return }
    let active = true
    setLoadingDocs(true)
    ;(async () => {
      const supabase = createClient()
      const { data: docs } = await supabase.storage
        .from('vendor_documents')
        .list(drawerApplication.id, { limit: 100 })
      if (!active) return
      setDrawerDocCount((docs || []).length)
      setLoadingDocs(false)
    })()
    return () => { active = false }
  }, [drawerApplication?.id])

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

  // Countdown stats: filtered available / total for the chip.
  const countdownStats = useMemo(() => {
    const total = countdownStalls.length
    const available = countdownStalls.filter((s) => !s.status || s.status === 'available').length
    return { available, total }
  }, [countdownStalls])

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

  // ---- unallocated vendors for left panel ----
  const unallocatedVendors = useMemo(() => {
    if (!data) return []
    return data.applications.filter((a) => {
      if (a.app_status !== 'approved') return false
      if (a.stall) return false
      if (vendorSearch.trim()) {
        const q = vendorSearch.toLowerCase()
        if (!a.business_name.toLowerCase().includes(q)) return false
      }
      if (sector && !(a.categories || []).includes(sector)) return false
      if (tier && a.tier !== tier) return false
      return true
    })
  }, [data, vendorSearch, sector, tier])

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
      <div className="h-dvh overflow-hidden flex items-center justify-center text-neutral-400 bg-neutral-50">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <AdminPage title="Floor plan" caption="BOOTH ALLOCATION">
    <div className="h-dvh overflow-hidden flex flex-col bg-neutral-50">
      <div className="flex-shrink-0 px-6 py-3 border-b border-neutral-200 bg-white flex items-center gap-4">
        <div className="flex-shrink-0">
          <p className="text-[10px] font-semibold text-[#cd2653] uppercase tracking-[0.2em]">Booth allocation</p>
          <h1 className="text-base font-bold text-neutral-900 leading-tight">Floor plan</h1>
        </div>
        {!loading && data && (
          <div className="ml-auto min-w-0 flex-1 flex items-center gap-3">
            <span className="text-xs font-medium text-neutral-500 bg-neutral-100/80 border border-neutral-200 px-2.5 py-1 rounded-full whitespace-nowrap">
              {countdownStats.available}/{countdownStats.total} stalls
            </span>
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

      <div className="flex-1 min-h-0 flex">
        {!loading && data && (
          <div className="w-80 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col overflow-hidden">
            <div className="p-3 border-b border-neutral-100">
              <h2 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">Unallocated Vendors</h2>
              <input
                type="text"
                value={vendorSearch}
                onChange={e => setVendorSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#cd2653]"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {unallocatedVendors.length === 0 ? (
                <div className="p-4 text-xs text-neutral-400">No unallocated vendors found.</div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {unallocatedVendors.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVendor(v.id === selectedVendor ? null : v.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-neutral-50 transition-colors ${
                        selectedVendor === v.id ? 'bg-[#cd2653]/5 border-l-2 border-[#cd2653]' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-neutral-900 truncate">{v.business_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-neutral-500">{v.tier_label}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                          {v.app_status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
              onStallClick={(code) => setStallDrawerCode(code)}
            />
          )}
        </div>

        {/* Stall detail drawer */}
        <RightDrawer
          open={!!stallDrawerCode}
          onClose={() => setStallDrawerCode(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{stallDrawerCode}</span>
              {drawerApplication && (
                <span className="text-xs text-neutral-400 font-normal font-sans">
                  {drawerApplication.tier_label}
                </span>
              )}
            </div>
          }
        >
          {drawerApplication ? (
            <div className="space-y-5 text-sm">
              {/* Vendor name + business */}
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{drawerApplication.business_name}</h3>
                {drawerApplication.contact_name && (
                  <p className="text-sm text-neutral-500 mt-0.5">{drawerApplication.contact_name}</p>
                )}
              </div>

              {/* Category */}
              <div className="border-t border-neutral-100 pt-4">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Category</span>
                <p className="text-sm text-neutral-800">
                  {(drawerApplication.categories || []).join(', ') || '—'}
                </p>
              </div>

              {/* Payment status */}
              <div className="border-t border-neutral-100 pt-4">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Payment</span>
                <StatusPill
                  tone={
                    drawerApplication.payment_status === 'paid' || drawerApplication.payment_status === 'completed'
                      ? 'success'
                      : drawerApplication.payment_status === 'pending' || drawerApplication.payment_status === 'partial'
                      ? 'warn'
                      : 'neutral'
                  }
                  label={drawerApplication.payment_status || 'None'}
                />
                {drawerApplication.payment_amount != null && drawerApplication.payment_amount > 0 && (
                  <p className="text-xs text-neutral-500 mt-1">
                    R{(drawerApplication.payment_amount / 100).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Documents status */}
              <div className="border-t border-neutral-100 pt-4">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Documents</span>
                <p className="text-sm text-neutral-800">
                  {loadingDocs ? (
                    <span className="text-neutral-400">Loading...</span>
                  ) : drawerDocCount > 0 ? (
                    <span className="text-emerald-700">{drawerDocCount} file(s) on record</span>
                  ) : (
                    <span className="text-neutral-400">No documents uploaded</span>
                  )}
                </p>
              </div>

              {/* Quick actions */}
              <div className="border-t border-neutral-100 pt-4 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Quick actions</span>
                <Link
                  href="/admin/customer-inbox"
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors text-neutral-700"
                >
                  <MessageSquare size={14} />
                  <span>Message vendor</span>
                </Link>
                <Link
                  href={`/admin/vendors/${drawerApplication.id}`}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors text-neutral-700"
                >
                  <ExternalLink size={14} />
                  <span>View full profile</span>
                  <ArrowRight size={14} className="ml-auto text-neutral-300" />
                </Link>
                <button
                  type="button"
                  onClick={() => setStallDrawerCode(null)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors text-neutral-700"
                >
                  <ArrowRight size={14} />
                  <span>Reassign stall</span>
                </button>
                <p className="text-[11px] text-neutral-400 pl-1">
                  Use the allocation panel in Floor Command to reassign the stall.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500 py-8 text-center">
              This stall is currently available.
            </div>
          )}
        </RightDrawer>
      </div>
    </div>
    </AdminPage>
  )
}
