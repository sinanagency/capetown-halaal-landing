'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn, ZoomOut, RotateCcw, MapPin, X, Search,
  Utensils, Coffee, ShoppingBag, Sparkles, Home, Baby,
  BookOpen, Wrench, Ticket, Filter, Locate
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ALL_BOOTHS,
  SECTIONS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type Booth,
  type BoothCategory
} from '@/lib/floor-plan-data'

const CATEGORY_ICONS: Record<BoothCategory, typeof Utensils> = {
  food: Utensils,
  drinks: Coffee,
  fashion: ShoppingBag,
  beauty: Sparkles,
  home: Home,
  kids: Baby,
  islamic: BookOpen,
  services: Wrench,
  carnival: Ticket,
}

const MIN_SCALE = 0.4
const MAX_SCALE = 3.5
const SVG_WIDTH = 1000
const SVG_HEIGHT = 1100

interface SiteMapProps {
  onBoothSelect?: (booth: Booth) => void
}

export function SiteMap({ onBoothSelect }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Transform state
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })

  // Interaction state
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })
  const lastTouchDist = useRef<number | null>(null)
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null)

  // UI state
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null)
  const [hoveredBooth, setHoveredBooth] = useState<Booth | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<BoothCategory | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter booths
  const filteredBooths = ALL_BOOTHS.filter(booth => {
    const matchesSearch = booth.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booth.number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || booth.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const highlightedBoothIds = new Set(filteredBooths.map(b => b.id))

  // Fit map to container on mount
  useEffect(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = rect.width / SVG_WIDTH
    const scaleY = rect.height / SVG_HEIGHT
    const fitScale = Math.min(scaleX, scaleY) * 0.9
    setScale(fitScale)
    setTranslate({
      x: (rect.width - SVG_WIDTH * fitScale) / 2,
      y: (rect.height - SVG_HEIGHT * fitScale) / 2,
    })
  }, [])

  // Zoom toward a point
  const zoomToPoint = useCallback((newScale: number, cx: number, cy: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    setScale(prev => {
      const ratio = clamped / prev
      setTranslate(t => ({
        x: cx - (cx - t.x) * ratio,
        y: cy - (cy - t.y) * ratio,
      }))
      return clamped
    })
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    zoomToPoint(scale * factor, cx, cy)
  }, [scale, zoomToPoint])

  // Mouse pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY }
    translateStart.current = { ...translate }
  }, [translate])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    })
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  // Touch handlers (pinch zoom + pan)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      setIsPanning(true)
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      translateStart.current = { ...translate }
    }
  }, [translate])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const ratio = dist / lastTouchDist.current

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top

      // Pan + zoom simultaneously
      if (lastTouchCenter.current) {
        const newCx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const newCy = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const panDx = newCx - lastTouchCenter.current.x
        const panDy = newCy - lastTouchCenter.current.y
        setTranslate(t => ({ x: t.x + panDx, y: t.y + panDy }))
        lastTouchCenter.current = { x: newCx, y: newCy }
      }

      zoomToPoint(scale * ratio, cx, cy)
      lastTouchDist.current = dist
    } else if (e.touches.length === 1 && isPanning) {
      setTranslate({
        x: translateStart.current.x + (e.touches[0].clientX - panStart.current.x),
        y: translateStart.current.y + (e.touches[0].clientY - panStart.current.y),
      })
    }
  }, [isPanning, scale, zoomToPoint])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null
    lastTouchCenter.current = null
    setIsPanning(false)
  }, [])

  // Button zoom (zoom toward center)
  const zoomIn = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    zoomToPoint(scale * 1.3, rect.width / 2, rect.height / 2)
  }
  const zoomOut = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    zoomToPoint(scale * 0.7, rect.width / 2, rect.height / 2)
  }

  // Reset view
  const resetView = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = rect.width / SVG_WIDTH
    const scaleY = rect.height / SVG_HEIGHT
    const fitScale = Math.min(scaleX, scaleY) * 0.9
    setScale(fitScale)
    setTranslate({
      x: (rect.width - SVG_WIDTH * fitScale) / 2,
      y: (rect.height - SVG_HEIGHT * fitScale) / 2,
    })
    setSelectedBooth(null)
  }

  // Focus on a specific booth
  const focusBooth = (booth: Booth) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const targetScale = 2.0
    setScale(targetScale)
    setTranslate({
      x: rect.width / 2 - (booth.x + booth.width / 2) * targetScale,
      y: rect.height / 2 - (booth.y + booth.height / 2) * targetScale,
    })
    setSelectedBooth(booth)
  }

  const handleBoothClick = (booth: Booth) => {
    setSelectedBooth(booth)
    onBoothSelect?.(booth)
  }

  // Search result click
  const handleSearchSelect = (booth: Booth) => {
    focusBooth(booth)
    setSearchQuery('')
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[500px] bg-neutral-900 rounded-2xl overflow-hidden border border-white/10">
      {/* Top Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-800/95 backdrop-blur-sm border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50"
          />
          {/* Search results dropdown */}
          {searchQuery.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-neutral-800/98 backdrop-blur-sm border border-white/10 rounded-xl">
              {filteredBooths.slice(0, 8).map(booth => (
                <button
                  key={booth.id}
                  onClick={() => handleSearchSelect(booth)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[booth.category] }} />
                  <span className="text-sm text-white truncate">{booth.name}</span>
                  <span className="text-xs text-neutral-500 ml-auto">#{booth.number}</span>
                </button>
              ))}
              {filteredBooths.length === 0 && (
                <p className="px-3 py-2 text-sm text-neutral-500">No vendors found</p>
              )}
            </div>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0",
            showFilters
              ? "bg-[#cd2653] text-white"
              : "bg-neutral-800/95 text-neutral-300 hover:bg-neutral-700"
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Category Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 left-3 right-3 z-20 flex flex-wrap gap-1.5 p-3 bg-neutral-800/98 backdrop-blur-sm rounded-xl border border-white/10"
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                !selectedCategory
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const Icon = CATEGORY_ICONS[key as BoothCategory]
              const isActive = selectedCategory === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(isActive ? null : key as BoothCategory)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                  style={isActive ? { backgroundColor: CATEGORY_COLORS[key as BoothCategory] } : {}}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Controls - bottom left */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1">
        <button onClick={zoomIn} className="w-10 h-10 bg-neutral-800/95 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition-colors">
          <ZoomIn className="w-4 h-4 text-white" />
        </button>
        <button onClick={zoomOut} className="w-10 h-10 bg-neutral-800/95 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition-colors">
          <ZoomOut className="w-4 h-4 text-white" />
        </button>
        <button onClick={resetView} className="w-10 h-10 bg-neutral-800/95 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition-colors">
          <Locate className="w-4 h-4 text-white" />
        </button>
        <div className="text-center text-[10px] text-neutral-500 mt-1">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        className={cn(
          "w-full h-full touch-none select-none",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          ref={svgRef}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {/* Background */}
          <rect x="0" y="0" width="1000" height="1100" fill="#1a1a1a" rx="12" />

          {/* Grass/Trees area */}
          <rect x="0" y="0" width="1000" height="100" fill="#166534" opacity="0.3" rx="12" />
          <rect x="0" y="0" width="80" height="600" fill="#166534" opacity="0.3" />
          <rect x="920" y="0" width="80" height="600" fill="#166534" opacity="0.3" />

          {/* Sections */}
          {SECTIONS.map(section => (
            <g key={section.id}>
              <rect
                x={section.x}
                y={section.y}
                width={section.width}
                height={section.height}
                fill={section.color}
                opacity={0.12}
                rx={8}
              />
              <text
                x={section.x + section.width / 2}
                y={section.y + 18}
                textAnchor="middle"
                fill={section.color}
                fontSize="11"
                fontWeight="600"
                opacity={0.7}
              >
                {section.name}
              </text>
            </g>
          ))}

          {/* Main Aisles */}
          <rect x="80" y="640" width="840" height="4" fill="#ef4444" opacity="0.4" rx="2" />
          <rect x="80" y="800" width="840" height="4" fill="#ef4444" opacity="0.4" rx="2" />
          <rect x="500" y="640" width="4" height="400" fill="#ef4444" opacity="0.4" rx="2" />

          {/* Entrance */}
          <g transform="translate(800, 950)">
            <polygon points="0,0 -20,15 -20,5 -60,5 -60,-5 -20,-5 -20,-15" fill="#ef4444" />
            <text x="-30" y="30" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">
              ENTRANCE
            </text>
          </g>

          {/* Salaah Facilities */}
          <g transform="translate(180, 940)">
            <rect x="-80" y="-20" width="160" height="40" fill="#10b981" opacity="0.3" rx="4" />
            <text x="0" y="5" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
              SALAAH FACILITIES
            </text>
          </g>

          {/* Booths */}
          {ALL_BOOTHS.map(booth => {
            const isHighlighted = highlightedBoothIds.has(booth.id) || (!searchQuery && !selectedCategory)
            const isHovered = hoveredBooth?.id === booth.id
            const isSelected = selectedBooth?.id === booth.id
            const color = CATEGORY_COLORS[booth.category]

            return (
              <g
                key={booth.id}
                onClick={(e) => { e.stopPropagation(); handleBoothClick(booth) }}
                onMouseEnter={() => setHoveredBooth(booth)}
                onMouseLeave={() => setHoveredBooth(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={booth.x}
                  y={booth.y}
                  width={booth.width}
                  height={booth.height}
                  fill={color}
                  opacity={isHighlighted ? (isHovered || isSelected ? 1 : 0.7) : 0.15}
                  rx={3}
                  stroke={isSelected ? '#ffffff' : isHovered ? '#ffffff' : 'transparent'}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0}
                  className="transition-opacity duration-150"
                />
                {booth.width > 45 && (
                  <text
                    x={booth.x + booth.width / 2}
                    y={booth.y + booth.height / 2 + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="7"
                    fontWeight="500"
                    opacity={isHighlighted ? 0.9 : 0.2}
                    style={{ pointerEvents: 'none' }}
                  >
                    {booth.number}
                  </text>
                )}
              </g>
            )
          })}

          {/* Carnival Icons */}
          <g transform="translate(400, 100)">
            <circle cx="0" cy="0" r="30" fill="#eab308" opacity="0.3" />
            <text x="0" y="8" textAnchor="middle" fill="#eab308" fontSize="22">🎡</text>
          </g>
          <g transform="translate(500, 100)">
            <circle cx="0" cy="0" r="30" fill="#eab308" opacity="0.3" />
            <text x="0" y="8" textAnchor="middle" fill="#eab308" fontSize="22">🎠</text>
          </g>
          <g transform="translate(600, 100)">
            <circle cx="0" cy="0" r="30" fill="#eab308" opacity="0.3" />
            <text x="0" y="8" textAnchor="middle" fill="#eab308" fontSize="22">🏰</text>
          </g>

          {/* First Aid */}
          <g transform="translate(850, 750)">
            <rect x="-18" y="-18" width="36" height="36" fill="#ef4444" rx="8" />
            <text x="0" y="7" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">+</text>
          </g>

          {/* Toilets */}
          <g transform="translate(850, 650)">
            <rect x="-14" y="-14" width="28" height="28" fill="#6b7280" rx="4" />
            <text x="0" y="6" textAnchor="middle" fill="white" fontSize="14">🚻</text>
          </g>
        </svg>
      </div>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredBooth && !selectedBooth && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-14 right-3 sm:right-auto sm:max-w-xs p-3 bg-neutral-800/98 backdrop-blur-sm rounded-xl border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[hoveredBooth.category] }}
              >
                {(() => {
                  const Icon = CATEGORY_ICONS[hoveredBooth.category]
                  return <Icon className="w-4 h-4 text-white" />
                })()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{hoveredBooth.name}</p>
                <p className="text-xs text-neutral-400">
                  #{hoveredBooth.number} · {CATEGORY_LABELS[hoveredBooth.category]}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Booth Panel */}
      <AnimatePresence>
        {selectedBooth && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-14 right-3 bottom-3 w-72 sm:w-80 bg-neutral-800/98 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden flex flex-col"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-white text-sm">Booth Details</h3>
              <button
                onClick={() => setSelectedBooth(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div
                className="w-full h-20 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: CATEGORY_COLORS[selectedBooth.category] + '25' }}
              >
                {(() => {
                  const Icon = CATEGORY_ICONS[selectedBooth.category]
                  return <Icon className="w-10 h-10" style={{ color: CATEGORY_COLORS[selectedBooth.category] }} />
                })()}
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">{selectedBooth.name}</h4>
                <p className="text-neutral-400 text-sm">Booth #{selectedBooth.number}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-neutral-500 mb-0.5">Category</p>
                  <p className="text-xs font-medium text-white">{CATEGORY_LABELS[selectedBooth.category]}</p>
                </div>
                <div className="p-2.5 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-neutral-500 mb-0.5">Section</p>
                  <p className="text-xs font-medium text-white capitalize">{selectedBooth.section.replace('-', ' ')}</p>
                </div>
                <div className="p-2.5 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-neutral-500 mb-0.5">Size</p>
                  <p className="text-xs font-medium text-white">{selectedBooth.size}m</p>
                </div>
                <div className="p-2.5 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-neutral-500 mb-0.5">Status</p>
                  <p className="text-xs font-medium capitalize" style={{ color: selectedBooth.status === 'available' ? '#10b981' : '#f97316' }}>
                    {selectedBooth.status}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <MapPin className="w-4 h-4 text-[#cd2653]" />
                  {selectedBooth.section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend - bottom right */}
      <div className="absolute bottom-3 right-3 p-2.5 bg-neutral-800/95 backdrop-blur-sm rounded-xl border border-white/10">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          {Object.entries(CATEGORY_COLORS).slice(0, 9).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-neutral-400 capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
