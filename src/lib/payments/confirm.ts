// Single source of truth for marking a vendor payment as paid. Used by both
// the Yoco webhook (when the gateway confirms) and the admin "mark as paid"
// action (when an organiser reconciles an EFT/cash payment manually).
//
// Idempotent: re-running with the same applicationId is a no-op for emails
// and template messages (it never sends twice).

import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState, updatePortalState } from '@/lib/portal-state'
import { sendEmail } from '@/lib/email/resend'
import { VendorPaymentConfirmation } from '@/lib/email/templates/VendorPaymentConfirmation'
import { computeVendorPricing, formatRand } from '@/lib/payments/pricing'
import { sendTemplate, toE164 } from '@/lib/whatsapp'

const SITE = 'https://cthalaal.co.za'

export type PaymentMethod = 'yoco' | 'eft' | 'cash' | 'manual_card' | 'waived'

export interface ConfirmPaymentInput {
  applicationId: string
  method: PaymentMethod
  amount?: number          // optional override; falls back to pricing.total
  providerRef?: string     // gateway txn id, EFT slip reference, "cash @ door", etc
  notes?: string           // admin-only note appended to admin_notes (not state)
  /** When true, skip outbound email + WhatsApp (useful for backfill / corrections). */
  silent?: boolean
}

export interface ConfirmPaymentResult {
  ok: boolean
  alreadyPaid: boolean
  amount: number
  error?: string
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  const admin = createAdminClient()
  const { data: app } = await admin
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, phone, wa_phone, admin_notes, special_requirements, preferred_booth_tier')
    .eq('id', input.applicationId)
    .maybeSingle()

  if (!app) return { ok: false, alreadyPaid: false, amount: 0, error: 'application not found' }

  const before = parsePortalState(app.admin_notes as string)
  const alreadyPaid = before.payment?.status === 'paid'

  const pricing = computeVendorPricing({
    preferred_booth_tier: app.preferred_booth_tier as string,
    special_requirements: app.special_requirements,
  })
  const amount = input.amount ?? before.payment?.amount ?? pricing.total

  await updatePortalState(input.applicationId, (s) => ({
    ...s,
    payment: {
      ...(s.payment || {}),
      status: 'paid',
      amount,
      provider_ref: input.providerRef || s.payment?.provider_ref,
      paid_at: s.payment?.paid_at || new Date().toISOString(),
    },
    stage: s.stage === 'show_ready' ? 'show_ready' : 'paid',
  }))

  if (alreadyPaid || input.silent) {
    return { ok: true, alreadyPaid, amount }
  }

  const contactName = (app.contact_name as string) || 'there'
  const firstName = contactName.trim().split(/\s+/)[0] || contactName
  const businessName = (app.business_name as string) || 'your business'
  const providerRef = input.providerRef || ''

  try {
    await sendEmail({
      to: app.email as string,
      subject: `Payment confirmed, ${businessName}, YAH Festival 2026`,
      react: VendorPaymentConfirmation({
        contactName,
        businessName,
        amount,
        providerRef,
        invoiceUrl: `${SITE}/exhibitor/portal/invoice`,
        portalUrl: `${SITE}/exhibitor/login`,
      }),
      text: `Hi ${contactName},\n\nWe've received your payment of ${formatRand(amount)} for ${businessName}. Reference: ${providerRef || input.method}. Your invoice is in your portal: ${SITE}/exhibitor/portal/invoice. Log in: ${SITE}/exhibitor/login.\n\nWelcome aboard.\nThe YAH Festival Team`,
    })
  } catch (e) {
    console.error('[confirmPayment] email failed:', (e as Error).message)
  }

  try {
    const { notifyOwners } = await import('@/lib/bot/notify')
    await notifyOwners({
      event: 'payment_succeeded',
      body: `${businessName} marked paid via ${input.method}. Amount ${formatRand(amount)}${providerRef ? `, ref ${providerRef}` : ''}.`,
      audience: 'all',
    })
  } catch (e) {
    console.error('[confirmPayment] notify owners failed:', (e as Error).message)
  }

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
        body: `[vendor_payment_confirmation] Payment received, ${firstName}. Amount: ${formatRand(amount)}, Stall: ${pricing.stallLabel}`,
        status: res.skipped ? 'failed' : 'sent',
        provider_message_id: res.messageId || null,
        error: res.skipped || null,
      })
    } catch (e) {
      console.error('[confirmPayment] whatsapp failed:', (e as Error).message)
    }
  }

  return { ok: true, alreadyPaid: false, amount }
}
