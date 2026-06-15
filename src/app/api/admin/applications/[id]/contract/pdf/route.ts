// Admin-side contract PDF fetch.
//
// Mirrors /api/exhibitor/portal/contract/pdf (the vendor-facing route) but is
// gated on admin_users (Law 2: vendor PII never leaves the admin shell, and
// only the admin RBAC layer can reach ANY vendor's contract). The vendor route
// pulls the application id from the signed-in vendor session; this route pulls
// it from the URL because the admin is reading on behalf of the operator, not
// the vendor.
//
// Reuses the existing contract storage layer: when a vendor signs at
// /exhibitor/portal/contract, /api/exhibitor/contract/sign stamps
// contract_signed_at + contract_pdf_path on the vendor_applications row, and
// puts the rendered PDF in the vendor-docs bucket. We just sign a 5-min URL
// over that path and redirect there. No new PDF generation, no fork.
//
// 404 if the application has no signed contract. 401/403 on auth failure.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VENDOR_DOCS_BUCKET = 'vendor-docs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: app, error } = await admin
    .from('vendor_applications')
    .select('id, contract_signed_at, contract_pdf_path')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'application not found' }, { status: 404 })

  const path = (app as { contract_pdf_path: string | null }).contract_pdf_path
  if (!path) {
    return NextResponse.json(
      { error: 'No signed contract on file for this vendor.' },
      { status: 404 },
    )
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(VENDOR_DOCS_BUCKET)
    .createSignedUrl(path, 300)
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }
  return NextResponse.redirect(signed.signedUrl)
}
