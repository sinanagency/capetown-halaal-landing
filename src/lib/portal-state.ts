import { createAdminClient } from '@/lib/supabase/admin'

// DDL is blocked on this Supabase project, so portal state lives as a marker
// inside vendor_applications.admin_notes — the same pattern as the ⟦STALL:..⟧
// allocation marker. State is base64-JSON so it never breaks on special chars
// and never collides with the ⟦STALL:..⟧ regex.
const PORTAL_RE = /⟦PORTAL:([A-Za-z0-9+/=]+)⟧/

export interface DocRecord {
  type: string
  path: string          // Storage object path in the vendor-docs bucket
  name: string          // original filename
  status: 'pending' | 'approved' | 'rejected'
  uploaded_at: string
  note?: string
}

/** Roles a vendor may register against a staff badge. Lifted from the
 *  staff-badges-via-fooevents spec (Samreen sign-off 2026-06-12). */
export type StaffRole = 'owner' | 'manager' | 'staff' | 'driver' | 'support'
export const STAFF_ROLES: StaffRole[] = ['owner', 'manager', 'staff', 'driver', 'support']

export interface StaffMember {
  id: string
  name: string
  /** Contact phone for the gate. New default since 2026-06-11. */
  phone?: string
  /** Legacy SA ID number, kept for backwards compatibility with pre-2026-06-11 records. */
  id_number: string
  vehicle_reg: string
  added_at: string
  /** Role on the stall. Defaults to 'staff' when not supplied. */
  role?: StaffRole
  /** WC order id once the FooEvents staff-badge order has been created. */
  wc_order_id?: number
  /** Public WC order number (often === wc_order_id, but FooEvents permits
   *  custom prefixes — keep the canonical string). */
  wc_order_number?: string
  /** FooEvents-generated ticket post id, when available. May be undefined
   *  if the hook lagged beyond our 10s poll — the admin order link still
   *  works as the lookup fallback. */
  fooevents_ticket_id?: string
  /** Admin URL where the ticket PDF can be re-downloaded. */
  ticket_pdf_url?: string
  /** Whether the FooEvents check-in has fired at the gate. Hydrated by the
   *  verifier admin from FooEvents attendee status. */
  checked_in_at?: string
  /** Set when the WC order has been cancelled (admin revoke). */
  revoked_at?: string
}

export interface MenuItem { name: string; price?: string; desc?: string }

export interface VendorProfile {
  tagline?: string
  description?: string
  logo_path?: string             // object path in vendor-assets bucket
  photo_gallery?: string[]       // additional photo paths in vendor-assets bucket
  website?: string
  instagram?: string
  facebook?: string
  menu?: MenuItem[]
  /** Opt-in flag: when true AND the vendor has an allocated stall, the public
   *  sectors page renders the stall code on the vendor's profile. Default
   *  false (privacy-first per CTH-DOCTRINE Law 2). UI toggle lives on
   *  /exhibitor/portal/stand; writer is /api/exhibitor/profile/publish-stall. */
  publish_stall?: boolean
}

export interface PortalState {
  v: number
  payment?: {
    status?: 'none' | 'deferred' | 'pending' | 'paid' | 'waived'
    amount?: number
    due?: string
    reference?: string
    provider_ref?: string   // gateway's own txn id (FNB txnToken), used to validate on return
    paid_at?: string
    proof_path?: string
    /** ISO time the vendor most recently clicked Pay and got a checkout URL.
     *  Used to detect stale 'pending' status (Yoco checkouts time out ~15min). */
    attempted_at?: string
    /** Number of checkout attempts since approval. Lets the UI escalate to
     *  "WhatsApp support" after repeated failures. */
    attempts?: number
    /** Number of attempts the webhook marked failed. */
    failed_attempts?: number
  }
  docs?: DocRecord[]
  staff?: StaffMember[]
  profile?: VendorProfile
  support?: SupportMessage[]
  passAllowance?: number        // gate passes this vendor is entitled to (set by organisers)
  stage?: 'approved' | 'invoiced' | 'paid' | 'docs' | 'show_ready'
  wa?: {
    phone: string              // E.164, the WhatsApp number they opted in with (may differ from vendor.phone)
    opted_in_at: string        // ISO timestamp
    welcome_sent?: boolean     // did we fire the approved welcome template
  }
  /** Pending phone-change verification. The vendor proposed a new phone in the
   *  portal; we sent a 6-digit OTP via WhatsApp to that number. The new number
   *  is NOT trusted as the vendor's contact until the OTP is confirmed at
   *  /api/exhibitor/wa-optin/verify. Cleared on success or 24h expiry. */
  phone_change_pending?: {
    new_phone: string          // E.164 candidate phone
    code_hash: string          // sha256(code + ':' + applicationId), constant-time compare
    requested_at: string       // ISO timestamp (used for expiry + rate-limit)
    attempts: number           // failed code checks; >=5 invalidates and forces re-request
  }
  /** ISO timestamp the vendor ticked the terms-and-conditions acceptance step in the portal. */
  terms_accepted_at?: string
}

export interface SupportMessage {
  id: string
  from: 'vendor' | 'admin'
  body: string
  at: string
}

export function parsePortalState(adminNotes?: string | null): PortalState {
  const m = (adminNotes || '').match(PORTAL_RE)
  if (!m) return { v: 1 }
  try {
    return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8')) as PortalState
  } catch {
    return { v: 1 }
  }
}

function encode(state: PortalState): string {
  return '⟦PORTAL:' + Buffer.from(JSON.stringify(state)).toString('base64') + '⟧'
}

/**
 * Read-modify-write the PORTAL marker on admin_notes, preserving any human
 * prose and the ⟦STALL:..⟧ allocation marker untouched. mutate() receives the
 * current state and returns the next one.
 */
export async function updatePortalState(
  applicationId: string,
  mutate: (s: PortalState) => PortalState
): Promise<PortalState> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('vendor_applications')
    .select('admin_notes')
    .eq('id', applicationId)
    .single()
  const notes = (data?.admin_notes as string) || ''
  const next = mutate(parsePortalState(notes))
  next.v = 1
  const rest = notes.replace(PORTAL_RE, '').replace(/\n{3,}/g, '\n\n').trim()
  const newNotes = rest ? `${rest}\n${encode(next)}` : encode(next)
  await admin.from('vendor_applications').update({ admin_notes: newNotes }).eq('id', applicationId)
  return next
}
