import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState } from '@/lib/portal-state'
import { activeProvider } from '@/lib/payments'

// FNB return handler (PULL model). FNB redirects the buyer's browser here after
// the card form + 3D Secure, with the txnToken in the query string. We do NOT
// trust the redirect alone — we call validateTransaction server-side to confirm,
// then mark the vendor's stall fee paid (idempotent) and bounce the browser to
// the portal. Register this URL with FNB during onboarding:
//   https://cthalaal.co.za/api/payments/fnb/return
const PORTAL = '/exhibitor/portal/payments'

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const fail = (q: string) => NextResponse.redirect(`${origin}${PORTAL}?${q}`)

  const provider = activeProvider()
  if (!provider.verifyReturn) {
    console.error('[fnb return] active provider has no verifyReturn')
    return fail('cancelled=1')
  }

  let result
  try {
    result = await provider.verifyReturn(req)
  } catch (e) {
    console.error('[fnb return] verify threw:', (e as Error).message)
    return fail('cancelled=1')
  }
  if (!result.ok) {
    console.error('[fnb return] not ok:', result.error)
    return fail('cancelled=1')
  }

  // Resolve the vendor from the echoed merchant reference (our YAH-xxxx code).
  let applicationId: string | undefined
  if (result.reference) {
    const admin = createAdminClient()
    const { data } = await admin.from('vendor_applications').select('id, admin_notes')
    for (const a of data || []) {
      if ((a.admin_notes as string)?.includes(result.reference)) { applicationId = a.id as string; break }
    }
  }
  if (!applicationId) {
    console.error('[fnb return] could not resolve application for', result.reference)
    return fail('cancelled=1')
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
        provider_ref: result.providerRef || s.payment?.provider_ref,
      },
    }))
    console.log(`[fnb return] marked ${applicationId} PAID (${result.reference})`)
    return NextResponse.redirect(`${origin}${PORTAL}?paid=1`)
  }

  console.log(`[fnb return] payment not approved for ${applicationId} (${result.reference})`)
  return fail('cancelled=1')
}
