import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { sendTicket, toE164 } from '@/lib/whatsapp'
import { WP_ORIGIN } from '@/lib/woocommerce'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Vendor-triggered "Resend WA" for a previously generated staff badge.
 *
 * Layer 3 (Law 3, FooEvents-no-fork): we don't regenerate the ticket — we
 * re-send the FooEvents PDF the vendor already received. The canonical PDF
 * lives on the WP host behind the order; the vendor's WhatsApp receives a
 * fresh `ticket_delivery` template pointing at the admin order URL.
 */
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const staffId = String(body.staffId || '')
  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 })

  const state = parsePortalState(ctx.application.admin_notes as string)
  const member = (state.staff || []).find((m) => m.id === staffId)
  if (!member) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  if (!member.wc_order_id) {
    return NextResponse.json({ error: 'Badge not yet generated' }, { status: 409 })
  }

  const vendorWa = String(ctx.application.phone || '')
  const e164 = toE164(vendorWa)
  if (!e164) return NextResponse.json({ error: 'Vendor WhatsApp number missing' }, { status: 409 })

  const businessName = String(ctx.application.business_name || 'Vendor')
  const orderNumber = member.wc_order_number || String(member.wc_order_id)
  // Public WC ticket PDF link — falls back to the admin order URL so the link
  // is always live. The verifier admin agent will hydrate a proper public URL
  // once we wire the FooEvents public-PDF route.
  const pdfUrl = member.ticket_pdf_url || `${WP_ORIGIN}/wp-admin/post.php?post=${member.wc_order_id}&action=edit`

  const firstName = (ctx.application.contact_name as string || businessName).split(/\s+/)[0]
  const res = await sendTicket({
    to: e164,
    firstName,
    orderNumber,
    ticketSummary: `Staff badge for ${member.name}`,
    pdfUrl,
    filename: `YAH-StaffBadge-${orderNumber}.pdf`,
  })

  if (res.skipped) return NextResponse.json({ ok: false, skipped: res.skipped }, { status: 200 })
  return NextResponse.json({ ok: true, messageId: res.messageId })
}
