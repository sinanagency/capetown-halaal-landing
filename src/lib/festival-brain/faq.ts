/**
 * Canonical FAQ source of truth for Young at Heart Festival 2026.
 * Pattern-matched BEFORE any LLM call. If a question matches, return canonical text.
 * NEVER let the LLM invent dates, prices, venue, URLs.
 */

export type FaqKey =
  | 'dates'
  | 'venue'
  | 'ticket_price'
  | 'parking'
  | 'kids_play_area'
  | 'kids_free_age'
  | 'vendor_apply'
  | 'halaal_cert'
  | 'refund_policy'
  | 'stall_sizes'
  | 'contact'
  | 'website'
  | 'instagram'
  | 'opening_hours'
  | 'electricity'

export interface FaqEntry {
  key: FaqKey
  patterns: RegExp[]
  answer: string
  // Short factual snippet used for LLM grounding (no greeting, no sign-off)
  fact: string
}

export const FAQ: Record<FaqKey, FaqEntry> = {
  dates: {
    key: 'dates',
    patterns: [
      /\b(when|date[s]?|day[s]?|month|festival on|happening|schedule)\b/i,
      /\b(11|12|13)\s*dec/i,
      /december\s+(11|12|13|2026)/i,
    ],
    fact: 'The festival runs 11, 12 and 13 December 2026 (Friday to Sunday).',
    answer:
      'The festival runs 11, 12 and 13 December 2026, Friday to Sunday. Doors open 10:00 each day. Gates close 22:00 Friday and Saturday, 20:00 Sunday.',
  },
  venue: {
    key: 'venue',
    patterns: [
      /\b(where|venue|location|address|directions|map|how do i get)\b/i,
      /\byoungsfield|wetton|claremont\b/i,
    ],
    fact: 'Venue is Youngsfield Military Base, Wetton Road, Claremont, Cape Town.',
    answer:
      'The festival is at Youngsfield Military Base, Wetton Road, Claremont, Cape Town. Easiest by car or Uber. Claremont train station is a short ride away.',
  },
  ticket_price: {
    key: 'ticket_price',
    patterns: [
      /\b(price|cost|how much|ticket[s]?|fee[s]?|entry)\b/i,
      /\b(r\s?30|r\s?60|weekend pass|day pass)\b/i,
    ],
    fact: 'Tickets are R30 per day, R60 for the full weekend (all three days). Kids under 5 enter free.',
    answer:
      'Tickets are R30 per day, R60 for the full weekend pass (all three days, saves R30). Kids under 5 enter free. Buy at cthalaal.co.za.',
  },
  parking: {
    key: 'parking',
    patterns: [/\bpark(ing)?\b/i, /\bcar park\b/i],
    fact: 'Free parking is available at the venue. Arrive early on Saturday for best spots.',
    answer:
      'Free parking is available on-site at Youngsfield Military Base. Saturday is the busiest day, so arrive before 12:00 for the best spots.',
  },
  kids_play_area: {
    key: 'kids_play_area',
    patterns: [/\bkids?\s*(zone|area|activit|play|entertainment)\b/i, /\bchild(ren)?\b/i, /\bfamily\b/i],
    fact: 'There is a dedicated kids play area with activities and entertainment all three days.',
    answer:
      'Yes, there is a dedicated kids zone with activities, entertainment and a play area all three days. Kids under 5 enter free.',
  },
  kids_free_age: {
    key: 'kids_free_age',
    patterns: [/\b(kids?|child(ren)?)\s+(under|free|age)\b/i, /\bage limit\b/i, /\bunder 5\b/i],
    fact: 'Children under 5 enter free. Ages 5 and up pay the standard ticket price.',
    answer: 'Children under 5 enter free. From age 5 the standard ticket price applies (R30 day, R60 weekend).',
  },
  vendor_apply: {
    key: 'vendor_apply',
    patterns: [
      /\b(vendor|stall|booth|exhibit|trade|sell|stand)\b/i,
      /\b(apply|application|sign up|register)\b.*\b(vendor|stall|booth|exhibit)\b/i,
      /\bhow do i (apply|become a vendor|get a stall)\b/i,
    ],
    fact:
      'Vendor and stall applications happen at cthalaal.co.za/apply. The form asks for business details, products, and category preference.',
    answer:
      'Vendor and stall applications are at cthalaal.co.za/apply. The form takes a few minutes. After you submit, the team reviews and replies within a few working days.',
  },
  halaal_cert: {
    key: 'halaal_cert',
    patterns: [
      /\bhalaal?\b/i,
      /\b(mjc|sanha|nihit)\b/i,
      /\bcert(ificat(e|ion))?\b/i,
      /\bfood (cert|certified|approved)\b/i,
    ],
    fact:
      'All food vendors must be halaal certified (MJC, SANHA or equivalent recognised body) or carry a valid letter of compliance. Certificates are checked on submission and on-site.',
    answer:
      'All food vendors must be halaal certified by MJC, SANHA or an equivalent recognised body. Upload your certificate with your application. The team checks it on submission and again on-site.',
  },
  refund_policy: {
    key: 'refund_policy',
    patterns: [/\brefund\b/i, /\bcancel(lation)?\b/i, /\bmoney back\b/i],
    fact:
      'Tickets are non-refundable but transferable. If you cannot attend, you may give the ticket to someone else. Email support@youngatheart.co.za for help.',
    answer:
      'Tickets are non-refundable but transferable. If you cannot attend, pass the ticket to someone else. For special cases email support@youngatheart.co.za.',
  },
  stall_sizes: {
    key: 'stall_sizes',
    patterns: [
      /\bstall (size|dimension|price|cost|fee)\b/i,
      /\bbooth (size|dimension|price|cost|fee)\b/i,
      /\b3\s?[xX]\s?3|6\s?[xX]\s?3\b/,
      /\bhow much.*(stall|booth)\b/i,
    ],
    fact:
      'Stall sizes range from 2x2m tables up to 6x3m full double layouts. Marquee stall fees run R3,700 to R12,000 depending on size and category. Food and drink trucks are an outside zone with their own fee. Electricity is an optional add-on (R400 to R750). Full pricing is on the application form.',
    answer:
      'Stall sizes start at a 2x2m table and go up to 6x3m. Marquee stall fees run R3,700 to R12,000 depending on size and category. Food and drink trucks are an outside zone with their own fee. Electricity is optional, R400 to R750. Full options and exact prices are on cthalaal.co.za/apply.',
  },
  contact: {
    key: 'contact',
    patterns: [
      /\b(contact|email|phone|number|reach|get hold of|speak to (someone|a human|the team))\b/i,
      /\bsupport@\b/i,
    ],
    fact: 'Contact the festival team at support@youngatheart.co.za.',
    answer:
      'Email the festival team at support@youngatheart.co.za. Someone replies within a few working hours.',
  },
  website: {
    key: 'website',
    patterns: [/\b(website|site|web|url|link)\b/i, /\bcthalaal\b/i, /\byoungatheart\b/i],
    fact: 'Website: cthalaal.co.za. Tickets: cthalaal.co.za. Vendor apply: cthalaal.co.za/apply.',
    answer:
      'Website is cthalaal.co.za. Tickets and vendor applications are both on the same site.',
  },
  instagram: {
    key: 'instagram',
    patterns: [/\binstagram\b/i, /\big handle\b/i, /\bsocial\b/i, /@youngatheart/i],
    fact: 'Instagram: @youngatheart_capetown.',
    answer: 'Follow @youngatheart_capetown on Instagram for daily updates.',
  },
  opening_hours: {
    key: 'opening_hours',
    patterns: [
      /\b(open(ing)?\s*hours?|what time|hours|close[s]?|gates|doors)\b/i,
      /\bstart time\b/i,
    ],
    fact:
      'Gates open 10:00 each day. Friday and Saturday close 22:00. Sunday closes 20:00.',
    answer:
      'Gates open 10:00 every day. Friday and Saturday run to 22:00, Sunday to 20:00.',
  },
  electricity: {
    key: 'electricity',
    patterns: [/\belectric(ity|al)?\b/i, /\bpower (point|outlet|supply)\b/i, /\bplug\b/i],
    fact: 'Electricity is an optional add-on for stalls: R400 to R750 depending on load.',
    answer:
      'Electricity is an optional add-on for stalls, R400 to R750 depending on the load. Tick the box on the application form.',
  },
}

/**
 * Pattern-match an inbound message against the FAQ.
 * Returns the highest-confidence match by pattern count.
 */
export function matchFaq(message: string): FaqEntry | null {
  const text = message.toLowerCase()
  let best: { entry: FaqEntry; score: number } | null = null

  for (const entry of Object.values(FAQ)) {
    let score = 0
    for (const pat of entry.patterns) {
      if (pat.test(text)) score += 1
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score }
    }
  }

  return best?.entry ?? null
}

/**
 * Build a compact grounding context for the LLM from one or more FAQ entries.
 * Used in step 3 when we fall through to the LLM.
 */
export function buildGroundingContext(keys: FaqKey[]): string {
  if (keys.length === 0) return ''
  const lines = keys.map((k) => `- ${FAQ[k].fact}`)
  return ['CANONICAL FACTS (do not contradict, do not invent alternatives):', ...lines].join('\n')
}
