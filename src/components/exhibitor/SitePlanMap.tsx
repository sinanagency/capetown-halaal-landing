'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface PlanStall { code: string; type: string; x: number; y: number; w: number; h: number }
export interface SitePlan { image: string; w: number; h: number; stalls: PlanStall[] }

type Mode = 'pin' | 'interactive' | 'guided'

const TYPE_COLOR: Record<string, string> = { FS: '#f59e0b', TS: '#a855f7', FT: '#0ea5e9', BS: '#10b981' }

export default function SitePlanMap({ plan, mode, mineCode }: { plan: SitePlan; mode: Mode; mineCode: string | null }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const [hover, setHover] = useState<PlanStall | null>(null)
  const aspect = (plan.h / plan.w) * 100

  const mine = mineCode ? plan.stalls.find((s) => s.code.toUpperCase() === mineCode.toUpperCase()) : null
  const neighbours = mine
    ? plan.stalls
        .filter((s) => s.code !== mine.code)
        .map((s) => ({ s, d: Math.hypot(s.x + s.w / 2 - (mine.x + mine.w / 2), s.y + s.h / 2 - (mine.y + mine.h / 2)) }))
        .sort((a, b) => a.d - b.d).slice(0, 6).map((n) => n.s)
    : []
  const nbCodes = new Set(neighbours.map((n) => n.code))

  // guided mode: center + zoom on the vendor's stall on mount
  useEffect(() => {
    if (mode !== 'guided' || !mine || !wrapRef.current) return
    const z = 2.6
    const cx = (mine.x + mine.w / 2), cy = (mine.y + mine.h / 2)
    setScale(z)
    setTx((0.5 - cx) * wrapRef.current.clientWidth * z)
    setTy((0.5 - cy) * (wrapRef.current.clientWidth * aspect / 100) * z)
  }, [mode, mine, aspect])

  const clampZoom = (z: number) => Math.min(6, Math.max(1, z))
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    setScale((s) => clampZoom(s - e.deltaY * 0.0015 * s))
  }
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, tx, ty } }
  const onMove = useCallback((e: MouseEvent) => {
    if (!drag.current) return
    setTx(drag.current.tx + (e.clientX - drag.current.x))
    setTy(drag.current.ty + (e.clientY - drag.current.y))
  }, [])
  const onUp = useCallback(() => { drag.current = null }, [])
  useEffect(() => {
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [onMove, onUp])
  function reset() { setScale(1); setTx(0); setTy(0) }

  const pct = (v: number) => `${v * 100}%`

  return (
    <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-[#1f8a3b] select-none">
      {/* zoom controls */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        {[['+', () => setScale((s) => clampZoom(s + 0.5))], ['−', () => setScale((s) => clampZoom(s - 0.5))], ['⟲', reset]].map(([l, fn], i) => (
          <button key={i} onClick={fn as () => void} className="w-9 h-9 rounded-lg bg-white/95 shadow text-neutral-800 font-bold text-lg flex items-center justify-center hover:bg-white">{l as string}</button>
        ))}
      </div>

      <div ref={wrapRef} onWheel={onWheel} onMouseDown={onDown}
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing" style={{ paddingBottom: `${aspect}%` }}>
        <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transition: drag.current ? 'none' : 'transform .18s ease-out' }}>
          {/* the actual festival artwork, 100% identical to the PDF */}
          <img src={plan.image} alt="Festival site plan" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

          {/* dim scrim for guided mode */}
          {mode === 'guided' && mine && <div className="absolute inset-0 bg-[#0a0a0a]/45" />}

          {/* hotspots */}
          {(mode === 'interactive' ? plan.stalls : [...(mine ? [mine] : []), ...(mode === 'guided' ? neighbours : [])]).map((s) => {
            const isMine = mine && s.code === mine.code
            const isNb = nbCodes.has(s.code)
            if (mode === 'interactive') {
              return (
                <div key={s.code}
                  onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
                  className="absolute cursor-pointer"
                  style={{ left: pct(s.x), top: pct(s.y), width: pct(Math.max(s.w, 0.006)), height: pct(Math.max(s.h, 0.008)),
                    boxShadow: isMine ? '0 0 0 2px #cd2653' : undefined,
                    background: isMine ? 'rgba(205,38,83,0.35)' : 'transparent', borderRadius: 2 }} />
              )
            }
            // pin / guided: ring + label on mine (and neighbours in guided)
            return (
              <div key={s.code} className="absolute" style={{ left: pct(s.x + s.w / 2), top: pct(s.y + s.h / 2) }}>
                <div className="-translate-x-1/2 -translate-y-1/2 relative">
                  <div className={`rounded-full ${isMine ? 'bg-[#cd2653]' : 'bg-white'} `}
                    style={{ width: isMine ? 12 : 8, height: isMine ? 12 : 8, boxShadow: isMine ? '0 0 0 3px rgba(205,38,83,.4)' : '0 0 0 2px #cd2653' }} />
                  {isMine && <span className="absolute left-1/2 -translate-x-1/2 -top-6 whitespace-nowrap text-[10px] font-extrabold text-[#cd2653] bg-white/90 px-1.5 py-0.5 rounded">YOU ARE HERE</span>}
                  {!isMine && isNb && <span className="absolute left-1/2 -translate-x-1/2 top-3 whitespace-nowrap text-[9px] font-bold text-white bg-[#cd2653]/80 px-1 rounded">{s.code}</span>}
                </div>
              </div>
            )
          })}

          {/* pulse ring on mine (pin + guided) */}
          {mode !== 'interactive' && mine && (
            <div className="absolute pointer-events-none" style={{ left: pct(mine.x + mine.w / 2), top: pct(mine.y + mine.h / 2) }}>
              <span className="block -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#cd2653] animate-ping" style={{ width: 28, height: 28 }} />
            </div>
          )}
        </div>

        {/* hover tooltip (interactive) */}
        {mode === 'interactive' && hover && (
          <div className="absolute z-30 bottom-3 left-3 bg-white/95 shadow rounded-lg px-3 py-1.5 text-sm pointer-events-none">
            <span className="font-bold text-neutral-900">{hover.code}</span>
            <span className="ml-2 text-xs" style={{ color: TYPE_COLOR[hover.type] || '#666' }}>
              {hover.type === 'FS' ? 'Full Space' : hover.type === 'TS' ? 'Table Space' : hover.type === 'FT' ? 'Food Truck' : 'Bedouin Space'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
