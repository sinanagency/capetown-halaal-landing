'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Booth, BOOTH_TIERS, formatPrice } from '@/lib/booth-data'
import { useBoothStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface BoothCellProps {
  booth: Booth
  isSelected: boolean
  isHovered: boolean
  isInCart: boolean
  onClick: () => void
  onHover: (hovered: boolean) => void
}

function BoothCell({ booth, isSelected, isHovered, isInCart, onClick, onHover }: BoothCellProps) {
  const tier = BOOTH_TIERS[booth.size]

  const bgColor = useMemo(() => {
    if (isInCart) return 'bg-green-500'
    if (booth.status === 'sold') return 'bg-gray-800'
    if (booth.status === 'reserved') return 'bg-gray-600'
    if (isSelected) return 'bg-amber-500'

    // Zone-based colors
    switch (tier.zone) {
      case 'prime': return 'bg-red-500/80'
      case 'premium': return 'bg-purple-500/80'
      default: return 'bg-blue-500/80'
    }
  }, [booth.status, isSelected, isInCart, tier.zone])

  const isClickable = booth.status === 'available'

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center rounded-sm border transition-all duration-150',
        bgColor,
        isClickable ? 'cursor-pointer hover:scale-105 hover:z-10' : 'cursor-not-allowed opacity-50',
        isSelected && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900',
        isHovered && isClickable && 'ring-2 ring-blue-400',
        isInCart && 'ring-2 ring-green-400'
      )}
      style={{
        width: `${booth.dimensions.width * 15}px`,
        height: `${booth.dimensions.depth * 15}px`,
      }}
      onClick={() => isClickable && onClick()}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      whileHover={isClickable ? { scale: 1.05 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
    >
      <span className="text-[10px] font-bold text-white drop-shadow-md">
        {booth.row}{booth.column}
      </span>

      {isInCart && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full flex items-center justify-center">
          <span className="text-[8px]">✓</span>
        </div>
      )}
    </motion.div>
  )
}

export function FloorPlan2D() {
  const { booths, selectedBooth, hoveredBooth, cart, selectBooth, hoverBooth, getFilteredBooths } = useBoothStore()
  const [zoom, setZoom] = useState(1)

  const filteredBooths = getFilteredBooths()
  const cartIds = cart.map(b => b.id)

  // Group booths by row
  const boothsByRow = useMemo(() => {
    const rows: Record<string, Booth[]> = {}
    booths.forEach(booth => {
      if (!rows[booth.row]) rows[booth.row] = []
      rows[booth.row].push(booth)
    })
    // Sort each row by column
    Object.keys(rows).forEach(row => {
      rows[row].sort((a, b) => a.column - b.column)
    })
    return rows
  }, [booths])

  const rowLetters = Object.keys(boothsByRow).sort()

  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/10 flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm"
          >
            -
          </button>
          <span className="text-sm text-gray-400 w-12 sm:w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-400">Standard</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-gray-400">Premium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-400">Prime</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-600" />
            <span className="text-gray-400">Unavailable</span>
          </div>
        </div>
      </div>

      {/* Floor plan grid */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="relative mx-auto"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            width: 'fit-content'
          }}
        >
          {/* Main entrance label */}
          <div className="text-center mb-4">
            <span className="px-4 py-2 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full border border-green-500/30">
              MAIN ENTRANCE
            </span>
          </div>

          {/* Grid container */}
          <div className="relative bg-gray-900/50 p-4 rounded-xl border border-white/5">
            {/* Side entrance left */}
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30 whitespace-nowrap">
                SIDE ENTRANCE
              </span>
            </div>

            {/* Side entrance right */}
            <div className="absolute -right-16 top-1/2 -translate-y-1/2 rotate-90">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30 whitespace-nowrap">
                SIDE ENTRANCE
              </span>
            </div>

            {/* Booth grid */}
            <div className="flex flex-col gap-1">
              {rowLetters.map(row => (
                <div key={row} className="flex items-center gap-1">
                  {/* Row label */}
                  <span className="w-6 text-xs text-gray-500 font-mono">{row}</span>

                  {/* Booths in row */}
                  <div className="flex gap-1">
                    {boothsByRow[row].map(booth => {
                      const isFiltered = !filteredBooths.find(b => b.id === booth.id)
                      if (isFiltered && booth.status === 'available') {
                        return <div key={booth.id} className="opacity-20">
                          <BoothCell
                            booth={booth}
                            isSelected={false}
                            isHovered={false}
                            isInCart={false}
                            onClick={() => {}}
                            onHover={() => {}}
                          />
                        </div>
                      }

                      return (
                        <BoothCell
                          key={booth.id}
                          booth={booth}
                          isSelected={selectedBooth?.id === booth.id}
                          isHovered={hoveredBooth?.id === booth.id}
                          isInCart={cartIds.includes(booth.id)}
                          onClick={() => selectBooth(booth)}
                          onHover={(hovered) => hoverBooth(hovered ? booth : null)}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage label */}
          <div className="text-center mt-4">
            <span className="px-4 py-2 bg-amber-500/20 text-amber-400 text-sm font-semibold rounded-full border border-amber-500/30">
              STAGE
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
