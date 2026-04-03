'use client'

import { useBoothStore } from '@/lib/store'
import { BOOTH_TIERS, BoothSize, formatPrice, getBoothStats, BOOTHS } from '@/lib/booth-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Filter, RotateCcw, MapPin, Ruler, DollarSign } from 'lucide-react'

export function BoothFilters() {
  const { filters, setFilters, resetFilters, booths } = useBoothStore()
  const stats = getBoothStats(booths)

  const sizeOptions = Object.entries(BOOTH_TIERS).map(([key, tier]) => ({
    value: key,
    label: tier.label,
    price: tier.price,
    sqm: tier.sqm
  }))

  const zoneOptions = [
    { value: 'standard', label: 'Standard', color: 'bg-blue-500' },
    { value: 'premium', label: 'Premium', color: 'bg-purple-500' },
    { value: 'prime', label: 'Prime', color: 'bg-red-500' }
  ]

  const toggleSize = (size: string) => {
    const newSizes = filters.size.includes(size)
      ? filters.size.filter(s => s !== size)
      : [...filters.size, size]
    setFilters({ size: newSizes })
  }

  const toggleZone = (zone: string) => {
    const newZones = filters.zone.includes(zone)
      ? filters.zone.filter(z => z !== zone)
      : [...filters.zone, zone]
    setFilters({ zone: newZones })
  }

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-2 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats summary */}
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white">{stats.available}</p>
          <p className="text-sm text-gray-400">Booths Available</p>
          <p className="text-xs text-gray-500 mt-1">of {stats.total} total spaces</p>
        </div>

        <Separator className="bg-white/10" />

        {/* Show available only */}
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-300">Show available only</Label>
          <button
            onClick={() => setFilters({ showAvailableOnly: !filters.showAvailableOnly })}
            className={cn(
              'w-10 h-6 rounded-full transition-colors relative',
              filters.showAvailableOnly ? 'bg-[#cd2653]' : 'bg-gray-600'
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                filters.showAvailableOnly ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        <Separator className="bg-white/10" />

        {/* Zone filter */}
        <div className="space-y-3">
          <Label className="text-sm text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Zone
          </Label>
          <div className="flex flex-wrap gap-2">
            {zoneOptions.map(zone => {
              const zoneStats = stats.byZone[zone.value]
              const isActive = filters.zone.includes(zone.value)

              return (
                <button
                  key={zone.value}
                  onClick={() => toggleZone(zone.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
                    isActive
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', zone.color)} />
                  <span className="text-sm">{zone.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {zoneStats?.available || 0}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Size filter */}
        <div className="space-y-3">
          <Label className="text-sm text-gray-300 flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Booth Size
          </Label>
          <div className="space-y-2">
            {sizeOptions.map(size => {
              const sizeStats = stats.bySize[size.value as BoothSize]
              const isActive = filters.size.includes(size.value)

              return (
                <button
                  key={size.value}
                  onClick={() => toggleSize(size.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all',
                    isActive
                      ? 'bg-white/10 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{size.label}</span>
                    <span className="text-xs text-gray-500">{size.sqm}m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{formatPrice(size.price)}</span>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {sizeStats?.available || 0}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Price range */}
        <div className="space-y-3">
          <Label className="text-sm text-gray-300 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Price Range
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{formatPrice(filters.priceRange[0])}</span>
            <input
              type="range"
              min={1600}
              max={8000}
              step={200}
              value={filters.priceRange[1]}
              onChange={(e) => setFilters({ priceRange: [filters.priceRange[0], Number(e.target.value)] })}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm text-gray-500">{formatPrice(filters.priceRange[1])}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
