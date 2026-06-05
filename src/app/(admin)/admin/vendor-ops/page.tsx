'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Map, Banknote, FileCheck, Megaphone, Sparkles, Loader2, Search, X, MapPin, Phone, Mail, Tag } from 'lucide-react'
import StallMap, { type MapStall } from '@/components/admin/StallMap'
import { TYPE_META, TIER_META, type StallType } from '@/lib/stalls'

interface AppRow {
  id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  categories: string[]
  tier: string | null
  tier_label: string
  app_status: string
  stall: string | null
  stall_status: string | null
  payment_status?: string
  payment_amount?: number
  payment_ref?: string | null
}
interface Avail { total: number; allocated: number; held: number; available: number }
interface StallsResponse {
  stalls: MapStall[]
  availability: Record<StallType, Avail>
  applications: AppRow[]
  grid: { cols: number; rows: number }
  zones: { label: string; col: number; row: number; w: number; h: number }[]
}

const TABS = [
  { k: 'allocation', label: 'Allocation Map', icon: Map },
  { k: 'payments', label: 'Payments', icon: Banknote },
  { k: 'documents', label: 'Documents', icon: FileCheck },
  { k: 'broadcast', label: 'Broadcast', icon: Megaphone },
] as const

export default function VendorOpsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<string>('allocation')
  const [data, setData] = useState<StallsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [chosenApp, setChosenApp] = useState<AppRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('hi everyone, move-in is thursday night, please bring your car pass from the vendor pack and dont be late')
  const [polishing, setPolishing] = useState(false)

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

  const selStall = useMemo(() => data?.stalls.find((s) => s.code === sel) || null, [data, sel])
  const occupant = useMemo(() => {
    if (!sel || !data) return null
    return data.applications.find((a) => a.stall === sel) || (selStall?.occupant as AppRow | null) || null
  }, [sel, data, selStall])

  const filteredApps = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.applications
      .filter((a) => !a.stall || a.stall === sel) // unplaced, or already on this stall
      .filter((a) => !q || a.business_name.toLowerCase().includes(q) || (a.tier_label || '').toLowerCase().includes(q))
      .slice(0, 40)
  }, [data, search, sel])

  function pick(code: string) { setSel(code); setChosenApp(null); setSearch('') }

  async function post(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/stalls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      toast.success(j.message || 'Saved')
      await load()
      setChosenApp(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function polish() {
    if (!msg.trim()) { toast.error('Type a message first'); return }
    setPolishing(true)
    try {
      const res = await fetch('/api/admin/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: msg }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      setMsg((await res.json()).text || msg)
      toast.success('Standardised with AI')
    } catch (e) { toast.error(`AI polish failed: ${e instanceof Error ? e.message : 'error'}`) } finally { setPolishing(false) }
  }

  if (!ready) return <div className="flex items-center justify-center min-h-screen text-neutral-400"><Loader2 className="w-5 h-5 animate-spin" /></div>

  const av = data?.availability
  const approvedCount = data?.applications.filter((a) => a.app_status === 'approved').length || 0
  const placedCount = data?.applications.filter((a) => a.stall).length || 0

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-neutral-900">Vendor Ops</h1>
        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">live data</span>
      </div>
      <p className="text-sm text-neutral-500 mb-5">Stall allocation, payments and broadcasts — driven by your real applications.</p>

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon; const active = tab === t.k
          return (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-[#cd2653] text-[#cd2653]' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      {loading && <div className="flex items-center gap-2 text-neutral-400 text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading live allocation…</div>}

      {!loading && tab === 'allocation' && data && (
        <div>
          {/* live slot counter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {(Object.keys(TYPE_META) as StallType[]).map((t) => {
              const a = av![t]; const full = a.available <= 0
              return (
                <div key={t} className={`rounded-xl border p-3.5 ${full ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-white'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_META[t].color }} />
                    <span className="text-xs font-semibold text-neutral-600">{TYPE_META[t].label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${full ? 'text-red-600' : 'text-neutral-900'}`}>{a.available}<span className="text-sm font-medium text-neutral-400"> / {a.total} left</span></p>
                  <p className="text-[11px] text-neutral-500">{a.allocated} allocated · {a.held} held{full ? ' · FULL' : ''}</p>
                </div>
              )
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex flex-wrap gap-3 text-[11px] text-neutral-500 mb-3 items-center">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-neutral-300 bg-white inline-block" />Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" />Held</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" />Allocated</span>
                <span className="ml-auto">{placedCount} placed · {approvedCount} approved awaiting</span>
              </div>
              <StallMap stalls={data.stalls} grid={data.grid} zones={data.zones} mode="admin" selected={sel} onSelect={pick} />
              <p className="text-[10px] text-neutral-400 mt-2 italic">Layout per the official festival site map. Click a stall to allocate. Numbering is fixed (never changes).</p>
            </div>

            {/* allocation panel */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 h-fit lg:sticky lg:top-24">
              {!selStall ? (
                <div className="text-center text-neutral-400 py-12 text-sm">Select a stall on the plan to allocate it</div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-500 font-medium">Selected stall</p>
                      <p className="text-2xl font-bold">{selStall.code}</p>
                      <p className="text-xs text-neutral-500">{TYPE_META[selStall.type].label} · {av![selStall.type].available} left in zone</p>
                    </div>
                    <button onClick={() => setSel(null)} className="text-neutral-400 hover:text-neutral-700"><X className="w-4 h-4" /></button>
                  </div>

                  {av![selStall.type].available <= 0 && selStall.status === 'available' && (
                    <div className="mt-3 text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-lg p-2">
                      This zone is fully booked. Allocating here exceeds the plan.
                    </div>
                  )}

                  {/* current occupant */}
                  {occupant ? (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-1">Currently {selStall.status}</p>
                      <p className="font-bold text-neutral-900">{occupant.business_name}</p>
                      <p className="text-xs text-neutral-600 flex items-center gap-1 mt-1"><Tag className="w-3 h-3" />{occupant.tier_label}</p>
                      {occupant.contact_name && <p className="text-xs text-neutral-600 mt-0.5">{occupant.contact_name}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-neutral-500">
                        {occupant.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{occupant.phone}</span>}
                        {occupant.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{occupant.email}</span>}
                      </div>
                      <button disabled={saving} onClick={() => post({ stall_code: selStall.code, status: 'clear' })} className="mt-3 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">Clear this stall</button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-neutral-500">Stall is available. Assign an approved vendor:</p>
                  )}

                  {/* assign / move */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-neutral-600">{occupant ? 'Reassign to another vendor' : 'Assign vendor'}</label>
                    <div className="relative mt-1">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search approved vendors…" className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#cd2653]" />
                    </div>
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-neutral-100 divide-y divide-neutral-100">
                      {filteredApps.length === 0 && <p className="text-xs text-neutral-400 p-3">No matching approved vendors.</p>}
                      {filteredApps.map((a) => (
                        <button key={a.id} onClick={() => setChosenApp(a)} className={`w-full text-left px-3 py-2 hover:bg-neutral-50 ${chosenApp?.id === a.id ? 'bg-[#cd2653]/5' : ''}`}>
                          <p className="text-sm font-medium text-neutral-900 truncate">{a.business_name}</p>
                          <p className="text-[11px] text-neutral-500 truncate">{a.tier_label}{a.stall ? ` · currently ${a.stall}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* chosen vendor business info + actions */}
                  {chosenApp && (
                    <div className="mt-4 rounded-lg border border-neutral-200 p-3">
                      <p className="font-bold text-neutral-900">{chosenApp.business_name}</p>
                      <p className="text-xs text-neutral-600 flex items-center gap-1 mt-1"><Tag className="w-3 h-3" />Chosen booth: <b>{chosenApp.tier_label}</b>{chosenApp.tier && TIER_META[chosenApp.tier] ? ` · suggest ${TYPE_META[TIER_META[chosenApp.tier].suggestZone].label}` : ''}</p>
                      {chosenApp.categories?.length > 0 && <p className="text-xs text-neutral-500 mt-1">{chosenApp.categories.join(', ')}</p>}
                      {chosenApp.contact_name && <p className="text-xs text-neutral-600 mt-1">{chosenApp.contact_name}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-neutral-500">
                        {chosenApp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{chosenApp.phone}</span>}
                        {chosenApp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{chosenApp.email}</span>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button disabled={saving} onClick={() => post({ stall_code: selStall.code, application_id: chosenApp.id, status: 'allocated' })} className="flex-1 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-50">{saving ? '…' : 'Allocate'}</button>
                        <button disabled={saving} onClick={() => post({ stall_code: selStall.code, application_id: chosenApp.id, status: 'held' })} className="px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-lg py-2 text-sm disabled:opacity-50">Hold</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'payments' && data && (() => {
        const rows = data.applications.filter((a) => a.app_status === 'approved' || a.stall)
        const amountOf = (r: AppRow) => r.payment_amount ?? (r.tier ? TIER_META[r.tier]?.price || 0 : 0)
        const paidRows = rows.filter((r) => r.payment_status === 'paid')
        const pendingRows = rows.filter((r) => r.payment_status === 'pending')
        const dueRows = rows.filter((r) => r.payment_status !== 'paid')
        const paidSum = paidRows.reduce((s, r) => s + amountOf(r), 0)
        const dueSum = dueRows.reduce((s, r) => s + amountOf(r), 0)
        const pendingSum = pendingRows.reduce((s, r) => s + amountOf(r), 0)
        const pillFor = (s: string | undefined) => {
          if (s === 'paid') return 'bg-green-50 text-green-700 border-green-200'
          if (s === 'pending') return 'bg-blue-50 text-blue-700 border-blue-200'
          if (s === 'deferred') return 'bg-neutral-50 text-neutral-600 border-neutral-200'
          return 'bg-amber-50 text-amber-700 border-amber-200'
        }
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-neutral-200 rounded-xl p-4"><p className="text-xs text-neutral-500">Paid</p><p className="text-2xl font-bold text-green-600">R{paidSum.toLocaleString()}</p><p className="text-[11px] text-neutral-400 mt-0.5">{paidRows.length} vendor{paidRows.length === 1 ? '' : 's'}</p></div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4"><p className="text-xs text-neutral-500">Pending checkout</p><p className="text-2xl font-bold text-blue-600">R{pendingSum.toLocaleString()}</p><p className="text-[11px] text-neutral-400 mt-0.5">{pendingRows.length} vendor{pendingRows.length === 1 ? '' : 's'}</p></div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4"><p className="text-xs text-neutral-500">Outstanding</p><p className="text-2xl font-bold text-amber-600">R{dueSum.toLocaleString()}</p><p className="text-[11px] text-neutral-400 mt-0.5">{dueRows.length} vendor{dueRows.length === 1 ? '' : 's'}</p></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800"><b>Policy:</b> no deposit — full settlement confirms the stall. Full refund if cancelled 8+ weeks before; none after. Payments process via Yoco (card).</div>
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-200"><th className="p-3 font-semibold">Vendor</th><th className="p-3 font-semibold">Chosen booth</th><th className="p-3 font-semibold">Stall</th><th className="p-3 font-semibold">Amount</th><th className="p-3 font-semibold">Payment</th><th className="p-3 font-semibold">Yoco ref</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-neutral-100">
                        <td className="p-3 font-semibold">{r.business_name}</td>
                        <td className="p-3 text-neutral-600">{r.tier_label}</td>
                        <td className="p-3">{r.stall || '—'}</td>
                        <td className="p-3">{amountOf(r) ? `R${amountOf(r).toLocaleString()}` : '—'}</td>
                        <td className="p-3"><span className={`text-[11px] font-semibold border px-2 py-0.5 rounded ${pillFor(r.payment_status)}`}>{r.payment_status || 'none'}</span></td>
                        <td className="p-3 text-xs text-neutral-500 font-mono">{r.payment_ref || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {!loading && tab === 'documents' && data && (() => {
        const foodWords = ['food', 'beverage', 'drink', 'dessert', 'meat', 'bak', 'cater', 'snack', 'restaurant', 'coffee']
        const food = data.applications.filter((a) => (a.categories || []).some((c) => foodWords.some((w) => c.toLowerCase().includes(w))))
        return (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-2xl">
            <p className="font-bold mb-1">Food vendor compliance (COA)</p>
            <p className="text-sm text-neutral-500 mb-4">All food is strictly halaal (vendors vetted). Food vendors must submit a <b>Certificate of Acceptability</b>. {food.length} food vendors detected from real applications.</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {food.length === 0 && <p className="text-sm text-neutral-400">No food vendors found.</p>}
              {food.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200">
                  <div><p className="text-sm font-semibold">{v.business_name}</p><p className="text-xs text-neutral-500">{(v.categories || []).join(', ')}{v.stall ? ` · ${v.stall}` : ''}</p></div>
                  <span className="text-[11px] font-semibold border px-2 py-0.5 rounded bg-neutral-50 text-neutral-500 border-neutral-200">COA required</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {!loading && tab === 'broadcast' && data && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="font-bold mb-3">Compose broadcast</p>
            <label className="text-xs font-semibold text-neutral-600">Audience</label>
            <select className="mt-1 mb-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"><option>All approved vendors ({approvedCount})</option><option>Placed vendors ({placedCount})</option></select>
            <div className="relative">
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653]" />
              <button onClick={polish} disabled={polishing} className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-[#cd2653] to-[#7c1d3a] text-white rounded-lg px-2.5 py-1.5 hover:opacity-90 disabled:opacity-60">
                {polishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}{polishing ? 'Polishing…' : 'Polish with AI'}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">AI (Claude) corrects spelling, grammar and standardises tone before you send.</p>
            <button onClick={() => toast.success(`Queued to ${approvedCount} approved vendors`)} className="mt-3 w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-2.5 text-sm">Queue broadcast</button>
            <p className="text-[11px] text-neutral-400 mt-2">WhatsApp delivery activates once the Meta WABA number is approved.</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="font-bold mb-1 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#cd2653]" />Allocation snapshot</p>
            <p className="text-sm text-neutral-500 mb-4">Live from the plan.</p>
            <div className="space-y-2">
              {(Object.keys(TYPE_META) as StallType[]).map((t) => (
                <div key={t} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_META[t].color }} />{TYPE_META[t].label}</span>
                  <span className="text-neutral-500">{av![t].allocated + av![t].held}/{av![t].total} taken</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
