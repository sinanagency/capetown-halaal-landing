'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn, ZoomOut, RotateCcw, MapPin, X, Search,
  Utensils, Coffee, ShoppingBag, Sparkles, Home, Baby,
  BookOpen, Wrench, Ticket, Filter
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

interface SiteMapProps {
  onBoothSelect?: (booth: Booth) => void
}

export function SiteMap({ onBoothSelect }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.8)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
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

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 2))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.3))
  const handleReset = () => {
    setScale(0.8)
    setPosition({ x: 0, y: 0 })
  }

  // Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(s => Math.max(0.3, Math.min(2, s + delta)))
  }

  const handleBoothClick = (booth: Booth) => {
    setSelectedBooth(booth)
    onBoothSelect?.(booth)
  }

  return (
    <div className="relative w-full h-[800px] bg-neutral-900 rounded-2xl overflow-hidden border border-white/10">
      {/* Header Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/90 backdrop-blur-sm border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
            showFilters
              ? "bg-[#cd2653] text-white"
              : "bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700"
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-neutral-800/90 backdrop-blur-sm rounded-xl p-1">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-sm text-neutral-400 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-4 right-4 z-20 flex flex-wrap gap-2 p-4 bg-neutral-800/95 backdrop-blur-sm rounded-xl border border-white/10"
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                !selectedCategory
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const Icon = CATEGORY_ICONS[key as BoothCategory]
              const isSelected = selectedCategory === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(isSelected ? null : key as BoothCategory)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isSelected
                      ? "text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                  style={isSelected ? { backgroundColor: CATEGORY_COLORS[key as BoothCategory] } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 1100"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Background */}
          <rect x="0" y="0" width="1000" height="1100" fill="#1a1a1a" />

          {/* Grass/Trees area (top and sides) */}
          <rect x="0" y="0" width="1000" height="100" fill="#166534" opacity="0.3" />
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
                opacity={0.15}
                rx={8}
              />
              <text
                x={section.x + section.width / 2}
                y={section.y + 20}
                textAnchor="middle"
                fill={section.color}
                fontSize="12"
                fontWeight="600"
                opacity={0.8}
              >
                {section.name}
              </text>
            </g>
          ))}

          {/* Main Aisles */}
          <rect x="80" y="640" width="840" height="5" fill="#ef4444" opacity="0.5" />
          <rect x="80" y="800" width="840" height="5" fill="#ef4444" opacity="0.5" />
          <rect x="500" y="640" width="5" height="400" fill="#ef4444" opacity="0.5" />

          {/* Entrance Arrow */}
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
            const isHighlighted = highlightedBoothIds.has(booth.id) || !searchQuery && !selectedCategory
            const isHovered = hoveredBooth?.id === booth.id
            const isSelected = selectedBooth?.id === booth.id
            const color = CATEGORY_COLORS[booth.category]

            return (
              <g
                key={booth.id}
                onClick={() => handleBoothClick(booth)}
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
                  opacity={isHighlighted ? (isHovered || isSelected ? 1 : 0.7) : 0.2}
                  rx={4}
                  stroke={isSelected ? '#fff' : isHovered ? '#fff' : 'transparent'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                />
                {booth.width > 50 && (
                  <text
                    x={booth.x + booth.width / 2}
                    y={booth.y + booth.height / 2 + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="8"
                    fontWeight="500"
                    opacity={isHighlighted ? 1 : 0.3}
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
            <text x="0" y="5" textAnchor="middle" fill="#eab308" fontSize="20">
              🎡
            </text>
          </g>
          <g transform="translate(500, 100)">
            <circle cx="0" cy="0" r="30" fill="#eab308" opacity="0.3" />
            <text x="0" y="5" textAnchor="middle" fill="#eab308" fontSize="20">
              🎠
            </text>
          </g>
          <g transform="translate(600, 100)">
            <circle cx="0" cy="0" r="30" fill="#eab308" opacity="0.3" />
            <text x="0" y="5" textAnchor="middle" fill="#eab308" fontSize="20">
              🏰
            </text>
          </g>

          {/* First Aid */}
          <g transform="translate(850, 750)">
            <rect x="-20" y="-20" width="40" height="40" fill="#ef4444" rx="8" />
            <text x="0" y="7" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
              +
            </text>
          </g>

          {/* Toilets */}
          <g transform="translate(850, 650)">
            <rect x="-15" y="-15" width="30" height="30" fill="#6b7280" rx="4" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14">
              🚻
            </text>
          </g>
        </svg>
      </div>

      {/* Booth Info Tooltip */}
      <AnimatePresence>
        {hoveredBooth && !selectedBooth && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 p-4 bg-neutral-800/95 backdrop-blur-sm rounded-xl border border-white/10 max-w-xs"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: CATEGORY_COLORS[hoveredBooth.category] }}
              >
                {(() => {
                  const Icon = CATEGORY_ICONS[hoveredBooth.category]
                  return <Icon className="w-5 h-5 text-white" />
                })()}
              </div>
              <div>
                <p className="font-semibold text-white">{hoveredBooth.name}</p>
                <p className="text-sm text-neutral-400">
                  Booth {hoveredBooth.number} • {CATEGORY_LABELS[hoveredBooth.category]}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Booth Detail Panel */}
      <AnimatePresence>
        {selectedBooth && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 bottom-4 w-80 bg-neutral-800/95 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">Booth Details</h3>
              <button
                onClick={() => setSelectedBooth(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div
                className="w-full h-24 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: CATEGORY_COLORS[selectedBooth.category] + '30' }}
              >
                {(() => {
                  const Icon = CATEGORY_ICONS[selectedBooth.category]
                  return <Icon className="w-12 h-12" style={{ color: CATEGORY_COLORS[selectedBooth.category] }} />
                })()}
              </div>

              <div>
                <h4 className="text-xl font-bold text-white">{selectedBooth.name}</h4>
                <p className="text-neutral-400">Booth #{selectedBooth.number}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-white">{CATEGORY_LABELS[selectedBooth.category]}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">Section</p>
                  <p className="text-sm font-medium text-white capitalize">{selectedBooth.section.replace('-', ' ')}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">Size</p>
                  <p className="text-sm font-medium text-white">{selectedBooth.size}m</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">Status</p>
                  <p className="text-sm font-medium capitalize" style={{ color: selectedBooth.status === 'available' ? '#10b981' : '#f97316' }}>
                    {selectedBooth.status}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-neutral-500 mb-2">Location on map</p>
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <MapPin className="w-4 h-4 text-[#cd2653]" />
                  {selectedBooth.section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 p-3 bg-neutral-800/90 backdrop-blur-sm rounded-xl border border-white/10">
        <p className="text-xs text-neutral-500 mb-2">Legend</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(CATEGORY_COLORS).slice(0, 6).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-neutral-400 capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
