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
import { sendTemplate, toE164 } from '@/lib/whatsapp'

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
    .select('id, business_name, contact_name, email, phone, wa_phone, admin_notes, special_requirements, preferred_booth_tier')
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

  // Idempotency guard: only send confirmations on the FIRST paid event.
  if (!alreadyPaid) {
    const pricing = computeVendorPricing({
      preferred_booth_tier: app.preferred_booth_tier as string,
      special_requirements: app.special_requirements,
    })
    const amount = result.amount ?? pricing.total
    const contactName = (app.contact_name as string) || 'there'
    const firstName = contactName.trim().split(/\s+/)[0] || contactName
    const businessName = (app.business_name as string) || 'your business'
    const providerRef = result.providerRef || ''

    // (1) EMAIL via Resend (DKIM-signed → inbox).
    try {
      await sendEmail({
        to: app.email as string,
        subject: `Payment confirmed — ${businessName} · YAH Festival 2026`,
        react: VendorPaymentConfirmation({
          contactName,
          businessName,
          amount,
          providerRef,
          invoiceUrl: `${SITE}/exhibitor/portal/invoice`,
          portalUrl: `${SITE}/exhibitor/login`,
        }),
        text: `Hi ${contactName},\n\nWe've received your payment of ${formatRand(amount)} for ${businessName}. Reference: ${providerRef}. Your invoice is in your portal: ${SITE}/exhibitor/portal/invoice. Log in: ${SITE}/exhibitor/login.\n\nWelcome aboard.\nThe YAH Festival Team`,
      })
    } catch (e) {
      console.error('[yoco-webhook] confirmation email failed:', (e as Error).message)
    }

    // Notify the festival owner (Samreen) in real time.
    try {
      const { notifyOwners } = await import('@/lib/bot/notify')
      await notifyOwners({
        event: 'payment_succeeded',
        body: `${businessName} just paid ${formatRand(amount)} via Yoco. Ref ${providerRef}.`,
        audience: 'all',
      })
    } catch (notifyError) {
      console.error('[yoco-webhook] notify owner failed:', notifyError)
    }

    // (2) WHATSAPP via approved `vendor_payment_confirmation` template.
    // Slot mapping: {{1}} = first name, {{2}} = amount, {{3}} = stall label.
    const waPhone = (app.wa_phone as string) || (app.phone as string) || ''
    if (waPhone) {
      try {
        const res = await sendTemplate(
          toE164(waPhone),
          'vendor_payment_confirmation',
          [firstName, formatRand(amount), pricing.stallLabel],
          { category: 'utility' }
        )
        await admin.from('wa_messages').insert({
          direction: 'out',
          wa_phone: toE164(waPhone),
          body: `[vendor_payment_confirmation] Payment received, ${firstName}! Amount: ${formatRand(amount)} · Stall: ${pricing.stallLabel}`,
          status: res.skipped ? 'failed' : 'sent',
          provider_message_id: res.messageId || null,
          error: res.skipped || null,
        })
      } catch (e) {
        console.error('[yoco-webhook] confirmation whatsapp failed:', (e as Error).message)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
