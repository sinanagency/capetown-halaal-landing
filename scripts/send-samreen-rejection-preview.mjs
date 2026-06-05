#!/usr/bin/env node
/**
 * Send Samreen the rejection email template for review.
 *
 * Two channels in one go:
 *   1) EMAIL  — renders ApplicationRejected.tsx with a sample vendor name and
 *      delivers the EXACT HTML a rejected applicant would see to her inbox
 *      (capetownhalaal@gmail.com). Uses the project's normal sendEmail() so
 *      DKIM via Resend is preserved (anything less hits spam).
 *
 *   2) WHATSAPP — sends the approved 'vendor_announcement' template (her
 *      24h customer-service window is closed, so free-form is blocked) with
 *      a body that points her to the email and tells her she can reply
 *      directly to the bot once she's read it.
 *
 * Run from project root:
 *   node scripts/send-samreen-rejection-preview.mjs --dry    (prints what would send)
 *   node scripts/send-samreen-rejection-preview.mjs          (actually sends)
 */

import { readFileSync, existsSync } from 'fs'
// Load .env.local first, then merge in /tmp/cth-vercel-env (WHATSAPP_* secrets
// not stored locally). Nothing overwrites a value already in process.env.
function loadEnv(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i < 1 || line.trimStart().startsWith('#')) continue
    const k = line.slice(0, i).trim()
    if (process.env[k] !== undefined) continue
    process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv('.env.local')
loadEnv('/tmp/cth-vercel-env')

const DRY = process.argv.includes('--dry')

const SAMREEN_EMAIL = 'capetownhalaal@gmail.com'
const SAMREEN_WA = '+27723803393'

// Body fills {{2}} on the approved 'festival_announcement' template; {{1}} is
// the first name. Picked this template because it's the only approved one with
// a flexible body slot we can route through today; the canned footer is fine.
const COVER_FIRST_NAME = 'Samreen'
const COVER_BODY = [
  `Taona's preparing the rejection emails for the vendors who weren't accepted this year. Before any go out, he wants you to sign off the wording.`,
  `The exact template (rendered exactly as a vendor would see it) is in your inbox at capetownhalaal@gmail.com.`,
  `Reply to this bot once you've read it — 'approved' if you're happy, or send any wording changes. Whatever you send here goes straight to Taona.`,
].join(' ')

async function renderEmailReact() {
  // Dynamic-import the TSX through tsx loader so the script runs without a build step.
  const { ApplicationRejected } = await import('../src/lib/email/templates/ApplicationRejected.tsx')
  return ApplicationRejected({
    contactName: 'Samreen',
    businessName: 'Sample Vendor Co.',
  })
}

async function sendEmailPreview() {
  const { sendEmail } = await import('../src/lib/email/resend.ts')
  const react = await renderEmailReact()
  const subject = '[Review] Rejection email template — vendors not accepted for YAH 2026'
  if (DRY) {
    console.log('[DRY] would email →', SAMREEN_EMAIL, '| subject:', subject)
    return { ok: true, dry: true }
  }
  const res = await sendEmail({
    to: SAMREEN_EMAIL,
    subject,
    react,
    text: `Hi Samreen,\n\nTaona is about to send rejection emails to vendors not accepted for YAH 2026. Please review the rendered email above (this is exactly what a rejected applicant will receive — name fields are placeholders). Reply 'approved' or share any wording changes.\n\nYou can also send your reply to the WhatsApp bot — it's routed straight to Taona.\n\n— Taona`,
  })
  console.log('email send →', res)
  return res
}

async function sendWhatsAppCover() {
  const { sendTemplate } = await import('../src/lib/whatsapp.ts')
  if (DRY) {
    console.log('[DRY] would WhatsApp →', SAMREEN_WA, '| template: festival_announcement | {{1}}:', COVER_FIRST_NAME, '| {{2}}:', COVER_BODY)
    return { ok: true, dry: true }
  }
  const res = await sendTemplate(SAMREEN_WA, 'festival_announcement', [COVER_FIRST_NAME, COVER_BODY], {
    category: 'marketing',
  })
  console.log('whatsapp send →', res)

  // Log the outbound to wa_messages so the Bot Inbox shows it.
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  await sb.from('wa_messages').insert({
    direction: 'out',
    wa_phone: SAMREEN_WA,
    body: `[festival_announcement template] Hi ${COVER_FIRST_NAME}! ${COVER_BODY}`,
    status: res.skipped ? 'failed' : 'sent',
    provider_message_id: res.messageId || null,
    error: res.skipped || null,
  })
  return res
}

async function main() {
  console.log(DRY ? '— DRY RUN —' : '— LIVE SEND —')
  try {
    await sendEmailPreview()
  } catch (e) {
    console.error('email send failed:', e.message)
  }
  try {
    await sendWhatsAppCover()
  } catch (e) {
    console.error('whatsapp send failed:', e.message)
  }
  console.log('done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
