import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderSignedContractPdf } from '@/lib/contract/render-pdf'
import { CONTRACT_VERSION } from '@/lib/contract/copy'

export const runtime = 'nodejs'
export const maxDuration = 60

const VENDOR_DOCS_BUCKET = 'vendor-docs'

const signSchema = z.object({
  signatureDataUrl: z.string().min(20).max(2_500_000), // up to ~2MB encoded
  signatureMode: z.enum(['type', 'draw']),
  printName: z.string().min(2).max(160),
  signedAt: z.string().min(2).max(120),
})

export async function POST(req: NextRequest) {
  let body: z.infer<typeof signSchema>
  try {
    body = signSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  const ctx = await getExhibitorContext()
  if (!ctx || !ctx.application) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const app = ctx.application as any
  if (app.status !== 'approved') {
    return NextResponse.json({ error: 'Application not approved yet' }, { status: 403 })
  }
  if (app.contract_signed_at) {
    return NextResponse.json({ ok: true, alreadySigned: true })
  }

  const admin = createAdminClient()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
  const ua = (req.headers.get('user-agent') || '').slice(0, 400)
  const signedAtIso = new Date().toISOString()

  // Render the themed PDF
  const pdf = await renderSignedContractPdf({
    vendorName: String(app.business_name || 'Vendor'),
    contactName: String(app.contact_name || ''),
    printName: body.printName,
    signedAtPlace: body.signedAt,
    signedAtIso,
    signatureDataUrl: body.signatureDataUrl,
    ip,
    applicationId: app.id,
  })
  if (!pdf) {
    return NextResponse.json({ error: 'Could not render contract' }, { status: 500 })
  }

  // Upload to vendor-docs/signed-contracts/<application_id>.pdf
  const path = `signed-contracts/${app.id}.pdf`
  const { error: upErr } = await admin.storage
    .from(VENDOR_DOCS_BUCKET)
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    console.error('[contract-sign] upload failed:', upErr.message)
    return NextResponse.json({ error: 'Could not store contract' }, { status: 500 })
  }

  // Stamp the audit columns
  const { error: dbErr } = await admin
    .from('vendor_applications')
    .update({
      contract_signed_at: signedAtIso,
      contract_signed_ip: ip,
      contract_signed_ua: ua,
      contract_pdf_path: path,
      contract_version: CONTRACT_VERSION,
    })
    .eq('id', app.id)
  if (dbErr) {
    console.error('[contract-sign] db update failed:', dbErr.message)
    return NextResponse.json({ error: 'Could not record signature' }, { status: 500 })
  }

  // Best-effort audit event
  try {
    await admin.from('site_events').insert({
      type: 'contract_signed',
      severity: 'info',
      detail: `Vendor ${app.business_name} (${app.id}) signed Vendor Contract 2026 (${body.signatureMode} mode).`,
      meta: { applicationId: app.id, mode: body.signatureMode, ip, version: CONTRACT_VERSION },
    })
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, path })
}
