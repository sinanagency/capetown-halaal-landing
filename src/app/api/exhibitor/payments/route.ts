import { NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
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

// POST: start a card payment (returns Yoco redirect URL).
// EFT-by-bank-transfer was retired 2026-06-09; vendors who can't use the card
// flow are routed to the Support inbox and the organisers mark them paid by
// hand from /admin/vendor-ops Payments tab.
export async function POST() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const app = ctx.application
  const applicationId = app.id as string

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
      description: `Stall fee, ${app.business_name}, Young at Heart Festival 2026`,
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
