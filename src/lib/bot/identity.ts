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
  // Ticket-buyer role:
  buyer?: {
    name: string | null
    email: string | null
    last_order_number: string | null
    total_tickets: number        // sum of qty across all their orders
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

  // (3) Ticket buyer via wa_phone (Meta cron-fed ticket_buyers).
  const { data: buyers } = await db
    .from('ticket_buyers')
    .select('first_name, last_name, email, last_order_number, ticket_count, created_at')
    .or(`wa_phone.eq.${e164},wa_phone.eq.${e164NoPlus}`)
    .order('created_at', { ascending: false })
    .limit(5)
  const rows = (buyers || []) as Array<{
    first_name: string | null
    last_name: string | null
    email: string | null
    last_order_number: string | null
    ticket_count: number | null
    created_at: string | null
  }>
  if (rows.length > 0) {
    const head = rows[0]
    const fullName = [head.first_name, head.last_name].filter(Boolean).join(' ') || null
    const totalTickets = rows.reduce((s, r) => s + (r.ticket_count || 0), 0)
    return {
      ...base,
      role: 'ticket_buyer',
      name: fullName,
      firstName: head.first_name || null,
      buyer: {
        name: fullName,
        email: head.email,
        last_order_number: head.last_order_number,
        total_tickets: totalTickets,
        last_buy_at: head.created_at,
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
    return `THE SENDER IS A TICKET BUYER — ${b.name || 'a confirmed buyer'}. Tickets on record: ${b.total_tickets}. Last order: ${b.last_order_number || 'unknown'}. Greet them by name when natural and focus on attendance-side info (gate times, parking, schedule, re-sending tickets).`
  }
  return 'The sender is an UNKNOWN contact — they may be a prospective vendor, a prospective ticket buyer, or just curious. Help warmly, ask which.'
}
