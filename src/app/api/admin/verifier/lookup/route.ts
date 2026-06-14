/**
 * Day-of gate verifier lookup.
 *
 * POST /api/admin/verifier/lookup
 *   Body: { mode: 'qr' | 'number' | 'search', value: string }
 *
 * Auth: cookie session + admin_users role IN ('owner', 'operator'). Viewers
 *   are read-only on this surface, so they are blocked at the layout level
 *   from seeing the check-in button but allowed to call lookup for sanity.
 *   We allow viewer reads here (Law 2: no PII leak to the public, but admin
 *   surfaces are admin-side already) and gate writes (check-in) on the
 *   sibling /check-in endpoint.
 *
 * Resolution order:
 *   1. mode='qr'      - try to decode the FooEvents payload shape
 *                       `<order_id>|<ticket_id>|<hash>`. If the payload does
 *                       not split cleanly, treat the whole string as a ticket
 *                       hash and fall through to a WP-side lookup.
 *   2. mode='number'  - call WC REST /orders/<id> with the staff badge meta
 *                       reader, surface FooEvents ticket meta.
 *   3. mode='search'  - call getOrders({search: q}) (Law 6 `after=` enforced)
 *                       AND ticket_buyers.ilike on name/phone/email AND
 *                       vendor_applications.ilike for staff badge match.
 *
 * Response shape:
 *   { valid: boolean,
 *     ticket: { holder_name, type, order_number, purchase_date,
 *               attendance_date, checked_in_at } | null,
 *     vendor: { business_name, stall_code, id } | null,
 *     hits?: Array<{ kind: 'buyer'|'staff'|'vendor', label, sub, order_id?, application_id?, phone?, email? }>,
 *     error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrders, type WCOrder } from '@/lib/woocommerce'
import { parseAllocation } from '@/lib/stalls'
import { parsePortalState, type StaffMember } from '@/lib/portal-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TicketShape {
  holder_name: string | null
  type: string
  order_number: string
  purchase_date: string | null
  attendance_date: string | null
  checked_in_at: string | null
  is_staff: boolean
}

interface VendorShape {
  id: string
  business_name: string
  stall_code: string | null
}

interface SearchHit {
  kind: 'buyer' | 'staff' | 'vendor'
  label: string
  sub: string
  order_id?: number
  application_id?: string
  phone?: string | null
  email?: string | null
}

// FooEvents staff badge product id, mirrored from lib/woocommerce.ts. Read
// from env so a future product swap (festival cycle reset) does not require
// a redeploy of this route to track the new id.
const STAFF_BADGE_PRODUCT_ID = Number(process.env.STAFF_BADGE_PRODUCT_ID || 9487)

// Known buyer ticket product ids (Friday / Saturday / Sunday / Weekend).
// Kept narrow so an arbitrary new WC product cannot masquerade as a valid
// buyer ticket at the gate. Order matters only for display.
const BUYER_TICKET_PRODUCT_IDS = new Set<number>([9448, 9450, 9452, 9454])

// Friendly day labels keyed by product id. Falls through to line_item.name
// for any future product additions.
const PRODUCT_LABEL: Record<number, { label: string; day: string }> = {
  9448: { label: 'Friday Entry', day: '2026-12-11' },
  9450: { label: 'Saturday Entry', day: '2026-12-12' },
  9452: { label: 'Sunday Entry', day: '2026-12-13' },
  9454: { label: 'Weekend Pass', day: '2026-12-11' },
  9487: { label: 'Staff Badge', day: '2026-12-11' },
}

function ilikeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (m) => '\\' + m)
}

/**
 * Best-effort decode of a pasted FooEvents QR payload. FooEvents QR payloads
 * vary by plugin version; the most common shapes we see in production are:
 *   1. `<order_id>|<ticket_id>|<hash>`
 *   2. `<ticket_hash>` (32+ char hash string)
 *   3. a URL of the form `.../wp-admin/admin.php?page=fooevents-...&t=<hash>`
 *
 * We surface the order id when shape 1 lands; otherwise the caller should
 * fall back to a server-side WP lookup on the hash. Until the WP-side
 * companion endpoint is built (see TODO in route comment), an unparseable
 * QR payload returns `{valid: false, error: 'qr_not_decodable'}` so the
 * operator can fall back to typing the ticket number.
 */
function decodeQrPayload(raw: string): { orderId?: string; ticketId?: string; hash?: string } | null {
  const v = (raw || '').trim()
  if (!v) return null

  // URL shape - pull a ?t= or last path segment.
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v)
      const t = u.searchParams.get('t') || u.searchParams.get('ticket') || u.searchParams.get('hash')
      if (t) return { hash: t }
    } catch { /* fall through */ }
  }

  // pipe-delimited shape
  if (v.includes('|')) {
    const parts = v.split('|').map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const [orderId, ticketId, hash] = parts
      if (/^\d+$/.test(orderId)) {
        return { orderId, ticketId, hash }
      }
    }
  }

  // Pure numeric => treat as order id
  if (/^\d+$/.test(v)) return { orderId: v }

  // Hash-shape: 16+ alphanumeric characters
  if (/^[A-Za-z0-9]{16,}$/.test(v)) return { hash: v }

  return null
}

function buildTicketFromOrder(order: WCOrder): TicketShape {
  const billing = order.billing || ({} as WCOrder['billing'])
  const holderName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || billing.email || null
  const firstItem = order.line_items[0]
  const productId = firstItem ? firstItem.product_id : 0
  const meta = PRODUCT_LABEL[productId]
  const label = meta ? meta.label : (firstItem ? firstItem.name : 'Unknown ticket')
  const attendance = meta ? meta.day : null
  const isStaff = productId === STAFF_BADGE_PRODUCT_ID
  return {
    holder_name: holderName,
    type: label,
    order_number: String(order.id),
    purchase_date: order.date_created || null,
    attendance_date: attendance,
    // FooEvents writes attendee scan state into ticket meta on the WP side.
    // Surfacing that reliably requires the companion WP endpoint (TODO),
    // so for now we leave this null and let the operator press the
    // "Mark as checked in" button as a one-way signal.
    checked_in_at: null,
    is_staff: isStaff,
  }
}

/** Look up the vendor associated with a staff badge order via meta_data. */
async function resolveStaffVendor(orderId: number): Promise<{ vendor: VendorShape | null; staffMember: StaffMember | null }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('vendor_applications')
    .select('id, business_name, admin_notes')
    .eq('status', 'approved')
  if (error || !data) return { vendor: null, staffMember: null }

  for (const row of data) {
    const notes = (row.admin_notes as string) || ''
    const portal = parsePortalState(notes)
    const staff = (portal.staff || []) as StaffMember[]
    const match = staff.find((s) => s.wc_order_id === orderId)
    if (match) {
      const { stall } = parseAllocation(notes)
      return {
        vendor: {
          id: row.id as string,
          business_name: (row.business_name as string) || 'Vendor',
          stall_code: stall,
        },
        staffMember: match,
      }
    }
  }
  return { vendor: null, staffMember: null }
}

export async function POST(request: NextRequest) {
  try {
    // ---- auth ----
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .single()
    if (!adminUser) return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'Forbidden' }, { status: 403 })

    const role = (adminUser.role as string) || 'viewer'
    if (!['owner', 'operator', 'viewer'].includes(role)) {
      return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'Forbidden' }, { status: 403 })
    }

    // ---- body ----
    const body = await request.json().catch(() => null) as { mode?: string; value?: string } | null
    if (!body || !body.mode || !body.value) {
      return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'mode + value required' }, { status: 400 })
    }
    const mode = body.mode
    const value = String(body.value || '').trim().slice(0, 500)
    if (!value) return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'value required' }, { status: 400 })

    // ---- mode: qr ----
    if (mode === 'qr') {
      const decoded = decodeQrPayload(value)
      if (!decoded) {
        return NextResponse.json({
          valid: false,
          ticket: null,
          vendor: null,
          error: 'QR payload not recognised. Try the ticket number tab.',
        })
      }
      if (decoded.orderId) {
        return handleNumber(decoded.orderId)
      }
      // Hash-only: no companion WP endpoint yet, surface a clear instruction.
      return NextResponse.json({
        valid: false,
        ticket: null,
        vendor: null,
        error: 'QR is a hash. Use FooEvents Express Check-In below, or type the order number from the ticket PDF.',
      })
    }

    // ---- mode: number ----
    if (mode === 'number') {
      const num = value.replace(/\D/g, '')
      if (!num) return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'Invalid ticket number' })
      return handleNumber(num)
    }

    // ---- mode: search ----
    if (mode === 'search') {
      const q = value
      const safe = ilikeEscape(q.slice(0, 100).replace(/[,()]/g, ' '))
      const pattern = `%${safe}%`
      const hits: SearchHit[] = []

      // Local ticket_buyers lookup. Cheap, indexable.
      try {
        const { data: buyers } = await admin
          .from('ticket_buyers')
          .select('id, name, email, phone, ticket_count')
          .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(20)
        for (const b of buyers || []) {
          hits.push({
            kind: 'buyer',
            label: (b.name as string) || (b.email as string) || 'Buyer',
            sub: `${b.email || ''} ${b.phone || ''}`.trim() || 'No contact on file',
            email: (b.email as string) || null,
            phone: (b.phone as string) || null,
          })
        }
      } catch (e) {
        console.error('[verifier/lookup] ticket_buyers search failed', e)
      }

      // Vendor applications lookup (covers both vendors and their staff
      // by name/phone). Restricted to approved so a stale pending row
      // does not get a green badge by accident.
      try {
        const { data: vendors } = await admin
          .from('vendor_applications')
          .select('id, business_name, contact_name, phone, email, admin_notes')
          .eq('status', 'approved')
          .or(
            `business_name.ilike.${pattern},contact_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`
          )
          .limit(20)
        for (const v of vendors || []) {
          hits.push({
            kind: 'vendor',
            label: (v.business_name as string) || 'Vendor',
            sub: `${v.contact_name || ''} ${v.phone || ''}`.trim() || 'Vendor',
            application_id: v.id as string,
            phone: (v.phone as string) || null,
            email: (v.email as string) || null,
          })
          // also scan staff within this vendor's portal state for name match
          const portal = parsePortalState((v.admin_notes as string) || '')
          const staff = (portal.staff || []) as StaffMember[]
          const ql = q.toLowerCase()
          for (const s of staff) {
            if (
              (s.name || '').toLowerCase().includes(ql) ||
              (s.phone || '').includes(q) ||
              (s.id_number || '').includes(q)
            ) {
              hits.push({
                kind: 'staff',
                label: s.name,
                sub: `${s.role || 'staff'} at ${(v.business_name as string) || 'vendor'}`,
                application_id: v.id as string,
                order_id: s.wc_order_id,
                phone: s.phone || null,
              })
            }
          }
        }
      } catch (e) {
        console.error('[verifier/lookup] vendor_applications search failed', e)
      }

      // WooCommerce search (Law 6 cycle filter applies via getOrders).
      try {
        const orders = await getOrders({ search: q, per_page: '10' })
        for (const o of orders.slice(0, 10)) {
          const productId = o.line_items[0]?.product_id || 0
          if (productId === STAFF_BADGE_PRODUCT_ID) {
            // Already surfaced via vendor staff scan above; skip dup.
            continue
          }
          if (!BUYER_TICKET_PRODUCT_IDS.has(productId)) continue
          const name = `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || (o.billing?.email || 'Buyer')
          const meta = PRODUCT_LABEL[productId]
          hits.push({
            kind: 'buyer',
            label: name,
            sub: `${meta ? meta.label : 'Ticket'} | Order #${o.id}`,
            order_id: o.id,
            phone: o.billing?.phone || null,
            email: o.billing?.email || null,
          })
        }
      } catch (e) {
        console.error('[verifier/lookup] WC search failed', e)
      }

      return NextResponse.json({ valid: false, ticket: null, vendor: null, hits })
    }

    return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'unknown mode' }, { status: 400 })
  } catch (err) {
    console.error('[verifier/lookup] error', err)
    return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'Internal server error' }, { status: 500 })
  }
}

/** Shared helper for mode='number' and mode='qr'-with-orderId. */
async function handleNumber(rawNum: string): Promise<NextResponse> {
  const orderId = Number(rawNum)
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ valid: false, ticket: null, vendor: null, error: 'Invalid ticket number' })
  }
  // Direct WC fetch via the existing client. We hit /orders/<id> through
  // wcFetch indirectly: getOrders accepts include=<id> which works for a
  // single id and benefits from the Law 6 `after=` filter (the filter is a
  // no-op when the id is explicit but the call is still date-scoped so a
  // last-cycle order id cannot quietly return).
  try {
    const list = await getOrders({ include: String(orderId), per_page: '1' })
    if (!list || list.length === 0) {
      return NextResponse.json({
        valid: false,
        ticket: null,
        vendor: null,
        error: `Order ${orderId} not found in 2026 cycle. Could be a previous-year ticket.`,
      })
    }
    const order = list[0]
    const ticket = buildTicketFromOrder(order)

    let vendor: VendorShape | null = null
    if (ticket.is_staff) {
      const resolved = await resolveStaffVendor(order.id)
      vendor = resolved.vendor
      if (resolved.staffMember && resolved.staffMember.checked_in_at) {
        ticket.checked_in_at = resolved.staffMember.checked_in_at
      }
    }

    const validProduct =
      ticket.is_staff || BUYER_TICKET_PRODUCT_IDS.has(order.line_items[0]?.product_id || 0)
    const validStatus = ['completed', 'processing'].includes(order.status)
    return NextResponse.json({
      valid: Boolean(validProduct && validStatus),
      ticket,
      vendor,
      error: !validProduct ? 'Not a recognised festival ticket product' :
             !validStatus ? `Order status is ${order.status}` : undefined,
    })
  } catch (e) {
    console.error('[verifier/lookup] WC fetch failed', e)
    return NextResponse.json({
      valid: false,
      ticket: null,
      vendor: null,
      error: 'Ticket store lookup failed. Try the FooEvents scanner directly.',
    }, { status: 502 })
  }
}
