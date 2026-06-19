// Venue zone capacities + allocation policy. Confirmed by Taona 2026-06-20.
//
// Only the MARQUEE (the 243 stalls in public/stalls.json) gets portal stall-code
// allocation (⟦STALL:..⟧ markers on the floor plan). Every other zone is
// payment-tracked + acknowledged only — no map slot — handled via the
// outside-vendor payment capture (lib/payments + /admin/finance). This keeps the
// allocation map honest at 243 and still tracks every rand that comes in.

export interface VenueZone {
  key: string
  label: string
  capacity: number
  /** true = vendors here get a stall code on the portal floor plan.
   *  false = tracked + acknowledged only (no allocation). */
  allocatable: boolean
}

export const VENUE_ZONES: VenueZone[] = [
  { key: 'marquee', label: 'Marquee', capacity: 243, allocatable: true },
  { key: 'bedouin', label: 'Bedouin', capacity: 20, allocatable: false },
  { key: 'food_drink_truck', label: 'Food & Drink Trucks', capacity: 30, allocatable: false },
  { key: 'dessert_truck', label: 'Dessert Trucks', capacity: 10, allocatable: false },
  { key: 'snack_truck', label: 'Snack Trucks', capacity: 5, allocatable: false },
]

export const MARQUEE_CAPACITY = 243

/** Zones that are NOT on the portal allocation map (the outside-capture set). */
export const NON_ALLOCATED_ZONES = VENUE_ZONES.filter((z) => !z.allocatable)

/** 243 + 20 + 30 + 10 + 5 = 308 defined spots (plus uncapped loose "outside"). */
export const TOTAL_DEFINED_CAPACITY = VENUE_ZONES.reduce((s, z) => s + z.capacity, 0)

export function zoneByKey(key: string | null | undefined): VenueZone | undefined {
  if (!key) return undefined
  return VENUE_ZONES.find((z) => z.key === key)
}

export function isAllocatableZone(key: string | null | undefined): boolean {
  return !!zoneByKey(key)?.allocatable
}
