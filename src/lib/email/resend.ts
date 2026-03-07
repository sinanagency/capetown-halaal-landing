import { Resend } from 'resend'

// Lazy-loaded Resend client instance
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

// Email sender configuration
export const FROM_EMAIL = 'Young at Heart Festival <noreply@cthalaal.co.za>'
export const ADMIN_EMAIL = 'admin@cthalaal.co.za' // Samreen's email
