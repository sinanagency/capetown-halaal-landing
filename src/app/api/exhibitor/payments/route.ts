import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState, parsePortalState } from '@/lib/portal-state'
import { activeProvider, paymentsEnabled, paymentReference } from '@/lib/payments'

const SITE = 'https://cthalaal.co.za'

// GET: this vendor's payment status.
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const state = parsePortalState(ctx.application.admin_notes as string)
  return NextResponse.json({
    enabled: paymentsEnabled(),
    payment: state.payment || { status: 'none' },
    amount: state.payment?.amount ?? null,
  })
}

// POST application/json {action:'initiate'} -> start a card payment (returns redirect URL).
// POST multipart (file) -> upload EFT proof-of-payment.
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const app = ctx.application
  const applicationId = app.id as string
  const contentType = req.headers.get('content-type') || ''

  // ---- EFT proof-of-payment upload (works today, admin confirms) ----
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${applicationId}/payment-proof-${Date.now()}.${ext}`
    const admin = createAdminClient()
    const { error } = await admin.storage.from('vendor-docs').upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'application/octet-stream', upsert: true,
    })
    if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    await updatePortalState(applicationId, (s) => ({
      ...s, payment: { ...(s.payment || {}), status: 'pending', proof_path: path },
    }))
    return NextResponse.json({ success: true })
  }

  // ---- Card payment via the active provider (Transaction Junction) ----
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: 'Online card payment is not enabled yet' }, { status: 503 })
  }
  const state = parsePortalState(app.admin_notes as string)
  // Compute amount from the application's stall + electricals + furniture. An
  // organiser-set state.payment.amount overrides for special-case quotes.
  const { computeVendorPricing } = await import('@/lib/payments/pricing')
  const pricing = computeVendorPricing({
    preferred_booth_tier: app.preferred_booth_tier as string,
    special_requirements: app.special_requirements,
  })
  const amount = state.payment?.amount && state.payment.amount > 0 ? state.payment.amount : pricing.total
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Your stall fee could not be computed. Please contact the team.' }, { status: 400 })
  }
  const reference = paymentReference(applicationId)
  try {
    const { url, providerRef } = await activeProvider().createPayment({
      applicationId,
      amount,
      currency: 'ZAR',
      reference,
      email: ctx.email,
      businessName: (app.business_name as string) || 'Exhibitor',
      description: `Stall fee — ${app.business_name} — Young at Heart Festival 2026`,
      returnUrl: `${SITE}/exhibitor/portal/payments?paid=1`,
      cancelUrl: `${SITE}/exhibitor/portal/payments?cancelled=1`,
    })
    await updatePortalState(applicationId, (s) => ({
      ...s, payment: { ...(s.payment || {}), status: 'pending', amount, reference, provider_ref: providerRef },
    }))
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[payments] initiate failed:', (e as Error).message)
    return NextResponse.json({ error: 'Could not start the payment. Please try again or contact support.' }, { status: 502 })
  }
}
