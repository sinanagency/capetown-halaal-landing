// Admin-only resend of the vendor payment confirmation + invoice link.
// Reuses the same VendorPaymentConfirmation email template the original
// confirmation used (whether Yoco webhook or manual mark-paid fired it) and
// re-sends in real time. Does NOT mutate payment state. Vendor must already
// be marked paid — otherwise we have nothing to confirm.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState } from '@/lib/portal-state'
import { sendVendorPaymentEmail } from '@/lib/payments/confirm'
import { computeVendorPricing } from '@/lib/payments/pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminUser) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const applicationId = String(body.applicationId || '').trim()
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 })
  }

  const { data: app } = await db
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, admin_notes, preferred_booth_tier, special_requirements')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app) return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
  if (!app.email) return NextResponse.json({ ok: false, error: 'Vendor has no email on file' }, { status: 400 })

  const state = parsePortalState(app.admin_notes as string)
  if (state.payment?.status !== 'paid') {
    return NextResponse.json(
      { ok: false, error: 'Vendor is not marked paid yet. Confirm the payment first, then resend.' },
      { status: 409 }
    )
  }

  const pricing = computeVendorPricing({
    preferred_booth_tier: app.preferred_booth_tier as string,
    special_requirements: app.special_requirements,
  })
  const amount = state.payment.amount ?? pricing.total
  const providerRef = state.payment.provider_ref || state.payment.reference || 'manual'
  const contactName = (app.contact_name as string) || 'there'
  const businessName = (app.business_name as string) || 'your business'

  const result = await sendVendorPaymentEmail({
    to: app.email as string,
    contactName,
    businessName,
    amount,
    providerRef,
  })
  if (!result.sent) {
    return NextResponse.json({ ok: false, error: result.error || 'Email send failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, to: app.email, amount, providerRef })
}
