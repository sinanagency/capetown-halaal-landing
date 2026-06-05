// Yoco Online Checkout webhook receiver. Verifies the Standard-Webhooks
// signature, marks the application paid, and triggers the confirmation email
// + invoice. Idempotent — Yoco may retry the same event up to 3 times.

import { NextRequest, NextResponse } from 'next/server'
import { yoco } from '@/lib/payments/yoco'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState, updatePortalState } from '@/lib/portal-state'
import { sendEmail } from '@/lib/email/resend'
import { VendorPaymentConfirmation } from '@/lib/email/templates/VendorPaymentConfirmation'
import { computeVendorPricing, formatRand } from '@/lib/payments/pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE = 'https://cthalaal.co.za'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  let result
  try {
    if (!yoco.parseWebhook) throw new Error('parseWebhook not implemented')
    result = await yoco.parseWebhook(req, raw)
  } catch (e) {
    console.error('[yoco-webhook] parse error:', (e as Error).message)
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 })
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
  }
  // Non-actionable event (e.g. payment.created) — ack and move on.
  if (!result.status || (result.status !== 'paid' && result.status !== 'failed')) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const applicationId = result.applicationId
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: 'missing applicationId in metadata' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: app } = await admin
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, admin_notes, special_requirements, preferred_booth_tier')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) {
    return NextResponse.json({ ok: false, error: 'application not found' }, { status: 404 })
  }

  const before = parsePortalState(app.admin_notes as string)
  const alreadyPaid = before.payment?.status === 'paid'

  if (result.status === 'failed') {
    await updatePortalState(applicationId, (s) => ({
      ...s,
      payment: {
        ...(s.payment || {}),
        status: alreadyPaid ? 'paid' : 'pending', // don't downgrade a paid row
        provider_ref: result.providerRef || s.payment?.provider_ref,
      },
    }))
    return NextResponse.json({ ok: true })
  }

  // status === 'paid'
  await updatePortalState(applicationId, (s) => ({
    ...s,
    payment: {
      ...(s.payment || {}),
      status: 'paid',
      amount: result.amount ?? s.payment?.amount,
      provider_ref: result.providerRef || s.payment?.provider_ref,
      paid_at: new Date().toISOString(),
    },
    stage: s.stage === 'show_ready' ? 'show_ready' : 'paid',
  }))

  // Idempotency guard: only send the confirmation email on the FIRST paid event.
  if (!alreadyPaid) {
    try {
      const pricing = computeVendorPricing({
        preferred_booth_tier: app.preferred_booth_tier as string,
        special_requirements: app.special_requirements,
      })
      await sendEmail({
        to: app.email as string,
        subject: `Payment confirmed — ${app.business_name} · YAH Festival 2026`,
        react: VendorPaymentConfirmation({
          contactName: (app.contact_name as string) || 'there',
          businessName: (app.business_name as string) || 'your business',
          amount: result.amount ?? pricing.total,
          providerRef: result.providerRef || '',
          invoiceUrl: `${SITE}/exhibitor/portal/invoice`,
          portalUrl: `${SITE}/exhibitor/login`,
        }),
        text: `Hi ${app.contact_name},\n\nWe've received your payment of ${formatRand(result.amount ?? pricing.total)} for ${app.business_name}. Reference: ${result.providerRef}. Your invoice is in your portal: ${SITE}/exhibitor/portal/invoice. Log in: ${SITE}/exhibitor/login.\n\nWelcome aboard.\nThe YAH Festival Team`,
      })
    } catch (e) {
      console.error('[yoco-webhook] confirmation email failed:', (e as Error).message)
      // Don't fail the webhook — the state is paid; we'll resend manually if needed.
    }
  }

  return NextResponse.json({ ok: true })
}
