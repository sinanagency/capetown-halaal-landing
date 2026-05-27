'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface Stall { code: string; type: string; x: number; y: number; w: number; h: number }
export interface PlanVec { w: number; h: number; image?: string; stalls: Stall[] }

type Mode = 'pin' | 'interactive' | 'guided'
const TYPE_LABEL: Record<string, string> = { FS: 'Full Space', TS: 'Table Space', FT: 'Food Truck', BS: 'Bedouin Space' }
const IMG = '/site-plan.webp' // the real organiser artwork (100% identical), 792x612 page space

export default function SitePlanSVG({ plan, mode, mineCode }: { plan: PlanVec; mode: Mode; mineCode: string | null }) {
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [hover, setHover] = useState<Stall | null>(null)
  const [sel, setSel] = useState<Stall | null>(null)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)
  const W = plan.w, H = plan.h

  const mine = mineCode ? plan.stalls.find((s) => s.code.toUpperCase() === mineCode.toUpperCase()) : null
  const neighbours = mine
    ? plan.stalls.filter((s) => s.code !== mine.code)
        .map((s) => ({ s, d: Math.hypot(s.x + s.w / 2 - (mine.x + mine.w / 2), s.y + s.h / 2 - (mine.y + mine.h / 2)) }))
        .sort((a, b) => a.d - b.d).slice(0, 6).map((n) => n.s)
    : []
  const nb = new Set(neighbours.map((n) => n.code))

  useEffect(() => {
    if (mode !== 'guided' || !mine) { setScale(1); setTx(0); setTy(0); return }
    const z = 3.4
    setScale(z); setTx(W / 2 - (mine.x + mine.w / 2) * z); setTy(H / 2 - (mine.y + mine.h / 2) * z)
  }, [mode, mine, W, H])

  const clamp = (z: number) => Math.min(9, Math.max(1, z))
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

      <svg viewBox={`0 0 ${W} ${H}`} onWheel={onWheel} onMouseDown={onDown}
        className="w-full rounded-2xl border border-neutral-200 cursor-grab active:cursor-grabbing block"
        style={{ aspectRatio: `${W} / ${H}`, background: '#0c6b2e' }}>
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {/* the REAL artwork — 100% identical to the PDF */}
          <image href={plan.image || IMG} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />

          {/* guided: dim everything except mine + neighbours */}
          {mode === 'guided' && mine && <rect x={0} y={0} width={W} height={H} fill="#06120a" opacity={0.55} />}

          {/* clickable stall cells overlaid at exact coordinates */}
          {plan.stalls.map((s) => {
            const isMine = mine && s.code === mine.code
            const isNb = mode === 'guided' && nb.has(s.code)
            const hot = hover?.code === s.code || sel?.code === s.code
            let fill = 'transparent', op = 1
            if (isMine) { fill = '#cd2653'; op = 0.55 }
            else if (mode === 'interactive' && hot) { fill = '#cd2653'; op = 0.35 }
            else if (mode === 'guided' && isNb) { fill = '#ffffff'; op = 0.001 } // keep visible (un-dimmed by sitting over scrim hole)
            return (
              <rect key={s.code} x={s.x} y={s.y} width={s.w} height={s.h}
                fill={fill} fillOpacity={op}
                stroke={isMine ? '#fff' : hot ? '#cd2653' : 'transparent'} strokeWidth={isMine ? 0.5 : 0.4}
                style={{ cursor: interactive ? 'pointer' : 'inherit' }}
                onMouseEnter={interactive ? () => setHover(s) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onClick={interactive ? () => { if (!drag.current?.moved) setSel(s) } : undefined}>
                <title>{s.code} · {TYPE_LABEL[s.type]}</title>
              </rect>
            )
          })}

          {/* guided: re-show neighbour cells above the scrim with labels */}
          {mode === 'guided' && neighbours.map((s) => (
            <g key={`n${s.code}`} style={{ pointerEvents: 'none' }}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#fff" fillOpacity={0.15} stroke="#fff" strokeWidth={0.3} />
              <text x={s.x + s.w / 2} y={s.y - 1} fontSize={2.8} fontWeight={700} fill="#fff" textAnchor="middle">{s.code}</text>
            </g>
          ))}

          {/* you-are-here marker */}
          {mine && (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={mine.x + mine.w / 2} cy={mine.y + mine.h / 2} r={Math.max(mine.w, mine.h) * 0.9} fill="none" stroke="#cd2653" strokeWidth={0.7}>
                <animate attributeName="r" values={`${Math.max(mine.w, mine.h) * 0.7};${Math.max(mine.w, mine.h) * 2}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <rect x={mine.x + mine.w / 2 - 11} y={mine.y - 6.5} width={22} height={4.6} rx={1} fill="#cd2653" />
              <text x={mine.x + mine.w / 2} y={mine.y - 3.2} fontSize={3} fontWeight={800} fill="#fff" textAnchor="middle">YOU ARE HERE</text>
            </g>
          )}
        </g>
      </svg>

      {interactive && hover && (
        <div className="absolute bottom-3 left-3 z-30 bg-white/95 shadow rounded-lg px-3 py-1.5 text-sm pointer-events-none">
          <span className="font-bold text-neutral-900">{hover.code}</span>
          <span className="ml-2 text-xs text-neutral-500">{TYPE_LABEL[hover.type]}</span>
        </div>
      )}
      {interactive && sel && (
        <div className="absolute bottom-3 right-3 z-30 bg-white shadow-lg border border-neutral-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-6">
            <div><p className="font-bold text-neutral-900">{sel.code}</p><p className="text-xs text-neutral-500">{TYPE_LABEL[sel.type]}</p></div>
            <button onClick={() => setSel(null)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">×</button>
          </div>
        </div>
      )}
    </div>
  )
}
