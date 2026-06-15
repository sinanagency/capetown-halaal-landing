// Live probe for WhatsApp (Meta Cloud API) — admin-only.
//
// Probe = GET /v{N}/{PHONE_NUMBER_ID}?fields=verified_name against Meta Graph
// using the same env vars the sender uses (META_WABA_TOKEN +
// META_WABA_PHONE_NUMBER_ID + META_WABA_GRAPH_VERSION, canonical per
// src/lib/whatsapp.ts). We deliberately hit the phone-number node, not /me,
// because /me with the WABA token returns a degenerate response — phone-number
// node returns 200 + verified_name when the WABA is healthy, and 4xx when the
// token or phone-number ID is bad.
//
// last_send_at = max(created_at) on wa_messages where direction='outbound'.
// (Canonical messages table is wa_messages, not a generic "messages" table.)
//
// Status mapping: ok && latency<2000=green, ok && latency>=2000=amber,
// !ok=red. Env missing => status:'unknown' with error:'env_missing:<name>'.
// READ-ONLY: this probe never sends a message (Law 5 + general safety).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 30s edge cache — matches the client poll cadence. Meta tolerates this rate.
export const revalidate = 30

type ProbeStatus = 'green' | 'amber' | 'red' | 'unknown'

interface WhatsappProbeResult {
  ok: boolean
  status: ProbeStatus
  latency_ms: number
  error?: string
  last_send_at?: string | null
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

export async function GET(_request: NextRequest): Promise<NextResponse<WhatsappProbeResult | { error: string }>> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = (process.env.META_WABA_TOKEN || '').trim()
  const phoneId = (process.env.META_WABA_PHONE_NUMBER_ID || '').trim()
  const version = (process.env.META_WABA_GRAPH_VERSION || 'v21.0').trim()

  if (!token) {
    return NextResponse.json({
      ok: false,
      status: 'unknown',
      latency_ms: 0,
      error: 'env_missing:META_WABA_TOKEN',
      last_send_at: null,
    })
  }
  if (!phoneId) {
    return NextResponse.json({
      ok: false,
      status: 'unknown',
      latency_ms: 0,
      error: 'env_missing:META_WABA_PHONE_NUMBER_ID',
      last_send_at: null,
    })
  }

  // last_send_at lookup runs in parallel with the network probe so we never
  // pay sequential latency for the dashboard.
  const admin = createAdminClient()
  const lastSendPromise: Promise<string | null> = (async () => {
    try {
      const r = await admin
        .from('wa_messages')
        .select('created_at')
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return (r.data?.created_at as string | undefined) ?? null
    } catch {
      return null
    }
  })()

  const url = `https://graph.facebook.com/${version}/${phoneId}?fields=verified_name`
  const t0 = Date.now()
  let ok = false
  let error: string | undefined
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      ok = true
    } else {
      const body = await res.text().catch(() => '')
      error = `graph_${res.status}: ${body.slice(0, 120)}`
    }
  } catch (e) {
    const msg = (e as Error).message
    error = msg.includes('aborted') || msg.includes('timeout')
      ? 'timeout_5000ms'
      : `network_error: ${msg.slice(0, 120)}`
  }
  const latency_ms = Date.now() - t0
  const last_send_at = await lastSendPromise

  const status = mapStatus(ok, latency_ms)
  return NextResponse.json({ ok, status, latency_ms, error, last_send_at })
}
