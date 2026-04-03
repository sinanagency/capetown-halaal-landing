'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { BOOTH_TIERS, formatPrice, type Booth, type BoothType } from '@/lib/booth-data'
import { useBoothStore } from '@/lib/store'
import { Search } from 'lucide-react'

// Grid bounds from the SDP layout
const GRID_MIN_COL = 22
const GRID_MAX_COL = 122
const GRID_MIN_ROW = 43
const GRID_MAX_ROW = 120

const CELL_SIZE = 8 // px per grid cell
const PAD = 40 // padding around the SVG content

const SVG_WIDTH = (GRID_MAX_COL - GRID_MIN_COL) * CELL_SIZE + PAD * 2
const SVG_HEIGHT = (GRID_MAX_ROW - GRID_MIN_ROW) * CELL_SIZE + PAD * 2

function boothRect(booth: Booth) {
  const tier = BOOTH_TIERS[booth.type]
  const x = (booth.col - GRID_MIN_COL) * CELL_SIZE + PAD
  const y = (booth.row - GRID_MIN_ROW) * CELL_SIZE + PAD
  const w = tier.gridCells.width * CELL_SIZE
  const h = tier.gridCells.depth * CELL_SIZE
  return { x, y, w, h }
}

// Zone label positions (approximate center of each cluster)
const ZONE_LABELS = [
  { label: 'FOOD COURT', x: 18, y: 68, col: 22, row: 68 },
  { label: 'MAIN STAGE', x: 71, y: 60, col: 71, row: 60 },
  { label: 'TRADE MARKET', x: 71, y: 108, col: 71, row: 108 },
  { label: 'FOOD ZONE', x: 71, y: 96, col: 71, row: 96 },
]

export function FloorPlan2D() {
  const { booths, selectedBooth, hoveredBooth, cart, selectBooth, hoverBooth, getFilteredBooths, loadBooths } =
    useBoothStore()

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [tooltipBooth, setTooltipBooth] = useState<Booth | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadBooths()
  }, [loadBooths])

  const filteredBooths = getFilteredBooths()
  const filteredIds = useMemo(() => new Set(filteredBooths.map((b) => b.id)), [filteredBooths])
  const cartIds = useMemo(() => new Set(cart.map((b) => b.id)), [cart])

  const searchMatch = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.trim().toUpperCase()
    return booths.find((b) => b.id.toUpperCase() === q)
  }, [searchQuery, booths])

  // Booth type counts
  const typeCounts = useMemo(() => {
    const counts: Record<BoothType, number> = { FT: 0, FS: 0, TS: 0, BS: 0 }
    booths.forEach((b) => counts[b.type]++)
    return counts
  }, [booths])

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    },
    [pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    },
    [isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => Math.max(0.4, Math.min(3, z + delta)))
  }, [])

  const handleBoothHover = useCallback(
    (booth: Booth | null, e?: React.MouseEvent<SVGRectElement>) => {
      setTooltipBooth(booth)
      if (booth && e && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
      hoverBooth(booth)
    },
    [hoverBooth]
  )

  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/10 flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Find booth (e.g. FT01)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#cd2653]/50 w-44"
            />
          </div>

          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-sm"
          >
            -
          </button>
          <span className="text-sm text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
            className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-sm"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
            className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-xs text-gray-400"
          >
            Reset
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {(['FT', 'FS', 'TS', 'BS'] as BoothType[]).map((t) => {
            const tier = BOOTH_TIERS[t]
            return (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: tier.color }} />
                <span className="text-gray-400">
                  {tier.label} ({typeCounts[t]})
                </span>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-600" />
            <span className="text-gray-400">Unavailable</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Background */}
          <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0a0a0f" />

          {/* Ground plane */}
          <rect
            x={PAD - 4}
            y={PAD - 4}
            width={(GRID_MAX_COL - GRID_MIN_COL) * CELL_SIZE + 8}
            height={(GRID_MAX_ROW - GRID_MIN_ROW) * CELL_SIZE + 8}
            fill="#111118"
            rx={6}
          />

          {/* Zone labels */}
          {ZONE_LABELS.map((zl) => (
            <text
              key={zl.label}
              x={(zl.col - GRID_MIN_COL) * CELL_SIZE + PAD}
              y={(zl.row - GRID_MIN_ROW) * CELL_SIZE + PAD}
              fill="#ffffff"
              fontSize="9"
              fontWeight="600"
              textAnchor="middle"
              opacity={0.15}
              style={{ pointerEvents: 'none' }}
            >
              {zl.label}
            </text>
          ))}

          {/* Entrance labels */}
          <text
            x={SVG_WIDTH / 2}
            y={PAD - 12}
            fill="#22c55e"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            opacity={0.7}
          >
            MAIN ENTRANCE
          </text>
          <text
            x={SVG_WIDTH / 2}
            y={SVG_HEIGHT - PAD + 20}
            fill="#f59e0b"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            opacity={0.7}
          >
            STAGE AREA
          </text>

          {/* Booths */}
          {booths.map((booth) => {
            const { x, y, w, h } = boothRect(booth)
            const isSelected = selectedBooth?.id === booth.id
            const isHovered = hoveredBooth?.id === booth.id
            const isInCart = cartIds.has(booth.id)
            const isFiltered = !filteredIds.has(booth.id)
            const isSearchHighlight = searchMatch?.id === booth.id
            const isAvailable = booth.status === 'available'

            let fill = booth.color
            if (isInCart) fill = '#22c55e'
            else if (booth.status === 'sold') fill = '#1f2937'
            else if (booth.status === 'reserved') fill = '#4b5563'
            else if (isSelected) fill = '#f59e0b'

            const opacity = isFiltered && isAvailable ? 0.15 : isHovered || isSelected ? 1 : 0.75
            const strokeColor = isSearchHighlight
              ? '#cd2653'
              : isSelected
                ? '#f59e0b'
                : isHovered
                  ? '#ffffff'
                  : isInCart
                    ? '#22c55e'
                    : 'transparent'
            const strokeWidth = isSearchHighlight ? 2.5 : isSelected || isInCart ? 2 : isHovered ? 1.5 : 0

            return (
              <g key={booth.id}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={fill}
                  opacity={opacity}
                  rx={2}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{ cursor: isAvailable ? 'pointer' : 'not-allowed', transition: 'opacity 0.15s' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isAvailable) selectBooth(booth)
                  }}
                  onMouseEnter={(e) => handleBoothHover(booth, e)}
                  onMouseMove={(e) => {
                    if (containerRef.current) {
                      const rect = containerRef.current.getBoundingClientRect()
                      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                    }
                  }}
                  onMouseLeave={() => handleBoothHover(null)}
                />
                {w >= 16 && (
                  <text
                    x={x + w / 2}
                    y={y + h / 2 + 2.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={w >= 24 ? 7 : 5.5}
                    fontWeight="600"
                    opacity={isFiltered && isAvailable ? 0.2 : 0.9}
                    style={{ pointerEvents: 'none' }}
                  >
                    {booth.id}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {tooltipBooth && (
          <div
            className="absolute z-30 pointer-events-none bg-neutral-900/95 border border-white/15 rounded-lg px-3 py-2 text-xs shadow-xl"
            style={{
              left: tooltipPos.x + 14,
              top: tooltipPos.y - 10,
              maxWidth: 220,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tooltipBooth.color }} />
              <span className="font-semibold text-white">{tooltipBooth.id}</span>
              <span className="text-gray-400">{BOOTH_TIERS[tooltipBooth.type].label}</span>
            </div>
            <div className="text-gray-400">
              {tooltipBooth.dimensions.width}m x {tooltipBooth.dimensions.depth}m | {formatPrice(tooltipBooth.price)}
            </div>
            <div className="mt-0.5">
              {tooltipBooth.status === 'available' ? (
                <span className="text-emerald-400">Available</span>
              ) : (
                <span className="text-gray-500 capitalize">{tooltipBooth.status}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
