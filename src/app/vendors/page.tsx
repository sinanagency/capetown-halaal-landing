import { redirect } from 'next/navigation'

// The old /vendors page was a dark hardcoded DEMO_VENDORS grid that
// (a) contradicted the white-editorial design rule and (b) duplicated the
// real public browse surface at /#sectors + /sectors/[slug].
// Single source of truth wins: redirect /vendors to the sectors grid.
// Deleted 2026-06-08 (Sam feedback item 5 + Gulfood-style cleanup).

export default function VendorsRedirect() {
  redirect('/#sectors')
}
