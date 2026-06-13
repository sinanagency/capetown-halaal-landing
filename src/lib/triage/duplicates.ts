import type { VendorApplication } from '@/lib/supabase/types'

/**
 * Pure duplicate finder.
 *
 * Two applications are flagged as a duplicate pair if ANY of:
 *   - same email (case-insensitive, trimmed)
 *   - same phone (digits-only normalized)
 *   - business_name Levenshtein distance < 3 (case-insensitive)
 *
 * Returns a map of application_id -> dup_marker (cluster id).
 * Rows with no duplicates do NOT appear in the map.
 */
export function findDuplicateClusters(
  rows: VendorApplication[]
): Map<string, string> {
  const result = new Map<string, string>()
  if (rows.length < 2) return result

  // Union-Find for clustering.
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    let cur = id
    while (parent.get(cur) && parent.get(cur) !== cur) {
      cur = parent.get(cur)!
    }
    parent.set(id, cur)
    return cur
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const r of rows) parent.set(r.id, r.id)

  // Build lookup buckets for O(n) email/phone collisions
  const emailIdx = new Map<string, string[]>()
  const phoneIdx = new Map<string, string[]>()
  for (const r of rows) {
    const email = normalizeEmail(r.email)
    if (email) {
      const list = emailIdx.get(email) ?? []
      list.push(r.id)
      emailIdx.set(email, list)
    }
    const phone = normalizePhone(r.phone)
    if (phone) {
      const list = phoneIdx.get(phone) ?? []
      list.push(r.id)
      phoneIdx.set(phone, list)
    }
  }

  for (const ids of emailIdx.values()) {
    if (ids.length > 1) {
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i])
    }
  }
  for (const ids of phoneIdx.values()) {
    if (ids.length > 1) {
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i])
    }
  }

  // O(n^2) Levenshtein over business names. The applications table is
  // measured in hundreds, not millions, so this is fine. Skip empty names.
  const names = rows.map((r) => ({
    id: r.id,
    name: normalizeBusinessName(r.business_name),
  }))
  for (let i = 0; i < names.length; i++) {
    const a = names[i]
    if (!a.name) continue
    for (let j = i + 1; j < names.length; j++) {
      const b = names[j]
      if (!b.name) continue
      // Short-circuit: if length difference >= 3, distance can't be < 3
      if (Math.abs(a.name.length - b.name.length) >= 3) continue
      if (levenshtein(a.name, b.name, 3) < 3) {
        union(a.id, b.id)
      }
    }
  }

  // Materialize cluster ids; only emit ids whose cluster has > 1 member.
  const clusterMembers = new Map<string, string[]>()
  for (const r of rows) {
    const root = find(r.id)
    const list = clusterMembers.get(root) ?? []
    list.push(r.id)
    clusterMembers.set(root, list)
  }
  for (const [root, members] of clusterMembers.entries()) {
    if (members.length > 1) {
      const marker = `dup:${root.slice(0, 8)}`
      for (const id of members) result.set(id, marker)
    }
  }

  return result
}

export function normalizeEmail(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase()
}

export function normalizePhone(v: string | null | undefined): string {
  return (v ?? '').replace(/\D+/g, '')
}

export function normalizeBusinessName(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Bounded Levenshtein. Returns the distance, capped at `max`.
 * If the true distance is >= max, returns max. Used to short-circuit.
 */
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0
  if (!a.length) return Math.min(b.length, max)
  if (!b.length) return Math.min(a.length, max)

  const m = a.length
  const n = b.length
  // Two-row DP
  let prev = new Array<number>(n + 1)
  let cur = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + cost
      )
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin >= max) return max
    ;[prev, cur] = [cur, prev]
  }
  return Math.min(prev[n], max)
}
