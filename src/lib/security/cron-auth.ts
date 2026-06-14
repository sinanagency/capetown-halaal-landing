// Constant-time Bearer-token check for cron + admin-callable routes.
//
// Rationale: prior callsites used `auth !== \`Bearer ${cronSecret}\`` (variable
// time string compare) or accepted `?secret=` in the URL (which leaks into
// access logs, browser history, referrers, and third-party analytics).
// This helper centralises one safe path: ONLY the `Authorization: Bearer …`
// header, compared in constant time via `crypto.timingSafeEqual`.
//
// Returns false if CRON_SECRET is unset (fail closed) or the header is
// missing, malformed, or wrong.

import { timingSafeEqual } from 'node:crypto'

export function verifyCronAuth(headerValue: string | null): boolean {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) return false
  if (!headerValue || !headerValue.startsWith('Bearer ')) return false
  const provided = headerValue.slice(7)
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
