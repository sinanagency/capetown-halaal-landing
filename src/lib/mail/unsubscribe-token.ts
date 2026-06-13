// =============================================================================
// Per-recipient unsubscribe token.
//
// Strategy: HMAC-SHA256(email || ':unsub', UNSUB_SECRET), base64url-encoded.
// No database row needed. Validating a token is deterministic.
//
// We do not embed an expiry, because for unsubscribe links a long lifetime is
// desired (people unsubscribe from emails months later). Rotation is via the
// secret env var.
// =============================================================================

import { createHmac, randomBytes } from 'crypto'

const UNSUB_SECRET = (
  process.env.UNSUB_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  // Stable per-process fallback so dev does not crash; production MUST set env.
  randomBytes(32).toString('hex')
).trim()

function b64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function sig(email: string): string {
  return b64url(createHmac('sha256', UNSUB_SECRET).update(`${email.toLowerCase()}:unsub`).digest())
}

/**
 * Build an opaque unsubscribe token for a given email.
 * Format: base64url(email) + "." + signature
 */
export function buildUnsubToken(email: string): string {
  return `${b64url(Buffer.from(email.toLowerCase(), 'utf8'))}.${sig(email)}`
}

/**
 * Validate + decode a token. Returns the email on success, null on tamper.
 */
export function decodeUnsubToken(token: string): string | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [emailPart, sigPart] = token.split('.', 2)
  if (!emailPart || !sigPart) return null
  let email = ''
  try {
    email = fromB64url(emailPart).toString('utf8')
  } catch {
    return null
  }
  if (!email.includes('@')) return null
  const expected = sig(email)
  // Constant-time compare.
  if (expected.length !== sigPart.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sigPart.charCodeAt(i)
  }
  if (diff !== 0) return null
  return email
}

export function buildUnsubUrl(email: string, base?: string): string {
  const root = (base || process.env.NEXT_PUBLIC_SITE_URL || 'https://cthalaal.co.za').replace(/\/+$/, '')
  return `${root}/unsubscribe/${encodeURIComponent(buildUnsubToken(email))}`
}
