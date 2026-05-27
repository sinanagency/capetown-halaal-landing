'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import SitePlanSVG, { type PlanVec } from '@/components/exhibitor/SitePlanSVG'

const VERSIONS = [
  { id: 'pin' as const, name: 'Version 1 — Minimal', blurb: 'The full plan with a single pulsing marker on your stall. Pan and zoom freely.' },
  { id: 'interactive' as const, name: 'Version 2 — Interactive', blurb: 'Every stall is a clickable cell. Hover for code + type, click to select. Yours is crimson.' },
  { id: 'guided' as const, name: 'Version 3 — Guided', blurb: 'Auto-zooms to your stall, dims the rest, labels your nearest neighbours.' },
]

export default function MapVersions({ mineCode, initial = 'pin' }: { mineCode: string | null; initial?: 'pin' | 'interactive' | 'guided' }) {
  const [plan, setPlan] = useState<PlanVec | null>(null)
  const [mode, setMode] = useState<'pin' | 'interactive' | 'guided'>(initial)

  useEffect(() => { fetch('/site-plan-vector.json').then((r) => r.json()).then(setPlan).catch(() => {}) }, [])
  const active = VERSIONS.find((v) => v.id === mode)!

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VERSIONS.map((v) => (
          <button key={v.id} onClick={() => setMode(v.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === v.id ? 'bg-[#cd2653] text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#cd2653]/40'}`}>
            {v.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-neutral-500">{active.blurb}</p>

      {!plan ? (
        <div className="flex items-center gap-2 text-neutral-500 text-sm py-20 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading the site plan…</div>
      ) : (
        <SitePlanSVG key={mode} plan={plan} mode={mode} mineCode={mineCode} />
      )}

      <p className="text-xs text-neutral-400">Rebuilt as a true vector map directly from the organiser PDF: every stall, block and label kept at its exact size, shape and location. {mineCode ? `Your stall: ${mineCode}.` : ''} Each stall is an individually clickable element.</p>
    </div>
  )
}
