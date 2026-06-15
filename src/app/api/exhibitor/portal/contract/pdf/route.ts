// Vendor-facing contract PDF download.
//
// Auth: session-gated on the signed-in vendor (Law 2). Application id resolved
// from getExhibitorContext, NEVER from query/path. No vendor can reach another
// vendor's contract.
//
// Behaviour:
//   - If the vendor has signed (contract_pdf_path stamped on their row) we mint
//     a short-lived signed URL to the stored PDF in the vendor-docs bucket and
//     redirect there. Same shape as the existing /api/exhibitor/contract/download
//     route; we duplicate to keep the URL scheme symmetric (.../portal/<thing>/pdf).
//   - If unsigned, return 404 with a helpful message so the UI can route the
//     vendor to /exhibitor/portal/contract to sign first.

import { NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VENDOR_DOCS_BUCKET = 'vendor-docs'

export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const app = ctx.application as Record<string, unknown>
  const path = (app.contract_pdf_path as string | null) || null
  if (!path) {
    return NextResponse.json(
      { error: 'No signed contract on file. Visit /exhibitor/portal/contract to sign first.' },
      { status: 404 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(VENDOR_DOCS_BUCKET).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }
  return NextResponse.redirect(data.signedUrl)
}
