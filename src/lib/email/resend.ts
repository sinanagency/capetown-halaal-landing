import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

export const FROM_EMAIL = 'Young at Heart Festival <support@youngatheart.co.za>'
export const ADMIN_EMAIL = 'support@youngatheart.co.za'
const BCC_EMAIL = 'info@sinan.agency'

// GoDaddy SMTP transport (port 465 SSL)
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'support@youngatheart.co.za',
    pass: process.env.SMTP_PASS || '',
  },
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
  auth: {
    user: process.env.SMTP_USER || 'support@youngatheart.co.za',
    pass: process.env.SMTP_PASS || '',
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
})

let resendClient: Resend | null = null
export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

const mailHeaders = {
  'X-Mailer': 'Young at Heart Festival',
  'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>',
}

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
}) {
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

  // Try port 465 SSL
  if (process.env.SMTP_PASS) {
    try {
      await transporter.sendMail(mailOptions)
      console.log(`Email sent via SMTP 465 to ${to}: ${subject}`)
      return
    } catch (e) {
      console.error('SMTP 465 failed:', (e as Error).message)
    }

    // Try port 587 STARTTLS
    try {
      await transporterFallback.sendMail(mailOptions)
      console.log(`Email sent via SMTP 587 to ${to}: ${subject}`)
      return
    } catch (e) {
      console.error('SMTP 587 failed:', (e as Error).message)
    }
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
      return
    } catch (e) {
      console.error('Resend failed:', (e as Error).message)
    }
  }

  console.error(`All email providers failed for ${to}. SMTP_PASS: ${process.env.SMTP_PASS ? 'set' : 'missing'}, RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'set' : 'missing'}`)
}
