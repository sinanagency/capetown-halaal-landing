import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Campaign, type CampaignProps } from '@/lib/email/templates/Campaign'
import { verifyCronAuth } from '@/lib/security/cron-auth'

export const maxDuration = 300

const FROM = 'Young at Heart Festival <support@youngatheart.co.za>'
const FREE_DAILY_CAP = 100 // Resend free tier = 100/day. Guard against silent overflow.
const PACE_MS = 600 // ~1.6 sends/sec, comfortably under Resend's 2/sec rate limit

type Audience = 'vendors' | 'vendors_pending' | 'vendors_approved' | 'buyers' | 'test'

/* ----- auth: Bearer CRON_SECRET (terminal) OR admin session (portal) ----- */
async function authorize(request: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  if (verifyCronAuth(request.headers.get('authorization'))) return { ok: true }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { ok: true }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const firstName = (n?: string | null) => {
  const f = (n || '').trim().split(/\s+/)[0]
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'there'
}

async function getRecipients(audience: Audience, testTo: string[]): Promise<{ email: string; name: string }[]> {
  const admin = createAdminClient()
  if (audience === 'test') return testTo.map((e) => ({ email: e, name: 'there' }))

  if (audience === 'buyers') {
    const { data } = await admin.from('ticket_buyers').select('email, name')
    return (data || []).map((r) => ({ email: r.email, name: firstName(r.name) }))
  }

  let q = admin.from('vendor_applications').select('email, contact_name')
  if (audience === 'vendors_pending') q = q.in('status', ['pending', 'info_requested'])
  else if (audience === 'vendors_approved') q = q.eq('status', 'approved')
  const { data } = await q
  return (data || []).map((r) => ({ email: r.email, name: firstName(r.contact_name) }))
}

/** Dedupe by lowercased email, drop invalids. */
function clean(list: { email: string; name: string }[]) {
  const seen = new Set<string>()
  const out: { email: string; name: string }[] = []
  for (const r of list) {
    const e = (r.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(e) || seen.has(e)) continue
    seen.add(e)
    out.push({ email: e, name: r.name })
  }
  return out
}

const personalize = (s: string | undefined, name: string) => (s ? s.replace(/\{name\}/g, name) : s)

export async function POST(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.res

  let body: {
    audience: Audience
    subject: string
    content: Omit<CampaignProps, 'unsubscribeUrl'>
    testTo?: string[]
    dryRun?: boolean
    limit?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { audience, subject, content, testTo = [], dryRun = false } = body
  if (!audience || !subject || !content?.heading) {
    return NextResponse.json({ error: 'audience, subject and content.heading are required' }, { status: 400 })
  }

  const recipients = clean(await getRecipients(audience, testTo))
  const total = recipients.length

  // Cap: never silently exceed the free-tier daily limit unless explicitly overridden.
  const cap = body.limit ?? FREE_DAILY_CAP
  const willSend = Math.min(total, cap)
  const skippedOverCap = total - willSend
  const capWarning =
    skippedOverCap > 0
      ? `Recipient list (${total}) exceeds the send cap (${cap}). Only the first ${willSend} will be sent. Raise "limit" (and your Resend plan) to send the rest.`
      : null

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      audience,
      subject,
      total,
      willSend,
      skippedOverCap,
      capWarning,
      sample: recipients.slice(0, 5).map((r) => r.email),
    })
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 })
  const resend = new Resend(apiKey)

  // Personalisation: if no {name} token anywhere, render once and reuse (fast for bulk).
  const fields = [content.heading, content.greeting, content.signoff, content.bodyHtml, ...(content.paragraphs || [])]
  const personalised = fields.some((f) => typeof f === 'string' && f.includes('{name}'))
  const unsubscribeUrl = 'mailto:support@youngatheart.co.za?subject=unsubscribe'

  let cachedHtml: string | null = null
  async function renderFor(name: string): Promise<string> {
    if (!personalised) {
      if (!cachedHtml) cachedHtml = await render(Campaign({ ...content, unsubscribeUrl }))
      return cachedHtml
    }
    return render(
      Campaign({
        ...content,
        heading: personalize(content.heading, name)!,
        greeting: personalize(content.greeting, name),
        signoff: personalize(content.signoff, name),
        bodyHtml: personalize(content.bodyHtml, name),
        paragraphs: content.paragraphs?.map((p) => personalize(p, name)!),
        unsubscribeUrl,
      })
    )
  }

  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []
  const slice = recipients.slice(0, willSend)

  for (const r of slice) {
    try {
      const html = await renderFor(r.name)
      const { error } = await resend.emails.send({
        from: FROM,
        to: r.email,
        replyTo: 'support@youngatheart.co.za',
        subject,
        html,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      })
      if (error) throw new Error(error.message)
      sent++
    } catch (e) {
      failed++
      errors.push({ email: r.email, error: (e as Error).message })
    }
    if (PACE_MS) await new Promise((res) => setTimeout(res, PACE_MS))
  }

  return NextResponse.json({
    audience,
    subject,
    total,
    sent,
    failed,
    skippedOverCap,
    capWarning,
    errors: errors.slice(0, 25),
  })
}
