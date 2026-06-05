// Resolve a WhatsApp inbound to a real person — admin, vendor, ticket buyer, or
// unknown. The bot uses this to personalise every reply ("Hi Sarah, your
// Weekend Pass…") and to gate admin tools. Stateless per turn: we re-query on
// every inbound rather than caching. This is cheap (1-2 indexed lookups) and
// always correct — vendor data changes as Samreen processes the queue.

import { createAdminClient } from '@/lib/supabase/admin'
import { findAdmin, type BotAdmin } from '@/lib/bot/admins'

export type IdentityRole = 'admin' | 'vendor' | 'ticket_buyer' | 'unknown'

export interface ResolvedIdentity {
  role: IdentityRole
  name: string | null
  firstName: string | null
  e164: string
  // Admin role:
  admin?: BotAdmin
  // Vendor role:
  vendor?: {
    id: string
    business_name: string
    contact_name: string | null
    email: string | null
    status: string
    stall: string | null         // allocation code from ⟦STALL:..⟧ marker, if any
    payment_status: string       // 'none' | 'pending' | 'paid' | etc.
    tier_label: string | null
  }
  // Ticket-buyer role (schema = email, name, phone, ticket_count, total_spent,
  // last_purchase_at — no first/last name split, no order column).
  buyer?: {
    name: string | null
    email: string | null
    total_tickets: number
    total_spent: number
    last_buy_at: string | null
  }
}

export async function resolveIdentity(e164: string): Promise<ResolvedIdentity> {
  const base: ResolvedIdentity = { role: 'unknown', name: null, firstName: null, e164 }

  // (1) Admin allowlist — highest precedence.
  const admin = findAdmin(e164)
  if (admin) {
    return {
      ...base,
      role: 'admin',
      admin,
      name: admin.name,
      firstName: admin.name.split(/\s+/)[0],
    }
  }

  const db = createAdminClient()
  // (2) Vendor by phone — the form normalises to E.164 (with '+') but some old
  // rows may be plain digits. Try both surfaces. This Supabase schema doesn't
  // have a wa_phone column on vendor_applications; phone is the source of truth.
  const e164NoPlus = e164.replace(/^\+/, '')
  const { data: vendors } = await db
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, status, admin_notes, preferred_booth_tier')
    .or(`phone.eq.${e164},phone.eq.${e164NoPlus}`)
    .limit(1)
  const vendor = (vendors || [])[0] as {
    id: string
    business_name: string
    contact_name: string | null
    email: string | null
    status: string
    admin_notes: string | null
    preferred_booth_tier: string | null
  } | undefined
  if (vendor) {
    const { parseAllocation, tierLabel } = await import('@/lib/stalls')
    const { parsePortalState } = await import('@/lib/portal-state')
    const alloc = parseAllocation(vendor.admin_notes)
    const portal = parsePortalState(vendor.admin_notes)
    const name = vendor.contact_name || vendor.business_name
    return {
      ...base,
      role: 'vendor',
      name,
      firstName: (name || '').trim().split(/\s+/)[0] || null,
      vendor: {
        id: vendor.id,
        business_name: vendor.business_name,
        contact_name: vendor.contact_name,
        email: vendor.email,
        status: vendor.status,
        stall: alloc.stall,
        payment_status: portal.payment?.status || 'none',
        tier_label: vendor.preferred_booth_tier ? tierLabel(vendor.preferred_booth_tier) : null,
      },
    }
  }

  // (3) Ticket buyer by phone — the live ticket_buyers schema has `phone` only
  // (no wa_phone column), and a single `name` column (no first/last split).
  const { data: buyers } = await db
    .from('ticket_buyers')
    .select('email, name, phone, ticket_count, total_spent, last_purchase_at, created_at')
    .or(`phone.eq.${e164},phone.eq.${e164NoPlus}`)
    .order('last_purchase_at', { ascending: false, nullsFirst: false })
    .limit(1)
  const buyer = (buyers || [])[0] as {
    email: string | null
    name: string | null
    phone: string | null
    ticket_count: number | null
    total_spent: number | null
    last_purchase_at: string | null
    created_at: string | null
  } | undefined
  if (buyer) {
    const fullName = buyer.name || null
    const firstName = (fullName || '').trim().split(/\s+/)[0] || null
    return {
      ...base,
      role: 'ticket_buyer',
      name: fullName,
      firstName,
      buyer: {
        name: fullName,
        email: buyer.email,
        total_tickets: buyer.ticket_count || 0,
        total_spent: Number(buyer.total_spent) || 0,
        last_buy_at: buyer.last_purchase_at || buyer.created_at,
      },
    }
  }

  return base
}

// Compact natural-language bio of the identity, injected into the festival
// brain's system prompt so every reply is grounded ("you're talking to…").
export function identityBriefing(id: ResolvedIdentity): string {
  if (id.role === 'admin') {
    const a = id.admin!
    return `THE SENDER IS AN ADMIN — ${a.name} (${a.role === 'master' ? 'master / owner-builder' : 'festival owner'}). They are NOT a customer; do not give them the standard vendor-or-attendee tour. Treat their questions as internal operational queries (how many tickets sold? which vendors paid? what's the latest? etc.) and answer concisely and factually.`
  }
  if (id.role === 'vendor') {
    const v = id.vendor!
    const pieces = [
      `THE SENDER IS A VENDOR — ${v.business_name}` + (v.contact_name ? ` (contact: ${v.contact_name})` : ''),
      `Application status: ${v.status}.`,
      v.tier_label ? `Stall type chosen: ${v.tier_label}.` : '',
      v.stall ? `Allocated stall: ${v.stall}.` : 'No stall placement yet.',
      `Payment status: ${v.payment_status}.`,
      `Personalise replies with their first name when natural. Answer specifically about their stall, payment, documents, and setup. Direct portal questions to cthalaal.co.za/exhibitor/login.`,
    ].filter(Boolean)
    return pieces.join(' ')
  }
  if (id.role === 'ticket_buyer') {
    const b = id.buyer!
    return `THE SENDER IS A TICKET BUYER — ${b.name || 'a confirmed buyer'}. Tickets on record: ${b.total_tickets}. Greet them by name when natural and focus on attendance-side info (gate times, parking, schedule, re-sending tickets).`
  }
  return 'The sender is an UNKNOWN contact — they may be a prospective vendor, a prospective ticket buyer, or just curious. Help warmly, ask which.'
}
