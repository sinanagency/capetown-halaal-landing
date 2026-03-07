// Booth data generator for Cape Town Halaal Lifestyle Expo
// 400 booths with varying sizes and prices (R2,500 - R8,000)
// Venue: Green Point A Track, Cape Town

export type BoothSize = '3x2' | '3x3' | '4x4' | '6x6'

export type BoothStatus = 'available' | 'reserved' | 'sold'

export interface Booth {
  id: string
  number: number
  row: string
  column: number
  size: BoothSize
  price: number
  sqm: number
  status: BoothStatus
  position: { x: number; z: number }
  dimensions: { width: number; depth: number }
  features: string[]
  zone: 'standard' | 'premium' | 'prime'
  reservedBy?: string
  reservedAt?: Date
}

export interface BoothTier {
  size: BoothSize
  label: string
  price: number
  sqm: number
  dimensions: { width: number; depth: number }
  features: string[]
  zone: 'standard' | 'premium' | 'prime'
  color: string
}

export const BOOTH_TIERS: Record<BoothSize, BoothTier> = {
  '3x2': {
    size: '3x2',
    label: 'Standard',
    price: 2500,
    sqm: 6,
    dimensions: { width: 3, depth: 2 },
    features: ['Basic signage', '1 table', '2 chairs', 'Power outlet'],
    zone: 'standard',
    color: '#3b82f6' // blue
  },
  '3x3': {
    size: '3x3',
    label: 'Medium',
    price: 4000,
    sqm: 9,
    dimensions: { width: 3, depth: 3 },
    features: ['Standard signage', '2 tables', '4 chairs', '2 Power outlets', 'Lighting'],
    zone: 'standard',
    color: '#22c55e' // green
  },
  '4x4': {
    size: '4x4',
    label: 'Large',
    price: 6000,
    sqm: 16,
    dimensions: { width: 4, depth: 4 },
    features: ['Premium signage', '3 tables', '6 chairs', '4 Power outlets', 'Spot lighting', 'Corner priority'],
    zone: 'premium',
    color: '#f59e0b' // amber
  },
  '6x6': {
    size: '6x6',
    label: 'Premium',
    price: 8000,
    sqm: 36,
    dimensions: { width: 6, depth: 6 },
    features: ['Large signage', '4 tables', '8 chairs', '6 Power outlets', 'Dedicated lighting', 'Prime location', 'Storage area'],
    zone: 'prime',
    color: '#ef4444' // red
  }
}

// Grid configuration: 20 rows x 20 columns = 400 positions
const ROWS = 20
const COLS = 20
const GRID_SPACING = 4 // meters between booth centers

// Zone definitions - Prime locations near entrances and stage
const PRIME_ZONES = [
  { rowStart: 0, rowEnd: 2, colStart: 8, colEnd: 12 }, // Main entrance
  { rowStart: 17, rowEnd: 19, colStart: 8, colEnd: 12 }, // Stage area
]

const PREMIUM_ZONES = [
  { rowStart: 0, rowEnd: 3, colStart: 0, colEnd: 4 }, // Corner 1
  { rowStart: 0, rowEnd: 3, colStart: 16, colEnd: 19 }, // Corner 2
  { rowStart: 16, rowEnd: 19, colStart: 0, colEnd: 4 }, // Corner 3
  { rowStart: 16, rowEnd: 19, colStart: 16, colEnd: 19 }, // Corner 4
  { rowStart: 8, rowEnd: 12, colStart: 0, colEnd: 2 }, // Side entrance 1
  { rowStart: 8, rowEnd: 12, colStart: 18, colEnd: 19 }, // Side entrance 2
]

function isInZone(row: number, col: number, zones: typeof PRIME_ZONES): boolean {
  return zones.some(zone =>
    row >= zone.rowStart && row <= zone.rowEnd &&
    col >= zone.colStart && col <= zone.colEnd
  )
}

function getBoothSize(row: number, col: number, random: number): BoothSize {
  const isPrime = isInZone(row, col, PRIME_ZONES)
  const isPremium = isInZone(row, col, PREMIUM_ZONES)

  if (isPrime) {
    return random > 0.5 ? '6x6' : '4x4'
  }

  if (isPremium) {
    if (random > 0.6) return '4x4'
    return '3x3'
  }

  // Standard zone distribution
  if (random > 0.7) return '3x3'
  return '3x2'
}

function getRowLetter(index: number): string {
  return String.fromCharCode(65 + index) // A, B, C, etc.
}

// Seeded random for consistent booth generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

export function generateBooths(): Booth[] {
  const booths: Booth[] = []
  const random = seededRandom(42) // Consistent seed
  let boothNumber = 1

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const r = random()
      const size = getBoothSize(row, col, r)
      const tier = BOOTH_TIERS[size]

      // All booths start as available for the demo
      const status: BoothStatus = 'available'

      const booth: Booth = {
        id: `booth-${row}-${col}`,
        number: boothNumber++,
        row: getRowLetter(row),
        column: col + 1,
        size,
        price: tier.price,
        sqm: tier.sqm,
        status,
        position: {
          x: (col - COLS / 2) * GRID_SPACING,
          z: (row - ROWS / 2) * GRID_SPACING
        },
        dimensions: tier.dimensions,
        features: tier.features,
        zone: tier.zone
      }

      booths.push(booth)
    }
  }

  return booths
}

// Pre-generated booths for the app
export const BOOTHS = generateBooths()

// Statistics
export function getBoothStats(booths: Booth[]) {
  const bySize: Record<BoothSize, { count: number; available: number; price: number }> = {} as Record<BoothSize, { count: number; available: number; price: number }>
  const byZone: Record<string, { count: number; available: number }> = {}

  // Count by size
  const sizeKeys = Object.keys(BOOTH_TIERS) as BoothSize[]
  for (const size of sizeKeys) {
    const sizeBooths = booths.filter(b => b.size === size)
    bySize[size] = {
      count: sizeBooths.length,
      available: sizeBooths.filter(b => b.status === 'available').length,
      price: BOOTH_TIERS[size].price
    }
  }

  // Count by zone
  const zones = ['standard', 'premium', 'prime'] as const
  for (const zone of zones) {
    const zoneBooths = booths.filter(b => b.zone === zone)
    byZone[zone] = {
      count: zoneBooths.length,
      available: zoneBooths.filter(b => b.status === 'available').length
    }
  }

  return {
    total: booths.length,
    available: booths.filter(b => b.status === 'available').length,
    reserved: booths.filter(b => b.status === 'reserved').length,
    sold: booths.filter(b => b.status === 'sold').length,
    bySize,
    byZone
  }
}

// Format price in South African Rand
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}
