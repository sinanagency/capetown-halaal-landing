import type { VendorApplication } from '@/lib/supabase/types'

/**
 * Pure completeness scorer for a vendor application row.
 * Returns 0-100. Used to surface "Ready to approve" vs "needs docs".
 *
 * Weights (sum 100):
 *   email                                   +20
 *   phone                                   +20
 *   primary category (>=1)                  +15
 *   business_description.length > 30        +15
 *   traded_before (in special_requirements) +10
 *   has uploaded doc                        +20
 */
export function scoreCompleteness(
  row: Partial<VendorApplication> | null | undefined
): number {
  if (!row) return 0
  let score = 0

  if (isNonEmpty(row.email)) score += 20
  if (isNonEmpty(row.phone)) score += 20

  if (Array.isArray(row.product_categories) && row.product_categories.length > 0) {
    score += 15
  }

  if (typeof row.business_description === 'string' && row.business_description.trim().length > 30) {
    score += 15
  }

  if (hasTradedBefore(row.special_requirements)) {
    score += 10
  }

  if (hasUploadedDoc(row)) {
    score += 20
  }

  return Math.min(100, score)
}

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

function hasTradedBefore(special: string | null | undefined): boolean {
  if (!special) return false
  try {
    const parsed = JSON.parse(special) as Record<string, unknown>
    const v = parsed?.traded_before
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') {
      const norm = v.trim().toLowerCase()
      return norm === 'yes' || norm === 'true' || norm === 'y' || norm === '1'
    }
    return false
  } catch {
    return false
  }
}

function hasUploadedDoc(row: Partial<VendorApplication>): boolean {
  const docs = row.documents
  if (Array.isArray(docs) && docs.length > 0) return true
  // Some legacy rows may stash URLs in special_requirements json.
  if (typeof row.special_requirements === 'string') {
    try {
      const parsed = JSON.parse(row.special_requirements) as Record<string, unknown>
      const stash = parsed?.documents
      if (Array.isArray(stash) && stash.length > 0) return true
    } catch {
      /* ignore */
    }
  }
  return false
}
