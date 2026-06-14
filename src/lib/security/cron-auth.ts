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

// Edge-runtime safe: manual constant-time compare instead of node:crypto.
// Middleware runs on Edge where node:crypto isn't available.
export function verifyCronAuth(headerValue: string | null): boolean {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) return false
  if (!headerValue || !headerValue.startsWith('Bearer ')) return false
  const provided = headerValue.slice(7)
  if (provided.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return diff === 0
}
