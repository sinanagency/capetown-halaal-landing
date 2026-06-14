/**
 * Phone normalisation, narrowly scoped to ZA / festival WhatsApp use.
 *
 * The fleet writes phones inconsistently:
 *   - vendor_applications.phone     : '+27 81 753 4892', '0817534892', '27817534892'
 *   - ticket_buyers.phone           : same chaos, sometimes E.164 with +, sometimes raw
 *   - wa_messages.wa_phone          : '27817534892' (Meta WABA strips +)
 *
 * Bot inbox + support inbox both need to look up a phone against vendors AND
 * ticket buyers without missing rows because of formatting. Strategy: derive
 * the *last 9 digits* (the unique part of a ZA mobile, post country-code) and
 * match with ILIKE / suffix. We also expose canonical E.164 forms for display.
 */

export type PhoneShape =
  | { ok: true; e164: string; e164NoPlus: string; last9: string }
  | { ok: false; raw: string }

const ZA_CC = '27'

function digitsOnly(s: string): string {
  return (s || '').replace(/[^\d]/g, '')
}

/**
 * Canonicalise a phone to E.164 ZA where possible.
 *   '0817534892'      -> +27817534892
 *   '27817534892'     -> +27817534892
 *   '+27817534892'    -> +27817534892
 *   '817534892'       -> +27817534892   (assume ZA mobile)
 *
 * Non-ZA international numbers (anything 11+ digits not starting with 27 after
 * digits-only collapse) are returned with a leading '+' but not coerced.
 */
export function normalizePhone(raw: string | null | undefined): PhoneShape {
  if (!raw) return { ok: false, raw: '' }
  const d = digitsOnly(raw)
  if (!d) return { ok: false, raw }

  let body = d
  if (body.startsWith('00')) body = body.slice(2)
  if (body.startsWith('0') && body.length === 10) body = ZA_CC + body.slice(1)
  if (body.length === 9 && !body.startsWith(ZA_CC)) body = ZA_CC + body

  const e164NoPlus = body
  const e164 = `+${body}`
  const last9 = body.slice(-9)
  return { ok: true, e164, e164NoPlus, last9 }
}

/**
 * Best-effort match candidates for a phone. Used in `lookupByPhone` for
 * vendor_applications + ticket_buyers ILIKE matching.
 */
export function phoneMatchSet(raw: string | null | undefined): string[] {
  const n = normalizePhone(raw)
  if (!n.ok) return []
  return Array.from(new Set([n.e164, n.e164NoPlus, n.last9]))
}

export function lastNine(raw: string | null | undefined): string | null {
  const n = normalizePhone(raw)
  return n.ok ? n.last9 : null
}
