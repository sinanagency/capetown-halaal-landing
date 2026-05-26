'use client'

import { useEffect, useState } from 'react'
import { Loader2, Navigation, Clock } from 'lucide-react'
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

export default function StandView({ email }: { email: string }) {
  const [data, setData] = useState<Placement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/exhibitor/placement', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
        })
        const j = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(j.error || 'Could not load your stand')
        setData(j)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })()
    return () => { cancelled = true }
  }, [email])

  if (error) return <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">{error}</div>
  if (!data) return <div className="flex items-center gap-2 text-neutral-500 text-sm py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading your stand…</div>

  if (!data.placed) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-neutral-900 mb-1">Your stall isn’t allocated yet</h2>
        <p className="text-neutral-600 text-sm max-w-md mx-auto">Once the organisers place you on the floor plan, your exact stall and neighbours appear here automatically.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-lg bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center"><Navigation className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-neutral-500">Your stall</p>
            <p className="text-xl font-bold text-neutral-900">{data.you!.code} <span className="text-sm font-medium text-neutral-500">· {data.you!.zone}</span></p>
          </div>
        </div>
        <StallMap stalls={data.stalls} grid={data.grid} zones={data.zones} mode="exhibitor" mineCode={data.you!.code} neighbourCodes={data.neighbours.map((n) => n.code)} />
        <p className="text-[10px] text-neutral-400 mt-2 italic">Your stall pulses in crimson, neighbours are highlighted.</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
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
    </div>
  )
}
