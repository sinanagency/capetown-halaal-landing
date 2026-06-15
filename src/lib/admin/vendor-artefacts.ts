/**
 * Admin Documents reconciliation: surface the same artefacts the vendor sees in
 * /exhibitor/portal as columns on the admin /admin/documents page.
 *
 * Inputs: a single vendor_applications.id.
 *
 * Outputs (VendorArtefactRow):
 *   - invoice_url:  URL to the vendor-facing invoice PDF (wave-2 H2 endpoint).
 *                   Null if no payment has been initiated (state.payment.status
 *                   is undefined or 'none'). The vendor sees the same artefact;
 *                   admin gets the same URL pattern for symmetry.
 *   - contract_url: URL to the vendor's signed contract PDF (wave-2 H2 endpoint).
 *                   Null if `vendor_applications.contract_signed_at` is unset.
 *   - badge_pdfs:   One entry per staff badge minted via FooEvents. Reads
 *                   `ticket_verifications` for product_id = STAFF_BADGE_PRODUCT_ID
 *                   (9487) and `vendor_application_id = applicationId`. Per
 *                   CTH-DOCTRINE Law 3 we do NOT re-mint; URL is the
 *                   FooEvents-emitted `raw_meta.pdf_url`. Falls back to the
 *                   admin wp-admin order page if FooEvents has not yet emitted
 *                   the PDF URL (same fallback as /api/admin/documents/tickets).
 *   - uploaded_docs: Vendor-uploaded compliance documents parsed from the
 *                   ⟦PORTAL:..⟧ marker on admin_notes (per portal-state.ts).
 *                   URL routes through the existing /api/admin/vendor-doc
 *                   signed-URL redirect — same as DocumentsClient already uses.
 *
 * Auth: This helper assumes the caller has already enforced admin auth. It uses
 * the service-role admin client to read across all applications. Wrap with the
 * /api/admin/documents/artefacts/[id]/route.ts handler for the auth gate.
 *
 * CTH-DOCTRINE notes:
 *   - Law 2 (PII): every field returned is privileged. Caller MUST gate.
 *   - Law 3 (FooEvents): badge PDFs link to FooEvents URLs, never re-minted.
 *   - Law 6 (date-filter): not relevant here — we never call orders.list.
 *     Staff badges are read out of ticket_verifications (our own table).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState } from '@/lib/portal-state'
import { STAFF_BADGE_PRODUCT_ID } from '@/lib/woocommerce'

const WP_ORIGIN = (process.env.CTH_WP_ORIGIN || 'https://tickets.youngatheart.co.za').replace(/\/$/, '')

export interface VendorArtefactRow {
  application_id: string
  business_name: string
  /** URL to the vendor invoice PDF. Null if no payment initiated. */
  invoice_url: string | null
  /** URL to the signed contract PDF. Null if contract not signed. */
  contract_url: string | null
  /** One per staff badge order, empty array if none minted yet. */
  badge_pdfs: Array<{ name: string; url: string }>
  /** Vendor-uploaded compliance docs from the ⟦PORTAL:..⟧ marker. */
  uploaded_docs: Array<{ type: string; status: string; url: string }>
}

interface ApplicationRow {
  id: string
  business_name: string | null
  admin_notes: string | null
  contract_signed_at: string | null
}

interface TicketVerificationRow {
  wc_order_id: number
  holder_first_name: string | null
  holder_last_name: string | null
  raw_meta: { pdf_url?: string } | null
}

export async function getVendorArtefacts(applicationId: string): Promise<VendorArtefactRow> {
  const db = createAdminClient()

  const { data: appData } = await db
    .from('vendor_applications')
    .select('id, business_name, admin_notes, contract_signed_at')
    .eq('id', applicationId)
    .maybeSingle()

  const app = (appData as ApplicationRow | null) ?? {
    id: applicationId,
    business_name: null,
    admin_notes: null,
    contract_signed_at: null,
  }

  const state = parsePortalState(app.admin_notes)

  // invoice_url: vendor-facing endpoint (wave-2 H2). The endpoint is session-
  // gated on the signed-in VENDOR, so the admin operator can't click through
  // directly — see README. Surfacing it gives reconciliation parity: Samreen
  // sees the same set of artefacts the vendor has access to.
  const paymentStatus = state.payment?.status
  const hasPaymentActivity = paymentStatus && paymentStatus !== 'none'
  const invoice_url = hasPaymentActivity ? '/api/exhibitor/portal/invoice/pdf' : null

  // contract_url: only meaningful when contract_signed_at is stamped. Same
  // session-gating caveat applies.
  const contract_url = app.contract_signed_at ? '/api/exhibitor/portal/contract/pdf' : null

  // badge_pdfs: read ticket_verifications scoped to this vendor + staff badge
  // product id. CTH-DOCTRINE Law 3: FooEvents owns the PDF, we link to it.
  const { data: badgeRows } = await db
    .from('ticket_verifications')
    .select('wc_order_id, holder_first_name, holder_last_name, raw_meta')
    .eq('vendor_application_id', applicationId)
    .eq('product_id', STAFF_BADGE_PRODUCT_ID)
    .order('created_at', { ascending: false })

  const badge_pdfs = (badgeRows as TicketVerificationRow[] | null || []).map((r) => {
    const name = [r.holder_first_name, r.holder_last_name].filter(Boolean).join(' ').trim() || `Badge #${r.wc_order_id}`
    const pdfFromRaw = r.raw_meta && typeof r.raw_meta.pdf_url === 'string' && r.raw_meta.pdf_url.length > 0
      ? r.raw_meta.pdf_url
      : null
    // Fallback: WP admin order page so the operator can re-download from the
    // FooEvents order detail. Same fallback shape as /api/admin/documents/tickets.
    const url = pdfFromRaw || `${WP_ORIGIN}/wp-admin/post.php?post=${r.wc_order_id}&action=edit`
    return { name, url }
  })

  // uploaded_docs: parse the ⟦PORTAL:..⟧ marker, map each DocRecord to a row.
  // URL goes through /api/admin/vendor-doc which signs a short-lived URL and
  // redirects. Same pattern DocumentsClient already uses for the Vendor
  // Documents tab — admin-side, RLS-bypassing, auth-gated.
  const docs = state.docs || []
  const uploaded_docs = docs.map((d) => ({
    type: d.type,
    status: d.status,
    url: `/api/admin/vendor-doc?path=${encodeURIComponent(d.path)}`,
  }))

  return {
    application_id: applicationId,
    business_name: app.business_name || '',
    invoice_url,
    contract_url,
    badge_pdfs,
    uploaded_docs,
  }
}
