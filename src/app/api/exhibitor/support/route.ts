import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { updatePortalState, parsePortalState, type SupportMessage } from '@/lib/portal-state'

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

  const msg: SupportMessage = { id: `${Date.now()}`, from: 'vendor', body: text, at: new Date().toISOString() }
  const next = await updatePortalState(applicationId, (s) => ({ ...s, support: [...(s.support || []), msg] }))

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
