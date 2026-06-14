// =============================================================================
// GET /api/admin/applications/suggest
//
// AI nudge layer for the bulk-review queue (Agent 1 owns the triage UI).
// Returns sector suggestions, completeness score, duplicate candidates, and
// a single recommendation per row. The recommendation is a NUDGE Samreen
// sees in the queue; the UI never auto-acts on it (per slice brief).
//
// Query:
//   ?id=<uuid>             single row
//   ?ids=uuid,uuid,...     batch (max 50)
//
// Anthropic Haiku is reused via @anthropic-ai/sdk, same wiring as
// /api/admin/inbox/summarize/route.ts (lines 25, 187-193) and
// /api/admin/broadcast/spin/route.ts (lines 15, 21, 74-79). No parallel client.
//
// Caching: Next's unstable_cache, key = (id, updated_at). 1h TTL. A row
// edit changes updated_at and naturally re-derives the suggestion.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifySector, type SectorSuggestion } from '@/lib/ai/sector-classifier'
import { scoreCompleteness, type CompletenessResult } from '@/lib/ai/completeness-scorer'
import { findDupeCandidates, type DupeCandidate } from '@/lib/ai/dupe-detector'
import { decideRecommendation, type Recommendation } from '@/lib/ai/recommend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BATCH = 50

interface RowFields {
  id: string
  updated_at: string
  business_name: string | null
  business_description: string | null
  product_categories: string[] | null
  website: string | null
  instagram: string | null
  facebook: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  preferred_booth_tier: string | null
  special_requirements: string | null
}

interface SuggestionPayload {
  id: string
  sector_suggestions: SectorSuggestion[]
  completeness_score: number
  completeness_breakdown: CompletenessResult['breakdown']
  dupe_candidates: DupeCandidate[]
  recommendation: Recommendation
  recommendation_reason: string
}

async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!data || data.length === 0) return null
  return { userId: user.id }
}

async function loadRows(ids: string[]): Promise<RowFields[]> {
  if (ids.length === 0) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('vendor_applications')
    .select(
      'id, updated_at, business_name, business_description, product_categories, website, instagram, facebook, contact_name, email, phone, preferred_booth_tier, special_requirements'
    )
    .in('id', ids)
  if (error || !data) return []
  return data as unknown as RowFields[]
}

async function buildSuggestionUncached(row: RowFields): Promise<SuggestionPayload> {
  const admin = createAdminClient()

  // Run all three derivations in parallel. completeness is sync but we keep
  // the shape uniform so the Promise.all reads as one batch.
  const [sectors, completeness, dupes] = await Promise.all([
    classifySector({
      business_name: row.business_name,
      business_description: row.business_description,
      product_categories: row.product_categories,
    }),
    Promise.resolve(
      scoreCompleteness({
        contact_name: row.contact_name,
        business_name: row.business_name,
        business_description: row.business_description,
        product_categories: row.product_categories,
        phone: row.phone,
        email: row.email,
        instagram: row.instagram,
        facebook: row.facebook,
        website: row.website,
        special_requirements: row.special_requirements,
        preferred_booth_tier: row.preferred_booth_tier,
      })
    ),
    findDupeCandidates(admin, { id: row.id, phone: row.phone, email: row.email }),
  ])

  const decision = decideRecommendation({
    completeness,
    dupes,
    sectors,
    has_business_description:
      typeof row.business_description === 'string' && row.business_description.trim().length > 0,
    has_phone: typeof row.phone === 'string' && row.phone.trim().length > 0,
    has_email: typeof row.email === 'string' && row.email.trim().length > 0,
  })

  return {
    id: row.id,
    sector_suggestions: sectors,
    completeness_score: completeness.score,
    completeness_breakdown: completeness.breakdown,
    dupe_candidates: dupes,
    recommendation: decision.recommendation,
    recommendation_reason: decision.recommendation_reason,
  }
}

// Cache key: (id, updated_at). Any row edit flips updated_at and we
// re-derive. 1h TTL is the upper bound for stale data on un-edited rows.
async function buildSuggestion(row: RowFields): Promise<SuggestionPayload> {
  const cached = unstable_cache(
    async () => buildSuggestionUncached(row),
    ['admin', 'applications', 'suggest', row.id, row.updated_at],
    { revalidate: 60 * 60, tags: [`vendor-application:${row.id}`] }
  )
  return cached()
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const idParam = url.searchParams.get('id')
  const idsParam = url.searchParams.get('ids')

  let ids: string[] = []
  if (idParam) {
    ids = [idParam.trim()]
  } else if (idsParam) {
    ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: 'id or ids required' }, { status: 400 })
  }

  // Dedupe + validate
  ids = Array.from(new Set(ids))
  const invalid = ids.filter((id) => !UUID_RE.test(id))
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'invalid uuid in ids', invalid }, { status: 400 })
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `batch too large, max ${MAX_BATCH}`, requested: ids.length },
      { status: 400 }
    )
  }

  const rows = await loadRows(ids)
  const found = new Set(rows.map((r) => r.id))
  const missing = ids.filter((id) => !found.has(id))

  // Build suggestions in parallel across rows. Each row's internal work is
  // already parallelised in buildSuggestionUncached.
  const suggestions = await Promise.all(rows.map((r) => buildSuggestion(r)))

  // Single-id callers get the bare object for ergonomic UI usage.
  if (idParam && !idsParam) {
    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    return NextResponse.json(suggestions[0])
  }

  return NextResponse.json({
    suggestions,
    missing,
    count: suggestions.length,
  })
}
