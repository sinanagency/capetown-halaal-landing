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

    // Route through /auth/callback so the PKCE code gets exchanged for a session
    // BEFORE the user lands on set-password. Otherwise set-password has no session
    // and updateUser({password}) silently fails.
    const origin = new URL(req.url).origin
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/exhibitor/set-password')}`
    const admin = createAdminClient()

    const lowEmail = email.trim().toLowerCase()
    const tag = `[send-password-reset] ${lowEmail}`

    try {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: lowEmail,
        options: { redirectTo },
      })

      if (error) {
        // Most common cause: no Supabase Auth user for this email. Vendors only
        // get a Supabase Auth account after their application is APPROVED
        // (provisionExhibitorAccount in src/lib/exhibitor-auth.ts). Pending
        // applicants who hit "forgot password" land here.
        console.warn(`${tag} generateLink rejected: ${error.message} (often: no auth user, user may be unapproved)`)
        return NextResponse.json({ ok: true })
      }

      // IMPORTANT: we do NOT use data.properties.action_link directly. That
      // link points at Supabase's /auth/v1/verify endpoint which redirects back
      // with either ?code= (PKCE) or #access_token= (implicit). Neither works
      // cleanly here. Instead we use data.properties.hashed_token + type and
      // route through our own callback that calls verifyOtp({type, token_hash})
      // — stateless verification, no code_verifier needed.
      const hashedToken = data?.properties?.hashed_token
      const verificationType = data?.properties?.verification_type

      if (!hashedToken || !verificationType) {
        console.error(`${tag} generateLink returned no hashed_token (response shape changed?)`)
        return NextResponse.json({ ok: true })
      }

      const params = new URLSearchParams({
        token_hash: hashedToken,
        type: verificationType,
        next: '/exhibitor/set-password',
      })
      const resetUrl = `${origin}/auth/callback?${params.toString()}`
      const contactName = (data.user?.user_metadata?.business_name as string | undefined) || undefined

      const sendRes = await sendEmail({
        to: email.trim(),
        subject: 'Reset your Young at Heart Festival exhibitor password',
        react: PasswordReset({ resetUrl, contactName }),
        text: `Hi ${contactName || 'there'},\n\nWe received a request to reset your Young at Heart Festival exhibitor password. Use this link (expires in 1 hour) to choose a new one:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nWarm regards,\nThe Young at Heart Festival Team`,
      })

      if (sendRes?.ok) {
        console.log(`${tag} reset email sent OK`)
      } else {
        console.error(`${tag} sendEmail FAILED:`, sendRes?.error || '(no error message)')
      }
    } catch (e) {
      console.error(`${tag} threw:`, (e as Error).message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[send-password-reset] bad request:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
