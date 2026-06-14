import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { recordConsent } from '@/lib/wa-consent'
import { toE164 } from '@/lib/whatsapp'
import { normalizeEmail } from '@/lib/email-normalize'
import {
  checkIpThrottle,
  logGuardEvent,
  clientIp,
} from '@/lib/security/abuse-guard'
import { z } from 'zod'

const ENDPOINT = 'buyers'
// 10 requests per IP per 10 minutes. Public endpoint, used by the ticket
// purchase widget on cthalaal.co.za — anything beyond casual buyer cadence is
// abuse.
const MAX_PER_WINDOW = 10
const WINDOW_MIN = 10

const buyerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  whatsappOptIn: z.boolean().optional(), // legacy; opt-in is now automatic via T&C
})

// Auto opt-in (T&C basis): completing a ticket purchase = agreeing to receive
// event updates and communications. We record consent for every buyer who gave
// a phone number. STOP still hard-blocks them forever via the webhook.
async function captureWaConsent(req: NextRequest, phone?: string | null) {
  if (!phone) return
  const waPhone = toE164(phone)
  if (!waPhone) return
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
  await recordConsent({
    waPhone,
    source: 'checkout',
    ip,
    userAgent: req.headers.get('user-agent') || undefined,
    isBuyer: true,
  })
}

// POST: Create or retrieve buyer by email.
//
// V6: this endpoint used to:
//   1. echo the full buyer row back (PII leak: name + phone + ticket_count)
//   2. accept name/phone updates without ANY auth (anyone could rewrite a
//      buyer's contact info)
//   3. give different responses for new vs existing email (enumeration)
//
// Now: same-shape `{ok: true}` for new + existing. Updates to an existing row
// require either an authenticated Supabase session OR a valid magic-link
// (verified buyer cookie) — guard the rewrite path until the verification
// surface ships. Per-IP throttle. No row echo.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: true })

    const admin = createAdminClient()
    const ip = clientIp(request.headers)

    const throttle = await checkIpThrottle(admin, {
      ip,
      endpoint: ENDPOINT,
      max: MAX_PER_WINDOW,
      windowMin: WINDOW_MIN,
    })
    if (!throttle.ok) {
      await logGuardEvent(admin, {
        endpoint: ENDPOINT,
        ip,
        reason: throttle.reason!,
        fields: {},
      })
      return NextResponse.json({ ok: true }) // silent, same shape
    }
    await logGuardEvent(admin, {
      endpoint: ENDPOINT,
      ip,
      reason: 'rate_limited',
      fields: { kind: 'attempt' },
    })

    let validated: z.infer<typeof buyerSchema>
    try {
      validated = buyerSchema.parse(body)
    } catch {
      // Same shape, no enumeration of what went wrong.
      return NextResponse.json({ ok: true })
    }

    const normalizedEmail = normalizeEmail(validated.email)
    if (!normalizedEmail) return NextResponse.json({ ok: true })

    // Look up existing row by normalized email (V5).
    const { data: existing } = await admin
      .from('ticket_buyers')
      .select('id, phone')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      // V6: refuse to rewrite name/phone without a verified session. The
      // tampering attack: attacker posts {email: victim@x, phone: '+27attacker'}
      // and Sasa/Samreen now WhatsApps the attacker for that buyer.
      const wantsUpdate = Boolean(validated.name || validated.phone)
      if (wantsUpdate) {
        const supabase = await createServerSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        const sessionEmail = user?.email ? normalizeEmail(user.email) : null
        const authorised = sessionEmail && sessionEmail === normalizedEmail
        if (!authorised) {
          // Drop the field updates on the floor. Still record consent if the
          // existing row already has a phone (idempotent, no rewrite).
          await captureWaConsent(request, existing.phone)
          return NextResponse.json({ ok: true })
        }
        const updates: Record<string, string> = {}
        if (validated.name) updates.name = validated.name
        if (validated.phone) updates.phone = validated.phone
        await admin.from('ticket_buyers').update(updates).eq('id', existing.id)
      }
      await captureWaConsent(request, validated.phone || existing.phone)
      return NextResponse.json({ ok: true })
    }

    // Create new buyer. Don't echo the row.
    const { error } = await admin
      .from('ticket_buyers')
      .insert({
        email: normalizedEmail,
        name: validated.name || null,
        phone: validated.phone || null,
      })

    if (error) {
      console.error('Create buyer error:', error)
      // Same shape as success so a probe cannot distinguish.
      return NextResponse.json({ ok: true })
    }

    await captureWaConsent(request, validated.phone)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Buyer error:', error)
    return NextResponse.json({ ok: true })
  }
}
