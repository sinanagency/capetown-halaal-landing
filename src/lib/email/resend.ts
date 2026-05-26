import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

export const FROM_EMAIL = 'Young at Heart Festival <support@youngatheart.co.za>'
export const ADMIN_EMAIL = 'support@youngatheart.co.za'
const BCC_EMAIL = 'info@sinan.agency'

// CRITICAL: env vars set via the Vercel dashboard frequently arrive with a
// trailing newline (e.g. "Saosin182!\n"). GoDaddy then rejects the password
// and every send fails silently. Trimming here neutralises that class of bug
// permanently — do not remove. See: 2026-05-26 email outage post-mortem.
const SMTP_USER = (process.env.SMTP_USER || 'support@youngatheart.co.za').trim()
const SMTP_PASS = (process.env.SMTP_PASS || '').trim()
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim()

// GoDaddy SMTP transport (port 465 SSL)
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
})

// Fallback SMTP (port 587 STARTTLS)
const transporterFallback = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 587,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
})

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
  provider?: 'smtp465' | 'smtp587' | 'resend'
  error?: string
}

/**
 * Send a transactional email. Tries SMTP 465 -> SMTP 587 -> Resend.
 * Returns a SendResult so callers can react to / surface failures instead of
 * the old behaviour of silently swallowing every error and reporting success.
 */
export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string
  subject: string
  react?: ReactElement
  text?: string
}): Promise<SendResult> {
  let html: string | undefined
  if (react) {
    html = await render(react)
  }

  const mailOptions = {
    from: FROM_EMAIL,
    replyTo: 'support@youngatheart.co.za',
    to,
    bcc: BCC_EMAIL,
    subject,
    html,
    text: text || undefined,
    headers: mailHeaders,
  }

  const errors: string[] = []

  // Try port 465 SSL
  if (SMTP_PASS) {
    try {
      await transporter.sendMail(mailOptions)
      console.log(`Email sent via SMTP 465 to ${to}: ${subject}`)
      return { ok: true, provider: 'smtp465' }
    } catch (e) {
      const msg = (e as Error).message
      errors.push(`smtp465: ${msg}`)
      console.error('SMTP 465 failed:', msg)
    }

    // Try port 587 STARTTLS
    try {
      await transporterFallback.sendMail(mailOptions)
      console.log(`Email sent via SMTP 587 to ${to}: ${subject}`)
      return { ok: true, provider: 'smtp587' }
    } catch (e) {
      const msg = (e as Error).message
      errors.push(`smtp587: ${msg}`)
      console.error('SMTP 587 failed:', msg)
    }
  } else {
    errors.push('smtp: SMTP_PASS missing')
  }

  // Fallback to Resend
  const resend = getResend()
  if (resend) {
    try {
      if (react) {
        await resend.emails.send({ from: FROM_EMAIL, to, subject, react })
      } else {
        await resend.emails.send({ from: FROM_EMAIL, to, subject, text: text || '' })
      }
      console.log(`Email sent via Resend to ${to}: ${subject}`)
      return { ok: true, provider: 'resend' }
    } catch (e) {
      const msg = (e as Error).message
      errors.push(`resend: ${msg}`)
      console.error('Resend failed:', msg)
    }
  } else {
    errors.push('resend: RESEND_API_KEY missing')
  }

  const error = errors.join(' | ')
  console.error(
    `ALL email providers failed for ${to} ("${subject}"). ` +
      `SMTP_PASS: ${SMTP_PASS ? 'set' : 'missing'}, RESEND_API_KEY: ${RESEND_API_KEY ? 'set' : 'missing'}. ` +
      `Errors: ${error}`
  )
  return { ok: false, error }
}

/**
 * Verify SMTP connectivity + auth without sending mail. Used by the
 * /api/admin/email-health endpoint so email health can be checked any time.
 */
export async function verifyEmailTransport(): Promise<{
  smtp465: { ok: boolean; error?: string }
  smtp587: { ok: boolean; error?: string }
  smtpUser: string
  smtpPassSet: boolean
  smtpPassLength: number
  resendKeySet: boolean
}> {
  const result = {
    smtp465: { ok: false } as { ok: boolean; error?: string },
    smtp587: { ok: false } as { ok: boolean; error?: string },
    smtpUser: SMTP_USER,
    smtpPassSet: !!SMTP_PASS,
    smtpPassLength: SMTP_PASS.length,
    resendKeySet: !!RESEND_API_KEY,
  }
  try {
    await transporter.verify()
    result.smtp465.ok = true
  } catch (e) {
    result.smtp465.error = (e as Error).message
  }
  try {
    await transporterFallback.verify()
    result.smtp587.ok = true
  } catch (e) {
    result.smtp587.error = (e as Error).message
  }
  return result
}
