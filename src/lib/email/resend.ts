import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'
import { mirrorOutboundToSupportInbox } from './support-mirror'

// =============================================================================
// CTH email — RESEND ONLY (2026-06-08).
//
// Why we ripped GoDaddy SMTP out:
//   - GoDaddy SMTP from the root domain has no DKIM signature on outbound;
//     mail consistently landed in Gmail Promotions / Spam for recipients on
//     major providers. Sam confirmed Global Cuisine approval went to spam.
//   - Resend signs every message with DKIM (`resend._domainkey`) aligned to
//     youngatheart.co.za, passes DMARC, reaches the inbox reliably.
//   - 415/415 vendor verification blast on 2026-06-04 went through Resend
//     successfully — empirical confirmation Resend is the only reliable
//     channel from this domain.
//   - Maintaining a fallback that lands in spam adds zero value (sender
//     reputation actually degrades when the same content hits spam often).
//
// CTH-DOCTRINE Law 5 (email-throttle) now applies to Resend rate limits, not
// SMTP. Resend free tier = 100/day; paid scales beyond. Resend's own client
// handles batching internally so we don't need pool/maxMessages config.
// =============================================================================

export const FROM_EMAIL = 'Young at Heart Festival <support@youngatheart.co.za>'
export const ADMIN_EMAIL = 'support@youngatheart.co.za'
// NOTE: outbound mail is no longer BCC'd to info@sinan.agency (2026-06-19). The
// portal Support Inbox (Sent tab) is the single source of truth for what went
// out — every send is mirrored there as a threaded message via support-mirror.

// Trim trailing newlines (Vercel env vars often have them).
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim()

let resendClient: Resend | null = null
export function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null
  if (!resendClient) resendClient = new Resend(RESEND_API_KEY)
  return resendClient
}

const mailHeaders = {
  'X-Mailer': 'Young at Heart Festival',
  'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>',
}

export type SendResult = {
  ok: boolean
  provider?: 'resend'
  error?: string
}

/**
 * Send a transactional email via Resend (DKIM-signed, inbox-safe).
 *
 * No SMTP fallback by design — see the doctrine block at the top of this file.
 * If Resend fails the call returns ok:false with the error so callers can
 * surface it (admin UI, audit log) instead of silently swallowing.
 */
export async function sendEmail({
  to,
  subject,
  react,
  text,
  attachments,
  replyTo,
}: {
  to: string
  subject: string
  react?: ReactElement
  text?: string
  /** Optional file attachments. content can be a base64 string or a Buffer. */
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>
  /** Optional per-send Reply-To override. Defaults to support@youngatheart.co.za. */
  replyTo?: string
}): Promise<SendResult> {
  let html: string | undefined
  if (react) {
    html = await render(react)
  }

  const resend = getResend()
  if (!resend) {
    const error = 'RESEND_API_KEY missing, no email channel available'
    console.error(`Email FAILED for ${to} ("${subject}"): ${error}`)
    return { ok: false, error }
  }

  try {
    const common = {
      from: FROM_EMAIL,
      to,
      replyTo: replyTo || 'support@youngatheart.co.za',
      subject,
      headers: mailHeaders,
      ...(attachments && attachments.length
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) }
        : {}),
    }
    const sendRes = html
      ? await resend.emails.send({ ...common, html })
      : await resend.emails.send({ ...common, text: text || '' })

    // Resend's client returns { data, error } rather than throwing on API
    // errors — surface a real failure instead of falsely reporting ok:true.
    if (sendRes?.error) {
      const msg = (sendRes.error as { message?: string }).message || String(sendRes.error)
      console.error(`Resend send FAILED for ${to} ("${subject}"): ${msg}`)
      return { ok: false, error: `resend: ${msg}` }
    }

    const providerMessageId = sendRes?.data?.id || undefined
    console.log(`Email sent via Resend to ${to}: ${subject}`)

    // Mirror into the Support Inbox as a threaded message (best-effort, never
    // blocks the send). Makes the Sent tab a real two-way surface.
    await mirrorOutboundToSupportInbox({ to, subject, html, text, providerMessageId })

    return { ok: true, provider: 'resend' }
  } catch (e) {
    const msg = (e as Error).message
    console.error(`Resend send FAILED for ${to} ("${subject}"): ${msg}`)
    return { ok: false, error: `resend: ${msg}` }
  }
}

/**
 * Verify Resend connectivity. Used by the /api/admin/email-health endpoint.
 * Returns the legacy shape with smtp fields removed.
 */
export async function verifyEmailTransport(): Promise<{
  resend: { ok: boolean; error?: string }
  resendKeySet: boolean
  fromEmail: string
}> {
  const result = {
    resend: { ok: false } as { ok: boolean; error?: string },
    resendKeySet: !!RESEND_API_KEY,
    fromEmail: FROM_EMAIL,
  }
  if (!RESEND_API_KEY) {
    result.resend.error = 'RESEND_API_KEY not set'
    return result
  }
  // The Resend SDK has no ping/verify endpoint; check by listing domains.
  try {
    const r = getResend()
    if (!r) throw new Error('client init failed')
    const domains = await r.domains.list()
    if ((domains as { data?: unknown })?.data !== undefined) {
      result.resend.ok = true
    } else {
      result.resend.error = 'unexpected response from resend.domains.list'
    }
  } catch (e) {
    result.resend.error = (e as Error).message
  }
  return result
}
