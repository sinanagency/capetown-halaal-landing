// =============================================================================
// lib/ai/sector-map.ts
//
// Deterministic regex -> sector mapping for the bulk-review queue.
// Public so Agent 3 (and any future caller) can import the same source of
// truth. If you change a sector label, update the SECTORS union below AND
// the queue UI in lockstep.
//
// Inputs are normalised (lowercased, trimmed) before matching. The map is
// scored: each matching rule adds weight; the highest-weight sector wins.
// Confidence is computed by the classifier; the map only contributes raw
// signal.
// =============================================================================

export const SECTORS = [
  'Food & Beverage',
  'Fashion & Modest Wear',
  'Beauty & Wellness',
  'Health & Pharmacy',
  'Business & Trade',
  'Home & Living',
  'Travel & Tourism',
  'Advertising',
] as const

export type Sector = (typeof SECTORS)[number]

export interface SectorRule {
  sector: Sector
  // Word-boundary regex. Tested against a lowercased haystack.
  pattern: RegExp
  weight: number
}

// Rule weights:
//   3 = strong signal (exact category name, "halal meat", "abaya", "umrah")
//   2 = solid signal (general category, "skincare", "wholesale")
//   1 = weak signal (adjacent word, "snacks", "decor")
export const SECTOR_RULES: SectorRule[] = [
  // Food & Beverage
  { sector: 'Food & Beverage', pattern: /\b(food|halal meat|meat|butchery|spice|spices|restaurant|catering|caterer|bakery|bakes|cafe|coffee|tea|juice|smoothie|drink|beverage|snack|snacks|sweet|sweets|chocolate|cake|cakes|biltong|samoosa|samosa|burger|grill|kitchen|chef|dessert|desserts|dairy|cheese|halaal food|f&b|fnb)\b/i, weight: 3 },
  { sector: 'Food & Beverage', pattern: /\b(produce|fruit|vegetable|fish|seafood|honey|jam|sauce|condiment)\b/i, weight: 2 },

  // Fashion & Modest Wear
  { sector: 'Fashion & Modest Wear', pattern: /\b(abaya|abayas|hijab|hijabs|modest|modest wear|modesty|kaftan|kaftans|jilbab|burqa|burka|niqab|thobe|thawb|kurta|kurti|shawl|scarf|scarves|fashion|clothing|apparel|attire|garment|garments|dress|dresses|boutique|tailor|tailoring)\b/i, weight: 3 },
  { sector: 'Fashion & Modest Wear', pattern: /\b(accessor|bag|bags|handbag|jewelry|jewellery|shoe|shoes|footwear)\b/i, weight: 1 },

  // Beauty & Wellness
  { sector: 'Beauty & Wellness', pattern: /\b(skincare|skin care|cosmetic|cosmetics|makeup|make up|perfume|perfumes|fragrance|fragrances|attar|oud|haircare|hair care|salon|spa|wellness|wellbeing|aromatherapy|essential oil|essential oils|body care|bath|soap|soaps|candle|candles)\b/i, weight: 3 },
  { sector: 'Beauty & Wellness', pattern: /\b(beauty|cologne|lotion|serum|balm)\b/i, weight: 2 },

  // Health & Pharmacy
  { sector: 'Health & Pharmacy', pattern: /\b(supplement|supplements|vitamin|vitamins|pharmacy|pharmacist|pharmaceutical|health|nutrition|nutritionist|herbal|herb|herbs|natural medicine|homeopath|homeopathy|naturopath|naturopathy|protein|fitness)\b/i, weight: 3 },
  { sector: 'Health & Pharmacy', pattern: /\b(medical|clinic|therapy|therapist|chiropract|physio)\b/i, weight: 2 },

  // Business & Trade
  { sector: 'Business & Trade', pattern: /\b(b2b|wholesale|wholesaler|import|importer|export|exporter|distributor|distribution|trading|trade|trader|supplier|sourcing|logistics|consult|consulting|consultancy|consultant)\b/i, weight: 3 },
  { sector: 'Business & Trade', pattern: /\b(agency|services|service provider|professional services|finance|insurance|legal)\b/i, weight: 1 },

  // Home & Living
  { sector: 'Home & Living', pattern: /\b(furniture|decor|d[eé]cor|home decor|homeware|kitchenware|cookware|bedding|linen|linens|rug|rugs|carpet|carpets|curtain|curtains|interior|interiors|tableware|crockery|cutlery|appliance|appliances)\b/i, weight: 3 },
  { sector: 'Home & Living', pattern: /\b(home|household|garden|gardening|plant|plants)\b/i, weight: 1 },

  // Travel & Tourism
  { sector: 'Travel & Tourism', pattern: /\b(travel|tourism|umrah|hajj|umrah and hajj|tour|tours|tour operator|holiday|holidays|vacation|destination|hotel|hotels|guest house|guesthouse|booking|flight|flights|airline)\b/i, weight: 3 },

  // Advertising
  { sector: 'Advertising', pattern: /\b(advertising|advertis|marketing|branding|media buying|ad agency|signage|billboard|print media|publishing|magazine|newspaper)\b/i, weight: 3 },
  { sector: 'Advertising', pattern: /\b(promo|promotional|sponsor|sponsorship)\b/i, weight: 1 },
]

export interface SectorMatch {
  sector: Sector
  score: number
  matched_terms: string[]
}

/**
 * Match a string (description + categories joined) against all rules.
 * Returns matches sorted by score desc. Empty array if nothing matched.
 *
 * Confidence shaping is the caller's job; this function only counts signal.
 */
export function matchSectors(haystack: string): SectorMatch[] {
  if (!haystack || typeof haystack !== 'string') return []
  const lower = haystack.toLowerCase()
  const tally = new Map<Sector, { score: number; terms: Set<string> }>()
  for (const rule of SECTOR_RULES) {
    const m = lower.match(rule.pattern)
    if (!m) continue
    const cur = tally.get(rule.sector) ?? { score: 0, terms: new Set<string>() }
    cur.score += rule.weight
    for (const term of m) {
      if (typeof term === 'string' && term.length > 0) cur.terms.add(term)
    }
    tally.set(rule.sector, cur)
  }
  return Array.from(tally.entries())
    .map(([sector, v]) => ({ sector, score: v.score, matched_terms: Array.from(v.terms) }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Build the haystack from a vendor application row. Joins description +
 * categories + business name so the regex map has every text signal.
 */
export function haystackFromRow(row: {
  business_name?: string | null
  business_description?: string | null
  product_categories?: string[] | null
}): string {
  const parts: string[] = []
  if (row.business_name) parts.push(row.business_name)
  if (row.business_description) parts.push(row.business_description)
  if (Array.isArray(row.product_categories)) parts.push(...row.product_categories)
  return parts.join(' \n ')
}
