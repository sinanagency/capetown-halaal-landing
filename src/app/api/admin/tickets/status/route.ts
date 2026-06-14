/**
 * GET /api/admin/tickets/status
 *
 * The lookup endpoint the Admin Verifier UI + People list hit to read
 * verification state for a ticket / order / contact.
 *
 * Query params (at least one required):
 *   ?order_id=X      -> all verifications for one WC order
 *   ?ticket_id=X     -> single verification by fooevents_ticket_id
 *   ?phone=X         -> matches holder_phone exactly
 *   ?email=X         -> matches holder_email (case-insensitive)
 *
 * Optional:
 *   ?vendor_id=X     -> filter by vendor_application_id (staff badges)
 *   ?limit=N         -> default 50, max 200
 *
 * Returns: { verifications: TicketVerification[] }
 *
 * Auth: signed-in admin_users row required (any role).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const orderId = sp.get('order_id')
  const ticketId = sp.get('ticket_id')
  const phone = sp.get('phone')
  const email = sp.get('email')
  const vendorId = sp.get('vendor_id')
  const limitRaw = Number(sp.get('limit') || 50)
  const limit = Math.min(Math.max(1, isFinite(limitRaw) ? limitRaw : 50), 200)

  if (!orderId && !ticketId && !phone && !email && !vendorId) {
    return NextResponse.json(
      { error: 'one of order_id, ticket_id, phone, email, vendor_id is required' },
      { status: 400 },
    )
  }

  let query = db
    .from('ticket_verifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (orderId) {
    const n = Number(orderId)
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: 'order_id must be numeric' }, { status: 400 })
    }
    query = query.eq('wc_order_id', n)
  }
  if (ticketId) query = query.eq('fooevents_ticket_id', ticketId)
  if (phone) query = query.eq('holder_phone', phone)
  if (email) query = query.ilike('holder_email', email)
  if (vendorId) query = query.eq('vendor_application_id', vendorId)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ verifications: data || [] })
}
