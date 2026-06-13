import { createAdminClient } from '@/lib/supabase/admin'

export interface WaSendArgs {
  phone: string
  templateKey: string
  applicationId?: string | null
  variables?: Record<string, string>
}

export interface WaSendResult {
  status: 'sent' | 'skipped' | 'failed'
  providerMessageId?: string
  error?: string
  logRowId?: string
}

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WABA_TOKEN = process.env.WHATSAPP_TOKEN
const LANG_CODE = process.env.WHATSAPP_TEMPLATE_LANG || 'en'

/**
 * Send a WhatsApp template + log to wa_messages.
 *
 * If WhatsApp env vars are not configured, logs with status='skipped'
 * and returns gracefully. The endpoint stays useful in dev without WA.
 */
export async function sendWhatsAppTemplate(args: WaSendArgs): Promise<WaSendResult> {
  const phone = normalizePhone(args.phone)
  const admin = createAdminClient()

  if (!phone) {
    return await logAndReturn(admin, {
      direction: 'outbound',
      phone: args.phone || '',
      application_id: args.applicationId ?? null,
      template_key: args.templateKey,
      status: 'failed',
      error: 'phone missing or invalid',
      metadata: args.variables ?? null,
    })
  }

  if (!PHONE_NUMBER_ID || !WABA_TOKEN) {
    return await logAndReturn(admin, {
      direction: 'outbound',
      phone,
      application_id: args.applicationId ?? null,
      template_key: args.templateKey,
      status: 'skipped',
      error: 'WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN not configured',
      metadata: args.variables ?? null,
    })
  }

  const components = buildTemplateComponents(args.variables)
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: args.templateKey,
      language: { code: LANG_CODE },
      components,
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WABA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id: string }>
      error?: { message?: string }
    }
    if (!res.ok) {
      return await logAndReturn(admin, {
        direction: 'outbound',
        phone,
        application_id: args.applicationId ?? null,
        template_key: args.templateKey,
        status: 'failed',
        error: json?.error?.message || `HTTP ${res.status}`,
        metadata: args.variables ?? null,
      })
    }
    const messageId = json?.messages?.[0]?.id
    return await logAndReturn(admin, {
      direction: 'outbound',
      phone,
      application_id: args.applicationId ?? null,
      template_key: args.templateKey,
      status: 'sent',
      provider_message_id: messageId ?? null,
      metadata: args.variables ?? null,
    })
  } catch (err) {
    return await logAndReturn(admin, {
      direction: 'outbound',
      phone,
      application_id: args.applicationId ?? null,
      template_key: args.templateKey,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      metadata: args.variables ?? null,
    })
  }
}

function buildTemplateComponents(vars: Record<string, string> | undefined) {
  if (!vars) return []
  const ordered = Object.keys(vars)
    .filter((k) => /^\{?\{?\d+\}?\}?$|^v\d+$|^\d+$/.test(k))
    .sort((a, b) => extractIndex(a) - extractIndex(b))
  const paramKeys = ordered.length > 0 ? ordered : Object.keys(vars)
  if (paramKeys.length === 0) return []
  return [
    {
      type: 'body',
      parameters: paramKeys.map((k) => ({ type: 'text', text: vars[k] })),
    },
  ]
}

function extractIndex(k: string): number {
  const m = k.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

function normalizePhone(v: string | null | undefined): string {
  return (v ?? '').replace(/\D+/g, '')
}

type LogRow = {
  direction: 'inbound' | 'outbound'
  phone: string
  application_id: string | null
  template_key: string | null
  body?: string | null
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped'
  provider_message_id?: string | null
  error?: string | null
  metadata?: Record<string, unknown> | null
}

async function logAndReturn(
  admin: ReturnType<typeof createAdminClient>,
  row: LogRow
): Promise<WaSendResult> {
  let logRowId: string | undefined
  try {
    const { data } = await admin
      .from('wa_messages')
      .insert(row)
      .select('id')
      .single()
    logRowId = data?.id
  } catch (err) {
    console.error('wa_messages insert failed:', err)
  }
  if (row.status === 'sent') {
    return { status: 'sent', providerMessageId: row.provider_message_id ?? undefined, logRowId }
  }
  if (row.status === 'skipped') {
    return { status: 'skipped', error: row.error ?? undefined, logRowId }
  }
  return { status: 'failed', error: row.error ?? undefined, logRowId }
}

export function templateKeyForStatus(status: string): string | null {
  switch (status) {
    case 'approved':
      return 'vendor_application_approved'
    case 'rejected':
      return 'vendor_application_rejected'
    case 'info_requested':
      return 'vendor_application_info_requested'
    default:
      return null
  }
}
