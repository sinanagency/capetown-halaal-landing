'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TYPE_META, type StallType } from '@/lib/stalls'

export interface MapStall {
  code: string
  type: StallType
  num: number
  col: number
  row: number
  w: number
  h: number
  status?: 'available' | 'held' | 'allocated'
  occupant?: { business_name?: string } | null
}

interface Props {
  stalls: MapStall[]
  grid: { cols: number; rows: number }
  zones: { label: string; col: number; row: number; w: number; h: number }[]
  mode?: 'admin' | 'exhibitor' | 'vendor'
  selected?: string | null
  onSelect?: (code: string) => void
  mineCode?: string | null
  neighbourCodes?: string[]
  searchQuery?: string
}

const STATUS_FILL: Record<string, string> = {
  available: 'rgba(255,255,255,.6)',
  held: '#fcd34d',
  allocated: '#cd2653', // brand-red
}

const STATUS_STROKE: Record<string, string> = {
  available: '#d8d2c4',
  held: '#d4a01a',
  allocated: '#bf3026', // brand-dark
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1

export default function StallMap({
  stalls,
  grid,
  zones,
  mode = 'admin',
  selected,
  onSelect,
  mineCode,
  neighbourCodes = [],
  searchQuery = '',
}: Props) {
  const neighbours = new Set(neighbourCodes)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // SVG viewBox = pan/zoom state. We keep the user-space coords unchanged
  // and shift+scale the viewBox so strokes stay crisp at any zoom level.
  // Default zoom 1.4 so stall codes (FS1, FS2, ...) render legibly on first
  // paint. At 1.0 the cell width is ~3 user-units but the font is sized for
  // >=1.4x, which is what was causing the FS1FS2FS3 label mash on /admin/allocation.
  const [zoom, setZoom] = useState(1.4)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef<{ active: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  })

  // Reset pan/zoom when grid changes (e.g. data swap). Match initial default
  // so labels stay readable across data swaps.
  useEffect(() => {
    setZoom(1.4)
    setPan({ x: 0, y: 0 })
  }, [grid.cols, grid.rows])

  // Normalised search match set, in lower-case for prefix/substring compare.
  const searchMatches = useMemo<Set<string>>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return new Set()
    const hits = new Set<string>()
    for (const s of stalls) {
      if (s.code.toLowerCase().includes(q)) hits.add(s.code)
    }
    return hits
  }, [searchQuery, stalls])

  const hasActiveSearch = searchMatches.size > 0 && searchQuery.trim().length > 0

  function fillFor(s: MapStall): string {
    if (mode === 'exhibitor') {
      if (s.code === mineCode) return '#cd2653'
      if (neighbours.has(s.code)) return TYPE_META[s.type].color
      return 'rgba(255,255,255,.6)'
    }
    // vendor + admin both show full occupancy; vendor also highlights "mine"
    if (mode === 'vendor' && s.code === mineCode) return '#cd2653'
    if (selected === s.code) return 'rgba(205,38,83,.18)'
    if (s.status === 'allocated') return STATUS_FILL.allocated
    if (s.status === 'held') return STATUS_FILL.held
    return STATUS_FILL.available
  }

  function strokeFor(s: MapStall): string {
    if (mode === 'exhibitor') {
      if (s.code === mineCode) return '#bf3026' // brand-dark
      if (neighbours.has(s.code)) return '#B8924A' // brass
      return '#d8d2c4' // available stroke
    }
    if (mode === 'vendor' && s.code === mineCode) return '#bf3026' // brand-dark
    if (selected === s.code) return '#cd2653' // brand-red
    if (s.status === 'allocated') return STATUS_STROKE.allocated
    if (s.status === 'held') return STATUS_STROKE.held
    return STATUS_STROKE.available
  }

  // Wheel zoom: anchor zoom around the cursor so the point under the mouse
  // stays put while scaling. Use SVG viewBox math, not CSS transform — CSS
  // scaling on the wrapper makes strokes blurry.
  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      // user-space coords under the cursor BEFORE zoom changes
      const vbW = grid.cols / zoom
      const vbH = grid.rows / zoom
      const userX = pan.x + (cursorX / rect.width) * vbW
      const userY = pan.y + (cursorY / rect.height) * vbH

      const dir = e.deltaY < 0 ? 1 : -1
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(zoom + dir * ZOOM_STEP).toFixed(2)))
      if (nextZoom === zoom) return

      const nextVbW = grid.cols / nextZoom
      const nextVbH = grid.rows / nextZoom
      // keep cursor anchored: solve for pan so userX/userY stays at same screen pos
      const nextPanX = userX - (cursorX / rect.width) * nextVbW
      const nextPanY = userY - (cursorY / rect.height) * nextVbH

      setZoom(nextZoom)
      setPan(clampPan({ x: nextPanX, y: nextPanY }, nextZoom))
    },
    [zoom, pan, grid.cols, grid.rows],
  )

  function clampPan(p: { x: number; y: number }, z: number): { x: number; y: number } {
    const vbW = grid.cols / z
    const vbH = grid.rows / z
    const maxX = Math.max(0, grid.cols - vbW)
    const maxY = Math.max(0, grid.rows - vbH)
    return {
      x: Math.max(0, Math.min(maxX, p.x)),
      y: Math.max(0, Math.min(maxY, p.y)),
    }
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // left button only; allow stall onClick to still fire by NOT preventDefault
      // until we see actual movement.
      if (e.button !== 0) return
      dragging.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      }
      ;(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
    },
    [pan],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current.active) return
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const vbW = grid.cols / zoom
      const vbH = grid.rows / zoom
      const dx = (e.clientX - dragging.current.startX) * (vbW / rect.width)
      const dy = (e.clientY - dragging.current.startY) * (vbH / rect.height)
      setPan(clampPan({ x: dragging.current.startPanX - dx, y: dragging.current.startPanY - dy }, zoom))
    },
    [zoom, grid.cols, grid.rows],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current.active) return
    dragging.current.active = false
    try {
      ;(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore — pointer was already released
    }
  }, [])

  // Track whether the pointer moved enough between down and up to count as a
  // drag (and therefore swallow the click). 4px threshold in screen space.
  const dragMovedRef = useRef(false)
  const onPointerMoveTrack = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current.active) return
      const dx = e.clientX - dragging.current.startX
      const dy = e.clientY - dragging.current.startY
      if (Math.hypot(dx, dy) > 4) dragMovedRef.current = true
      onPointerMove(e)
    },
    [onPointerMove],
  )
  const onPointerDownTrack = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      dragMovedRef.current = false
      onPointerDown(e)
    },
    [onPointerDown],
  )

  function resetView() {
    setZoom(1.4)
    setPan({ x: 0, y: 0 })
  }

  function zoomIn() {
    const nz = Math.min(MAX_ZOOM, +(zoom + ZOOM_STEP).toFixed(2))
    setZoom(nz)
    setPan((p) => clampPan(p, nz))
  }

  function zoomOut() {
    const nz = Math.max(MIN_ZOOM, +(zoom - ZOOM_STEP).toFixed(2))
    setZoom(nz)
    setPan((p) => clampPan(p, nz))
  }

  // When a search match exists, center the viewBox on the first match.
  useEffect(() => {
    if (!hasActiveSearch) return
    const first = stalls.find((s) => searchMatches.has(s.code))
    if (!first) return
    const targetZoom = Math.max(zoom, 1.4)
    const vbW = grid.cols / targetZoom
    const vbH = grid.rows / targetZoom
    const cx = first.col + first.w / 2
    const cy = first.row + first.h / 2
    setZoom(targetZoom)
    setPan(clampPan({ x: cx - vbW / 2, y: cy - vbH / 2 }, targetZoom))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveSearch, searchQuery])

  const viewBoxW = grid.cols / zoom
  const viewBoxH = grid.rows / zoom
  // Label scaling: bigger codes when zoomed out so they remain readable; the
  // text size in user-space shrinks slightly as you zoom in so it doesn't
  // overflow the stall rect.
  const labelSize = Math.max(0.9, Math.min(1.6, 1.4 / Math.sqrt(zoom)))

  return (
    <div className="relative w-full h-full" style={{ background: '#FAF8F2', borderRadius: 8 }}>
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/95 border border-neutral-200 rounded-lg shadow-sm">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="w-8 h-8 inline-flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-t-lg text-lg font-semibold disabled:opacity-40"
          disabled={zoom >= MAX_ZOOM}
        >
          +
        </button>
        <div className="text-[10px] text-neutral-500 text-center px-1 border-y border-neutral-100">
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="w-8 h-8 inline-flex items-center justify-center text-neutral-700 hover:bg-neutral-100 text-lg font-semibold disabled:opacity-40"
          disabled={zoom <= MIN_ZOOM}
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset view"
          className="w-8 h-8 inline-flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-b-lg text-[10px] font-semibold uppercase tracking-wider"
        >
          fit
        </button>
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-3 left-3 z-10 text-[10px] text-neutral-500 bg-white/80 px-2 py-1 rounded-md border border-neutral-200">
        scroll to zoom · drag to pan
      </div>

      <svg
        ref={svgRef}
        viewBox={`${pan.x} ${pan.y} ${viewBoxW} ${viewBoxH}`}
        className="w-full h-full select-none touch-none"
        style={{
          minWidth: 1200,
          minHeight: 700,
          cursor: dragging.current.active ? 'grabbing' : 'grab',
          background: '#FAF8F2',
          borderRadius: 8,
        }}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDownTrack}
        onPointerMove={onPointerMoveTrack}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* zones */}
        {zones.map((z, i) => (
          <g key={`z-${i}`}>
            <rect x={z.col} y={z.row} width={z.w} height={z.h} fill="#ffffff" fillOpacity={0.5} stroke="#B8924A" strokeWidth={0.3} rx={1} />
            <text
              x={z.col + z.w / 2}
              y={z.row + z.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.min(2.4, z.h * 0.5)}
              fill="#B8924A"
              fontWeight={700}
              className="font-sans uppercase tracking-[0.2em]"
            >
              {z.label}
            </text>
          </g>
        ))}

        {/* stalls */}
        {stalls.map((s) => {
          const interactive = mode === 'admin' && !!onSelect
          const isMine = (mode === 'exhibitor' || mode === 'vendor') && s.code === mineCode
          const isSelected = selected === s.code
          const isSearchHit = hasActiveSearch && searchMatches.has(s.code)
          const isDimmed = hasActiveSearch && !isSearchHit
          const labelFits = Math.min(s.w, s.h) >= 1.6

          return (
            <g key={s.code} opacity={isDimmed ? 0.25 : 1}>
              <rect
                x={s.col}
                y={s.row}
                width={s.w}
                height={s.h}
                rx={0.6}
                fill={fillFor(s)}
                stroke={isSearchHit ? '#cd2653' : strokeFor(s)}
                strokeWidth={
                  isSearchHit
                    ? 1.2
                    : isMine || isSelected
                    ? isSelected
                      ? 1.6
                      : 0.8
                    : 0.3
                }
                className={`${isSelected ? 'drop-shadow ' : ''}${
                  interactive
                    ? 'cursor-pointer transition-colors hover:stroke-[#cd2653]/50 hover:brightness-[1.08]'
                    : ''
                }`}
                onClick={
                  interactive
                    ? (e) => {
                        if (dragMovedRef.current) {
                          e.preventDefault()
                          return
                        }
                        onSelect!(s.code)
                      }
                    : undefined
                }
              >
                <title>
                  {s.code}
                  {s.occupant?.business_name ? ` · ${s.occupant.business_name}` : s.status ? ` · ${s.status}` : ''}
                </title>
              </rect>
              {labelFits && zoom >= 1.0 && (
                <text
                  x={s.col + s.w / 2}
                  y={s.row + s.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={labelSize}
                  fontWeight={isSearchHit || isSelected ? 800 : 600}
                  fill={
                    s.status === 'allocated' || isMine
                      ? '#ffffff'
                      : isSearchHit
                      ? '#cd2653'
                      : '#3f3a30'
                  }
                  className="pointer-events-none font-sans"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {s.code}
                </text>
              )}
              {isSearchHit && (
                <rect
                  x={s.col - 0.2}
                  y={s.row - 0.2}
                  width={s.w + 0.4}
                  height={s.h + 0.4}
                  rx={0.8}
                  fill="none"
                  stroke="#cd2653"
                  strokeWidth={0.4}
                  strokeDasharray="0.8 0.4"
                  className="pointer-events-none"
                >
                  <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
                </rect>
              )}
            </g>
          )
        })}

        {/* "you are here" pin (exhibitor + vendor views) */}
        {(mode === 'exhibitor' || mode === 'vendor') && mineCode && (() => {
          const me = stalls.find((s) => s.code === mineCode)
          if (!me) return null
          return (
            <g>
              <defs>
                <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#cd2653" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#E8C679" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle cx={me.col + me.w / 2} cy={me.row + me.h / 2} r={Math.max(me.w, me.h) * 1.4} fill="none" stroke="url(#pulseGradient)" strokeWidth={0.5} opacity={0.7}>
                <animate attributeName="r" values={`${Math.max(me.w, me.h) * 1.4};${Math.max(me.w, me.h) * 2.8}`} dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x={me.col + me.w / 2} y={me.row - 1.5} textAnchor="middle" fontSize={2.6} fontWeight={800} fill="#cd2653">YOU ARE HERE</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
