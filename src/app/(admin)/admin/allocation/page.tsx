'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Search, X, MapPin } from 'lucide-react'
import StallMap, { type MapStall } from '@/components/admin/StallMap'
import AllocationFilters, { type StatusFilter, type AppRowLite } from '@/components/admin/allocation/AllocationFilters'
import { TYPE_META, TIER_META, type StallType } from '@/lib/stalls'

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

// Booth allocation page with 2D floorplan map. Samreen picks a stall on the map,
// then assigns it to an approved vendor (filtered by Sector / Booth Tier).
// Reuses the existing /api/admin/stalls endpoint so persistence stays on the
// ⟦STALL:..⟧ marker (stall-allocation law).
export default function AllocationPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<StallsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [chosenApp, setChosenApp] = useState<AppRow | null>(null)
  const [saving, setSaving] = useState(false)

  // Filter state — controls both the map highlight and the live countdown.
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

  // Apply the filter to the map: stalls not matching are dimmed via status='available'
  // proxy (we don't mutate originals — we keep allocated/held visible, just lower
  // their visual weight when out of slice). For countdown we count only in-slice.
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
        // sector filter applies to OCCUPIED stalls only — narrowing what shows
        // up as "X allocated in this sector"
        const occ = s.occupant as { id?: string } | null
        if (!occ?.id) return false
        const app = data.applications.find((a) => a.id === occ.id)
        if (!app || !(app.categories || []).includes(sector)) return false
      }
      return true
    })
  }, [data, tier, sector, status])

  // Approved-only vendor pool, sector + tier filtered, for the "assign" dropdown.
  const eligibleApps = useMemo<AppRow[]>(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.applications.filter((a) => {
      if (a.app_status !== 'approved' && !a.stall) return false
      if (a.stall && a.stall !== sel) return false
      if (sector && !(a.categories || []).includes(sector)) return false
      if (tier && a.tier !== tier) return false
      if (q && !a.business_name.toLowerCase().includes(q)) return false
      return true
    }).slice(0, 40)
  }, [data, sector, tier, search, sel])

  const selStall = useMemo(() => data?.stalls.find((s) => s.code === sel) || null, [data, sel])
  const occupant = useMemo(() => {
    if (!sel || !data) return null
    return data.applications.find((a) => a.stall === sel) || null
  }, [sel, data])

  function pick(code: string) { setSel(code); setChosenApp(null); setSearch('') }

  async function post(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/stalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      toast.success(j.message || 'Saved')
      await load()
      setChosenApp(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-1">
        <p className="text-xs font-semibold text-[#cd2653] uppercase tracking-[0.2em]">BOOTH ALLOCATION</p>
        <h1 className="text-2xl font-bold text-neutral-900">Floor plan</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Pick a stall, then assign it to an approved vendor. Filter by sector or tier to narrow the pool.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading live allocation…
        </div>
      )}

      {!loading && data && (
        <div className="mt-5 grid lg:grid-cols-[1fr_360px] gap-4">
          <div>
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

            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <StallMap
                stalls={filteredStalls}
                grid={data.grid}
                zones={data.zones}
                mode="admin"
                selected={sel}
                onSelect={pick}
              />
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-600">
                {(Object.keys(TYPE_META) as StallType[]).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_META[t].color }} />
                    {TYPE_META[t].label}
                    <span className="text-neutral-400">
                      ({data.availability[t].allocated + data.availability[t].held}/{data.availability[t].total})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="font-semibold text-neutral-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#cd2653]" />
              {sel ? `Stall ${sel}` : 'Pick a stall'}
            </p>
            {!sel && (
              <p className="text-sm text-neutral-500 mt-2">
                Click a stall on the map to assign it.
              </p>
            )}

            {sel && selStall && (
              <div className="mt-3 space-y-3 text-sm">
                <div className="text-xs text-neutral-500">
                  Zone: <span className="font-medium text-neutral-700">{TYPE_META[selStall.type].label}</span>
                </div>
                {occupant ? (
                  <div className="rounded-lg border border-[#cd2653]/30 bg-[#F8DCE3] p-3">
                    <p className="font-semibold text-[#cd2653]">{occupant.business_name}</p>
                    <p className="text-xs text-[#cd2653]/80 mt-1">{occupant.tier_label}</p>
                    <button
                      type="button"
                      onClick={() => post({ stall_code: sel, status: 'clear' })}
                      disabled={saving}
                      className="mt-3 w-full text-xs font-semibold text-[#cd2653] underline hover:no-underline disabled:opacity-50"
                    >
                      {saving ? 'Working…' : 'Release this stall'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search vendor…"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                      />
                    </div>
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                      {eligibleApps.length === 0 ? (
                        <p className="text-xs text-neutral-400 p-3">
                          No approved vendors match the current sector/tier filter.
                        </p>
                      ) : (
                        eligibleApps.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setChosenApp(a)}
                            className={`w-full text-left p-2.5 text-sm hover:bg-neutral-50 ${
                              chosenApp?.id === a.id ? 'bg-[#F8DCE3]/40' : ''
                            }`}
                          >
                            <p className="font-medium text-neutral-900 truncate">{a.business_name}</p>
                            <p className="text-[11px] text-neutral-500 truncate">{a.tier_label}</p>
                          </button>
                        ))
                      )}
                    </div>
                    {chosenApp && (
                      <button
                        type="button"
                        onClick={() => post({ stall_code: sel, application_id: chosenApp.id, status: 'allocated' })}
                        disabled={saving}
                        className="w-full bg-[#cd2653] hover:bg-[#bf3026] text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Assign {chosenApp.business_name} to {sel}
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" /> Close
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
