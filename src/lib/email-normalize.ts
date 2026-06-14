/**
 * Lowercase + trim email for consistent matching.
 *
 * ticket_buyers writes used `.ilike('email', ...)` on lookup and `.eq('email', ...)`
 * on insert, which let two rows for the same buyer drift apart on case
 * mismatch ('Joe@x.com' vs 'joe@x.com'). Normalize at every write so existing
 * rows match and new inserts collapse the case. Full DB-level
 * `UNIQUE LOWER(email)` constraint is next sprint (needs DDL on a Supabase
 * account we don't currently hold the CLI for, see CTH-DOCTRINE law 8).
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return ''
  return String(email).trim().toLowerCase()
}
