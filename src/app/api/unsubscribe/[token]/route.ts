// =============================================================================
// /api/unsubscribe/[token]
//
// One-click unsubscribe handler. Used by:
//   - The List-Unsubscribe-Post header (Gmail one-click)
//   - The /unsubscribe page (manual click-through with confirmation)
//   - A STOP-reply parser (server-side, future) that posts the user's email here
//
// POST is the canonical write. GET is also accepted because Gmail's preview
// fetcher may fire GET; we treat it the same way so unsubscribe lands either
// way. Token validation is HMAC-based (see lib/mail/unsubscribe-token).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decodeUnsubToken } from '@/lib/mail/unsubscribe-token'

export const dynamic = 'force-dynamic'

async function handle(token: string, reason: string) {
  const email = decodeUnsubToken(token)
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('mail_optout')
    .upsert({ email, reason, unsubscribed_at: new Date().toISOString() }, { onConflict: 'email' })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  // Best effort: also flip wa_consent off for any matching vendor row, when the
  // column exists. Silently ignore failures (table may not have it yet).
  try {
    await admin
      .from('vendor_applications')
      .update({ wa_consent: false })
      .eq('email', email)
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true, email })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  let reason = 'one-click'
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.reason) reason = String(body.reason).slice(0, 200)
  } catch {
    // empty body is fine
  }
  return handle(token, reason)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  return handle(token, 'gmail-preview-or-direct-get')
}
