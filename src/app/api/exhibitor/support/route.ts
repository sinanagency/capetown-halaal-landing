import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { updatePortalState, parsePortalState, type SupportMessage } from '@/lib/portal-state'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  checkIpThrottle,
  logGuardEvent,
  clientIp,
} from '@/lib/security/abuse-guard'

const ENDPOINT = 'exhibitor-support'
// Hard cap to keep admin_notes JSON from unbounded growth if a vendor script
// somehow squeezes past the rate limit. Older messages truncate first.
const MAX_SUPPORT_MESSAGES = 200
// Per-vendor (NOT per-IP) ceiling: 10 messages / hour. A vendor running 5000
// posts would flood Samreen's WA + Resend reputation; this stops it dead.
const MAX_PER_HOUR = 10
const WINDOW_MIN = 60

// GET: the signed-in vendor's support thread.
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const state = parsePortalState(ctx.application.admin_notes as string)
  return NextResponse.json({ messages: state.support || [] })
}

// POST: vendor sends a message.
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const applicationId = ctx.application.id as string
  const body = await req.json().catch(() => ({}))
  const text = String(body.body || '').trim().slice(0, 2000)
  if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 })

  // Per-vendor throttle keyed on user.id so a single vendor cannot weaponise
  // the support thread. checkIpThrottle is a general "key throttle" against
  // site_events — passing user.id as the "ip" field keys it on the vendor.
  const admin = createAdminClient()
  const ip = clientIp(req.headers)
  const vendorKey = ctx.userId
  const throttle = await checkIpThrottle(admin, {
    ip: vendorKey,
    endpoint: ENDPOINT,
    max: MAX_PER_HOUR,
    windowMin: WINDOW_MIN,
  })
  if (!throttle.ok) {
    await logGuardEvent(admin, {
      endpoint: ENDPOINT,
      ip: vendorKey,
      reason: throttle.reason!,
      fields: { applicationId, real_ip: ip ?? null },
    })
    return NextResponse.json(
      { error: 'Too many support messages, slow down and try again later' },
      { status: 429 },
    )
  }
  // Log the hit so the throttle counter increments for THIS message too.
  await logGuardEvent(admin, {
    endpoint: ENDPOINT,
    ip: vendorKey,
    reason: 'rate_limited',
    fields: { applicationId, real_ip: ip ?? null, kind: 'send' },
  })

  const msg: SupportMessage = { id: `${Date.now()}`, from: 'vendor', body: text, at: new Date().toISOString() }
  const next = await updatePortalState(applicationId, (s) => {
    const existing = s.support || []
    const appended = [...existing, msg]
    // Truncate oldest first if the thread overflows the cap.
    const trimmed = appended.length > MAX_SUPPORT_MESSAGES
      ? appended.slice(appended.length - MAX_SUPPORT_MESSAGES)
      : appended
    return { ...s, support: trimmed }
  })

  // Best-effort owner notifications. Failure here never blocks the vendor's send.
  const bizName = ctx.application.business_name as string
  const contact = (ctx.application.contact_name as string) || ''
  const email = (ctx.application.email as string) || ''
  const phone = (ctx.application.phone as string) || ''

  try {
    const { notifyOwners } = await import('@/lib/bot/notify')
    await notifyOwners({
      event: 'vendor_support_message',
      body: `${bizName} (${contact || email}): ${text.slice(0, 240)}`,
      audience: 'all',
    })
  } catch (e) {
    console.error('[exhibitor/support] notifyOwners failed:', (e as Error).message)
  }

  try {
    const { sendEmail } = await import('@/lib/email/resend')
    await sendEmail({
      to: 'support@youngatheart.co.za',
      subject: `Support message from ${bizName}, YAH 2026`,
      text: `${bizName}\n${contact}\n${email}${phone ? `, ${phone}` : ''}\n\nsent via the exhibitor portal:\n\n${text}\n\nReply in /admin/support.`,
    })
  } catch (e) {
    console.error('[exhibitor/support] email failed:', (e as Error).message)
  }

  return NextResponse.json({ success: true, messages: next.support })
}
