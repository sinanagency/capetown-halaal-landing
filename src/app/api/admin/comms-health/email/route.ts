// Live probe for email (Resend) — admin-only.
//
// History: GoDaddy SMTP was ripped on 2026-06-08 because outbound from the root
// domain landed in Gmail Promotions / Spam with no DKIM (see the doctrine block
// in src/lib/email/resend.ts). Resend is now the only outbound channel and the
// only thing left to probe. CTH-DOCTRINE Law 5 (email-throttle) governs Resend
// rate limits today, not SMTP.
//
// We reuse verifyEmailTransport() from src/lib/email/resend.ts — that helper
// already calls `resend.domains.list()` which is a free, idempotent read that
// proves the Resend API key works without sending mail. Reusing it keeps the
// admin email-health endpoint and this probe in lockstep so two surfaces can
// never disagree about the truth.
//
// throttle_hits_24h: docs/throttle-log.md is a markdown file, not a DB table,
// so we cannot count from it in a serverless request. Field returns null with
// `throttle_hits_note` explaining the contract. To populate later: drop a
// `email_throttle_events` table + log Resend 429s into it.
//
// READ-ONLY: this probe never sends mail. Law 5 compliant by construction
// (Resend domains.list has no email side-effect).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyEmailTransport } from '@/lib/email/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 30

type ProbeStatus = 'green' | 'amber' | 'red' | 'unknown'

interface EmailProbeResult {
  ok: boolean
  status: ProbeStatus
  latency_ms: number
  resend_ok: boolean
  smtp_ok: boolean | null
  smtp_note: string
  throttle_hits_24h: number | null
  throttle_hits_note: string
  error?: string
}

async function requireAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()
    return !!adminUser
  } catch {
    return false
  }
}

function mapStatus(ok: boolean, latency_ms: number): ProbeStatus {
  if (!ok) return 'red'
  if (latency_ms >= 2000) return 'amber'
  return 'green'
}

const SMTP_REMOVED_NOTE = 'godaddy_smtp_removed_2026_06_08 (resend-only)'
const THROTTLE_FILE_NOTE = 'throttle_log_is_markdown_not_db (counter unwired)'

export async function GET(_request: NextRequest): Promise<NextResponse<EmailProbeResult | { error: string }>> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      ok: false,
      status: 'unknown',
      latency_ms: 0,
      resend_ok: false,
      smtp_ok: null,
      smtp_note: SMTP_REMOVED_NOTE,
      throttle_hits_24h: null,
      throttle_hits_note: THROTTLE_FILE_NOTE,
      error: 'env_missing:RESEND_API_KEY',
    })
  }

  const t0 = Date.now()
  let resend_ok = false
  let error: string | undefined
  try {
    // 5s budget via Promise.race — verifyEmailTransport doesn't take a signal.
    const transport = await Promise.race<
      | Awaited<ReturnType<typeof verifyEmailTransport>>
      | { __timeout: true }
    >([
      verifyEmailTransport(),
      new Promise(resolve => setTimeout(() => resolve({ __timeout: true }), 5000)),
    ])
    if ('__timeout' in transport) {
      error = 'timeout_5000ms'
    } else {
      resend_ok = transport.resend.ok
      if (!resend_ok) error = transport.resend.error || 'resend_probe_failed'
    }
  } catch (e) {
    error = `probe_threw: ${(e as Error).message.slice(0, 120)}`
  }
  const latency_ms = Date.now() - t0
  const ok = resend_ok
  const status = mapStatus(ok, latency_ms)

  return NextResponse.json({
    ok,
    status,
    latency_ms,
    resend_ok,
    smtp_ok: null,
    smtp_note: SMTP_REMOVED_NOTE,
    throttle_hits_24h: null,
    throttle_hits_note: THROTTLE_FILE_NOTE,
    error,
  })
}
