'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface Rect { x: number; y: number; w: number; h: number; fill: string }
export interface Stall extends Rect { code: string; type: string }
export interface Txt { t: string; x: number; y: number; size: number; fill: string }
export interface PlanVec { w: number; h: number; bg: Rect[]; stalls: Stall[]; texts: Txt[] }

type Mode = 'pin' | 'interactive' | 'guided'
const TYPE_LABEL: Record<string, string> = { FS: 'Full Space', TS: 'Table Space', FT: 'Food Truck', BS: 'Bedouin Space' }

export default function SitePlanSVG({ plan, mode, mineCode }: { plan: PlanVec; mode: Mode; mineCode: string | null }) {
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [hover, setHover] = useState<Stall | null>(null)
  const [sel, setSel] = useState<Stall | null>(null)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  const mine = mineCode ? plan.stalls.find((s) => s.code.toUpperCase() === mineCode.toUpperCase()) : null
  const neighbours = mine
    ? plan.stalls.filter((s) => s.code !== mine.code)
        .map((s) => ({ s, d: Math.hypot(s.x + s.w / 2 - (mine.x + mine.w / 2), s.y + s.h / 2 - (mine.y + mine.h / 2)) }))
        .sort((a, b) => a.d - b.d).slice(0, 6).map((n) => n.s)
    : []
  const nb = new Set(neighbours.map((n) => n.code))

  // guided: zoom to mine on mount
  useEffect(() => {
    if (mode !== 'guided' || !mine) { setScale(1); setTx(0); setTy(0); return }
    const z = 3
    setScale(z)
    setTx(plan.w / 2 - (mine.x + mine.w / 2) * z)
    setTy(plan.h / 2 - (mine.y + mine.h / 2) * z)
  }, [mode, mine, plan.w, plan.h])

  const clamp = (z: number) => Math.min(8, Math.max(1, z))
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

  const interactive = mode === 'interactive'

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        {([['+', () => setScale((s) => clamp(s + 0.6))], ['−', () => setScale((s) => clamp(s - 0.6))], ['⟲', () => { setScale(1); setTx(0); setTy(0) }]] as const).map(([l, fn], i) => (
          <button key={i} onClick={fn} className="w-9 h-9 rounded-lg bg-white/95 shadow text-neutral-800 font-bold text-lg flex items-center justify-center hover:bg-white">{l}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${plan.w} ${plan.h}`} onWheel={onWheel} onMouseDown={onDown}
        className="w-full rounded-2xl border border-neutral-200 cursor-grab active:cursor-grabbing"
        style={{ background: '#00af50', aspectRatio: `${plan.w} / ${plan.h}` }}>
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {/* background shapes — exact PDF geometry/colours */}
          {plan.bg.map((r, i) => <rect key={`b${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />)}

          {/* stalls — every cell at its real size/location, individually clickable */}
          {plan.stalls.map((s) => {
            const isMine = mine && s.code === mine.code
            const isNb = mode === 'guided' && nb.has(s.code)
            const dim = mode === 'guided' && !isMine && !isNb
            const fill = isMine ? '#cd2653' : s.fill
            return (
              <rect key={s.code} x={s.x} y={s.y} width={s.w} height={s.h}
                fill={fill} fillOpacity={dim ? 0.25 : 1}
                stroke={isMine ? '#7c1d3a' : hover?.code === s.code || sel?.code === s.code ? '#1a1416' : '#ffffff'}
                strokeWidth={isMine || hover?.code === s.code ? 0.6 : 0.18}
                style={{ cursor: interactive ? 'pointer' : 'inherit', transition: 'fill-opacity .2s' }}
                onMouseEnter={interactive ? () => setHover(s) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onClick={interactive ? () => { if (!drag.current?.moved) setSel(s) } : undefined}>
                <title>{s.code} · {TYPE_LABEL[s.type]}</title>
              </rect>
            )
          })}

          {/* zone / dimension labels — exact positions */}
          {plan.texts.map((t, i) => (
            <text key={`t${i}`} x={t.x} y={t.y} fontSize={t.size} fill={t.fill}
              fontWeight={t.size > 7 ? 700 : 400} style={{ pointerEvents: 'none' }}>{t.t}</text>
          ))}

          {/* you-are-here marker */}
          {mine && (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={mine.x + mine.w / 2} cy={mine.y + mine.h / 2} r={Math.max(mine.w, mine.h) * 0.9} fill="none" stroke="#cd2653" strokeWidth={0.5}>
                <animate attributeName="r" values={`${Math.max(mine.w, mine.h) * 0.7};${Math.max(mine.w, mine.h) * 1.8}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x={mine.x + mine.w / 2} y={mine.y - 2} fontSize={3.4} fontWeight={800} fill="#cd2653" textAnchor="middle">YOU ARE HERE</text>
            </g>
          )}
        </g>
      </svg>

      {/* hover chip (interactive) */}
      {interactive && hover && (
        <div className="absolute bottom-3 left-3 z-30 bg-white/95 shadow rounded-lg px-3 py-1.5 text-sm pointer-events-none">
          <span className="font-bold text-neutral-900">{hover.code}</span>
          <span className="ml-2 text-xs text-neutral-500">{TYPE_LABEL[hover.type]}</span>
        </div>
      )}

      {/* selected detail (interactive) */}
      {interactive && sel && (
        <div className="absolute bottom-3 right-3 z-30 bg-white shadow-lg border border-neutral-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="font-bold text-neutral-900">{sel.code}</p>
              <p className="text-xs text-neutral-500">{TYPE_LABEL[sel.type]}</p>
            </div>
            <button onClick={() => setSel(null)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-neutral-500">
        {[['#ffbf00', 'Full Space'], ['#dd11ed', 'Table Space'], ['#00afef', 'Food Truck'], ['#ffff00', 'Bedouin Space'], ['#cd2653', 'Your stall']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-black/10" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  )
}
