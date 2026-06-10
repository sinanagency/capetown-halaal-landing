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

export interface StaffMember {
  id: string
  name: string
  /** Contact phone for the gate. New default since 2026-06-11. */
  phone?: string
  /** Legacy SA ID number, kept for backwards compatibility with pre-2026-06-11 records. */
  id_number: string
  vehicle_reg: string
  added_at: string
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
