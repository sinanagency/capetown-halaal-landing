/**
 * GET /api/admin/documents/artefacts/[id]
 *
 * Returns the VendorArtefactRow for a single vendor application: invoice,
 * contract, staff badge PDFs, and the parsed list of vendor-uploaded docs.
 *
 * Admin-only. Auth pattern mirrors /api/admin/documents/vendors:
 *   1. Supabase session must resolve a user.
 *   2. That user.id must exist in admin_users.
 *
 * Per CTH-DOCTRINE Law 2 (vendor PII): this route NEVER serves anon traffic.
 * Both gates return JSON errors with the appropriate status.
 *
 * Per CTH-DOCTRINE Law 3 (no FooEvents fork): badge PDFs link to FooEvents-
 * minted URLs from ticket_verifications.raw_meta.pdf_url; we never re-render.
 *
 * Per CTH-DOCTRINE Law 6 (date-filter): not exercised. We read only from our
 * own Supabase tables (vendor_applications + ticket_verifications). No
 * WooCommerce orders.list call lives in this code path.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorArtefacts } from '@/lib/admin/vendor-artefacts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await ctx.params
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'bad_application_id' }, { status: 400 })
  }

  try {
    const row = await getVendorArtefacts(id)
    return NextResponse.json({ row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
