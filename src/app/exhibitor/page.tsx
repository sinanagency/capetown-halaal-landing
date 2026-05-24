'use client'

import { useState, type FormEvent } from 'react'
import { Logo } from '@/components/logo'
import { MapPin, Calendar, Loader2, Search, Store, Navigation, Clock, Mail } from 'lucide-react'
import StallMap, { type MapStall } from '@/components/admin/StallMap'

interface Placement {
  business_name: string
  application_status: string
  tier_label: string
  placed: boolean
  you: { code: string; zone: string; status: string } | null
  neighbours: { code: string; type: string; business_name: string; zone: string }[]
  stalls: MapStall[]
  grid: { cols: number; rows: number }
  zones: { label: string; col: number; row: number; w: number; h: number }[]
}

export default function ExhibitorPortal() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Placement | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function lookup(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setData(null)
    try {
      const res = await fetch('/api/exhibitor/placement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Lookup failed')
      setData(j)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/"><Logo size="md" showText={true} /></a>
          <span className="text-sm text-neutral-500 hidden sm:block">Exhibitor Portal</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {!data && (
            <div className="max-w-md mx-auto mt-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center mx-auto mb-3"><Store className="w-6 h-6" /></div>
                <h1 className="text-2xl font-bold text-neutral-900">Find your stall</h1>
                <p className="text-neutral-500 text-sm mt-1">Enter the email you applied with to see where you are on the festival map and who your neighbours are.</p>
              </div>
              <form onSubmit={lookup} className="bg-white border border-neutral-200 rounded-xl p-5">
                <label className="text-xs font-semibold text-neutral-600">Application email</label>
                <div className="relative mt-1 mb-3">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.za" className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#cd2653]" />
                </div>
                <button disabled={loading} className="w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{loading ? 'Looking up…' : 'Show my placement'}
                </button>
                {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}
              </form>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{data.business_name}</h1>
                  <p className="text-neutral-500 text-sm">{data.tier_label} · application {data.application_status}</p>
                </div>
                <button onClick={() => { setData(null); setEmail('') }} className="text-sm text-neutral-500 hover:text-neutral-900">← look up another</button>
              </div>

              {!data.placed ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <h2 className="text-lg font-bold text-neutral-900 mb-1">Your stall isn’t allocated yet</h2>
                  <p className="text-neutral-600 text-sm">Once the organisers place you on the map, your exact stall and neighbours will appear here. Outcomes are confirmed by 1 June 2026.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-neutral-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-lg bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center"><Navigation className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-neutral-500">Your stall</p>
                        <p className="text-xl font-bold text-neutral-900">{data.you!.code} <span className="text-sm font-medium text-neutral-500">· {data.you!.zone}</span></p>
                      </div>
                    </div>
                    <StallMap stalls={data.stalls} grid={data.grid} zones={data.zones} mode="exhibitor" mineCode={data.you!.code} neighbourCodes={data.neighbours.map((n) => n.code)} />
                    <p className="text-[10px] text-neutral-400 mt-2 italic">Festival site map · your stall pulses in crimson, neighbours are highlighted.</p>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-xl p-5">
                    <p className="font-bold text-neutral-900 mb-3">Your neighbours</p>
                    {data.neighbours.length === 0 ? (
                      <p className="text-sm text-neutral-500">No neighbouring vendors placed yet.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {data.neighbours.map((n) => (
                          <div key={n.code} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200">
                            <div><p className="text-sm font-semibold text-neutral-900">{n.business_name}</p><p className="text-xs text-neutral-500">{n.zone}</p></div>
                            <span className="text-xs font-mono font-semibold text-neutral-400">{n.code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h2 className="font-semibold text-neutral-900 mb-4">Event information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium">11 – 13 December 2026</p><p className="text-neutral-500">3-day festival</p></div></div>
                  <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium">Youngsfield Military Base</p><p className="text-neutral-500">Cape Town, South Africa</p></div></div>
                  <div className="flex items-start gap-3"><Mail className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium">support@youngatheart.co.za</p><p className="text-neutral-500">For any questions</p></div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
