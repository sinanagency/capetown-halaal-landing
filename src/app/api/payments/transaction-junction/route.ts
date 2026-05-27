import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState } from '@/lib/portal-state'
import { activeProvider } from '@/lib/payments'

// Webhook/callback endpoint for Transaction Junction.
// Give this URL to TJ during onboarding: https://cthalaal.co.za/api/payments/transaction-junction
// On a successful payment it marks the vendor's stall fee paid (idempotent).
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  let result
  try {
    result = await activeProvider().parseWebhook(req, rawBody)
  } catch (e) {
    console.error('[payments webhook] parse threw:', (e as Error).message)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!result.ok) {
    console.error('[payments webhook] rejected:', result.error)
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  // Resolve the vendor. Prefer the echoed merchant reference (applicationId).
  let applicationId = result.applicationId
  if (!applicationId && result.reference) {
    // fallback: find by stored payment.reference
    const admin = createAdminClient()
    const { data } = await admin.from('vendor_applications').select('id, admin_notes')
    for (const a of data || []) {
      if ((a.admin_notes as string)?.includes(result.reference)) { applicationId = a.id as string; break }
    }
  }
  if (!applicationId) {
    console.error('[payments webhook] could not resolve application for', result.reference)
    return NextResponse.json({ ok: true, note: 'unresolved' }) // 200 so TJ stops retrying noise
  }

  if (result.status === 'paid') {
    await updatePortalState(applicationId, (s) => ({
      ...s,
      stage: 'paid',
      payment: {
        ...(s.payment || {}),
        status: 'paid',
        paid_at: new Date().toISOString(),
        reference: result.reference || s.payment?.reference,
      },
    }))
    console.log(`[payments webhook] marked ${applicationId} PAID (${result.reference})`)
  } else if (result.status === 'failed') {
    console.log(`[payments webhook] payment failed for ${applicationId} (${result.reference})`)
  }

  return NextResponse.json({ ok: true })
}
