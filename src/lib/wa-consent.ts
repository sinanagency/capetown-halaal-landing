// WhatsApp consent gate — the single chokepoint every outbound message passes
// through. This is what keeps the festival number (and therefore the host WABA,
// Nisria now / Halaal Hub later) safe: no record → no send; STOP → never again.
//
// Rules enforced by canSend():
//   - opted_out          → BLOCK everything, forever (hard stop, even utility)
//   - marketing category → require explicit opted_in === true
//   - utility/auth/service → allowed unless opted_out (transactional consent)
//   - free-form text     → only inside the 24h service window AND not opted_out

import { createAdminClient } from '@/lib/supabase/admin'

export type WaCategory = 'utility' | 'marketing' | 'authentication' | 'service'
export type ConsentSource = 'checkout' | 'vendor_form' | 'inbound' | 'manual' | 'import'

// wa_v2 = T&C-based auto opt-in. By buying a ticket or submitting a vendor
// application (and accepting the Terms & Conditions), the person agrees to
// receive Young at Heart Festival event updates and communications via WhatsApp
// and email. STOP always works and is honoured forever (see recordOptOut).
export const CONSENT_TEXT_VERSION = 'wa_v2'
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

interface ContactState {
  opted_in: boolean
  opted_out: boolean
  is_buyer: boolean
  last_inbound_at: string | null
}

async function getContact(waPhone: string): Promise<ContactState | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('wa_contacts')
    .select('opted_in, opted_out, is_buyer, last_inbound_at')
    .eq('wa_phone', waPhone)
    .maybeSingle()
  return (data as ContactState) ?? null
}

export interface SendDecision {
  allowed: boolean
  reason: string
}

// THE GATE. Call before every outbound message.
export async function canSend(
  waPhone: string,
  kind: { type: 'template'; category: WaCategory } | { type: 'text' }
): Promise<SendDecision> {
  const c = await getContact(waPhone)

  // Unknown contact: never opted out, but also never opted in.
  if (c?.opted_out) return { allowed: false, reason: 'contact opted out (STOP)' }

  if (kind.type === 'text') {
    // Free-form only allowed inside the 24h service window.
    const last = c?.last_inbound_at ? Date.parse(c.last_inbound_at) : 0
    const open = last > 0 && Date.now() - last < SERVICE_WINDOW_MS
    return open
      ? { allowed: true, reason: 'within 24h service window' }
      : { allowed: false, reason: 'outside 24h window — use an approved template' }
  }

  // Template path.
  if (kind.category === 'marketing') {
    return c?.opted_in
      ? { allowed: true, reason: 'marketing opt-in on file' }
      : { allowed: false, reason: 'no marketing opt-in' }
  }
  // utility / authentication / service templates: transactional, allowed unless opted out.
  return { allowed: true, reason: `${kind.category} template (transactional)` }
}

// Record an explicit opt-in (checkout checkbox, vendor form, etc.).
// Writes BOTH the fast state (wa_contacts) and the append-only proof (wa_consent_log).
export async function recordConsent(args: {
  waPhone: string
  source: ConsentSource
  orderId?: string
  ip?: string
  userAgent?: string
  isBuyer?: boolean
  profileName?: string
}): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()

  await db.from('wa_contacts').upsert(
    {
      wa_phone: args.waPhone,
      opted_in: true,
      opted_out: false, // a fresh opt-in clears a prior opt-out
      opted_in_at: now,
      ...(args.isBuyer ? { is_buyer: true } : {}),
      ...(args.profileName ? { profile_name: args.profileName } : {}),
      updated_at: now,
    },
    { onConflict: 'wa_phone' }
  )

  await db.from('wa_consent_log').insert({
    wa_phone: args.waPhone,
    action: 'opt_in',
    source: args.source,
    consent_text_ver: CONSENT_TEXT_VERSION,
    order_id: args.orderId ?? null,
    ip_address: args.ip ?? null,
    user_agent: args.userAgent ?? null,
  })
}

// Record an opt-out (STOP keyword, or manual). Hard block from here on.
export async function recordOptOut(args: {
  waPhone: string
  source: ConsentSource
}): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()

  await db.from('wa_contacts').upsert(
    {
      wa_phone: args.waPhone,
      opted_out: true,
      opted_in: false,
      opted_out_at: now,
      updated_at: now,
    },
    { onConflict: 'wa_phone' }
  )

  await db.from('wa_consent_log').insert({
    wa_phone: args.waPhone,
    action: 'opt_out',
    source: args.source,
  })
}

// Inbound message arrived → open/refresh the 24h service window.
export async function touchInbound(waPhone: string, profileName?: string): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  await db.from('wa_contacts').upsert(
    {
      wa_phone: waPhone,
      last_inbound_at: now,
      ...(profileName ? { profile_name: profileName } : {}),
      updated_at: now,
    },
    { onConflict: 'wa_phone' }
  )
}

// --- STOP / START keyword detection (case + whitespace insensitive) ---
const STOP_WORDS = new Set(['stop', 'unsubscribe', 'opt out', 'optout', 'cancel', 'end', 'quit'])
const START_WORDS = new Set(['start', 'unstop', 'subscribe', 'opt in', 'optin', 'yes'])

export function isStopKeyword(text: string): boolean {
  return STOP_WORDS.has((text || '').trim().toLowerCase())
}
export function isStartKeyword(text: string): boolean {
  return START_WORDS.has((text || '').trim().toLowerCase())
}
