// Unified inbox reply — send to a contact on WhatsApp or email from one box.
//
// WhatsApp: uses sendText, which runs the canSend consent/window gate. Free-form
// is allowed inside the vendor's 24h session window (they just messaged). If the
// window is closed, the gate returns skipped with a reason and we surface it —
// this is the Meta rule the old bot-inbox route enforced too bluntly.
// Email: sendEmail (Resend), mirrored into the Support Inbox thread.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendText, toE164 } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email/resend'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  channel: z.enum(['whatsapp', 'email']),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(160).optional(),
  text: z.string().min(1).max(4000),
  subject: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'invalid body', details: e.issues }, { status: 400 })
    throw e
  }

  if (body.channel === 'whatsapp') {
    if (!body.phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })
    const e164 = toE164(body.phone)
    const res = await sendText(e164, body.text)
    if (res.skipped) {
      return NextResponse.json({
        ok: false,
        channel: 'whatsapp',
        reason: res.skipped,
        message: res.skipped.includes('window')
          ? 'This contact is outside the 24h WhatsApp window, so a free-form reply is not allowed by Meta. They need to message first, or use an approved template.'
          : `Could not send: ${res.skipped}`,
      }, { status: 409 })
    }
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164.replace(/^\+/, ''),
      body: body.text,
      status: 'sent',
      provider_message_id: res.messageId || null,
    })
    return NextResponse.json({ ok: true, channel: 'whatsapp' })
  }

  // email
  if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const res = await sendEmail({
    to: body.email,
    subject: body.subject || 'Young at Heart Festival',
    text: body.text,
  })
  if (!res.ok) {
    return NextResponse.json({ ok: false, channel: 'email', reason: res.error, message: `Email failed: ${res.error}` }, { status: 502 })
  }
  // sendEmail already mirrors into the Support Inbox thread (support-mirror).
  return NextResponse.json({ ok: true, channel: 'email' })
}
