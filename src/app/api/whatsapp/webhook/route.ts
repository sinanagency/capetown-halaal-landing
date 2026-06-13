import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhook,
  verifySignature,
  parseInbound,
  parseStatuses,
  sendText,
  toE164,
} from '@/lib/whatsapp'
import {
  recordOptOut,
  recordConsent,
  touchInbound,
  isStopKeyword,
  isStartKeyword,
} from '@/lib/wa-consent'
import { askFestivalBrain } from '@/lib/festival-brain'
import { detectHumanIntent, escalateToHuman, isInHandover } from '@/lib/bot/handover'
import { notifyOwners } from '@/lib/bot/notify'
import { createAdminClient } from '@/lib/supabase/admin'
import { findAdmin } from '@/lib/bot/admins'
import { resolveIdentity, identityBriefing } from '@/lib/bot/identity'
import { handleAdminMessage } from '@/lib/bot/admin-chat'
import { isMaintenanceEnabled } from '@/lib/maintenance'
import { guardReply, logGuardRedaction } from '@/lib/bot/reply-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- GET: Meta verification handshake ----
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const challenge = verifyWebhook(p.get('hub.mode'), p.get('hub.verify_token'), p.get('hub.challenge'))
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return new NextResponse('Forbidden', { status: 403 })
}

// ---- POST: inbound messages + delivery statuses ----
export async function POST(req: NextRequest) {
  // Read the RAW body for signature verification (must match byte-for-byte).
  const raw = await req.text()
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return new NextResponse('Bad JSON', { status: 400 })
  }

  // Log delivery statuses (fire and forget) — never blocks the 200.
  try {
    await logStatuses(parseStatuses(body))
  } catch (e) {
    console.error('wa status log error', e)
  }

  const inbound = parseInbound(body)
  for (const msg of inbound) {
    try {
      await handleInbound(msg)
    } catch (e) {
      console.error('wa inbound handler error', e)
    }
  }

  // Always 200 fast so Meta doesn't retry/penalize.
  return NextResponse.json({ ok: true })
}

async function handleInbound(msg: {
  from: string
  messageId: string
  type: string
  text: string
  name?: string
}) {
  const e164 = toE164(msg.from)

  // Dedup: Meta retries webhooks. Skip if we've already stored this message id.
  if (await alreadySeen(msg.messageId)) return
  await logMessage({ direction: 'in', wa_phone: e164, body: msg.text, status: 'received', providerMessageId: msg.messageId })

  // 1) STOP — hard opt-out, confirm once, then go silent.
  if (isStopKeyword(msg.text)) {
    await recordOptOut({ waPhone: e164, source: 'inbound' })
    // Confirmation is allowed: it's a direct reply to their inbound (service window).
    // recordOptOut set opted_out=true, so send the confirmation directly (not via gate).
    await sendRaw(e164, "You're unsubscribed. You won't get any more WhatsApp messages from Young at Heart Festival. Reply START anytime to opt back in.")
    return
  }

  // 2) START — re-opt-in.
  if (isStartKeyword(msg.text)) {
    await touchInbound(e164, msg.name)
    await recordConsent({ waPhone: e164, source: 'inbound', profileName: msg.name })
    await sendText(e164, "You're back in 🎉 You'll get Young at Heart Festival updates here. How can I help?")
    return
  }

  // 3) Normal message — opens the 24h window.
  await touchInbound(e164, msg.name)

  // 3-MAINT) Maintenance gate. Runs AFTER STOP/START (compliance preserved)
  // and AFTER message logging (audit preserved). Master (Taona) bypasses
  // entirely so testing the bot during sweep still works. Festival_owner
  // (Samreen) gets a personalized soft message. Everyone else gets the
  // generic maintenance reply with ticket purchase still pointed at
  // tickets.youngatheart.co.za (Doctrine Laws 3+4 stay live).
  if (isMaintenanceEnabled()) {
    const known = findAdmin(e164)
    if (known?.role === 'master') {
      // Fall through to normal flow — Taona keeps full bot access.
    } else if (known?.role === 'festival_owner') {
      const first = known.name.split(' ')[0]
      const softMsg = `Hey ${first}, quick heads-up: I'm doing a deep tune-up on the festival platform tonight. Site and portal are temporarily offline while I tighten everything. Back online by tomorrow with everything cleaner. If anything's urgent in the meantime, message Taona directly on +971501168462. Catch you on the other side.`
      const res = await sendText(e164, softMsg)
      await logMessage({
        direction: 'out',
        wa_phone: e164,
        body: softMsg,
        status: res.skipped ? 'failed' : 'sent',
        providerMessageId: res.messageId,
      })
      return
    } else {
      const genericMsg = `Hi! The Cape Town Halaal vendor portal is being tuned up tonight. Back online tomorrow. Festival tickets are still available now at tickets.youngatheart.co.za. If you started a vendor application, your progress is saved. Reply STOP to unsubscribe.`
      const res = await sendText(e164, genericMsg)
      await logMessage({
        direction: 'out',
        wa_phone: e164,
        body: genericMsg,
        status: res.skipped ? 'failed' : 'sent',
        providerMessageId: res.messageId,
      })
      return
    }
  }

  // 3a) ADMIN path — bypass the festival LLM and route through the admin chat
  // handler. The handler returns either a structured reply (intent matched —
  // stats query, blast proposal, confirmation, cancellation) or an empty reply
  // (no intent matched → fall through to a one-line ack + master forward).
  const admin = findAdmin(e164)
  if (admin) {
    const adminResult = await handleAdminMessage(admin, msg.text)
    const reply = adminResult.reply ||
      (admin.role === 'festival_owner'
        ? `Got it ${admin.name.split(' ')[0]}, passed to Taona. Ask me 'stats' for live numbers, or tell me who you want to email and I'll draft it.`
        : `Logged for you, ${admin.name}. Try 'stats' or 'email approved unpaid the payment reminder'.`)
    const res = await sendText(e164, reply)
    await logMessage({
      direction: 'out',
      wa_phone: e164,
      body: reply,
      status: res.skipped ? 'failed' : 'sent',
      providerMessageId: res.messageId,
    })
    // Only notify master on free-form (non-intent) admin messages — proposals
    // and stats queries are noise to forward.
    if (!adminResult.reply) await notifyMaster(admin, msg.text)
    return
  }

  if (msg.type !== 'text' || !msg.text.trim()) {
    await sendText(e164, "Hi! I'm the Young at Heart Festival assistant. Ask me about tickets, vendors, directions, or anything about the festival. Type 'talk to human' to reach our support team. Reply STOP to unsubscribe.")
    return
  }

  // 3b) HUMAN HANDOVER intent — user explicitly wants a person.
  if (detectHumanIntent(msg.text)) {
    await escalateToHuman(e164, msg.text)
    const ack = "Got it. I've passed your message to our support team. Someone will WhatsApp you back here shortly. While they're looking, keep adding context and I'll forward it through."
    const res = await sendText(e164, ack)
    await logMessage({ direction: 'out', wa_phone: e164, body: ack, status: res.skipped ? 'failed' : 'sent', providerMessageId: res.messageId })
    try {
      await notifyOwners({
        event: 'vendor_support_message',
        body: `${e164} asked to talk to a human: ${msg.text.slice(0, 240)}`,
        audience: 'all',
      })
    } catch (e) { console.error('[bot] notifyOwners on handover failed:', (e as Error).message) }
    return
  }

  // 3c) ALREADY IN HANDOVER — bot stays quiet, message gets forwarded to Samreen.
  // Auto-releases after 24h of silence so the bot resumes naturally.
  if (await isInHandover(e164)) {
    try {
      await notifyOwners({
        event: 'vendor_support_message',
        body: `[${e164}, ongoing handover] ${msg.text.slice(0, 240)}`,
        audience: 'all',
      })
    } catch (e) { console.error('[bot] notifyOwners during handover failed:', (e as Error).message) }
    // Don't auto-reply. Samreen replies through /admin/bot-inbox.
    return
  }

  // Resolve who this is so every reply is personalised (vendor name, ticket
  // count, etc.). Admins are already handled above; resolution here is for
  // vendors / ticket buyers / unknowns.
  const identity = await resolveIdentity(e164)

  const history = await recentHistory(e164)
  // New brain shape: pass the latest user turn as the message, prior turns as
  // history, and per-caller identity briefing as extraSystem. The brain owns
  // the system prompt, intent routing, FAQ short-circuit, and sign-off rule.
  let reply = ''
  try {
    const result = await askFestivalBrain(msg.text, {
      waId: e164,
      history,
      extraSystem: identityBriefing(identity),
    })
    reply = result.message
  } catch (e) {
    console.error('brain error', e)
    reply = identity.firstName
      ? `Thanks for your message, ${identity.firstName}! Our team will get back to you. For tickets visit tickets.youngatheart.co.za`
      : 'Thanks for your message! Our team will get back to you. For tickets visit tickets.youngatheart.co.za'
  }
  // OUTPUT-side PII guard (KT #114 pattern). Redact phones/emails/IDs in
  // the bot's reply that don't belong to the caller. Log redactions.
  const guarded = guardReply(reply, { identity, callerE164: e164 })
  if (guarded.redactionCount > 0) {
    await logGuardRedaction({
      callerE164: e164,
      role: identity.role,
      redactionCount: guarded.redactionCount,
      reasons: guarded.reasons,
      originalLen: reply.length,
    })
  }
  const res = await sendText(e164, guarded.reply)
  await logMessage({ direction: 'out', wa_phone: e164, body: guarded.reply, status: res.skipped ? 'failed' : 'sent', providerMessageId: res.messageId })
}

// Forward an admin's inbound straight to the master (Taona) so he sees it
// without waiting to open /admin/bot-inbox. Best-effort: a failure here never
// blocks the 200 to Meta because the caller logs and swallows errors.
async function notifyMaster(from: { role: string; name: string }, body: string) {
  const master = findAdmin('+971501168462')
  if (!master || master.role !== 'master') return
  if (master.name === from.name) return // Taona pinging himself
  const text = `🛎️ ${from.name} (${from.role}) said:\n\n"${(body || '').slice(0, 400)}"\n\nReply in /admin/bot-inbox or here.`
  try {
    const res = await sendText(master.phone, text)
    await logMessage({
      direction: 'out',
      wa_phone: master.phone,
      body: text,
      status: res.skipped ? 'failed' : 'sent',
      providerMessageId: res.messageId,
    })
  } catch (e) {
    console.error('notifyMaster error', e)
  }
}

// ---- helpers (wa_messages = existing v5 table; wamid = provider_message_id) ----

async function alreadySeen(providerMessageId: string): Promise<boolean> {
  if (!providerMessageId) return false
  const db = createAdminClient()
  const { data } = await db.from('wa_messages').select('id').eq('provider_message_id', providerMessageId).maybeSingle()
  return Boolean(data)
}

async function logMessage(row: {
  direction: 'in' | 'out'
  wa_phone: string
  body: string
  status: string
  providerMessageId?: string
}) {
  const db = createAdminClient()
  await db.from('wa_messages').insert({
    direction: row.direction,
    wa_phone: row.wa_phone,
    body: row.body,
    status: row.status,
    provider_message_id: row.providerMessageId || null,
  })
}

async function logStatuses(statuses: Array<{ messageId: string; status: string; recipient: string; errorMessage?: string }>) {
  if (!statuses.length) return
  const db = createAdminClient()
  for (const s of statuses) {
    await db
      .from('wa_messages')
      .update({ status: s.status, error: s.errorMessage || null, updated_at: new Date().toISOString() })
      .eq('provider_message_id', s.messageId)
  }
}

async function recentHistory(e164: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const db = createAdminClient()
  const { data } = await db
    .from('wa_messages')
    .select('direction, body')
    .eq('wa_phone', e164)
    .order('created_at', { ascending: false })
    .limit(8)
  const rows = (data as Array<{ direction: string; body: string }>) || []
  return rows
    .reverse()
    .filter((r) => r.body)
    .map((r) => ({ role: r.direction === 'in' ? ('user' as const) : ('assistant' as const), content: r.body }))
}

// Direct send for the STOP confirmation ONLY. recordOptOut() has already set
// opted_out=true, so the normal sendText() gate would (correctly) block this.
// A single opt-out confirmation is permitted and expected, so we bypass the gate
// with a raw Graph call. Nothing else may use this path.
//
// WALL (2026-06-13): even on the gate-bypass path the bot-guards wall still
// fires. The consent gate is a routing decision (may we talk?); the wall is a
// content cleaner (is this fit to send?). Brand-leak / em-dash / urgency rules
// must apply to every byte that leaves this process, including canned strings.
async function sendRaw(e164: string, body: string) {
  let sendBody = body
  try {
    const { sanitizeReply } = await import('@/lib/bot-guards/index.js')
    const { CTH_BOT_GUARDS_CONFIG } = await import('@/lib/bot/guards-config')
    sendBody = sanitizeReply(body, CTH_BOT_GUARDS_CONFIG).body
  } catch {
    // wall must never block the send
  }
  try {
    await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: e164.replace('+', ''),
        type: 'text',
        text: { preview_url: false, body: sendBody },
      }),
    })
  } catch (e) {
    console.error('stop-confirm send error', e)
  }
}
