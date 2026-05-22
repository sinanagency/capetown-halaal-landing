// WhatsApp Cloud API client (Meta, provider-agnostic surface).
// Dormant until WHATSAPP_* env vars are set — see META-WHATSAPP-SETUP.md.
// Swapping to Twilio later only touches this file.

const GRAPH = 'https://graph.facebook.com/v21.0'
const WA_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''

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
    throw new Error(`WhatsApp API error: ${res.status} — ${detail}`)
  }
  return data as Record<string, unknown>
}

function extractMessageId(data: Record<string, unknown>, to: string): SendResult {
  const messages = data.messages as Array<{ id: string }> | undefined
  return { messageId: messages?.[0]?.id || '', to }
}

// --- Free-form text (only valid inside the 24h customer service window) ---
export async function sendText(to: string, body: string): Promise<SendResult> {
  const waId = toWaId(to)
  const data = await waFetch(`${WA_PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: waId,
    type: 'text',
    text: { preview_url: false, body },
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
  opts: { lang?: string; headerMedia?: { type: 'document' | 'image'; link: string; filename?: string } } = {}
): Promise<SendResult> {
  const waId = toWaId(to)
  const components: Array<Record<string, unknown>> = []

  if (opts.headerMedia) {
    const media: Record<string, unknown> = { link: opts.headerMedia.link }
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
  qrUrl: string
}): Promise<SendResult> {
  return sendTemplate(
    args.to,
    'ticket_delivery',
    [args.firstName, args.orderNumber, args.ticketSummary],
    { headerMedia: { type: 'document', link: args.qrUrl, filename: 'YAH-Festival-Ticket.pdf' } }
  )
}

// --- Webhook verification (GET handshake from Meta) ---
export function verifyWebhook(mode: string | null, token: string | null, challenge: string | null): string | null {
  if (mode === 'subscribe' && token && token === WA_VERIFY_TOKEN) return challenge
  return null
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
