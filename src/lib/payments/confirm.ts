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

/**
 * Send (or re-send) the vendor payment confirmation email using the same
 * template + invoice link the original confirmation used. Called by
 * confirmPayment() on first success and by /api/admin/payments/resend-invoice
 * when an organiser triggers a resend. Returns { sent } so callers can show a
 * truthful real-time toast.
 */
export async function sendVendorPaymentEmail(args: {
  to: string
  contactName: string
  businessName: string
  amount: number
  providerRef: string
  reference?: string
  paidDate?: string
  pricing?: import('@/lib/payments/pricing').VendorPricing
}): Promise<{ sent: boolean; error?: string }> {
  // No PDF attachment by design. Invoice PDFs from a first-touch sender are the
  // dominant Gmail/Outlook spam signal (phishing pattern). The full itemised
  // receipt is rendered inline in the email body and the printable copy lives
  // behind auth at /exhibitor/portal/invoice. See knowledge-tree node on
  // attachment-vs-link deliverability.
  try {
    const invoiceUrl = `${SITE}/exhibitor/portal/invoice`
    const portalUrl = `${SITE}/exhibitor/login`
    await sendEmail({
      to: args.to,
      subject: `Payment confirmed, ${args.businessName}, Young at Heart Festival 2026`,
      react: VendorPaymentConfirmation({
        contactName: args.contactName,
        businessName: args.businessName,
        amount: args.amount,
        providerRef: args.providerRef,
        reference: args.reference,
        paidDate: args.paidDate,
        pricing: args.pricing,
        invoiceUrl,
        portalUrl,
      }),
      text: [
        `Hi ${args.contactName},`,
        '',
        `We've received your payment of ${formatRand(args.amount)} for ${args.businessName}. Your trading spot at Young at Heart Festival 2026 is confirmed.`,
        '',
        `Reference: ${args.providerRef || 'manual'}`,
        `Paid: ${args.paidDate || 'today'}`,
        '',
        `View and download your printable invoice from your portal:`,
        invoiceUrl,
        '',
        `Log in here:`,
        portalUrl,
        '',
        `Welcome to the family.`,
        `The Young at Heart Festival Team`,
      ].join('\n'),
    })
    return { sent: true }
  } catch (e) {
    const msg = (e as Error).message
    console.error('[sendVendorPaymentEmail] failed:', msg)
    return { sent: false, error: msg }
  }
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  const admin = createAdminClient()
  const { data: app, error: appErr } = await admin
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, phone, admin_notes, special_requirements, preferred_booth_tier')
    .eq('id', input.applicationId)
    .maybeSingle()

  if (appErr) {
    console.error('[confirmPayment] lookup failed:', appErr.message)
    return { ok: false, alreadyPaid: false, amount: 0, error: `lookup: ${appErr.message}` }
  }
  if (!app) return { ok: false, alreadyPaid: false, amount: 0, error: 'application not found' }

  const before = parsePortalState(app.admin_notes as string)
  const alreadyPaid = before.payment?.status === 'paid'

  const pricing = computeVendorPricing({
    preferred_booth_tier: app.preferred_booth_tier as string,
    special_requirements: app.special_requirements,
  })
  const amount = input.amount ?? before.payment?.amount ?? pricing.total

  const paidAtIso = new Date().toISOString()
  await updatePortalState(input.applicationId, (s) => ({
    ...s,
    payment: {
      ...(s.payment || {}),
      status: 'paid',
      amount,
      provider_ref: input.providerRef || s.payment?.provider_ref,
      paid_at: s.payment?.paid_at || paidAtIso,
    },
    stage: s.stage === 'show_ready' ? 'show_ready' : 'paid',
  }))

  // Broken-wire fix: mirror the portal-state payment to the top-level
  // vendor_applications columns the admin queue + CSV export + segments read
  // from. Without this, those surfaces lie about who's paid because they read
  // the columns, not the base64 marker on admin_notes.
  // Idempotent: only writes when paid_at IS NULL (first transition into paid).
  // payment_status is also flipped to 'paid' or 'waived' to match the method.
  const targetPaymentStatus: 'paid' | 'waived' =
    input.method === 'waived' ? 'waived' : 'paid'
  const { error: colErr } = await admin
    .from('vendor_applications')
    .update({
      paid_at: paidAtIso,
      payment_status: targetPaymentStatus,
    })
    .eq('id', input.applicationId)
    .is('paid_at', null)
  if (colErr) {
    console.error('[confirmPayment] column mirror failed:', colErr.message)
  }

  if (alreadyPaid || input.silent) {
    return { ok: true, alreadyPaid, amount }
  }

  const contactName = (app.contact_name as string) || 'there'
  const firstName = contactName.trim().split(/\s+/)[0] || contactName
  const businessName = (app.business_name as string) || 'your business'
  const providerRef = input.providerRef || ''

  const paidIso = new Date().toISOString()
  const paidDate = new Date(paidIso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  await sendVendorPaymentEmail({
    to: app.email as string,
    contactName,
    businessName,
    amount,
    providerRef: providerRef || input.method,
    reference: before.payment?.reference || input.applicationId.slice(0, 8).toUpperCase(),
    paidDate,
    pricing,
  })

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

  const waPhone = (before.wa?.phone as string) || (app.phone as string) || ''
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
