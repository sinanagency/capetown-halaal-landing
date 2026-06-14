/**
 * Look up a phone number against vendor_applications + ticket_buyers.
 *
 * Used by the Bot Inbox header to replace raw '27817534892' strings with a
 * real name + role badge. NEVER fabricates a name on miss: a miss returns
 * `null` and the UI keeps the number.
 *
 * Match strategy uses last-9-digit suffix matching to absorb formatting drift
 * (see `src/lib/phone/normalize.ts`).
 */

import { lastNine } from '@/lib/phone/normalize'

export type ContactBadge = 'vendor' | 'ticket_buyer' | 'unknown'

export interface PhoneContact {
  phone: string
  displayName: string | null
  badge: ContactBadge
  vendorApplicationId: string | null
  ticketBuyerEmail: string | null
}

// Same loose structural typing as src/lib/contacts/resolve.ts to avoid
// coupling to a generated schema type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbClient = { from: (table: string) => any }

interface VendorHit {
  id: string
  business_name: string | null
  contact_name: string | null
}

interface BuyerHit {
  email: string | null
  name: string | null
}

async function findVendorByPhone(supabase: SbClient, last9: string): Promise<VendorHit | null> {
  try {
    const { data, error } = await supabase
      .from('vendor_applications')
      .select('id,business_name,contact_name')
      .ilike('phone', `%${last9}`)
      .limit(1)
    if (error || !data || (Array.isArray(data) && data.length === 0)) return null
    const row = (Array.isArray(data) ? data[0] : data) as VendorHit
    return row || null
  } catch {
    return null
  }
}

async function findBuyerByPhone(supabase: SbClient, last9: string): Promise<BuyerHit | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_buyers')
      .select('email,name')
      .ilike('phone', `%${last9}`)
      .limit(1)
    if (error || !data || (Array.isArray(data) && data.length === 0)) return null
    const row = (Array.isArray(data) ? data[0] : data) as BuyerHit
    return row || null
  } catch {
    return null
  }
}

export async function lookupPhone(
  rawPhone: string,
  supabase: SbClient
): Promise<PhoneContact> {
  const empty: PhoneContact = {
    phone: rawPhone,
    displayName: null,
    badge: 'unknown',
    vendorApplicationId: null,
    ticketBuyerEmail: null,
  }
  const last9 = lastNine(rawPhone)
  if (!last9) return empty

  const vendor = await findVendorByPhone(supabase, last9)
  if (vendor) {
    return {
      phone: rawPhone,
      displayName: vendor.business_name?.trim() || vendor.contact_name?.trim() || null,
      badge: 'vendor',
      vendorApplicationId: vendor.id,
      ticketBuyerEmail: null,
    }
  }

  const buyer = await findBuyerByPhone(supabase, last9)
  if (buyer) {
    return {
      phone: rawPhone,
      displayName: buyer.name?.trim() || buyer.email || null,
      badge: 'ticket_buyer',
      vendorApplicationId: null,
      ticketBuyerEmail: buyer.email,
    }
  }

  return empty
}

/**
 * Batched variant for the Bot Inbox thread list. Same per-phone result shape.
 */
export async function lookupPhones(
  rawPhones: string[],
  supabase: SbClient
): Promise<Map<string, PhoneContact>> {
  const out = new Map<string, PhoneContact>()
  const unique = Array.from(new Set(rawPhones.filter(Boolean)))
  await Promise.all(
    unique.map(async (p) => {
      const c = await lookupPhone(p, supabase)
      out.set(p, c)
    })
  )
  return out
}
