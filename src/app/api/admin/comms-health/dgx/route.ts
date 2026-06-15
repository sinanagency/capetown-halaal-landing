// Live probe for DGX (Zanii inference platform) — admin-only.
//
// Probe = GET {DGX_ENDPOINT}/models which is the OpenAI-compatible model
// listing endpoint vLLM serves on /v1/models (canonical for OpenAI clients).
// DGX_ENDPOINT already includes /v1, so we hit `${endpoint}/models`. A 200
// proves the inference server is reachable AND model-loaded; 5xx / timeout =
// substrate problem.
//
// Failover: if primary tier (DGX_ENDPOINT) fails, we probe the failover
// tier (DGX_FAILOVER_ENDPOINT) and report status:'amber' on the assumption
// the primary is hot-swapped — failover is a degraded mode. If both fail,
// status:'red'.
//
// last_run_at: we don't currently persist DGX-tagged inference runs to a
// table — the engine field on bot-inbox/summarize is in-memory only. Field
// returns null with a note. To populate later: add an `ai_runs` table and
// log each DGX call (engine, model, latency, ok) into it from dgx.ts.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 30

type ProbeStatus = 'green' | 'amber' | 'red' | 'unknown'

interface DgxProbeResult {
  ok: boolean
  status: ProbeStatus
  latency_ms: number
  tier_used: 'primary' | 'failover' | 'none'
  primary_ok: boolean | null
  failover_ok: boolean | null
  last_run_at: string | null
  last_run_note: string
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

const LAST_RUN_NOTE = 'no_ai_runs_table_yet (engine tag is in-memory only)'

interface Tier { name: 'primary' | 'failover'; endpoint: string; apiKey: string }

function tiers(): Tier[] {
  const out: Tier[] = []
  if (process.env.DGX_ENDPOINT && process.env.DGX_API_KEY) {
    out.push({
      name: 'primary',
      endpoint: process.env.DGX_ENDPOINT.replace(/\/$/, ''),
      apiKey: process.env.DGX_API_KEY,
    })
  }
  if (process.env.DGX_FAILOVER_ENDPOINT && process.env.DGX_FAILOVER_API_KEY) {
    out.push({
      name: 'failover',
      endpoint: process.env.DGX_FAILOVER_ENDPOINT.replace(/\/$/, ''),
      apiKey: process.env.DGX_FAILOVER_API_KEY,
    })
  }
  return out
}

async function probeTier(tier: Tier): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
  const t0 = Date.now()
  try {
    const res = await fetch(`${tier.endpoint}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tier.apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    const latency_ms = Date.now() - t0
    if (res.ok) return { ok: true, latency_ms }
    const body = await res.text().catch(() => '')
    return { ok: false, latency_ms, error: `${tier.name}_${res.status}: ${body.slice(0, 120)}` }
  } catch (e) {
    const latency_ms = Date.now() - t0
    const msg = (e as Error).message
    return {
      ok: false,
      latency_ms,
      error: msg.includes('aborted') || msg.includes('timeout')
        ? `${tier.name}_timeout_5000ms`
        : `${tier.name}_network: ${msg.slice(0, 120)}`,
    }
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse<DgxProbeResult | { error: string }>> {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const list = tiers()
  if (list.length === 0) {
    return NextResponse.json({
      ok: false,
      status: 'unknown',
      latency_ms: 0,
      tier_used: 'none',
      primary_ok: null,
      failover_ok: null,
      last_run_at: null,
      last_run_note: LAST_RUN_NOTE,
      error: 'env_missing:DGX_ENDPOINT',
    })
  }

  let primary_ok: boolean | null = null
  let failover_ok: boolean | null = null
  let tier_used: DgxProbeResult['tier_used'] = 'none'
  let ok = false
  let latency_ms = 0
  let error: string | undefined

  for (const tier of list) {
    const result = await probeTier(tier)
    if (tier.name === 'primary') primary_ok = result.ok
    if (tier.name === 'failover') failover_ok = result.ok
    if (result.ok) {
      ok = true
      tier_used = tier.name
      latency_ms = result.latency_ms
      break
    }
    error = result.error
    latency_ms = result.latency_ms
  }

  // Status mapping:
  //   primary green + fast => green
  //   primary green + slow => amber
  //   primary red, failover green => amber (degraded mode)
  //   both red => red
  let status: ProbeStatus
  if (!ok) {
    status = 'red'
  } else if (tier_used === 'failover') {
    status = 'amber'
  } else if (latency_ms >= 2000) {
    status = 'amber'
  } else {
    status = 'green'
  }

  return NextResponse.json({
    ok,
    status,
    latency_ms,
    tier_used,
    primary_ok,
    failover_ok,
    last_run_at: null,
    last_run_note: LAST_RUN_NOTE,
    error: ok ? undefined : error,
  })
}
