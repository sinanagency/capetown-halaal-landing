/**
 * Admin outbound reply on a unified-inbox thread.
 *
 * POST /api/admin/inbox/reply
 *   body: { thread_id: string, body: string, mark_done?: boolean, subject?: string }
 *
 * Side effects:
 *   - inserts an outbound row in wa_messages (channel='wa') or mail_messages (channel='mail')
 *   - updates wa_threads.last_handled_at = now
 *   - if mark_done, sets status = 'done'
 *
 * Does NOT clear the bot handover marker. That requires explicit Release-bot
 * via POST /api/admin/inbox/release.
 *
 * NOTE: this route lands the row only. The actual WhatsApp send + Resend
 * email send is delegated to the existing sender libs in Stream-A. A
 * "queued" row gets picked up by the sender daemon.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ReplyBody {
  thread_id: string
  body: string
  mark_done?: boolean
  subject?: string
}

async function requireAdmin(): Promise<{ userId: string; email: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_users')
    .select('id,email')
    .eq('id', user.id)
    .limit(1)
  if (!data || data.length === 0) return null
  return { userId: user.id, email: (data[0].email as string) ?? '' }
}

function makeMessageId(threadId: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `<${threadId}.${Date.now()}.${rand}@youngatheart.co.za>`
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: ReplyBody
  try {
    payload = (await req.json()) as ReplyBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { thread_id, body, mark_done, subject } = payload
  if (!thread_id || !body?.trim()) {
    return NextResponse.json({ error: 'thread_id and body required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Load thread
  const { data: threadRows, error: threadErr } = (await supabase
    .from('wa_threads')
    .select('id, thread_key, channel, status')
    .eq('id', thread_id)
    .limit(1)) as unknown as {
    data: Array<{
      id: string
      thread_key: string
      channel: 'wa' | 'mail'
      status: string
    }> | null
    error: { message: string } | null
  }

  if (threadErr || !threadRows || threadRows.length === 0) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 })
  }
  const thread = threadRows[0]

  const now = new Date().toISOString()

  // Land the outbound row using existing schema.
  // wa_messages (upstream): direction 'out', body, status, wa_phone, provider_message_id
  // mail_messages (Stream-B): direction 'outbound', message_id, from/to/subject/body
  try {
    if (thread.channel === 'wa') {
      const { error } = await supabase.from('wa_messages').insert({
        direction: 'out',
        wa_phone: thread.thread_key,
        body,
        status: 'queued',
        metadata: { thread_id: thread.id, sent_by: session.userId },
      })
      if (error) {
        return NextResponse.json(
          { error: `wa insert: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      const { error } = await supabase.from('mail_messages').insert({
        thread_id: thread.id,
        message_id: makeMessageId(thread.id),
        from_address: 'support@youngatheart.co.za',
        from_name: 'Young at Heart Festival',
        to_address: thread.thread_key,
        subject: subject || 'Re: your message',
        body,
        direction: 'outbound',
        sent_by: session.userId,
        received_at: now,
        delivery_status: 'queued',
      })
      if (error) {
        return NextResponse.json(
          { error: `mail insert: ${error.message}` },
          { status: 500 }
        )
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: `insert: ${(e as Error).message}` },
      { status: 500 }
    )
  }

  // Update thread bookkeeping
  const update: Record<string, unknown> = {
    last_handled_at: now,
    updated_at: now,
  }
  if (mark_done) update.status = 'done'

  const { error: upErr } = await supabase
    .from('wa_threads')
    .update(update)
    .eq('id', thread.id)

  if (upErr) {
    return NextResponse.json(
      { error: `thread update: ${upErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    thread_id: thread.id,
    handled_at: now,
    status: mark_done ? 'done' : thread.status,
  })
}
