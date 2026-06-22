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
import { detectHumanIntent, escalateToHuman, isInHandover, isPendingHandover, setPendingHandover } from '@/lib/bot/handover'
import { notifyOwners } from '@/lib/bot/notify'
import { resolveSwipeReplyTarget } from '@/lib/bot/swipe-reply'
import { createAdminClient } from '@/lib/supabase/admin'
import { findAdmin } from '@/lib/bot/admins'
import { resolveIdentity, identityBriefing } from '@/lib/bot/identity'
import { handleAdminMessage } from '@/lib/bot/admin-chat'
import { isMaintenanceEnabled } from '@/lib/maintenance'
import { guardReply, logGuardRedaction } from '@/lib/bot/reply-guard'
import { shouldProcess } from '@/lib/brain-core/index.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// N2: per-sender LLM rate limit.
//
// Each inbound text drops a token in a per-waId bucket. When the bucket
// exceeds LLM_MAX_PER_5MIN, we skip the festival-brain LLM call and reply
// with a cheap static line. Without this, a single spammer with one open
// session can pin Anthropic Haiku at $1-5/min unbounded.
//
// Process-local Map; resets on cold start. Fine for the single Vercel
// instance most webhook traffic hits.
// ---------------------------------------------------------------------------
const LLM_BUCKET: Map<string, { count: number; windowStart: number }> = new Map()
const LLM_MAX_PER_5MIN = 10
const LLM_WINDOW_MS = 5 * 60_000

function checkLLMBucket(waId: string): boolean {
  const now = Date.now()
  const entry = LLM_BUCKET.get(waId) ?? { count: 0, windowStart: now }
  if (now - entry.windowStart > LLM_WINDOW_MS) {
    entry.count = 0
    entry.windowStart = now
  }
  entry.count++
  LLM_BUCKET.set(waId, entry)
  // Opportunistic cleanup so the map can't grow unbounded.
  if (LLM_BUCKET.size > 1000) {
    for (const [k, v] of LLM_BUCKET) {
      if (now - v.windowStart > LLM_WINDOW_MS) LLM_BUCKET.delete(k)
    }
  }
  return entry.count <= LLM_MAX_PER_5MIN
}

async function logLLMThrottle(waId: string, count: number) {
  try {
    const db = createAdminClient()
    await db.from('site_events').insert({
      session_id: 'wa-llm-throttle',
      event_type: 'wa_llm_throttled',
      path: '/api/whatsapp/webhook',
      metadata: { wa_id: waId, count, window_minutes: LLM_WINDOW_MS / 60_000, max: LLM_MAX_PER_5MIN },
    })
  } catch (e) {
    console.warn('[wa-webhook] LLM throttle log failed:', (e as Error).message)
  }
}

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

// Build a human-readable handover alert: full name, business, status and the
// actual question — plus a parseable `Phone: +27…` line that the swipe-reply
// router reads back to know who to forward Samreen's reply to.
async function buildHandoverAlert(e164: string, text: string, ongoing = false): Promise<string> {
  const who = await resolveIdentity(e164)
  const brief = who.vendor
    ? `${who.name || 'Vendor'} · ${who.vendor.business_name} · ${who.vendor.status}` +
      `${who.vendor.stall ? ` · stall ${who.vendor.stall}` : ''} · pay:${who.vendor.payment_status}`
    : who.name || 'Unknown contact'
  return `${brief}${ongoing ? ' (ongoing)' : ''}\nPhone: ${e164}\nAsks: "${text.slice(0, 240)}"\n\nSwipe-reply to this message to answer them directly.`
}

async function handleInbound(msg: {
  from: string
  messageId: string
  type: string
  text: string
  name?: string
  replyToWamid?: string
  media?: { kind: 'image' | 'document' | 'video' | 'audio' | 'sticker'; id: string; mimeType?: string; filename?: string; caption?: string }
}) {
  const e164 = toE164(msg.from)

  // Brain-core webhook guard: dedup (wamid + 2s sender lock) + media-pending buffer.
  const guard = await shouldProcess("cth", e164, msg.messageId, msg.text, {
    seenByWamid: async (id) => alreadySeen(id),
    logToChat: async (_sender, _text) => {},
  })
  if (guard.action !== "process") return
  await logMessage({ direction: 'in', wa_phone: e164, body: msg.text, status: 'received', providerMessageId: msg.messageId, media: msg.media })

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

  // 3-AUDIO) Voice / audio note rejection. The Meta Cloud API surfaces
  // push-to-talk voice notes and audio file uploads as `type: 'audio'`.
  // CTH does NOT transcribe. We send a single polite reply asking the user
  // to type their message and STOP. No downstream brain/handover/admin
  // routing. Order: AFTER STOP/START + dedup + maintenance (so opt-outs
  // and maintenance windows still win), BEFORE admin/handover/brain.
  if (msg.type === 'audio') {
    const rejectMsg = "Hi! Voice notes aren't supported on this number yet. Please type your message and I'll help you out."
    const res = await sendText(e164, rejectMsg)
    await logMessage({
      direction: 'out',
      wa_phone: e164,
      body: rejectMsg,
      status: res.skipped ? 'failed' : 'sent',
      providerMessageId: res.messageId,
    })
    return
  }

  // 3a) ADMIN path — bypass the festival LLM and route through the admin chat
  // handler. The handler returns either a structured reply (intent matched —
  // stats query, blast proposal, confirmation, cancellation) or an empty reply
  // (no intent matched → fall through to a one-line ack + master forward).
  const admin = findAdmin(e164)
  if (admin) {
    // 3a-SWIPE) If the admin SWIPE-REPLIED to a handover alert, route their text
    // straight to that vendor (no "to +27…" command). The alert's wamid arrives
    // as context.id; we recover the vendor phone from the logged alert body.
    if (msg.replyToWamid) {
      const target = await resolveSwipeReplyTarget(msg.replyToWamid)
      if (target) {
        const fwd = await sendText(target.vendorE164, msg.text)
        await logMessage({
          direction: 'out', wa_phone: target.vendorE164, body: msg.text,
          status: fwd.skipped ? 'failed' : 'sent', providerMessageId: fwd.messageId,
        })
        // Pin the vendor in handover so the auto-bot stays quiet while a human is
        // actively replying (otherwise the brain could answer over the operator).
        if (!fwd.skipped) {
          await escalateToHuman(target.vendorE164, 'admin swipe-reply').catch(() => {})
        }
        const who = await resolveIdentity(target.vendorE164)
        const ackName = who.vendor?.business_name || who.firstName || target.vendorE164
        const ack = fwd.skipped
          ? `⚠️ Couldn't deliver to ${ackName}: ${fwd.skipped}`
          : `✅ Sent to ${ackName}. Swipe-reply again to keep the conversation going.`
        const ar = await sendText(e164, ack)
        await logMessage({
          direction: 'out', wa_phone: e164, body: ack,
          status: ar.skipped ? 'failed' : 'sent', providerMessageId: ar.messageId,
        })
        // Cross-mirror to the OTHER support agent so both see the conversation
        // and either can pick it up. The relay body carries `Phone: +…` and the
        // 'vendor support' prefix, so it is itself a swipe-anchor — the other
        // agent can swipe-reply on it to continue answering the same vendor.
        if (!fwd.skipped) {
          try {
            await notifyOwners({
              event: 'vendor_support_message',
              body: `${admin.name} → ${ackName}\nPhone: ${target.vendorE164}\n"${msg.text.slice(0, 240)}"\n\nSwipe-reply to continue.`,
              audience: 'all',
              exclude: e164,
            })
          } catch (e) { console.error('[swipe] cross-mirror failed:', (e as Error).message) }
        }
        return
      }
    }

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

  // 3a-PENDING) An unknown contact who asked for a human was asked for their
  // name + reason; THIS message is their answer. Capture it as the handover
  // context and escalate now.
  if (await isPendingHandover(e164)) {
    await escalateToHuman(e164, msg.text)
    const ack = "Thank you. I've passed this to our team and someone will WhatsApp you back here shortly."
    const res = await sendText(e164, ack)
    await logMessage({ direction: 'out', wa_phone: e164, body: ack, status: res.skipped ? 'failed' : 'sent', providerMessageId: res.messageId })
    try {
      await notifyOwners({ event: 'vendor_support_message', body: await buildHandoverAlert(e164, msg.text), audience: 'all' })
    } catch (e) { console.error('[bot] notifyOwners on pending handover failed:', (e as Error).message) }
    return
  }

  // 3b) HUMAN HANDOVER intent — user explicitly wants a person.
  if (detectHumanIntent(msg.text)) {
    // Unknown contacts (not a known vendor / ticket-buyer) get asked who they
    // are + what they need FIRST, so Samreen never receives a bare number with
    // no context. Known vendors/buyers are auto-enriched, so escalate at once.
    const who = await resolveIdentity(e164)
    if (who.role === 'unknown') {
      await setPendingHandover(e164)
      const ask = "Before I connect you to our team, please tell me your name and what you need help with. For example: \"I'm Aisha from Nature's Table, I need to change my stall.\""
      const askRes = await sendText(e164, ask)
      await logMessage({ direction: 'out', wa_phone: e164, body: ask, status: askRes.skipped ? 'failed' : 'sent', providerMessageId: askRes.messageId })
      return
    }
    await escalateToHuman(e164, msg.text)
    const ack = "Got it. I've passed your message to our support team. Someone will WhatsApp you back here shortly. While they're looking, keep adding context and I'll forward it through."
    const res = await sendText(e164, ack)
    await logMessage({ direction: 'out', wa_phone: e164, body: ack, status: res.skipped ? 'failed' : 'sent', providerMessageId: res.messageId })
    try {
      await notifyOwners({
        event: 'vendor_support_message',
        body: await buildHandoverAlert(e164, msg.text),
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
        body: await buildHandoverAlert(e164, msg.text, true),
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
  // N2: per-sender LLM rate limit. If this caller has already burned 10 LLM
  // turns in the last 5 minutes, skip the Haiku call and respond with a
  // pre-written line so a spammer can't pin our Anthropic spend.
  const llmAllowed = checkLLMBucket(e164)
  if (!llmAllowed) {
    await logLLMThrottle(e164, LLM_MAX_PER_5MIN + 1)
    reply = identity.firstName
      ? `Thanks ${identity.firstName}, we've received your message. A human will respond shortly. For tickets visit tickets.youngatheart.co.za`
      : "We've received your message. A human will respond shortly. For tickets visit tickets.youngatheart.co.za"
  } else {
    try {
      const result = await askFestivalBrain(msg.text, {
        waId: e164,
        history,
        extraSystem: identityBriefing(identity),
        // V1: a known approved/applying vendor on WhatsApp gets the vendor scope
        // (real per-vendor facts in identityBriefing + EXHIBITOR PORTAL FACTS),
        // not the public deflection. Strictly gated on the vendor role so public
        // / ticket_buyer / unknown / admin callers never see vendor scope.
        ...(identity.role === 'vendor' ? { surface: 'vendor' as const } : {}),
      })
      reply = result.message
    } catch (e) {
      console.error('brain error', e)
      reply = identity.firstName
        ? `Thanks for your message, ${identity.firstName}! Our team will get back to you. For tickets visit tickets.youngatheart.co.za`
        : 'Thanks for your message! Our team will get back to you. For tickets visit tickets.youngatheart.co.za'
    }
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
  media?: { kind: 'image' | 'document' | 'video' | 'audio' | 'sticker'; id: string; mimeType?: string; filename?: string; caption?: string }
}) {
  const db = createAdminClient()
  // Persist the media descriptor into the existing `metadata` jsonb (no DDL,
  // Doctrine Law 8). The unified inbox media proxy reads metadata.media.id to
  // fetch the bytes from the Graph API. The wamid alone CANNOT retrieve media.
  const metadata = row.media
    ? { media: { kind: row.media.kind, id: row.media.id, mime_type: row.media.mimeType, filename: row.media.filename, caption: row.media.caption } }
    : null
  await db.from('wa_messages').insert({
    direction: row.direction,
    wa_phone: row.wa_phone,
    body: row.body,
    status: row.status,
    provider_message_id: row.providerMessageId || null,
    ...(metadata ? { metadata } : {}),
  })
  // Spine: keep wa_threads in lockstep with wa_messages so the admin Bot Inbox
  // can render. Prod schema is migration v9 (PK = wa_phone). Inbound bumps
  // last_inbound_at + unread_count; outbound bumps last_outbound_at and zeroes
  // unread. Best-effort: a failure here never blocks the 200 to Meta.
  try {
    await touchThread(db, row.wa_phone, row.direction)
  } catch (e) {
    console.error('wa_threads touch error', e)
  }
}

async function touchThread(
  db: ReturnType<typeof createAdminClient>,
  waPhone: string,
  direction: 'in' | 'out'
) {
  if (!waPhone) return
  const now = new Date().toISOString()
  // Read first so we can compute unread_count without race-prone increments.
  const { data: existing } = await db
    .from('wa_threads')
    .select('wa_phone,unread_count,ticket_id')
    .eq('wa_phone', waPhone)
    .maybeSingle()

  const prevUnread = (existing as { unread_count?: number; ticket_id?: string } | null)?.unread_count ?? 0
  const existingTicketId = (existing as { ticket_id?: string } | null)?.ticket_id
  const row: Record<string, unknown> = { wa_phone: waPhone }
  if (direction === 'in') {
    row.last_inbound_at = now
    row.unread_count = prevUnread + 1
  } else {
    row.last_outbound_at = now
    row.unread_count = 0
  }
  await db.from('wa_threads').upsert(row, { onConflict: 'wa_phone' })

  // Auto-link ticket if thread has no ticket_id yet
  if (!existingTicketId) {
    try {
      await autoLinkWaTicket(db, waPhone)
    } catch (e) {
      console.error('[wa-ticket] auto-link error:', (e as Error).message)
    }
  }
}

// Auto-link a WA thread to a vendor ticket by matching phone (last 9 digits).
async function autoLinkWaTicket(db: ReturnType<typeof createAdminClient>, waPhone: string) {
  const digits = waPhone.replace(/[^0-9]/g, '')
  const last9 = digits.slice(-9)
  if (last9.length < 6) return

  const { data: app } = await db
    .from('vendor_applications')
    .select('id')
    .filter('phone', 'like', `%${last9}`)
    .maybeSingle()

  if (!app) return

  // Find or create ticket
  let { data: ticket } = await db
    .from('vendor_tickets')
    .select('id')
    .eq('vendor_application_id', app.id)
    .maybeSingle()

  if (!ticket) {
    const { data: newTicket } = await db
      .from('vendor_tickets')
      .insert({ vendor_application_id: app.id, status: 'open' })
      .select('id')
      .single()
    ticket = newTicket as { id: string } | null
  }

  if (ticket) {
    await db.from('wa_threads').update({ ticket_id: ticket.id }).eq('wa_phone', waPhone)
  }
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
