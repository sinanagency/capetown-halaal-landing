import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTemplate, toE164 } from '@/lib/whatsapp'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300

// The approved MARKETING template used for broadcasts. Body:
//   "Hi {{1}}! 🎉 An update from the Young at Heart Festival:\n\n{{2}}\n\n
//    Get your tickets at tickets.youngatheart.co.za\n\nReply STOP to opt out..."
// {{1}} = first name, {{2}} = Sam's message.
const BROADCAST_TEMPLATE = 'festival_announcement'
const PACE_MS = 250 // ~4/sec, gentle on rate + messaging limits

type Audience = 'vendors' | 'attendees' | 'all'

async function authorize(request: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  const authHeader = request.headers.get('authorization')
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return { ok: true }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { ok: true }
}

const firstName = (n?: string | null) => {
  const f = (n || '').trim().split(/\s+/)[0]
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'there'
}

interface Recipient { phone: string; name: string }

// Build the recipient list for an audience, deduped by E.164. The consent gate
// (canSend, inside sendTemplate) is the real safety net: only opted_in contacts
// actually receive a marketing broadcast, and opted_out are skipped — so pulling
// raw vendor/buyer phones here is safe.
async function getRecipients(audience: Audience): Promise<Recipient[]> {
  const db = createAdminClient()
  const byPhone = new Map<string, Recipient>()
  const add = (rawPhone?: string | null, name?: string | null) => {
    if (!rawPhone) return
    const e164 = toE164(rawPhone)
    if (!e164) return
    if (!byPhone.has(e164)) byPhone.set(e164, { phone: e164, name: firstName(name) })
  }

  if (audience === 'vendors' || audience === 'all') {
    const { data } = await db.from('vendor_applications').select('phone, contact_name, business_name')
    for (const r of data || []) add(r.phone, r.contact_name || r.business_name)
  }
  if (audience === 'attendees' || audience === 'all') {
    const { data } = await db.from('ticket_buyers').select('phone, name')
    for (const r of data || []) add(r.phone, r.name)
    // Also any WhatsApp contact flagged as a buyer (covers buyers captured by the bot)
    const { data: wc } = await db.from('wa_contacts').select('wa_phone, profile_name').eq('is_buyer', true)
    for (const r of wc || []) add(r.wa_phone, r.profile_name)
  }
  return [...byPhone.values()]
}

// GET ?counts=1 → audience sizes (opted-in) for the UI to show before sending.
export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.res
  const db = createAdminClient()

  const counts: Record<string, number> = {}
  for (const aud of ['vendors', 'attendees', 'all'] as Audience[]) {
    const recips = await getRecipients(aud)
    // how many are actually reachable (opted_in, not opted_out)
    const phones = recips.map((r) => r.phone)
    let optedIn = 0
    if (phones.length) {
      const { data } = await db
        .from('wa_contacts')
        .select('wa_phone, opted_in, opted_out')
        .in('wa_phone', phones)
      const map = new Map((data || []).map((c) => [c.wa_phone, c]))
      for (const p of phones) {
        const c = map.get(p)
        if (c && c.opted_in && !c.opted_out) optedIn++
      }
    }
    counts[aud] = optedIn
    counts[`${aud}_total`] = recips.length
  }
  return NextResponse.json({ counts })
}

// POST { audience, message, test? } → send the broadcast.
export async function POST(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.res

  let body: { audience?: Audience; message?: string; test?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const message = (body.message || '').trim()
  const audience = body.audience
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (message.length > 600) return NextResponse.json({ error: 'Message too long (max 600 chars)' }, { status: 400 })
  if (!body.test && !['vendors', 'attendees', 'all'].includes(audience || '')) {
    return NextResponse.json({ error: 'Pick an audience' }, { status: 400 })
  }

  const db = createAdminClient()
  const broadcastId = randomUUID()

  // Test send: just one number, the admin's own.
  const recipients: Recipient[] = body.test
    ? [{ phone: toE164(body.test), name: 'there' }].filter((r) => r.phone) as Recipient[]
    : await getRecipients(audience as Audience)

  let sent = 0, skipped = 0, failed = 0
  const skipReasons: Record<string, number> = {}

  for (const r of recipients) {
    try {
      const res = await sendTemplate(r.phone, BROADCAST_TEMPLATE, [r.name, message], { category: 'marketing' })
      if (res.skipped) {
        skipped++
        skipReasons[res.skipped] = (skipReasons[res.skipped] || 0) + 1
      } else {
        sent++
      }
      // Log every attempt for audit.
      await db.from('wa_messages').insert({
        direction: 'out',
        wa_phone: r.phone,
        template_name: BROADCAST_TEMPLATE,
        category: 'marketing',
        body: message,
        status: res.skipped ? 'failed' : 'sent',
        error: res.skipped || null,
        provider_message_id: res.messageId || null,
        broadcast_id: broadcastId,
      })
    } catch (e) {
      failed++
      console.error('[broadcast] send error', r.phone, e)
    }
    if (PACE_MS) await new Promise((rs) => setTimeout(rs, PACE_MS))
  }

  return NextResponse.json({
    broadcastId,
    audience: body.test ? 'test' : audience,
    total: recipients.length,
    sent,
    skipped,
    failed,
    skipReasons,
  })
}
