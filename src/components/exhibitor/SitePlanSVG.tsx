'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface Stall { code: string; type: string; x: number; y: number; w: number; h: number }
export interface Zone { x: number; y: number; w: number; h: number; fill: string }
export interface Label { t: string; x: number; y: number; size: number; fill: string }
export interface PlanVec { w: number; h: number; zones: Zone[]; stalls: Stall[]; labels: Label[] }

const TYPE_FILL: Record<string, string> = { FS: '#f5b400', TS: '#d61fd6', FT: '#0ea5e9', BS: '#facc15' }
const TYPE_LABEL: Record<string, string> = { FS: 'Full Space', TS: 'Table Space', FT: 'Food Truck', BS: 'Bedouin Space' }
// soft, legible re-colours of the PDF's structural fills
const zoneStyle = (fill: string): { f: string; s: string } | null => {
  if (fill === '#000000') return null // drop the black banner/borders
  if (fill === '#ff0000') return { f: '#f3dada', s: '#e6bdbd' } // entrance aisle -> soft walkway
  if (fill === '#ff3399') return { f: '#fbdcec', s: '#f3b6d6' } // facilities
  if (fill === '#156082') return { f: '#dbe6ec', s: '#bcd0db' }
  return { f: '#d9e0db', s: '#c5cec8' } // grey blocks
}

export default function SitePlanSVG({ plan, mineCode }: { plan: PlanVec; mineCode: string | null }) {
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [hover, setHover] = useState<Stall | null>(null)
  const [sel, setSel] = useState<Stall | null>(null)
  const [q, setQ] = useState('')
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)
  // auto-fit the viewBox to the festival content (drop the empty parking field) so it fills the frame
  const items = [...plan.stalls, ...plan.zones, ...plan.labels.map((l) => ({ x: l.x, y: l.y - 4, w: l.t.length * l.size * 0.5, h: l.size }))]
  const pad = 12
  const minX = Math.max(0, Math.min(...items.map((i) => i.x)) - pad)
  const minY = Math.max(0, Math.min(...items.map((i) => i.y)) - pad)
  const maxX = Math.min(plan.w, Math.max(...items.map((i) => i.x + (i.w || 0))) + pad)
  const maxY = Math.min(plan.h, Math.max(...items.map((i) => i.y + (i.h || 0))) + pad)
  const VW = maxX - minX, VH = maxY - minY

  const mine = mineCode ? plan.stalls.find((s) => s.code.toUpperCase() === mineCode.toUpperCase()) : null
  const focus = sel || mine
  const neighbours = focus
    ? plan.stalls.filter((s) => s.code !== focus.code)
        .map((s) => ({ s, d: Math.hypot(s.x + s.w / 2 - (focus.x + focus.w / 2), s.y + s.h / 2 - (focus.y + focus.h / 2)) }))
        .sort((a, b) => a.d - b.d).slice(0, 6).map((n) => n.s)
    : []
  const qhit = q.trim() ? new Set(plan.stalls.filter((s) => s.code.toLowerCase().includes(q.trim().toLowerCase())).map((s) => s.code)) : null

  function zoomToMine() {
    if (!mine) { setScale(1); setTx(0); setTy(0); return }
    const z = 3
    setScale(z); setTx(minX + VW / 2 - (mine.x + mine.w / 2) * z); setTy(minY + VH / 2 - (mine.y + mine.h / 2) * z)
  }

  const clamp = (z: number) => Math.min(10, Math.max(1, z))
  function onWheel(e: React.WheelEvent) { e.preventDefault(); setScale((s) => clamp(s - e.deltaY * 0.0016 * s)) }
  function onDown(e: React.MouseEvent) { drag.current = { x: e.clientX, y: e.clientY, tx, ty, moved: false } }
  const onMove = useCallback((e: MouseEvent) => {
    if (!drag.current) return
    if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) drag.current.moved = true
    setTx(drag.current.tx + (e.clientX - drag.current.x)); setTy(drag.current.ty + (e.clientY - drag.current.y))
  }, [])
  const onUp = useCallback(() => { drag.current = null }, [])
  useEffect(() => {
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [onMove, onUp])
  function reset() { setScale(1); setTx(0); setTy(0) }

  return (
    <div className="relative">
      {/* search + locate */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a stall…"
          className="w-40 rounded-lg border border-neutral-200 bg-white/95 shadow px-3 py-2 text-sm outline-none focus:border-[#cd2653]" />
        {mine && <button onClick={zoomToMine} className="rounded-lg bg-[#cd2653] text-white shadow px-3 py-2 text-sm font-semibold hover:bg-[#b01f45] whitespace-nowrap">Find my stall</button>}
      </div>
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        {([['+', () => setScale((s) => clamp(s + 0.6))], ['−', () => setScale((s) => clamp(s - 0.6))], ['⟲', reset]] as const).map(([l, fn], i) => (
          <button key={i} onClick={fn} className="w-9 h-9 rounded-lg bg-white/95 shadow text-neutral-800 font-bold text-lg flex items-center justify-center hover:bg-white">{l}</button>
        ))}
      </div>

      <svg viewBox={`${minX} ${minY} ${VW} ${VH}`} onWheel={onWheel} onMouseDown={onDown}
        className="w-full rounded-2xl border border-neutral-200 cursor-grab active:cursor-grabbing block"
        style={{ aspectRatio: `${VW} / ${VH}`, background: '#eaf2ea' }}>
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {/* structural zones */}
          {plan.zones.map((z, i) => {
            const st = zoneStyle(z.fill); if (!st) return null
            return <rect key={`z${i}`} x={z.x} y={z.y} width={z.w} height={z.h} rx={1.2} fill={st.f} stroke={st.s} strokeWidth={0.25} />
          })}

          {/* stalls — real rect per stall, exact size/placement */}
          {plan.stalls.map((s) => {
            const isMine = mine && s.code === mine.code
            const isSel = sel?.code === s.code
            const isHov = hover?.code === s.code
            const isNb = focus && neighbours.some((n) => n.code === s.code)
            const dimByQ = qhit && !qhit.has(s.code)
            const fill = isMine ? '#cd2653' : TYPE_FILL[s.type] || '#bbb'
            return (
              <rect key={s.code} x={s.x} y={s.y} width={s.w} height={s.h} rx={0.45}
                fill={fill} fillOpacity={dimByQ ? 0.25 : 1}
                stroke={isMine || isSel ? '#1a1416' : isHov ? '#1a1416' : isNb ? '#cd2653' : '#ffffff'}
                strokeWidth={isMine || isSel || isHov ? 0.6 : isNb ? 0.45 : 0.22}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
                onClick={() => { if (!drag.current?.moved) setSel(s) }}>
                <title>{s.code} · {TYPE_LABEL[s.type] || s.type}</title>
              </rect>
            )
          })}

          {/* zone / section labels */}
          {plan.labels.map((l, i) => (
            <text key={`l${i}`} x={l.x} y={l.y} fontSize={Math.max(l.size, 3.4)} fill="#33433a"
              fontWeight={l.size > 7 ? 700 : 500} style={{ pointerEvents: 'none' }}>{l.t}</text>
          ))}

          {/* you-are-here */}
          {mine && (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={mine.x + mine.w / 2} cy={mine.y + mine.h / 2} r={Math.max(mine.w, mine.h)} fill="none" stroke="#cd2653" strokeWidth={0.7}>
                <animate attributeName="r" values={`${Math.max(mine.w, mine.h) * 0.7};${Math.max(mine.w, mine.h) * 2.1}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <rect x={mine.x + mine.w / 2 - 12} y={mine.y - 7} width={24} height={5} rx={1.2} fill="#cd2653" />
              <text x={mine.x + mine.w / 2} y={mine.y - 3.4} fontSize={3.1} fontWeight={800} fill="#fff" textAnchor="middle">YOU ARE HERE</text>
            </g>
          )}
        </g>
      </svg>

      {hover && (
        <div className="absolute bottom-3 left-3 z-30 bg-white/95 shadow rounded-lg px-3 py-1.5 text-sm pointer-events-none">
          <span className="font-bold text-neutral-900">{hover.code}</span>
          <span className="ml-2 text-xs text-neutral-500">{TYPE_LABEL[hover.type] || hover.type}</span>
        </div>
      )}
      {sel && (
        <div className="absolute bottom-3 right-3 z-30 bg-white shadow-lg border border-neutral-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-6">
            <div><p className="font-bold text-neutral-900">{sel.code}</p><p className="text-xs text-neutral-500">{TYPE_LABEL[sel.type] || sel.type}</p></div>
            <button onClick={() => setSel(null)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-neutral-500">
        {[['#f5b400', 'Full Space'], ['#d61fd6', 'Table Space'], ['#0ea5e9', 'Food Truck'], ['#facc15', 'Bedouin Space'], ['#cd2653', 'Your stall']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-black/10" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  )
}
