// WhatsApp Cloud API client (Meta, provider-agnostic surface).
// Dormant until WHATSAPP_* env vars are set — see META-WHATSAPP-SETUP.md.
// Swapping to Twilio later only touches this file.

import { createHmac, timingSafeEqual } from 'crypto'
import { canSend, type WaCategory } from './wa-consent'

const GRAPH = 'https://graph.facebook.com/v21.0'
const WA_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''
const WA_APP_SECRET = process.env.WHATSAPP_APP_SECRET || ''

export const whatsappConfigured = Boolean(WA_TOKEN && WA_PHONE_ID)

// --- Phone normalization (South Africa default) ---
// WhatsApp wants digits with country code, no '+'. Billing phones arrive as
// 0821234567 (local) or +27821234567 — normalize both to 27821234567.
export function toWaId(phone: string, defaultCc = '27'): string {
  const digits = (phone || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return defaultCc + digits.slice(1)
  if (digits.startsWith(defaultCc)) return digits
  return digits
}

// E.164 with '+' for storage/display.
export function toE164(phone: string, defaultCc = '27'): string {
  const id = toWaId(phone, defaultCc)
  return id ? `+${id}` : ''
}

interface SendResult {
  messageId: string
  to: string
  skipped?: string // set (with reason) when the consent gate blocked the send
}

async function waFetch(path: string, payload: unknown): Promise<Record<string, unknown>> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    throw new Error('WhatsApp not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.')
  }

  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = (data as { error?: { message?: string } })?.error?.message || JSON.stringify(data)
    console.error(`WhatsApp API error: ${res.status}`, detail)
    throw new Error(`WhatsApp API error: ${res.status}, ${detail}`)
  }
  return data as Record<string, unknown>
}

function extractMessageId(data: Record<string, unknown>, to: string): SendResult {
  const messages = data.messages as Array<{ id: string }> | undefined
  return { messageId: messages?.[0]?.id || '', to }
}

// Upload a file (e.g. the FooEvents ticket PDF) to WhatsApp's media store and
// return a media id. Used to send the EXACT same PDF a buyer was emailed, by
// id (more reliable than asking Meta to fetch a public URL). Multipart upload.
export async function uploadMedia(
  bytes: Buffer | Uint8Array,
  mimeType = 'application/pdf',
  filename = 'ticket.pdf'
): Promise<string> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    throw new Error('WhatsApp not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.')
  }
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', mimeType)
  form.append('file', new Blob([ab], { type: mimeType }), filename)

  const res = await fetch(`${GRAPH}/${WA_PHONE_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
    body: form,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.id) {
    const detail = data?.error?.message || JSON.stringify(data)
    throw new Error(`WhatsApp media upload failed: ${res.status}, ${detail}`)
  }
  return data.id as string
}

// --- Free-form text (only valid inside the 24h customer service window) ---
// Gated: blocked if the contact opted out or the 24h window is closed.
//
// Architecture 2 pre-send gate (2026-06-12): every outbound passes through
// the shared @sinanagency/bot-guards sanitizeReply with CTH's BotGuardsConfig.
// Catches: brand leaks (Sasa/Nisria/Jensen/Stephen mentions), em-dashes,
// Netlify mentions, urgency-manipulation phrasing. On catch, body is replaced
// with reaskPhrase and the original is logged for engineering review.
// Reference: ~/Code/bot-guards/ + src/lib/bot/guards-config.ts.
export async function sendText(to: string, body: string): Promise<SendResult> {
  const waId = toWaId(to)
  const gate = await canSend(toE164(to), { type: 'text' })
  if (!gate.allowed) return { messageId: '', to: waId, skipped: gate.reason }

  // Pre-send sanitization. Pure function. If it catches anything, log it.
  const { sanitizeReply } = await import('./bot-guards/index.js')
  const { CTH_BOT_GUARDS_CONFIG } = await import('./bot/guards-config')
  const sanitized = sanitizeReply(body, CTH_BOT_GUARDS_CONFIG)
  const sendBody = sanitized.body
  if (sanitized.caught) {
    try {
      const { createAdminClient } = await import('./supabase/admin')
      const db = createAdminClient()
      await db.from('site_events').insert({
        session_id: 'bot_pre_send_caught',
        event_type: 'pre_send_caught_' + sanitized.caught.kind,
        path: '/lib/whatsapp.sendText',
        metadata: {
          to: toE164(to),
          pattern: sanitized.caught.pattern,
          original: sanitized.caught.original,
          replaced_with: sendBody,
        },
      })
    } catch {
      // Best-effort log; never block the send.
    }
  }

  const data = await waFetch(`${WA_PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: waId,
    type: 'text',
    text: { preview_url: false, body: sendBody },
  })
  return extractMessageId(data, waId)
}

// --- Approved template (business-initiated) ---
// `bodyParams` fill the {{1}}, {{2}}... in order. `headerMedia` attaches a
// document/image to a template that has a media header (e.g. the QR ticket).
export async function sendTemplate(
  to: string,
  templateName: string,
  bodyParams: string[] = [],
  opts: {
    lang?: string
    // Provide EITHER a public `link` OR an uploaded media `id` (see uploadMedia).
    headerMedia?: { type: 'document' | 'image'; link?: string; id?: string; filename?: string }
    category?: WaCategory // defaults to 'utility' (transactional); set 'marketing' for promos
  } = {}
): Promise<SendResult> {
  const waId = toWaId(to)
  const gate = await canSend(toE164(to), { type: 'template', category: opts.category || 'utility' })
  if (!gate.allowed) return { messageId: '', to: waId, skipped: gate.reason }
  const components: Array<Record<string, unknown>> = []

  if (opts.headerMedia) {
    const media: Record<string, unknown> = opts.headerMedia.id
      ? { id: opts.headerMedia.id }
      : { link: opts.headerMedia.link }
    if (opts.headerMedia.filename) media.filename = opts.headerMedia.filename
    components.push({
      type: 'header',
      parameters: [{ type: opts.headerMedia.type, [opts.headerMedia.type]: media }],
    })
  }

  if (bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((text) => ({ type: 'text', text })),
    })
  }

  const data = await waFetch(`${WA_PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: waId,
    type: 'template',
    template: {
      name: templateName,
      language: { code: opts.lang || 'en' },
      ...(components.length ? { components } : {}),
    },
  })
  return extractMessageId(data, waId)
}

// --- Convenience: deliver a ticket (template + QR document header) ---
export async function sendTicket(args: {
  to: string
  firstName: string
  orderNumber: string
  ticketSummary: string
  // Provide EITHER the uploaded media id (preferred — the exact FooEvents PDF)
  // OR a public PDF url.
  mediaId?: string
  pdfUrl?: string
  filename?: string
}): Promise<SendResult> {
  return sendTemplate(
    args.to,
    'ticket_delivery',
    [args.firstName, args.orderNumber, args.ticketSummary],
    {
      headerMedia: {
        type: 'document',
        ...(args.mediaId ? { id: args.mediaId } : { link: args.pdfUrl }),
        filename: args.filename || 'YAH-Festival-Ticket.pdf',
      },
    }
  )
}

// --- Webhook verification (GET handshake from Meta) ---
export function verifyWebhook(mode: string | null, token: string | null, challenge: string | null): string | null {
  if (mode === 'subscribe' && token && token === WA_VERIFY_TOKEN) return challenge
  return null
}

// --- Payload signature check (POST webhook) ---
// Meta signs every POST with the app secret. Reject anything that doesn't match
// so nobody can spoof inbound messages / opt-outs against the bot.
// Audit C5: fail CLOSED in production. A missing WHATSAPP_APP_SECRET on a
// preview deploy or after a Vercel env-var \n trim must NOT silently accept
// every unsigned POST. In dev (NODE_ENV !== 'production'), accept-without-key
// stays — useful for local webhook tests.
export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WA_APP_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[whatsapp] WHATSAPP_APP_SECRET missing in production — rejecting webhook')
      return false
    }
    return true
  }
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = 'sha256=' + createHmac('sha256', WA_APP_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHeader)
  return a.length === b.length && timingSafeEqual(a, b)
}

// --- Inbound message parsing (POST webhook payload) ---
export interface InboundMessage {
  from: string // wa id, digits only
  messageId: string
  type: string
  text: string
  name?: string
}

export function parseInbound(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = []
  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: WaChangeValue }> }> })?.entry || []
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value
      const contacts = value?.contacts || []
      const profileName = contacts[0]?.profile?.name
      for (const msg of value?.messages || []) {
        out.push({
          from: msg.from,
          messageId: msg.id,
          type: msg.type,
          text: msg.text?.body || msg.button?.text || '',
          name: profileName,
        })
      }
    }
  }
  return out
}

// --- Delivery status parsing (sent/delivered/read/failed) ---
export interface StatusUpdate {
  messageId: string
  status: string
  recipient: string
  errorMessage?: string
}

export function parseStatuses(body: unknown): StatusUpdate[] {
  const out: StatusUpdate[] = []
  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: WaChangeValue }> }> })?.entry || []
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      for (const st of change.value?.statuses || []) {
        out.push({
          messageId: st.id,
          status: st.status,
          recipient: st.recipient_id,
          errorMessage: st.errors?.[0]?.title,
        })
      }
    }
  }
  return out
}

interface WaChangeValue {
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>
  messages?: Array<{
    from: string
    id: string
    type: string
    text?: { body: string }
    button?: { text: string }
  }>
  statuses?: Array<{
    id: string
    status: string
    recipient_id: string
    errors?: Array<{ title: string }>
  }>
}
