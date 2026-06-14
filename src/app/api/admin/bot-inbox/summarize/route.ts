// AI summary + suggested replies for a single WhatsApp thread.
// Used by /admin/bot-inbox to give Samreen a fast read on what each
// conversation is about + 3 reply suggestions she can tap-to-send.

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { askDgx, dgxConfigured, DgxNotConfigured } from '@/lib/llm/dgx'
import { toE164 } from '@/lib/whatsapp'

// If DGX is unset, fall back to Anthropic Haiku (already installed + used by
// /api/admin/inbox/summarize). Never block the bot-inbox UI on DGX availability.
async function askLLM(systemPrompt: string, msgs: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
  if (dgxConfigured()) {
    try {
      return await askDgx(
        [{ role: 'system' as const, content: systemPrompt }, ...msgs],
        { maxTokens: 600 },
      )
    } catch (e) {
      if (!(e instanceof DgxNotConfigured)) throw e
      console.warn('[bot-inbox/summarize] DGX not configured, falling back to Anthropic')
    }
  } else {
    console.warn('[bot-inbox/summarize] DGX not configured, using Anthropic fallback')
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No summary engine available (neither DGX nor ANTHROPIC_API_KEY)')
  const client = new Anthropic({ apiKey })
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 600,
    system: systemPrompt,
    messages: msgs,
  })
  const block = resp.content[0]
  return block && block.type === 'text' ? block.text : ''
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM = `You are summarising a WhatsApp conversation between a festival vendor and the Young at Heart Festival 2026 organisers.

Return STRICT JSON ONLY, with exactly this shape:
{
  "summary": "<one short sentence describing what the vendor is asking or needs>",
  "context": "<one short sentence with relevant facts: payment status, stall code, urgency, etc. Empty string if nothing>",
  "suggestions": ["<short reply 1>", "<short reply 2>", "<short reply 3>"]
}

Suggestions should be warm but practical. Address the vendor by name when known. Refer to payments / portal / stall details when relevant. Keep each suggestion under 240 chars. Do NOT include any prefix like "Reply 1:" , just the message body verbatim.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const phone = String(body.phone || '').trim()
  if (!phone) return NextResponse.json({ ok: false, error: 'phone required' }, { status: 400 })
  const e164 = toE164(phone)

  // Pull last 20 messages on this thread
  const { data: rows } = await db
    .from('wa_messages')
    .select('direction, body, created_at')
    .eq('wa_phone', e164)
    .order('created_at', { ascending: false })
    .limit(20)
  const msgs = (rows || []).reverse()
    .filter((m) => m.body && !String(m.body).startsWith('['))
    .map((m) => ({ role: m.direction === 'in' ? 'user' as const : 'assistant' as const, content: String(m.body) }))

  if (msgs.length === 0) {
    return NextResponse.json({ ok: true, summary: 'No messages yet.', context: '', suggestions: [] })
  }

  // Resolve vendor info for context
  const { data: vendor } = await db
    .from('vendor_applications')
    .select('business_name, contact_name, status, admin_notes, preferred_booth_tier, payment_due_date')
    .eq('phone', e164)
    .maybeSingle()
  const vendorBriefing = vendor
    ? `Vendor name: ${vendor.contact_name || 'unknown'}. Business: ${vendor.business_name || 'unknown'}. Application status: ${vendor.status}. Booth: ${vendor.preferred_booth_tier || 'TBD'}. Payment due: ${vendor.payment_due_date || 'TBD'}.`
    : `This phone (${e164}) is not a registered vendor.`

  const systemFull = `${SYSTEM}\n\n=== VENDOR INFO ===\n${vendorBriefing}\n\n=== INSTRUCTIONS ===\nUse the vendor's first name if known. Refer to specifics where it helps. The conversation messages follow next.`

  try {
    const raw = await askLLM(systemFull, msgs)
    // Strip any code fences or prose around the JSON.
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ ok: true, summary: raw.slice(0, 200), context: '', suggestions: [] })
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      ok: true,
      summary: String(parsed.summary || '').slice(0, 240),
      context: String(parsed.context || '').slice(0, 240),
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3).map((s: unknown) => String(s).slice(0, 280))
        : [],
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
