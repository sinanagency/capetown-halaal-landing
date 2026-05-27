'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import SitePlanSVG, { type PlanVec } from '@/components/exhibitor/SitePlanSVG'

export default function MapVersions({ mineCode }: { mineCode: string | null; initial?: string }) {
  const [plan, setPlan] = useState<PlanVec | null>(null)
  useEffect(() => { fetch('/site-plan-vector.json').then((r) => r.json()).then(setPlan).catch(() => {}) }, [])

  if (!plan) return <div className="flex items-center gap-2 text-neutral-500 text-sm py-20 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading the site plan…</div>
  return (
    <div className="space-y-3">
      <SitePlanSVG plan={plan} mineCode={mineCode} />
      <p className="text-xs text-neutral-400">Clean schematic rebuilt from the organiser plan: every stall at its exact placement and size, individually clickable. {mineCode ? `Your stall: ${mineCode}.` : ''} Search, zoom, drag to pan.</p>
    </div>
  )
}
