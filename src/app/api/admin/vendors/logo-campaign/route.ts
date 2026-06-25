/**
 * POST /api/admin/vendors/logo-campaign
 *
 * One-off campaign: ask every PAID vendor who has NOT uploaded a logo to add one
 * so they go live (with branding) in the public sector listings. Sends, per
 * vendor, a branded email (Resend) and a WhatsApp template (vendor_logo_reminder).
 *
 * - "Paid" = portal-state payment.status === 'paid' (the ⟦PORTAL⟧ marker is the
 *   source of truth for payment; same definition the portal dashboard uses).
 * - "No logo" = no profile.logo_path on the ⟦PORTAL⟧ marker.
 * - Idempotent: a vendor already stamped `logo_prompt_sent_at` is skipped unless
 *   { force: true }. After a send we stamp it so re-runs do not double-message.
 * - WhatsApp goes via a business-initiated template (paid vendors are usually
 *   outside the 24h window). The template `vendor_logo_reminder` must be approved
 *   in Meta first; until then sendTemplate skips observably (counted in wa_skipped).
 *
 * Body (all optional):
 *   { dryRun?: boolean, force?: boolean, limit?: number,
 *     channels?: { email?: boolean, whatsapp?: boolean } }
 *
 * Auth: owner | operator (same gate as the other admin vendor mutations) OR a
 * CRON_SECRET bearer for machine runs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOperator } from '@/lib/admin-rbac'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import { parsePortalState, updatePortalState } from '@/lib/portal-state'
import { sendEmail } from '@/lib/email/resend'
import { Campaign } from '@/lib/email/templates/Campaign'
import { sendTemplate } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PORTAL_URL = 'https://cthalaal.co.za/exhibitor/portal/profile'
const PACE_MS = 300            // ~3 sends/sec, under Resend's rate limit
const DEFAULT_LIMIT = 500      // safety cap per run

function firstName(n?: string | null): string {
  const f = (n || '').trim().split(/\s+/)[0]
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'there'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  // Auth: cron bearer OR operator session.
  if (!verifyCronAuth(req.headers.get('authorization'))) {
    const gate = await requireOperator()
    if (!gate.ok) return gate.response
  }

  const body = await req.json().catch(() => ({})) as {
    dryRun?: boolean; force?: boolean; limit?: number
    channels?: { email?: boolean; whatsapp?: boolean }
  }
  const dryRun = body.dryRun === true // live by default; pass { dryRun: true } to preview counts
  const force = body.force === true
  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), DEFAULT_LIMIT)
  const doEmail = body.channels?.email !== false
  const doWhatsapp = body.channels?.whatsapp !== false

  const db = createAdminClient()
  const { data, error } = await db
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, phone, admin_notes')
    .eq('status', 'approved')
    .order('business_name', { ascending: true })
  if (error) {
    return NextResponse.json({ error: `Could not read vendors: ${error.message}` }, { status: 500 })
  }

  type Row = {
    id: string; business_name: string; contact_name: string | null
    email: string | null; phone: string | null; admin_notes: string | null
  }

  // Build the target list: paid + no logo (+ not already messaged, unless force).
  const targets: Array<{ id: string; name: string; email: string | null; phone: string | null; already: boolean }> = []
  for (const r of (data || []) as Row[]) {
    const state = parsePortalState(r.admin_notes || '')
    const isPaid = state.payment?.status === 'paid'
    const hasLogo = !!state.profile?.logo_path
    if (!isPaid || hasLogo) continue
    const already = !!state.logo_prompt_sent_at
    targets.push({
      id: r.id,
      name: firstName(r.contact_name),
      email: r.email,
      phone: r.phone,
      already,
    })
  }

  const queue = targets.filter((t) => force || !t.already).slice(0, limit)

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      total_paid_no_logo: targets.length,
      already_messaged: targets.filter((t) => t.already).length,
      would_send: queue.length,
      channels: { email: doEmail, whatsapp: doWhatsapp },
      sample: queue.slice(0, 10).map((t) => ({ name: t.name, has_email: !!t.email, has_phone: !!t.phone })),
    })
  }

  let emailed = 0, emailFailed = 0, waSent = 0, waSkipped = 0, waFailed = 0
  const errors: Array<{ id: string; channel: string; error: string }> = []

  for (const t of queue) {
    // --- Email (Resend) ---
    if (doEmail && t.email && EMAIL_RE.test(t.email.trim())) {
      try {
        const res = await sendEmail({
          to: t.email.trim(),
          subject: 'One step left: add your logo to go live',
          react: Campaign({
            preview: 'Add your logo so shoppers see your brand in the festival listings.',
            heading: 'Upload your logo',
            greeting: `Hi ${t.name},`,
            paragraphs: [
              'Your stall at Young at Heart Festival 2026 is paid and confirmed, thank you.',
              'One step is left to go live on the public festival site: your logo. Vendors with a logo appear with their branding in the sector listings shoppers browse before the show. Vendors without one are easy to scroll past.',
              'It takes under a minute in your vendor portal.',
            ],
            cta: { label: 'Upload your logo', href: PORTAL_URL },
            signoff: 'See you in December,',
          }),
        })
        if (res.ok) emailed++
        else { emailFailed++; errors.push({ id: t.id, channel: 'email', error: res.error || 'unknown' }) }
      } catch (e) {
        emailFailed++; errors.push({ id: t.id, channel: 'email', error: (e as Error).message })
      }
    }

    // --- WhatsApp (business-initiated template) ---
    if (doWhatsapp && t.phone) {
      try {
        const res = await sendTemplate(t.phone, 'vendor_logo_reminder', [t.name], { category: 'utility' })
        if (res.skipped) { waSkipped++ }
        else if (res.messageId) { waSent++ }
        else { waFailed++; errors.push({ id: t.id, channel: 'whatsapp', error: 'no message id' }) }
      } catch (e) {
        waFailed++; errors.push({ id: t.id, channel: 'whatsapp', error: (e as Error).message })
      }
    }

    // Stamp so a re-run does not double-message this vendor.
    try {
      await updatePortalState(t.id, (s) => ({
        ...s,
        logo_prompt_sent_at: new Date().toISOString(),
      }))
    } catch {
      // non-fatal: worst case a re-run messages them again (force-guarded anyway)
    }

    await sleep(PACE_MS)
  }

  return NextResponse.json({
    ok: true,
    targeted: queue.length,
    emailed, emailFailed,
    waSent, waSkipped, waFailed,
    errors: errors.slice(0, 50),
  })
}
