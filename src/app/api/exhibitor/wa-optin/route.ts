// Vendor WhatsApp opt-in from the exhibitor portal banner.
//
// Captures consent (per wa-consent.ts source-of-truth), persists the chosen WA
// number on the application's portal-state marker (no DDL), and fires an
// approved welcome template so the vendor immediately gets a real message in
// their inbox — that's their "did it actually work?" feedback.
//
// Only logged-in approved exhibitors can opt in for themselves.

import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState } from '@/lib/portal-state'
import { recordConsent } from '@/lib/wa-consent'
import { sendTemplate, toE164 } from '@/lib/whatsapp'
import { tierLabel } from '@/lib/stalls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rawPhone = String(body.phone || '').trim()
  if (!rawPhone) return NextResponse.json({ ok: false, error: 'Phone is required.' }, { status: 400 })

  const e164 = toE164(rawPhone)
  if (!/^\+\d{8,15}$/.test(e164)) {
    return NextResponse.json({ ok: false, error: 'Not a valid WhatsApp number.' }, { status: 400 })
  }

  const app = ctx.application
  const applicationId = app.id as string
  const contactName = (app.contact_name as string) || ctx.email
  const firstName = contactName.trim().split(/\s+/)[0] || contactName
  const tier = (app.preferred_booth_tier as string) || ''
  const stallLabel = tier ? tierLabel(tier) : 'your stall'

  // 1) Mark portal-state as opted-in so the banner disappears for them.
  await updatePortalState(applicationId, (s) => ({
    ...s,
    wa: {
      phone: e164,
      opted_in_at: new Date().toISOString(),
      welcome_sent: false, // updated below after send
    },
  }))

  // 2) Source-of-truth consent in wa_contacts. This is the table the consent
  // gate (canSend) reads, so future marketing templates are NOT blocked.
  try {
    await recordConsent({
      waPhone: e164,
      source: 'vendor_form',
      profileName: contactName,
    })
  } catch (e) {
    console.error('[wa-optin] recordConsent failed:', (e as Error).message)
  }

  // 3) Update vendor_applications.phone to the opted-in WA number. The
  // identity resolver + the Yoco webhook both read .phone for outbound sends,
  // so making this match the WA number means every future template/notification
  // reaches the right device. The "original" phone (if different) is preserved
  // implicitly in the application's audit history.
  try {
    const admin = createAdminClient()
    await admin.from('vendor_applications').update({ phone: e164 }).eq('id', applicationId)
  } catch (e) {
    console.error('[wa-optin] sync phone failed:', (e as Error).message)
  }

  // 4) Immediate welcome via the approved vendor_application_approved template.
  //    Body slots: {{1}} = first name, {{2}} = stall label.
  //    Why this template: their action ("I want updates") is most-similarly
  //    framed as "you're approved + we'll be in touch", and it's already
  //    approved on Meta. Outside the 24h window so we MUST use a template.
  let welcomeSent = false
  try {
    const res = await sendTemplate(
      e164,
      'vendor_application_approved',
      [firstName, stallLabel],
      { category: 'utility' }
    )
    welcomeSent = !res.skipped
    const db = createAdminClient()
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164,
      body: `[vendor_application_approved] Welcome WA for ${contactName}, stall: ${stallLabel}`,
      status: res.skipped ? 'failed' : 'sent',
      provider_message_id: res.messageId || null,
      error: res.skipped || null,
    })
  } catch (e) {
    console.error('[wa-optin] welcome send failed:', (e as Error).message)
  }

  // Mark welcome sent so we don't re-fire on subsequent opt-in clicks.
  if (welcomeSent) {
    await updatePortalState(applicationId, (s) => ({
      ...s,
      wa: { ...(s.wa as NonNullable<typeof s.wa>), welcome_sent: true },
    }))
  }

  // 5) Owners get a notification — duplicate to Taona per his rule.
  try {
    const { notifyOwners } = await import('@/lib/bot/notify')
    await notifyOwners({
      event: 'system_alert',
      body: `WA opt-in: ${contactName} (${app.business_name}) subscribed at ${e164}.`,
      audience: 'all',
    })
  } catch (e) {
    console.error('[wa-optin] notify owners failed:', (e as Error).message)
  }

  return NextResponse.json({ ok: true, welcomeSent, e164 })
}
