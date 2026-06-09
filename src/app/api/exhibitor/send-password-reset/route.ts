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

    try {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim().toLowerCase(),
        options: { redirectTo },
      })

      // No account / not allowed → silently succeed (don't reveal existence).
      //
      // IMPORTANT: we do NOT use data.properties.action_link directly. That link
      // points at Supabase's /auth/v1/verify endpoint which then redirects back
      // with either ?code= (PKCE) or #access_token= (implicit). Neither works
      // cleanly here:
      //   - PKCE fails because the code_verifier cookie is never set (link was
      //     minted server-side, no browser involved)
      //   - implicit hash flow has its own client-side bootstrap fragility
      //
      // Instead we use data.properties.hashed_token + type and route through our
      // own callback that calls supabase.auth.verifyOtp({type, token_hash}) —
      // stateless verification, no code_verifier needed.
      const hashedToken = data?.properties?.hashed_token
      const verificationType = data?.properties?.verification_type
      if (!error && hashedToken && verificationType) {
        const params = new URLSearchParams({
          token_hash: hashedToken,
          type: verificationType,
          next: '/exhibitor/set-password',
        })
        const resetUrl = `${origin}/auth/callback?${params.toString()}`
        const contactName =
          (data.user?.user_metadata?.business_name as string | undefined) || undefined
        await sendEmail({
          to: email.trim(),
          subject: 'Reset your Young at Heart Festival exhibitor password',
          react: PasswordReset({ resetUrl, contactName }),
          text: `Hi ${contactName || 'there'},\n\nWe received a request to reset your Young at Heart Festival exhibitor password. Use this link (expires in 1 hour) to choose a new one:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nWarm regards,\nThe Young at Heart Festival Team`,
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
