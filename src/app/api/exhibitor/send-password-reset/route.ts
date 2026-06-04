import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { PasswordReset } from '@/lib/email/templates/PasswordReset'

export const dynamic = 'force-dynamic'

// Sends a BRANDED exhibitor password-reset email instead of Supabase's generic
// default. We mint a recovery action_link with the service-role client and mail
// it through our own (DKIM-signed, Young at Heart branded) sender. Always
// responds { ok: true } so the endpoint never leaks which emails have accounts.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const redirectTo = `${new URL(req.url).origin}/exhibitor/set-password`
    const admin = createAdminClient()

    try {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim().toLowerCase(),
        options: { redirectTo },
      })

      // No account / not allowed → silently succeed (don't reveal existence).
      const actionLink = data?.properties?.action_link
      if (!error && actionLink) {
        const contactName =
          (data.user?.user_metadata?.business_name as string | undefined) || undefined
        await sendEmail({
          to: email.trim(),
          subject: 'Reset your Young at Heart Festival exhibitor password',
          react: PasswordReset({ resetUrl: actionLink, contactName }),
          text: `Hi ${contactName || 'there'},\n\nWe received a request to reset your Young at Heart Festival exhibitor password. Use this link (expires in 1 hour) to choose a new one:\n\n${actionLink}\n\nIf you didn't request this, you can safely ignore this email.\n\nWarm regards,\nThe Young at Heart Festival Team`,
        })
      } else if (error) {
        // Log server-side only; client still sees ok.
        console.error('[send-password-reset] generateLink error:', error.message)
      }
    } catch (e) {
      console.error('[send-password-reset] threw:', (e as Error).message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[send-password-reset] bad request:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
