'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import SitePlanMap, { type SitePlan } from '@/components/exhibitor/SitePlanMap'

const VERSIONS = [
  { id: 'pin' as const, name: 'Version 1 — Minimal pin', blurb: 'The full official plan, with a single pulsing marker on your stall. Pan and zoom freely.' },
  { id: 'interactive' as const, name: 'Version 2 — Interactive directory', blurb: 'Every stall is hoverable. Yours is highlighted in crimson. Hover any space to see its code and type.' },
  { id: 'guided' as const, name: 'Version 3 — Guided wayfinding', blurb: 'Auto-zooms to your stall, dims the rest, and labels your nearest neighbours. Best for "where am I".' },
]

export default function MapVersions({ mineCode }: { mineCode: string | null }) {
  const [plan, setPlan] = useState<SitePlan | null>(null)
  const [mode, setMode] = useState<'pin' | 'interactive' | 'guided'>('pin')

  useEffect(() => {
    fetch('/site-plan-stalls.json').then((r) => r.json()).then(setPlan).catch(() => {})
  }, [])

  const active = VERSIONS.find((v) => v.id === mode)!

  return (
    <div className="space-y-4">
      {/* version switcher */}
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
        <div className="flex items-center gap-2 text-neutral-500 text-sm py-20 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading the official site plan…</div>
      ) : (
        <SitePlanMap key={mode} plan={plan} mode={mode} mineCode={mineCode} />
      )}

      <p className="text-xs text-neutral-400">This is the actual organiser site plan (CTH 2026 Draft Site Layout), rendered exactly. {mineCode ? `Your stall: ${mineCode}.` : 'Your stall will be marked once allocated.'} Tell me which version to keep and I'll wire it into My Stand.</p>
    </div>
  )
}
