import { NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const VENDOR_DOCS_BUCKET = 'vendor-docs'

export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const path = (ctx.application as any).contract_pdf_path as string | undefined
  if (!path) return NextResponse.json({ error: 'No signed contract on file' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(VENDOR_DOCS_BUCKET).createSignedUrl(path, 300)
  if (error || !data) return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
