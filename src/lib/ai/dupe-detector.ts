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
  // filter ergonomically (the SDK has no native bind for functional indexes),
  // so the phone-last9 functional index added by the 2026-06-15 pipeline
  // migration is currently UNUSED by this query: an `ilike phone like %<last9>`
  // scan is what hits the table. That is fine at <5K rows (current production
  // is ~1.1K vendor_applications and the seq scan stays under 30ms locally),
  // but is the right thing to revisit if we ever push past ~25K rows. Two
  // future options when that happens:
  //   1. Define a Supabase RPC (`fn_find_dupes_by_last9(p_last9 text)`) and
  //      call it via `db.rpc(...)` so the planner reads the functional index.
  //   2. Add a generated `phone_last9_normalized` column + a regular btree
  //      index on it, and switch this filter to `.eq('phone_last9_normalized',
  //      phoneKey)`. That is the simpler refactor, at the cost of one column.
  // Leaving the ilike scan in place is a deliberate choice; the index stays
  // on disk for the day we flip to one of those approaches.
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
