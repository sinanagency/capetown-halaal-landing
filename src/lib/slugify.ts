/**
 * Slug helpers for vendor public profile URLs.
 * Single source of truth — used by /sectors/[slug]/[vendor-slug] page,
 * the matching API route, and the AdminSidebar link generator.
 *
 * No DB column required (CTH Supabase DDL is gated on Sam's account, per
 * Doctrine Law 8). Computed at request time from business_name.
 */
export function vendorSlug(businessName: string): string {
  return (businessName || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}
