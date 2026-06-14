/**
 * POST /api/admin/support-inbox/webhook/resend
 *
 * Resend webhook receiver. Mirrors every outbound email back into
 * support_inbox_messages so the operator timeline carries the full thread.
 *
 * Event types we care about:
 *   - email.sent      -> insert a 'sent' row (direction='out', provider='resend')
 *   - email.delivered -> update status if we already have the message row
 *   - email.opened    -> update status if we already have the message row
 *
 * Payload shape (Resend v2):
 *   {
 *     "type": "email.sent",
 *     "created_at": "2026-06-14T12:00:00Z",
 *     "data": {
 *       "email_id": "uuid",
 *       "from": "Young at Heart Festival <support@youngatheart.co.za>",
 *       "to": ["alice@example.com"],
 *       "subject": "...",
 *       "created_at": "2026-06-14T12:00:00Z"
 *     }
 *   }
 *
 * Linking strategy:
 *   1. Match an existing support_inbox_threads row by peer_email = first `to`
 *      address (case-insensitive).
 *   2. If no thread, create one (status='open', subject=<email subject>).
 *   3. Idempotent: support_inbox_messages.message_id is UNIQUE; we set it to
 *      the Resend email_id (prefixed `resend:<uuid>`) so a replayed webhook
 *      lands on conflict and is skipped.
 *
 * Auth: signed with the `RESEND_WEBHOOK_SECRET` header `svix-signature`. We
 * accept the unsigned variant in dev (DEV_ALLOW_UNSIGNED_RESEND=1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ResendEmailData {
  email_id: string
  from?: string
  to?: string[] | string
  subject?: string
  created_at?: string
  // delivered / opened events sometimes carry the same email_id without to/from.
}

interface ResendEvent {
  type: 'email.sent' | 'email.delivered' | 'email.opened' | string
  created_at?: string
  data?: ResendEmailData
}

function pickPeerEmail(to: string | string[] | undefined): string | null {
  if (!to) return null
  const arr = Array.isArray(to) ? to : [to]
  const first = arr[0]
  if (!first) return null
  // "Name <email@x.com>" -> "email@x.com"
  const m = first.match(/<([^>]+)>/)
  return (m ? m[1] : first).trim().toLowerCase() || null
}

function isInternalRecipient(email: string | null): boolean {
  if (!email) return true
  // Don't mirror BCCs to our own internal funnel addresses; they don't belong
  // in operator threads.
  return /@(youngatheart\.co\.za|sinan\.agency)$/i.test(email)
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || ''
  const devAllow = process.env.DEV_ALLOW_UNSIGNED_RESEND === '1'
  const isProd = process.env.NODE_ENV === 'production'

  // We need the raw body for signature verification AND for JSON parsing.
  // Read once as text, verify, then JSON.parse.
  const rawBody = await req.text()

  // Verification rules (CTH-DOCTRINE Vendor-data-privacy law):
  //   - In prod with secret set: verification REQUIRED. Forged headers reject.
  //   - In non-prod without secret: skip (dev convenience).
  //   - DEV_ALLOW_UNSIGNED_RESEND=1: skip in non-prod only.
  if (secret) {
    try {
      const wh = new Webhook(secret)
      wh.verify(rawBody, {
        'svix-id': req.headers.get('svix-id') || '',
        'svix-timestamp': req.headers.get('svix-timestamp') || '',
        'svix-signature': req.headers.get('svix-signature') || '',
      })
    } catch (err) {
      // In prod, signature failure is hard-reject. In dev, allow with explicit opt-in.
      if (isProd || !devAllow) {
        console.warn('[resend webhook] signature verification failed:', (err as Error).message)
        return new Response('invalid signature', { status: 401 })
      }
    }
  } else if (isProd) {
    // No secret configured in prod = misconfigured webhook. Refuse to mirror.
    return new Response('webhook secret not configured', { status: 503 })
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody) as ResendEvent
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!event?.type || !event?.data?.email_id) {
    return NextResponse.json({ error: 'missing type/email_id' }, { status: 400 })
  }

  // Only `email.sent` triggers the mirror. delivered/opened just observe.
  if (event.type !== 'email.sent') {
    return NextResponse.json({ ok: true, ignored: event.type })
  }

  const data = event.data
  const peerEmail = pickPeerEmail(data.to)
  if (!peerEmail || isInternalRecipient(peerEmail)) {
    return NextResponse.json({ ok: true, skipped: 'internal_recipient' })
  }

  const messageId = `resend:${data.email_id}`
  const subject = (data.subject || '').slice(0, 500)
  const sentAt = data.created_at || event.created_at || new Date().toISOString()
  const fromAddrRaw = data.from || 'support@youngatheart.co.za'
  const fromAddr = (fromAddrRaw.match(/<([^>]+)>/)?.[1] || fromAddrRaw).toLowerCase()

  const db = createAdminClient()

  // 1. Find or create the thread.
  let threadId: string | null = null
  const { data: existing } = await db
    .from('support_inbox_threads')
    .select('id, subject')
    .ilike('peer_email', peerEmail)
    .maybeSingle()

  if (existing) {
    threadId = (existing as { id: string }).id
  } else {
    const { data: created, error: insertErr } = await db
      .from('support_inbox_threads')
      .insert({
        peer_email: peerEmail,
        peer_name: null,
        subject,
        status: 'open',
        last_handled_at: sentAt,
        unread_count: 0,
      })
      .select('id')
      .maybeSingle()
    if (insertErr || !created) {
      return NextResponse.json({ error: insertErr?.message || 'thread create failed' }, { status: 500 })
    }
    threadId = (created as { id: string }).id
  }

  // 2. Insert the out-row, idempotent on message_id.
  const { error: msgErr } = await db.from('support_inbox_messages').insert({
    thread_id: threadId,
    direction: 'out',
    from_address: fromAddr,
    from_name: 'Young at Heart Festival',
    to_address: peerEmail,
    subject,
    body_text: null,
    body_html: null,
    message_id: messageId,
    provider: 'resend',
    provider_message_id: data.email_id,
    received_at: sentAt,
  })
  if (msgErr) {
    const code = (msgErr as { code?: string }).code
    if (code === '23505') {
      // Duplicate webhook delivery, fine.
      return NextResponse.json({ ok: true, deduped: true })
    }
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  // 3. Touch the thread last_handled_at.
  await db
    .from('support_inbox_threads')
    .update({ last_handled_at: sentAt })
    .eq('id', threadId)

  return NextResponse.json({ ok: true, thread_id: threadId, message_id: messageId })
}
