// =============================================================================
// lib/ai/dupe-detector.ts
//
// Duplicate-candidate detector for the bulk-review queue. For a given
// vendor application row, return other rows that share the same SA phone
// (last 9 digits, normalised) or the same email (case-insensitive).
//
// Uses the functional phone-last9 index added in the 2026-06-15 pipeline
// migration:
//   CREATE INDEX idx_vendor_apps_phone_last9
//     ON vendor_applications ((regexp_replace(phone, '\D', '', 'g')));
//
// Doctrine guardrails:
//   - We never auto-merge. Output is a *candidate list* only.
//   - We exclude rows already flagged is_duplicate=true and superseded rows
//     (superseded_at IS NOT NULL). Those are dead.
//   - We exclude the row itself.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export interface DupeCandidate {
  id: string
  match_on: 'phone_last9' | 'email'
  match_value: string
}

export interface DupeRowInput {
  id: string
  phone?: string | null
  email?: string | null
}

function digitsOnly(v: string | null | undefined): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\D/g, '')
}

function last9(v: string | null | undefined): string {
  const d = digitsOnly(v)
  if (d.length < 9) return ''
  return d.slice(-9)
}

interface DupeRow {
  id: string
  phone: string | null
  email: string | null
}

/**
 * Find duplicate candidates for a row. Runs phone + email lookups in
 * parallel. Returns a deduped list keyed on candidate id (a row can match
 * on both phone and email; we keep the phone match in that case because
 * phone collisions in SA are higher-signal than email collisions).
 */
export async function findDupeCandidates(
  supabase: SupabaseClient,
  row: DupeRowInput
): Promise<DupeCandidate[]> {
  const phoneKey = last9(row.phone)
  const emailKey = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''

  // Pull candidate pool. We can't push regexp_replace into a PostgREST
  // filter ergonomically, so we narrow on email first when available and
  // do the phone match in-process. The phone-last9 index still wins on the
  // wider phone-only fetch via the SDK's filter syntax (ilike on last 9).
  const promises: Array<Promise<{ data: DupeRow[] | null }>> = []

  if (phoneKey) {
    promises.push(
      supabase
        .from('vendor_applications')
        .select('id, phone, email')
        .neq('id', row.id)
        .eq('is_duplicate', false)
        .is('superseded_at', null)
        .ilike('phone', `%${phoneKey}`)
        .limit(20) as unknown as Promise<{ data: DupeRow[] | null }>
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  if (emailKey) {
    promises.push(
      supabase
        .from('vendor_applications')
        .select('id, phone, email')
        .neq('id', row.id)
        .eq('is_duplicate', false)
        .is('superseded_at', null)
        .ilike('email', emailKey)
        .limit(20) as unknown as Promise<{ data: DupeRow[] | null }>
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  const [phoneRes, emailRes] = await Promise.all(promises)

  const out = new Map<string, DupeCandidate>()

  // Phone matches: validate the last-9 truly matches (ilike with leading %
  // can over-match in edge cases like "+27821234567 ext 9").
  for (const r of phoneRes.data ?? []) {
    if (last9(r.phone) === phoneKey && phoneKey.length === 9) {
      out.set(r.id, { id: r.id, match_on: 'phone_last9', match_value: phoneKey })
    }
  }

  // Email matches: only add if no phone match for the same id (phone wins).
  for (const r of emailRes.data ?? []) {
    if (out.has(r.id)) continue
    if (typeof r.email === 'string' && r.email.trim().toLowerCase() === emailKey && emailKey.length > 0) {
      out.set(r.id, { id: r.id, match_on: 'email', match_value: emailKey })
    }
  }

  return Array.from(out.values())
}
