import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendText, toE164 } from '@/lib/whatsapp'
import { isAdmin } from '@/lib/bot/admins'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Auth: must be a logged-in admin_users row.
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
  const to = String(body.to || '').trim()
  const text = String(body.body || '').trim()
  if (!to || !text) return NextResponse.json({ ok: false, error: 'Missing to/body' }, { status: 400 })

  // Only allow replies to known admins from this endpoint (this is the inbox,
  // not a free outbound channel).
  const e164 = toE164(to)
  if (!isAdmin(e164)) {
    return NextResponse.json({ ok: false, error: 'Recipient is not a registered bot admin' }, { status: 400 })
  }

  try {
    const res = await sendText(e164, text)
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164,
      body: text,
      status: res.skipped ? 'failed' : 'sent',
      provider_message_id: res.messageId || null,
      error: res.skipped || null,
    })
    if (res.skipped) {
      return NextResponse.json({ ok: false, error: 'Send blocked: ' + res.skipped }, { status: 422 })
    }
    return NextResponse.json({ ok: true, messageId: res.messageId })
  } catch (e) {
    const msg = (e as Error).message
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164,
      body: text,
      status: 'failed',
      error: msg,
    })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
