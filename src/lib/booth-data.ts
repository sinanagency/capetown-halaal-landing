// Booth data for Young at Heart Festival 2026
// Real SDP layout: 264 booths across 4 types
// Venue: Youngsfield Military Base, Cape Town

export type BoothType = 'FT' | 'FS' | 'TS' | 'BS'

export type BoothStatus = 'available' | 'reserved' | 'sold'

export interface Booth {
  id: string
  type: BoothType
  label: string
  status: BoothStatus
  price: number
  sqm: number
  position: { x: number; z: number }
  dimensions: { width: number; depth: number }
  features: string[]
  zone: string
  color: string
  col: number
  row: number
  reservedBy?: string
  reservedAt?: Date
}

export interface BoothTier {
  type: BoothType
  label: string
  price: number
  sqm: number
  dimensions: { width: number; depth: number }
  gridCells: { width: number; depth: number }
  height3d: number
  features: string[]
  zone: string
  color: string
}

export const BOOTH_TIERS: Record<BoothType, BoothTier> = {
  FT: {
    type: 'FT',
    label: 'Food Tent',
    price: 8000,
    sqm: 36,
    dimensions: { width: 6, depth: 6 },
    gridCells: { width: 3, depth: 3 },
    height3d: 1.5,
    features: [
      'Large tent structure',
      '4 tables, 8 chairs',
      '6 power outlets',
      'Dedicated lighting',
      'Prime food court location',
      'Water access',
    ],
    zone: 'Food Court',
    color: '#f97316',
  },
  FS: {
    type: 'FS',
    label: 'Food Stall',
    price: 4500,
    sqm: 9,
    dimensions: { width: 3, depth: 3 },
    gridCells: { width: 3, depth: 3 },
    height3d: 1.0,
    features: [
      'Standard stall frame',
      '2 tables, 4 chairs',
      '2 power outlets',
      'Basic lighting',
      'Food zone location',
    ],
    zone: 'Food Zone',
    color: '#3b82f6',
  },
  TS: {
    type: 'TS',
    label: 'Trade Stall',
    price: 2500,
    sqm: 6,
    dimensions: { width: 3, depth: 2 },
    gridCells: { width: 2, depth: 2 },
    height3d: 0.7,
    features: [
      'Compact stall frame',
      '1 table, 2 chairs',
      '1 power outlet',
      'Basic signage',
    ],
    zone: 'Trade Market',
    color: '#22c55e',
  },
  BS: {
    type: 'BS',
    label: 'Bar Stand',
    price: 5000,
    sqm: 9,
    dimensions: { width: 3, depth: 3 },
    gridCells: { width: 3, depth: 3 },
    height3d: 0.9,
    features: [
      'Bar counter included',
      'Display shelving',
      '3 power outlets',
      'Accent lighting',
      'Main stage proximity',
    ],
    zone: 'Stage Area',
    color: '#8b5cf6',
  },
}

// Raw JSON shape from /booths.json
interface RawBoothData {
  FT: [string, number, number][]
  FS: [string, number, number][]
  TS: [string, number, number][]
  BS: [string, number, number][]
}

// Grid bounds from the SDP layout
const GRID_MIN_COL = 22
const GRID_MAX_COL = 120
const GRID_MIN_ROW = 43
const GRID_MAX_ROW = 118

// Scale factor: maps grid units to world units for 3D
const SCALE = 0.6

function gridToWorld(col: number, row: number): { x: number; z: number } {
  const centerCol = (GRID_MIN_COL + GRID_MAX_COL) / 2
  const centerRow = (GRID_MIN_ROW + GRID_MAX_ROW) / 2
  return {
    x: (col - centerCol) * SCALE,
    z: (row - centerRow) * SCALE,
  }
}

export function parseBoothData(raw: RawBoothData): Booth[] {
  const booths: Booth[] = []

  for (const typeKey of ['FT', 'FS', 'TS', 'BS'] as BoothType[]) {
    const tier = BOOTH_TIERS[typeKey]
    const entries = raw[typeKey] || []

    for (const [id, col, row] of entries) {
      const pos = gridToWorld(col, row)
      booths.push({
        id,
        type: typeKey,
        label: tier.label,
        status: 'available',
        price: tier.price,
        sqm: tier.sqm,
        position: pos,
        dimensions: tier.dimensions,
        features: tier.features,
        zone: tier.zone,
        color: tier.color,
        col,
        row,
      })
    }
  }

  return booths
}

// Fetch and parse booth data from the public JSON file
export async function fetchBoothData(): Promise<Booth[]> {
  const res = await fetch('/booths.json')
  const raw: RawBoothData = await res.json()
  return parseBoothData(raw)
}

// Statistics
export function getBoothStats(booths: Booth[]) {
  const byType: Record<BoothType, { count: number; available: number; price: number }> = {} as Record<
    BoothType,
    { count: number; available: number; price: number }
  >

  const typeKeys: BoothType[] = ['FT', 'FS', 'TS', 'BS']
  for (const t of typeKeys) {
    const typeBooths = booths.filter((b) => b.type === t)
    byType[t] = {
      count: typeBooths.length,
      available: typeBooths.filter((b) => b.status === 'available').length,
      price: BOOTH_TIERS[t].price,
    }
  }

  const zones = [...new Set(booths.map((b) => b.zone))]
  const byZone: Record<string, { count: number; available: number }> = {}
  for (const zone of zones) {
    const zoneBooths = booths.filter((b) => b.zone === zone)
    byZone[zone] = {
      count: zoneBooths.length,
      available: zoneBooths.filter((b) => b.status === 'available').length,
    }
  }

  return {
    total: booths.length,
    available: booths.filter((b) => b.status === 'available').length,
    reserved: booths.filter((b) => b.status === 'reserved').length,
    sold: booths.filter((b) => b.status === 'sold').length,
    byType,
    byZone,
  }
}

// Format price in South African Rand
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}
