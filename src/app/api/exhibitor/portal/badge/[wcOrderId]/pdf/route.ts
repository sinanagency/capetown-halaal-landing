// Vendor-facing staff-badge PDF download.
//
// Auth: session-gated (Law 2). Path takes a WC order id, but we cross-check it
// against the vendor's own portal-state staff[] list before resolving. A vendor
// can NEVER reach a badge that isn't on their own manifest, even if they know
// another vendor's order id.
//
// Law 3 (no FooEvents fork): we do NOT mint the PDF. FooEvents owns ticket PDF
// generation. We hit the WP resolver mu-plugin (wp-json/cth/v1/tickets-by-order/<id>)
// to get the upstream `pdf_url` and redirect there.

import { NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { fetchTicketsFromWpResolver } from '@/lib/tickets/verify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctxArg: { params: Promise<{ wcOrderId: string }> },
) {
  const { wcOrderId } = await ctxArg.params
  const orderId = Number.parseInt(String(wcOrderId), 10)
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ error: 'Bad order id' }, { status: 400 })
  }

  const ctx = await getExhibitorContext()
  if (!ctx?.application) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const app = ctx.application as Record<string, unknown>
  const state = parsePortalState((app.admin_notes as string) || null)
  const ownsBadge = (state.staff || []).some((s) => s.wc_order_id === orderId)
  if (!ownsBadge) {
    // Generic 404 not 403, to avoid leaking existence of other vendors' badges.
    return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
  }

  const tickets = await fetchTicketsFromWpResolver(orderId)
  const pdfUrl = tickets?.[0]?.raw?.pdf_url
  if (!pdfUrl || typeof pdfUrl !== 'string' || !/^https?:\/\//.test(pdfUrl)) {
    return NextResponse.json(
      { error: 'Ticket PDF not yet available. FooEvents may still be generating it; try again in a minute.' },
      { status: 503 },
    )
  }
  return NextResponse.redirect(pdfUrl)
}
