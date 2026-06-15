// Resolve the vendor's marketing fields from the signed-in session.
//
// SECURITY (CTH-DOCTRINE Law 2 vendor-data-privacy):
//   This module is the ONE place that touches vendor data for marketing
//   renders. It pulls the application row via getExhibitorContext (which
//   refuses email-fallback joins) and never reads a vendor id from a query
//   string. Callers in route handlers MUST go through this helper.
//
// Falls back to the festival logo when the vendor has not uploaded one yet,
// so the auto-filled assets still look complete on day one.

import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import { escapeHtml } from '@/lib/marketing/png-renderer'

export interface VendorMarketingFields {
  business_name: string
  stall_code: string
  logo_url: string
  tagline: string
  [key: string]: string
}

const FALLBACK_LOGO = 'https://cthalaal.co.za/logo.png'
const FALLBACK_STALL = 'TBA'
const FALLBACK_TAGLINE = 'Cape Town’s biggest halaal festival, 11 to 13 December 2026.'

function publicLogoUrl(logo_path: string | undefined): string {
  if (!logo_path) return FALLBACK_LOGO
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return FALLBACK_LOGO
  return `${base}/storage/v1/object/public/vendor-assets/${logo_path}`
}

/**
 * Resolve marketing fields for the currently signed-in vendor.
 * Returns null when no vendor session is active (route handler returns 401).
 * All returned strings are HTML-escaped and safe to inject into the templates.
 */
export async function resolveVendorMarketingFields(): Promise<VendorMarketingFields | null> {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return null
  const app = ctx.application as Record<string, unknown>
  const state = parsePortalState((app.admin_notes as string) || null)
  const stallCode = parseAllocation((app.admin_notes as string) || null).stall || FALLBACK_STALL
  const profile = state.profile || {}

  const rawName = ((app.business_name as string) || ctx.email || 'Your Stall').replace(/^DEMO\s*·?\s*/i, '').trim()
  const rawTag = (profile.tagline as string) || (profile.description as string) || FALLBACK_TAGLINE
  // Keep the tagline short so it never overflows the template.
  const trimmedTag = rawTag.length > 110 ? rawTag.slice(0, 107).trimEnd() + '...' : rawTag

  return {
    business_name: escapeHtml(rawName),
    stall_code: escapeHtml(stallCode),
    logo_url: publicLogoUrl(profile.logo_path),
    tagline: escapeHtml(trimmedTag),
  }
}

/** Filename-safe slug from the vendor's business name. */
export function vendorFilenameSlug(businessName: string): string {
  return businessName
    .replace(/&[a-z]+;/gi, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'vendor'
}
