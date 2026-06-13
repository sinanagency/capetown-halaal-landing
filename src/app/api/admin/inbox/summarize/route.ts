/**
 * POST /api/admin/inbox/summarize
 *
 * On-demand thread summary + suggested replies. Replaces the old useEffect-on-
 * select pattern (Stream-C placeholder) with an explicit operator-triggered
 * call. Caches the response for 10 minutes per thread key so flicking back
 * and forth doesn't re-burn the LLM.
 *
 * Returns:
 *   {
 *     ok: true,
 *     summary: string,          // 2-4 sentence rollup of the thread state
 *     suggested_replies: string[]  // 3 short, clickable canned chips
 *     cached_at: string         // ISO; client uses for "synced N min ago" badge
 *   }
 *
 * Drives off `askFestivalBrain` so DGX-first + Anthropic fallback wiring is
 * inherited. NEVER mentions Claude / Anthropic / OpenAI; the system prompt
 * scopes the assistant to an internal ops aide.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { askFestivalBrain } from '@/lib/festival-brain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SummarizeBody {
  thread_id: string
  force?: boolean // bypass cache
}

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; payload: Record<string, unknown> }>()

const OPS_SYSTEM = `You are an internal ops aide for the Young at Heart Festival admin team.
You are NEVER addressed by vendors or customers; you only help operators triage their inbox.
Output strictly valid JSON with two keys:
  - "summary": a 2-4 sentence plain-text rollup of where the thread stands and what the operator should do next.
  - "suggested_replies": an array of three short reply chips (max 140 chars each), in the operator's voice, plain text, no em-dashes.
Never refer to yourself as an AI, a model, or a vendor. Never mention Claude, Anthropic, OpenAI, or any provider. If the thread is empty, say so in the summary and return an empty suggested_replies array. Always reply with JSON only, no prose around it.`

async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!data || data.length === 0) return null
  return { userId: user.id }
}

interface ThreadRow {
  id: string
  thread_key: string
  channel: 'wa' | 'mail'
}

interface NormalisedMsg {
  direction: 'in' | 'out'
  body: string
  created_at: string
}

async function loadMessages(
  supabase: ReturnType<typeof createAdminClient>,
  thread: ThreadRow
): Promise<NormalisedMsg[]> {
  if (thread.channel === 'wa') {
    const { data } = (await supabase
      .from('wa_messages')
      .select('direction, body, created_at')
      .eq('wa_phone', thread.thread_key.replace(/^\+/, ''))
      .order('created_at', { ascending: true })
      .limit(40)) as unknown as { data: Array<{ direction: string; body: string | null; created_at: string }> | null }
    return (data ?? []).map((m) => ({
      direction: m.direction === 'out' ? 'out' : 'in',
      body: m.body ?? '',
      created_at: m.created_at,
    }))
  }
  const { data } = (await supabase
    .from('mail_messages')
    .select('direction, body, received_at')
    .eq('thread_id', thread.id)
    .order('received_at', { ascending: true })
    .limit(40)) as unknown as { data: Array<{ direction: string; body: string | null; received_at: string }> | null }
  return (data ?? []).map((m) => ({
    direction: m.direction === 'outbound' ? 'out' : 'in',
    body: m.body ?? '',
    created_at: m.received_at,
  }))
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    // Try to pluck the first JSON object substring (LLMs sometimes wrap)
    const m = s.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0]) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: SummarizeBody
  try {
    body = (await req.json()) as SummarizeBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.thread_id) {
    return NextResponse.json({ error: 'thread_id required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: threadRows } = (await supabase
    .from('wa_threads')
    .select('id, thread_key, channel')
    .eq('id', body.thread_id)
    .limit(1)) as unknown as { data: ThreadRow[] | null }

  if (!threadRows || threadRows.length === 0) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 })
  }
  const thread = threadRows[0]
  const cacheKey = `${thread.channel}:${thread.id}`

  if (!body.force) {
    const hit = cache.get(cacheKey)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json({ ok: true, cached: true, ...hit.payload })
    }
  }

  const msgs = await loadMessages(supabase, thread)
  if (msgs.length === 0) {
    const payload = {
      summary: 'No messages yet on this thread.',
      suggested_replies: [],
      cached_at: new Date().toISOString(),
    }
    cache.set(cacheKey, { at: Date.now(), payload })
    return NextResponse.json({ ok: true, cached: false, ...payload })
  }

  const transcript = msgs
    .slice(-20)
    .map(
      (m) =>
        `[${m.direction === 'in' ? 'them' : 'us'} ${m.created_at.slice(0, 16)}] ${m.body.slice(0, 500)}`
    )
    .join('\n')

  const user = `Channel: ${thread.channel}
Contact: ${thread.thread_key}

Transcript (oldest first):
${transcript}

Return JSON with "summary" and "suggested_replies" (3 short chips).`

  let raw: string
  try {
    raw = await askFestivalBrain([{ role: 'user', content: user }], {
      system: OPS_SYSTEM,
      maxTokens: 400,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const parsed = safeJsonParse(raw)
  if (!parsed) {
    return NextResponse.json({
      ok: true,
      cached: false,
      summary: raw.slice(0, 400),
      suggested_replies: [],
      cached_at: new Date().toISOString(),
      parse_warn: true,
    })
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
  const suggestions = Array.isArray(parsed.suggested_replies)
    ? (parsed.suggested_replies as unknown[])
        .filter((s): s is string => typeof s === 'string')
        .slice(0, 3)
        .map((s) => s.replace(/[–—]/g, ',').trim())
        .filter((s) => s.length > 0)
    : []

  const payload = {
    summary: summary.replace(/[–—]/g, ',').trim(),
    suggested_replies: suggestions,
    cached_at: new Date().toISOString(),
  }
  cache.set(cacheKey, { at: Date.now(), payload })
  return NextResponse.json({ ok: true, cached: false, ...payload })
}
