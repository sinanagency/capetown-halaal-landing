/**
 * GET /api/admin/documents/tickets
 *
 * Returns rows from ticket_verifications joined with the WP-resolver-emitted
 * pdf_url that already lives in raw_meta. One row per ticket, with the holder
 * + order + a one-click PDF link.
 *
 * Admin-only. Reads via service-role per RLS contract (Law 4: WC + FooEvents
 * are canonical, we don't fork either).
 *
 * No FooEvents fork (Law 3): the PDF link is the URL the WP resolver already
 * minted; we never re-render the PDF inside our app.
 *
 * Query params:
 *   - search: holder first/last name OR email (case-insensitive substring)
 *   - ticket_type: filter to a specific FooEvents product type
 *   - verified: 'yes' | 'no' (verified_at IS NOT NULL filter)
 *   - limit: default 500
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WP_ORIGIN = (process.env.CTH_WP_ORIGIN || 'https://tickets.youngatheart.co.za').replace(/\/$/, '')

interface TicketRow {
  id: string
  wc_order_id: number
  fooevents_ticket_id: string | null
  ticket_type: string | null
  holder_first_name: string | null
  holder_last_name: string | null
  holder_email: string | null
  holder_phone: string | null
  attendance_date: string | null
  verified_at: string | null
  checked_in_at: string | null
  pdf_url: string | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const search = (url.searchParams.get('search') || '').trim().toLowerCase()
  const ticketType = (url.searchParams.get('ticket_type') || '').trim()
  const verified = (url.searchParams.get('verified') || '').trim().toLowerCase()
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 1), 2000)

  let q = db
    .from('ticket_verifications')
    .select('id, wc_order_id, fooevents_ticket_id, ticket_type, holder_first_name, holder_last_name, holder_email, holder_phone, attendance_date, verified_at, checked_in_at, raw_meta')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (ticketType) q = q.eq('ticket_type', ticketType)
  if (verified === 'yes') q = q.not('verified_at', 'is', null)
  if (verified === 'no') q = q.is('verified_at', null)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows: TicketRow[] = (data || []).map((r) => {
    const raw = (r as { raw_meta?: { pdf_url?: string } | null }).raw_meta || null
    const pdfFromRaw = raw && typeof raw.pdf_url === 'string' && raw.pdf_url.length > 0 ? raw.pdf_url : null
    // Fallback: link to WP admin order page so an operator can re-download
    // the FooEvents PDF from the order detail screen. Same fallback already
    // used by /api/admin/vendors/[id]/staff/[memberId]/resend.
    const pdfFallback = `${WP_ORIGIN}/wp-admin/post.php?post=${(r as { wc_order_id: number }).wc_order_id}&action=edit`
    return {
      id: (r as { id: string }).id,
      wc_order_id: (r as { wc_order_id: number }).wc_order_id,
      fooevents_ticket_id: (r as { fooevents_ticket_id: string | null }).fooevents_ticket_id,
      ticket_type: (r as { ticket_type: string | null }).ticket_type,
      holder_first_name: (r as { holder_first_name: string | null }).holder_first_name,
      holder_last_name: (r as { holder_last_name: string | null }).holder_last_name,
      holder_email: (r as { holder_email: string | null }).holder_email,
      holder_phone: (r as { holder_phone: string | null }).holder_phone,
      attendance_date: (r as { attendance_date: string | null }).attendance_date,
      verified_at: (r as { verified_at: string | null }).verified_at,
      checked_in_at: (r as { checked_in_at: string | null }).checked_in_at,
      pdf_url: pdfFromRaw || pdfFallback,
    }
  })

  if (search) {
    rows = rows.filter((r) => {
      const fn = r.holder_first_name?.toLowerCase() || ''
      const ln = r.holder_last_name?.toLowerCase() || ''
      const em = r.holder_email?.toLowerCase() || ''
      return fn.includes(search) || ln.includes(search) || em.includes(search) || `${fn} ${ln}`.includes(search)
    })
  }

  return NextResponse.json({ rows, total: rows.length })
}
