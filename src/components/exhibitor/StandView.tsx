'use client'

import { useEffect, useState } from 'react'
import { Loader2, Navigation, Clock } from 'lucide-react'
import StallMap, { type MapStall } from '@/components/admin/StallMap'

interface MapData {
  stalls: MapStall[]
  grid: { cols: number; rows: number }
  zones: { label: string; col: number; row: number; w: number; h: number }[]
  mine: string | null
  placed: boolean
  you: { code: string; zone: string } | null
  counts: { allocated: number; total: number }
}

function Legend() {
  const items = [
    { c: '#cd2653', label: 'Your stall' },
    { c: '#22c55e', label: 'Allocated' },
    { c: '#fcd34d', label: 'Held' },
    { c: '#ffffff', label: 'Available', border: true },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-neutral-500">
          <span className="w-3 h-3 rounded-sm" style={{ background: i.c, border: i.border ? '1px solid #cbd5e1' : 'none' }} />{i.label}
        </span>
      ))}
    </div>
  )
}

export default function StandView() {
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/exhibitor/map')
        const j = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(j.error || 'Could not load the floor plan')
        setData(j)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (error) return <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">{error}</div>
  if (!data) return <div className="flex items-center gap-2 text-neutral-500 text-sm py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading the floor plan…</div>

  return (
    <div className="space-y-6">
      {data.placed ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center"><Navigation className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-neutral-500">Your stall</p>
            <p className="text-xl font-bold text-neutral-900">{data.you!.code} <span className="text-sm font-medium text-neutral-500">· {data.you!.zone}</span></p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-500 shrink-0" />
          <p className="text-sm text-neutral-700">Your stall isn’t allocated yet. The full floor plan is below, and your spot will be marked here the moment the organisers place you.</p>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="font-bold text-neutral-900">Festival floor plan</p>
          <span className="text-xs text-neutral-500">{data.counts.allocated} of {data.counts.total} stalls allocated</span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 mb-3">The same live map the organisers use. Hover any stall to see who’s there.</p>
        <StallMap stalls={data.stalls} grid={data.grid} zones={data.zones} mode="vendor" mineCode={data.mine} />
        <Legend />
      </div>
    </div>
  )
}
