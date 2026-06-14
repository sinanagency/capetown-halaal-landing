// Phone-change OTP verifier (B4, 2026-06-15).
//
// Pair of /api/exhibitor/wa-optin. When a vendor proposes a new WhatsApp
// number, the opt-in route parks the candidate phone in
// portal_state.phone_change_pending and delivers a 6-digit code via the
// utility template. This route validates the code and, on match, promotes
// the candidate phone onto vendor_applications.phone and the wa block.
//
// Failure modes guarded:
//   - missing pending entry → 400 nothing-to-verify
//   - expired pending entry (>15 min) → 400 expired, vendor re-requests
//   - >=5 failed attempts → invalidate pending, force re-request
//   - constant-time hash comparison on the OTP

import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState, parsePortalState } from '@/lib/portal-state'
import { recordConsent } from '@/lib/wa-consent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TTL_MINUTES = 15
const MAX_ATTEMPTS = 5

function hashOtp(code: string, applicationId: string): string {
  return createHash('sha256').update(`${code}:${applicationId}`).digest('hex')
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) {
    return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const code = String(body.code || '').replace(/\D/g, '').slice(0, 6)
  if (code.length !== 6) {
    return NextResponse.json({ ok: false, error: 'A 6-digit code is required.' }, { status: 400 })
  }

  const app = ctx.application
  const applicationId = app.id as string
  const contactName = (app.contact_name as string) || ctx.email

  // Read the current pending entry.
  const admin = createAdminClient()
  const { data: row } = await admin
    .from('vendor_applications')
    .select('admin_notes')
    .eq('id', applicationId)
    .single()
  const state = parsePortalState((row?.admin_notes as string) || '')
  const pending = state.phone_change_pending
  if (!pending) {
    return NextResponse.json(
      { ok: false, error: 'No pending phone change. Submit the new number again to receive a fresh code.' },
      { status: 400 }
    )
  }

  // Expiry guard.
  const ageMs = Date.now() - new Date(pending.requested_at).getTime()
  if (!Number.isFinite(ageMs) || ageMs > TTL_MINUTES * 60 * 1000) {
    await updatePortalState(applicationId, (s) => ({ ...s, phone_change_pending: undefined }))
    return NextResponse.json(
      { ok: false, error: 'That code has expired. Submit the new number again to receive a fresh code.' },
      { status: 400 }
    )
  }

  // Attempt-count guard.
  if ((pending.attempts || 0) >= MAX_ATTEMPTS) {
    await updatePortalState(applicationId, (s) => ({ ...s, phone_change_pending: undefined }))
    return NextResponse.json(
      { ok: false, error: 'Too many incorrect attempts. Submit the new number again to receive a fresh code.' },
      { status: 429 }
    )
  }

  // Constant-time hash compare.
  const candidateHash = hashOtp(code, applicationId)
  const match = constantTimeEqualHex(candidateHash, pending.code_hash)
  if (!match) {
    await updatePortalState(applicationId, (s) => ({
      ...s,
      phone_change_pending: s.phone_change_pending
        ? { ...s.phone_change_pending, attempts: (s.phone_change_pending.attempts || 0) + 1 }
        : undefined,
    }))
    const remaining = Math.max(0, MAX_ATTEMPTS - ((pending.attempts || 0) + 1))
    return NextResponse.json(
      { ok: false, error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
      { status: 400 }
    )
  }

  // SUCCESS: promote the candidate phone, clear pending, refresh consent + wa.
  const newPhone = pending.new_phone
  try {
    await admin.from('vendor_applications').update({ phone: newPhone }).eq('id', applicationId)
  } catch (e) {
    console.error('[wa-optin/verify] vendor_applications.phone update failed:', (e as Error).message)
  }

  await updatePortalState(applicationId, (s) => ({
    ...s,
    phone_change_pending: undefined,
    wa: {
      phone: newPhone,
      opted_in_at: new Date().toISOString(),
      welcome_sent: false,
    },
  }))

  try {
    await recordConsent({
      waPhone: newPhone,
      source: 'vendor_form',
      profileName: contactName,
    })
  } catch (e) {
    console.error('[wa-optin/verify] recordConsent failed:', (e as Error).message)
  }

  return NextResponse.json({ ok: true, phone: newPhone })
}
