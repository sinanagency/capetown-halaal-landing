import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

// Email sender configuration
export const FROM_EMAIL = 'Young at Heart Festival <support@youngatheart.co.za>'
export const ADMIN_EMAIL = 'support@youngatheart.co.za'

// GoDaddy SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'support@youngatheart.co.za',
    pass: process.env.SMTP_PASS || '',
  },
})

// Keep Resend as fallback if configured
let resendClient: Resend | null = null

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Unified email sender — tries SMTP first, falls back to Resend
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
  // Render React Email to HTML if provided
  let html: string | undefined
  if (react) {
    html = await render(react)
  }

  // Try GoDaddy SMTP first
  if (process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text: text || undefined,
      })
      console.log(`Email sent via SMTP to ${to}: ${subject}`)
      return
    } catch (smtpError) {
      console.error('SMTP send failed, trying Resend fallback:', smtpError)
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
    } catch (resendError) {
      console.error('Resend send failed:', resendError)
    }
  }

  console.error(`No email provider available. SMTP_PASS: ${process.env.SMTP_PASS ? 'set' : 'missing'}, RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'set' : 'missing'}`)
}
