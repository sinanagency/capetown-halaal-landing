// Stall inventory + allocation helpers.
//
// Geometry/capacity is static reference data (public/stalls.json, from the
// official SDP2026 site plan). Allocations are stored as a single reversible
// marker on each vendor_applications.admin_notes row:  ⟦STALL:FS12⟧  (or
// ⟦STALL:FS12:held⟧). We use admin_notes because the live DB has no stalls
// table and vendor_profiles/booth_bookings are hard-coupled to auth users.
// The marker never clobbers Samreen's human notes — we parse it out, keep the
// prose, and re-append on write.

import stallsFile from '../../public/stalls.json'

export type StallType = 'FT' | 'FS' | 'TS' | 'BS'
export type StallStatus = 'available' | 'held' | 'allocated' | 'reserved' | 'blocked'

export interface StallGeo {
  code: string
  type: StallType
  num: number
  col: number
  row: number
  w: number
  h: number
}

export interface ZoneGeo { label: string; col: number; row: number; w: number; h: number }

interface StallsFile {
  grid: { cols: number; rows: number }
  capacity: Record<StallType, number>
  types: Record<StallType, { label: string; color: string }>
  zones: ZoneGeo[]
  stalls: StallGeo[]
}

export const STALLS = stallsFile as unknown as StallsFile
export const STALL_LIST: StallGeo[] = STALLS.stalls
export const STALL_GRID = STALLS.grid
export const STALL_ZONES = STALLS.zones
export const STALL_CAPACITY = STALLS.capacity

// Festival's own type labels (clearer than the raw SDP codes)
export const TYPE_META: Record<StallType, { label: string; color: string }> = {
  FT: { label: 'Food', color: '#f97316' },
  FS: { label: 'Fashion & Style', color: '#a855f7' },
  TS: { label: 'Trending & Services', color: '#eab308' },
  BS: { label: 'Business & Sponsors', color: '#0ea5e9' },
}

// Booth tiers the applicant chose (preferred_booth_tier slug) → readable label +
// the zone we'd suggest placing them in. Zone is a hint only; the real zone is
// whichever stall the organiser clicks.
export const TIER_META: Record<string, { label: string; suggestZone: StallType; price: number }> = {
  'marquee-table-2x2': { label: 'Marquee Table 2×2m', suggestZone: 'TS', price: 3700 },
  'marquee-full-3x3': { label: 'Marquee Full 3×3m', suggestZone: 'FS', price: 6500 },
  'marquee-table-double-4x2': { label: 'Marquee Double Table 4×2m', suggestZone: 'TS', price: 6500 },
  'marquee-full-double-6x3': { label: 'Marquee Full Double 6×3m', suggestZone: 'FS', price: 12000 },
  'outdoor-bedouin-2x3': { label: 'Outdoor Bedouin 2×3m', suggestZone: 'FS', price: 3750 },
  'food-gazebo-3x3': { label: 'Food Gazebo 3×3m', suggestZone: 'FT', price: 4800 },
  'mini-dessert-truck-3.5m': { label: 'Mini Dessert Truck 3.5m', suggestZone: 'FT', price: 5000 },
  'food-truck-4.5m': { label: 'Food Truck 4.5m', suggestZone: 'FT', price: 6500 },
  'food-truck-6m': { label: 'Food Truck 6m', suggestZone: 'FT', price: 7500 },
  'food-truck-8m': { label: 'Food Truck 8m', suggestZone: 'FT', price: 8500 },
}

export function tierLabel(slug: string | null | undefined): string {
  if (!slug) return 'Not specified'
  return TIER_META[slug]?.label || slug
}

// ---- allocation marker on admin_notes ----
const ALLOC_RE = /\s*⟦STALL:([A-Za-z]+\d+)(?::(held|allocated|reserved|blocked))?⟧\s*/

export interface ParsedNotes { stall: string | null; status: StallStatus; human: string }

export function parseAllocation(adminNotes: string | null | undefined): ParsedNotes {
  const notes = adminNotes || ''
  const m = notes.match(ALLOC_RE)
  if (!m) return { stall: null, status: 'available', human: notes.trim() }
  const human = notes.replace(ALLOC_RE, ' ').trim()
  return { stall: m[1], status: (m[2] as StallStatus) || 'allocated', human }
}

// Rebuild admin_notes preserving human prose, with (or without) the marker.
export function withAllocation(adminNotes: string | null | undefined, stall: string | null, status: StallStatus = 'allocated'): string {
  const { human } = parseAllocation(adminNotes)
  if (!stall) return human
  // allocated is the default (bare marker); every other state is tagged.
  const marker = status === 'allocated' ? `⟦STALL:${stall}⟧` : `⟦STALL:${stall}:${status}⟧`
  return human ? `${human}\n\n${marker}` : marker
}

export function stallTypeOf(code: string): StallType | null {
  const s = STALL_LIST.find((x) => x.code === code)
  return s ? s.type : null
}
