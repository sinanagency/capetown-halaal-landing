'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Map, Banknote, FileCheck, Megaphone, Shield, Sparkles, Loader2 } from 'lucide-react'

type Status = 'open' | 'held' | 'paid'
type Cat = 'FT' | 'FS' | 'TS' | 'BS'
interface Stand { id: string; cat: Cat; status: Status; vendor: number }

// Real plan counts (from the festival site map)
const DIST: Record<Cat, number> = { FT: 47, FS: 117, TS: 79, BS: 37 }
const CAT_NAME: Record<Cat, string> = {
  FT: 'Food & Treats', FS: 'Fashion & Style', TS: 'Trending & Services', BS: 'Business & Sponsors',
}
const CAT_TINT: Record<Cat, string> = { FT: '#bfdbfe', FS: '#fde68a', TS: '#e9d5ff', BS: '#fed7aa' }
const VENDORS = ['— unassigned —', 'Bismillah Foods', 'Cape Spice Co', 'Halal Bites', 'Modest Threads', 'Atlas Spices', 'Zaitoun Beauty', 'Sunnah Living', 'Barakah Books', 'Nour Textiles', 'Madinah Sweets']

function genStands(): Record<string, Stand> {
  const out: Record<string, Stand> = {}
  ;(Object.keys(DIST) as Cat[]).forEach((c) => {
    for (let i = 1; i <= DIST[c]; i++) {
      const id = `${c}-${i}`
      const r = (i * 7) % 10
      const status: Status = r < 4 ? 'paid' : r < 6 ? 'held' : 'open'
      out[id] = { id, cat: c, status, vendor: status === 'open' ? 0 : 1 + (i % 10) }
    }
  })
  return out
}

const TABS = [
  { k: 'allocation', label: 'Allocation Map', icon: Map },
  { k: 'payments', label: 'Payments', icon: Banknote },
  { k: 'documents', label: 'Documents', icon: FileCheck },
  { k: 'broadcast', label: 'Broadcast & Live', icon: Megaphone },
  { k: 'users', label: 'Users & Audit', icon: Shield },
] as const

export default function VendorOpsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<string>('allocation')
  const [stands, setStands] = useState<Record<string, Stand>>(genStands)
  const [sel, setSel] = useState<string | null>(null)
  const [vendorPick, setVendorPick] = useState(0)
  const [statusPick, setStatusPick] = useState<Status>('open')
  const [msg, setMsg] = useState('hi everyone move in is thursday night pls bring ur car pass from the vendor pack dont be late')
  const [polishing, setPolishing] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) { router.push('/admin/login'); return }
      setReady(true)
    })()
    return () => { active = false }
  }, [router])

  const counts = useMemo(() => {
    const vals = Object.values(stands)
    return { total: vals.length, paid: vals.filter((s) => s.status === 'paid').length, alloc: vals.filter((s) => s.vendor > 0).length }
  }, [stands])

  function pick(id: string) { setSel(id); setVendorPick(stands[id].vendor); setStatusPick(stands[id].status) }
  function save() {
    if (!sel) return
    setStands((prev) => ({ ...prev, [sel]: { ...prev[sel], vendor: vendorPick, status: statusPick } }))
    toast.success(`${sel} → ${VENDORS[vendorPick]} (${statusPick})`)
  }

  async function polish() {
    if (!msg.trim()) { toast.error('Type a message first'); return }
    setPolishing(true)
    try {
      const res = await fetch('/api/admin/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: msg }) })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      const data = await res.json()
      setMsg(data.text || msg)
      toast.success('Standardised with AI')
    } catch (err) {
      toast.error(`AI polish failed: ${err instanceof Error ? err.message : 'error'}`)
    } finally { setPolishing(false) }
  }

  function color(s: Stand): string { return s.status === 'paid' ? '#22c55e' : s.status === 'held' ? '#fcd34d' : CAT_TINT[s.cat] }
  function ids(c: Cat, from: number, to: number): string[] {
    return Array.from({ length: to - from + 1 }, (_, i) => `${c}-${from + i}`).filter((id) => stands[id])
  }
  function Cell({ id }: { id: string }) {
    const s = stands[id]
    if (!s) return null
    return (
      <button onClick={() => pick(id)} title={`${id} · ${s.status}${s.vendor ? ' · ' + VENDORS[s.vendor] : ''}`}
        className="rounded-[2px] h-4 text-[6px] font-bold flex items-center justify-center hover:scale-150 transition-transform"
        style={{ background: color(s), color: s.status === 'paid' ? '#fff' : '#475569', outline: sel === id ? '2px solid #cd2653' : 'none' }}>
        {s.id.split('-')[1]}
      </button>
    )
  }
  function Grid({ list, cols }: { list: string[]; cols: number }) {
    return <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{list.map((id) => <Cell key={id} id={id} />)}</div>
  }
  const zone = 'rounded text-[9px] font-semibold flex items-center justify-center text-center px-1'

  if (!ready) return <div className="flex items-center justify-center min-h-screen text-neutral-400"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-neutral-900">Vendor Ops</h1>
        <span className="text-[11px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded">added module</span>
      </div>
      <p className="text-sm text-neutral-500 mb-5">Allocation, payments, documents, broadcasts and audit, alongside your existing admin.</p>

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

      {tab === 'allocation' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-neutral-500">All {counts.total} stands · <span className="font-semibold text-neutral-900">{counts.alloc} allocated · {counts.paid} paid</span></p>
            <div className="flex gap-3 text-[11px] text-neutral-500 items-center flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#bfdbfe' }} />FT Food</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#fde68a' }} />FS Fashion</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#e9d5ff' }} />TS Services</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#fed7aa' }} />BS Business</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" />Held</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" />Paid</span>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-4 overflow-x-auto">
              <div className="rounded-lg border border-emerald-200 p-3" style={{ background: '#e8f3e3', minWidth: 700 }}>
                <div className="flex justify-between text-[10px] text-neutral-500 mb-2"><span>↖ EXIT TO ROADWAY</span><span>PARKING ▶</span></div>
                <div className="flex gap-2">
                  <div className="shrink-0"><p className="text-[8px] font-bold text-blue-700 mb-1">FT ↓</p><Grid list={ids('FT', 1, 30)} cols={2} /></div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 h-12">
                      <div className={`${zone} bg-orange-100 text-orange-700 flex-1`}>🎡 Food Court & Rides</div>
                      <div className={`${zone} bg-lime-100 text-lime-700 w-20`}>Jump City 15×15</div>
                      <div className={`${zone} bg-pink-100 text-pink-600 w-16`}>Carnival Tickets</div>
                    </div>
                    <div className="flex gap-2 items-stretch">
                      <div className={`${zone} bg-neutral-200 text-neutral-500 w-16`}>40×20</div>
                      <div className="flex-1"><p className="text-[8px] font-bold text-orange-700 mb-0.5">BUSINESS & SPONSORS (BS)</p><Grid list={ids('BS', 1, 37)} cols={13} /></div>
                      <div className={`${zone} bg-neutral-200 text-neutral-500 w-14`}>15×25</div>
                    </div>
                    <div className="border-2 border-neutral-300 rounded p-1.5 bg-white/40">
                      <p className="text-[8px] font-bold text-neutral-500 text-center mb-1">▼ ENTRANCE · EXHIBITION HALL · ENTRANCE ▼</p>
                      <p className="text-[8px] font-bold text-amber-700 mb-0.5">FASHION & STYLE (FS)</p>
                      <Grid list={ids('FS', 1, 60)} cols={20} />
                      <div className="bg-[#cd2653]/80 text-white text-[8px] text-center rounded my-1 py-0.5 font-semibold">◀ MAIN WALKWAY ▶</div>
                      <p className="text-[8px] font-bold text-purple-700 mb-0.5">TRENDING & SERVICES (TS)</p>
                      <Grid list={ids('TS', 1, 79)} cols={20} />
                      <p className="text-[8px] font-bold text-amber-700 mb-0.5 mt-1">FASHION & STYLE (FS) cont.</p>
                      <Grid list={ids('FS', 61, 117)} cols={20} />
                    </div>
                    <div className="flex gap-2 h-9">
                      <div className={`${zone} bg-emerald-100 text-emerald-700 w-24`}>🕌 Salaah Facilities</div>
                      <div className={`${zone} bg-yellow-100 text-yellow-700 w-20`}>⚡ Generator</div>
                      <div className={`${zone} bg-neutral-100 text-neutral-500 flex-1`}>🚻 Toilets</div>
                    </div>
                  </div>
                  <div className="shrink-0 w-16 flex flex-col gap-1">
                    <p className="text-[8px] font-bold text-blue-700">FT</p>
                    <Grid list={ids('FT', 31, 47)} cols={2} />
                    <div className={`${zone} bg-sky-50 text-sky-500 flex-1 mt-1`}>🚗 Parking</div>
                  </div>
                </div>
                <p className="text-[8px] text-neutral-400 mt-2 italic">Layout provisional &amp; indicative, subject to organiser discretion (per festival site map). · 100m</p>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-5 h-fit lg:sticky lg:top-24">
              {!sel ? (
                <div className="text-center text-neutral-400 py-12 text-sm">Select a stand on the plan</div>
              ) : (
                <div>
                  <p className="text-xs text-neutral-500 font-medium">Selected stand</p>
                  <p className="text-2xl font-bold">{sel}</p>
                  <p className="text-xs text-neutral-500 mb-4">{CAT_NAME[stands[sel].cat]} zone</p>
                  <label className="text-xs font-semibold text-neutral-600">Assign vendor</label>
                  <select value={vendorPick} onChange={(e) => setVendorPick(Number(e.target.value))} className="mt-1 mb-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653]">
                    {VENDORS.map((v, i) => <option key={i} value={i}>{v}</option>)}
                  </select>
                  <label className="text-xs font-semibold text-neutral-600">Status</label>
                  <select value={statusPick} onChange={(e) => setStatusPick(e.target.value as Status)} className="mt-1 mb-4 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653]">
                    <option value="open">Open</option><option value="held">Held</option><option value="paid">Paid / confirmed</option>
                  </select>
                  <button onClick={save} className="w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-2.5 text-sm">Save allocation</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <b>Policy:</b> no deposit — full settlement of stall costs required to confirm. Refund: full if cancelled 8+ weeks before the festival, none after.
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between"><p className="font-bold">Payments</p><span className="text-xs text-neutral-500">R312k outstanding</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-200"><th className="p-3 font-semibold">Vendor</th><th className="p-3 font-semibold">Stand</th><th className="p-3 font-semibold">Amount</th><th className="p-3 font-semibold">Status</th><th className="p-3 font-semibold text-right">Action</th></tr></thead>
                <tbody>
                  {[['Bismillah Foods', 'FT-12', 'R6,500', 'unpaid'], ['Modest Threads', 'FS-4', 'R8,200', 'paid'], ['Cape Spice Co', 'FT-7', 'R6,500', 'unpaid'], ['Atlas Spices', 'FS-3', 'R5,650', 'paid']].map(([v, st, a, s]) => (
                    <tr key={st} className="border-b border-neutral-100">
                      <td className="p-3 font-semibold">{v}</td><td className="p-3">{st}</td><td className="p-3">{a}</td>
                      <td className="p-3"><span className={`text-[11px] font-semibold border px-2 py-0.5 rounded ${s === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{s}</span></td>
                      <td className="p-3 text-right">{s === 'paid' ? <span className="text-green-600 text-xs">paid</span> : <button onClick={() => toast.success('Marked paid')} className="text-xs font-semibold text-[#cd2653] hover:underline">Confirm</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-2xl">
          <p className="font-bold mb-1">Document review</p>
          <p className="text-sm text-neutral-500 mb-4">Food vendors must submit a <b>COA</b>. All food is strictly halaal (vendors vetted, no certificate upload). Non-food vendors have no required documents.</p>
          <div className="space-y-3">
            {[['Bismillah Foods', 'COA (food vendor)'], ['Cape Spice Co', 'COA (food vendor)'], ['Halal Bites', 'COA (food vendor)']].map(([v, doc]) => (
              <div key={v} className="flex items-center justify-between p-3.5 rounded-lg border border-neutral-200">
                <div><p className="text-sm font-semibold">{doc}</p><p className="text-xs text-neutral-500">{v}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => toast.success('Approved')} className="text-xs font-semibold text-green-600 border border-green-200 bg-green-50 rounded-lg px-2.5 py-1.5">Approve</button>
                  <button onClick={() => toast('Rejected')} className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 rounded-lg px-2.5 py-1.5">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'broadcast' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="font-bold mb-3">Compose broadcast</p>
            <label className="text-xs font-semibold text-neutral-600">Audience</label>
            <select className="mt-1 mb-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"><option>All vendors</option><option>One zone (Food)</option><option>Unpaid only</option><option>All attendees</option></select>
            <label className="text-xs font-semibold text-neutral-600">Channels</label>
            <div className="flex gap-3 my-2 text-sm">
              <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-[#cd2653]" /> Portal</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-[#cd2653]" /> WhatsApp</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-[#cd2653]" /> Email</label>
            </div>
            <div className="relative">
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653]" />
              <button onClick={polish} disabled={polishing} className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-[#cd2653] to-[#7c1d3a] text-white rounded-lg px-2.5 py-1.5 hover:opacity-90 disabled:opacity-60">
                {polishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}{polishing ? 'Polishing…' : 'Polish with AI'}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">AI (Claude) corrects spelling, grammar and standardises tone before you send.</p>
            <button onClick={() => toast.success('Broadcast queued')} className="mt-3 w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-2.5 text-sm">Send to 142 vendors</button>
          </div>
          <div className="bg-neutral-900 text-white rounded-xl p-6">
            <p className="font-bold mb-1">Live Control</p>
            <p className="text-white/50 text-sm mb-4">Show-day. Pushes to site banner + WhatsApp instantly.</p>
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              {['Parking full', 'Stage starting', 'Weather', 'Lost child'].map((b) => (
                <button key={b} onClick={() => toast.success(`Sent: ${b}`)} className="bg-white/10 hover:bg-white/20 rounded-lg py-2 font-medium">{b}</button>
              ))}
            </div>
            <button onClick={() => toast.success('Emergency broadcast sent to 25,000')} className="w-full bg-[#cd2653] hover:bg-[#b01f45] rounded-lg py-2.5 text-sm font-bold">Emergency broadcast</button>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="font-bold mb-3">Admin users</p>
            <div className="space-y-2 text-sm">
              {[['Samreen K.', 'Owner · full'], ['Faruk M.', 'Payments · limited'], ['Aisha D.', 'Documents · limited']].map(([n, r]) => (
                <div key={n} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200">
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center text-xs font-bold">{n.split(' ').map((x) => x[0]).join('')}</div><span className="font-medium">{n}</span></div>
                  <span className="text-xs text-neutral-500">{r}</span>
                </div>
              ))}
            </div>
            <button onClick={() => toast.success('Invite sent')} className="mt-3 text-sm text-[#cd2653] font-semibold hover:underline">+ Invite admin</button>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="font-bold mb-3">Audit log</p>
            <div className="space-y-2.5 text-xs">
              {[['Samreen K.', 'approved Modest Threads', '2m ago'], ['Faruk M.', 'confirmed payment FS-4', '1h ago'], ['Aisha D.', 'approved COA · Halal Bites', '3h ago'], ['Samreen K.', 'assigned Bismillah Foods to FT-12', '5h ago']].map(([w, a, t], i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-neutral-100 pb-2"><span><b>{w}</b> {a}</span><span className="text-neutral-400 whitespace-nowrap">{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
