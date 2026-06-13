// Per-category required-doc lookup. Replaces the hardcoded
// REQUIRED_DOCS list that used to live in src/app/exhibitor/portal/page.tsx.
//
// Source of truth: Samreen's category-level compliance brief (2026-06-08).
// - Public liability + Electrical CoC are covered by the organisers, vendors
//   do NOT upload these. They are intentionally absent from every list.
// - Halaal certificate / declaration is optional everywhere it is listed.
// - Health permit (City of Cape Town food trading permit) is mandatory for
//   anything that handles food.
// - Gas certification is mandatory for food trucks (gas is on by default in
//   that build), optional for marquee food stalls (only if they cook with gas).
// - Modest fashion / beauty / health-pharmacy / travel / home / finance /
//   business categories carry no compliance docs at the festival level.

export type DocType =
  | 'halaal_cert'
  | 'health_permit'
  | 'gas_cert'
  | 'public_liability'
  | 'electrical_coc'
  | 'fire_safety'
  | 'indemnity'
  | 'other'

// Tier slug fragments that mean "food truck". The portal stores the full slug
// (e.g. food-truck-4.5m) in vendor_applications.preferred_booth_tier.
const FOOD_TRUCK_HINT = /^food-truck/i

// Categories are the labels users pick in /apply (ITEM_CATEGORIES).
// We normalise them to lowercase before the lookup to absorb prior data
// (some legacy rows have "food & beverage" / "Food and Beverage" / etc).
const CATEGORY_RULES: Array<{ match: (cat: string) => boolean; docs: DocType[] }> = [
  // Food & beverage: halaal + health permit. Gas is conditional and surfaced
  // by the DocumentsManager UI itself, not gated as required here.
  { match: (c) => /food|beverage|bever|drink|catering/.test(c), docs: ['halaal_cert', 'health_permit'] },
  // Modest fashion + Beauty + Wellness + Health/Pharmacy: no festival-level
  // compliance docs required. Public liability is on the organisers.
  { match: (c) => /modest|fashion|beauty|wellness|health.*pharm|pharmacy/.test(c), docs: [] },
  // Travel + Home + Finance + Business categories: none.
  { match: (c) => /travel|tourism|home|living|finance|services|business|trade/.test(c), docs: [] },
]

/**
 * Resolve the list of doc types a vendor MUST upload before show-day, given
 * their product categories and stall tier. Food trucks always include gas
 * cert on top of food docs (gas is the default heat source in a truck).
 *
 * Empty list = nothing required at the festival level (good standing by
 * default — typical for fashion/beauty/services vendors).
 */
export function getRequiredDocs(opts: {
  productCategories?: string[] | null
  boothTier?: string | null
}): DocType[] {
  const cats = (opts.productCategories || [])
    .filter(Boolean)
    .map((c) => String(c).toLowerCase().trim())

  const set = new Set<DocType>()
  for (const cat of cats) {
    for (const rule of CATEGORY_RULES) {
      if (rule.match(cat)) {
        for (const d of rule.docs) set.add(d)
        break
      }
    }
  }

  // Food trucks: gas is mandatory regardless of how the category was labelled.
  const tier = (opts.boothTier || '').toLowerCase()
  if (FOOD_TRUCK_HINT.test(tier)) {
    set.add('halaal_cert')
    set.add('health_permit')
    set.add('gas_cert')
  }

  return Array.from(set)
}

/**
 * Friendly label for a doc type. Used by the Overview tile when the required
 * list is empty (we still want a positive copy line, not "0/0").
 */
export const DOC_LABEL: Record<DocType, string> = {
  halaal_cert: 'Halaal certificate or declaration',
  health_permit: 'Health permit',
  gas_cert: 'Gas certification',
  public_liability: 'Public liability insurance',
  electrical_coc: 'Electrical certificate of compliance',
  fire_safety: 'Fire-safety certificate',
  indemnity: 'Indemnity',
  other: 'Other supporting documents',
}
