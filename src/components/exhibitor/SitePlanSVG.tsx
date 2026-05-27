'use client'

import { useRef, useState } from 'react'
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

export interface Stall { code: string; type: string; x: number; y: number; w: number; h: number }
export interface Zone { x: number; y: number; w: number; h: number; fill: string }
export interface Label { t: string; x: number; y: number; size: number; fill: string }
export interface PlanVec { w: number; h: number; zones: Zone[]; stalls: Stall[]; labels: Label[] }

const TYPE_FILL: Record<string, string> = { FS: '#f5b400', TS: '#d61fd6', FT: '#0ea5e9', BS: '#facc15' }
const TYPE_LABEL: Record<string, string> = { FS: 'Full Space', TS: 'Table Space', FT: 'Food Truck', BS: 'Bedouin Space' }
const LIGHT_TEXT = new Set(['TS']) // dark fills get white code text
const zoneStyle = (fill: string): { f: string; s: string } | null => {
  if (fill === '#000000') return null
  if (fill === '#ff0000') return { f: '#f3dada', s: '#e6bdbd' }
  if (fill === '#ff3399') return { f: '#fbdcec', s: '#f3b6d6' }
  if (fill === '#156082') return { f: '#dbe6ec', s: '#bcd0db' }
  return { f: '#dfe5e0', s: '#c8d1ca' }
}
const SKIP_LABEL = /space|foodtruck|provisional|discretion|guarantee|^x$/i

export default function SitePlanSVG({ plan, mineCode }: { plan: PlanVec; mineCode: string | null }) {
  const ref = useRef<ReactZoomPanPinchRef | null>(null)
  const down = useRef<{ x: number; y: number } | null>(null)
  const [hover, setHover] = useState<Stall | null>(null)
  const [sel, setSel] = useState<Stall | null>(null)
  const [q, setQ] = useState('')

  // real stalls only (drops the PDF's legend bars + numberless fragments mis-captured as stalls)
  const stalls = plan.stalls.filter((s) => /^(FS|TS|FT|BS)\d+$/.test(s.code))
  // auto-fit viewBox to the festival content (drop empty parking field)
  const items = [...stalls, ...plan.zones.filter((z) => z.y < plan.h * 0.88)]
  const pad = 14
  const minX = Math.max(0, Math.min(...items.map((i) => i.x)) - pad)
  const minY = Math.max(0, Math.min(...items.map((i) => i.y)) - pad)
  const maxX = Math.max(...items.map((i) => i.x + i.w)) + pad
  const maxY = Math.max(...items.map((i) => i.y + i.h)) + pad + 6
  const VW = maxX - minX, VH = maxY - minY

  const mine = mineCode ? stalls.find((s) => s.code.toUpperCase() === mineCode.toUpperCase()) : null
  const focus = sel || mine
  const nb = new Set(
    focus
      ? stalls.filter((s) => s.code !== focus.code)
          .map((s) => ({ s, d: Math.hypot(s.x + s.w / 2 - (focus.x + focus.w / 2), s.y + s.h / 2 - (focus.y + focus.h / 2)) }))
          .sort((a, b) => a.d - b.d).slice(0, 6).map((n) => n.s.code)
      : []
  )
  const qx = q.trim().toLowerCase()
  const qhit = qx ? new Set(stalls.filter((s) => s.code.toLowerCase().includes(qx)).map((s) => s.code)) : null

  const findMine = () => { if (ref.current) ref.current.zoomToElement('mine-cell', 6, 500) }

  const labels = plan.labels.filter((l) => !SKIP_LABEL.test(l.t) && l.y < plan.h * 0.9)
  const zones = plan.zones.filter((z) => z.y < plan.h * 0.88)

  return (
    <div className="relative">
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a stall…"
          className="w-40 rounded-lg border border-neutral-200 bg-white/95 shadow px-3 py-2 text-sm outline-none focus:border-[#cd2653]" />
        {mine && <button onClick={findMine} className="rounded-lg bg-[#cd2653] text-white shadow px-3 py-2 text-sm font-semibold hover:bg-[#b01f45] whitespace-nowrap">Find my stall</button>}
      </div>
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        <button onClick={() => ref.current?.zoomIn()} className="w-9 h-9 rounded-lg bg-white/95 shadow text-neutral-800 font-bold text-lg flex items-center justify-center hover:bg-white">+</button>
        <button onClick={() => ref.current?.zoomOut()} className="w-9 h-9 rounded-lg bg-white/95 shadow text-neutral-800 font-bold text-lg flex items-center justify-center hover:bg-white">−</button>
        <button onClick={() => ref.current?.resetTransform()} className="w-9 h-9 rounded-lg bg-white/95 shadow text-neutral-800 font-bold text-lg flex items-center justify-center hover:bg-white">⟲</button>
      </div>

      <div className="rounded-2xl border border-neutral-200 overflow-hidden" style={{ background: '#eaf2ea' }}>
        <TransformWrapper ref={ref} minScale={1} maxScale={16} limitToBounds={false} centerOnInit
          doubleClick={{ disabled: true }} wheel={{ step: 0.08 }}>
          <TransformComponent wrapperStyle={{ width: '100%', aspectRatio: `${VW} / ${VH}` }} contentStyle={{ width: '100%' }}>
            <svg viewBox={`${minX} ${minY} ${VW} ${VH}`} className="w-full block"
              onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY } }}>
              {/* zones */}
              {zones.map((z, i) => {
                const st = zoneStyle(z.fill); if (!st) return null
                return <rect key={`z${i}`} x={z.x} y={z.y} width={z.w} height={z.h} rx={1.5} fill={st.f} stroke={st.s} strokeWidth={0.25} />
              })}

              {/* stalls — even tiles with consistent gap + printed code */}
              {stalls.map((s) => {
                const isMine = mine && s.code === mine.code
                const isFoc = sel?.code === s.code || hover?.code === s.code
                const isNb = nb.has(s.code)
                const dimQ = qhit && !qhit.has(s.code)
                const g = Math.min(s.w, s.h) * 0.1 + 0.12
                const fill = isMine ? '#cd2653' : TYPE_FILL[s.type] || '#bbb'
                const fs = Math.min(s.w * 0.42, s.h * 0.62, 2.6)
                const tcol = isMine || LIGHT_TEXT.has(s.type) ? '#fff' : '#1a1416'
                return (
                  <g key={s.code} id={isMine ? 'mine-cell' : undefined}
                    onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
                    onClick={(e) => { if (!down.current || Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) < 5) setSel(s) }}
                    style={{ cursor: 'pointer' }} opacity={dimQ ? 0.3 : 1}>
                    <rect x={s.x + g} y={s.y + g} width={Math.max(s.w - 2 * g, 0.3)} height={Math.max(s.h - 2 * g, 0.3)} rx={0.4}
                      fill={fill} stroke={isMine || isFoc ? '#1a1416' : isNb ? '#cd2653' : 'none'} strokeWidth={isMine || isFoc || isNb ? 0.35 : 0} />
                    <text x={s.x + s.w / 2} y={s.y + s.h / 2 + fs * 0.35} fontSize={fs} fill={tcol} textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none' }}>{s.code}</text>
                    <title>{s.code} · {TYPE_LABEL[s.type] || s.type}</title>
                  </g>
                )
              })}

              {/* section labels */}
              {labels.map((l, i) => (
                <text key={`l${i}`} x={l.x} y={l.y} fontSize={Math.max(l.size, 3.6)} fill="#33433a"
                  fontWeight={l.size > 7 ? 700 : 500} style={{ pointerEvents: 'none' }}>{l.t}</text>
              ))}

              {/* you-are-here */}
              {mine && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={mine.x + mine.w / 2} cy={mine.y + mine.h / 2} r={Math.max(mine.w, mine.h)} fill="none" stroke="#cd2653" strokeWidth={0.6}>
                    <animate attributeName="r" values={`${Math.max(mine.w, mine.h) * 0.7};${Math.max(mine.w, mine.h) * 2}`} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <rect x={mine.x + mine.w / 2 - 12} y={mine.y - 7} width={24} height={5} rx={1.2} fill="#cd2653" />
                  <text x={mine.x + mine.w / 2} y={mine.y - 3.4} fontSize={3} fontWeight={800} fill="#fff" textAnchor="middle">YOU ARE HERE</text>
                </g>
              )}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>

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
