// Push portal events to the admin allowlist on WhatsApp + log to the Bot Inbox.
// Keeps Samreen "in the loop in real time" per ask. Best-effort: a failure here
// never breaks the originating request — the caller catches+continues.
//
// Pattern source: project_nisria_notifications (lib/notify.ts). Same shape,
// reused here with our approved Meta templates.

import { sendTemplate, sendText, toE164 } from '@/lib/whatsapp'
import { BOT_ADMINS, type BotAdmin } from '@/lib/bot/admins'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

// EMAIL BACKSTOP for the silent-drop failure surface: Meta frequency-caps
// repeated free-text owner alerts (production: ~30% of owner WhatsApp sends to
// the two admins were dropped with "healthy ecosystem engagement", 29 of them
// actionable new-application / talk-to-human pings the team never saw). Email
// has no such cap, so for events where the admin must REACT to something
// external we ALSO email them. Admin-initiated events (approve/reject/info) are
// excluded: the admin already knows, no need to backstop their own action.
const EMAIL_BACKSTOP_EVENTS: ReadonlySet<PortalEvent> = new Set<PortalEvent>([
  'application_received',
  'vendor_support_message',
  'payment_succeeded',
  'payment_failed',
  'system_alert',
])

export type PortalEvent =
  | 'application_received'
  | 'application_approved'
  | 'application_rejected'
  | 'application_info_requested'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'document_uploaded'
  | 'vendor_support_message'
  | 'system_alert'

interface NotifyArgs {
  event: PortalEvent
  body: string // one-line summary, will be wrapped by the template
  audience?: 'all' | 'master' | 'festival_owner'
  /** E.164 to skip — e.g. the admin who just replied shouldn't be notified of
   *  their own message (used to mirror a reply to the OTHER support agent). */
  exclude?: string
}

// Logs every send to wa_messages so the Bot Inbox surfaces it next to admin
// replies — one feed for owner attention.
async function deliverOne(admin: BotAdmin, args: NotifyArgs) {
  const db = createAdminClient()
  const e164 = toE164(admin.phone)
  const firstName = admin.name.split(/\s+/)[0]

  // Inside 24h window → free-form. Otherwise approved template.
  const { data: last } = await db
    .from('wa_messages')
    .select('created_at')
    .eq('wa_phone', e164)
    .eq('direction', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
  const lastIn = last?.[0]?.created_at as string | undefined
  const inWindow = lastIn && Date.now() - new Date(lastIn).getTime() < 24 * 3600 * 1000

  // If args.body starts with a "+<digits>" or "[+<digits>...", we can extract
  // the user's phone and append a copy-paste reply command for the owner.
  // Samreen just edits the message after "to <phone>" and sends.
  const phoneMatch = args.body.match(/(?:^|\[)(\+\d{8,16})/)
  const replyHint = phoneMatch
    ? `\n\nReply with:\nto ${phoneMatch[1]} <your message>`
    : '\n\nOpen /admin/bot-inbox or reply here.'
  const text = `🛎️ ${args.event.replace(/_/g, ' ')}\n\n${args.body}${replyHint}`
  try {
    let res
    const logBody = inWindow
      ? text
      : `${args.event.replace(/_/g, ' ').toUpperCase()} - ${args.body.replace(/\s*\n\s*/g, ' · ')}`
    if (inWindow) {
      res = await sendText(e164, text)
    } else {
      res = await sendTemplate(e164, 'festival_announcement', [firstName, logBody], { category: 'marketing' })
    }
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164,
      body: logBody,
      status: res.skipped ? 'failed' : 'sent',
      provider_message_id: res.messageId || null,
      error: res.skipped || null,
    })
  } catch (e) {
    console.error('[notify] deliver failed', admin.name, (e as Error).message)
  }

  // Email backstop: WhatsApp owner alerts get frequency-capped by Meta and drop
  // silently (the failure is async, set later by a status webhook), so the WA
  // send above can never be trusted as delivered. For actionable events we ALSO
  // email the admin so the ping always lands. Best-effort, never throws.
  if (EMAIL_BACKSTOP_EVENTS.has(args.event) && admin.email) {
    try {
      const label = args.event.replace(/_/g, ' ')
      await sendEmail({
        to: admin.email,
        subject: `[YAH] ${label}: ${args.body.split('\n')[0].slice(0, 80)}`,
        text: `${args.body}\n\nOpen the admin inbox to action this: https://cthalaal.co.za/admin/bot-inbox`,
      })
    } catch (e) {
      console.error('[notify] email backstop failed', admin.name, (e as Error).message)
    }
  }
}

export async function notifyOwners(args: NotifyArgs): Promise<void> {
  const audience = args.audience || 'all'
  const excludeNorm = args.exclude ? toE164(args.exclude) : null
  const targets = BOT_ADMINS.filter((a) => {
    if (excludeNorm && toE164(a.phone) === excludeNorm) return false
    if (audience === 'all') return true
    if (audience === 'master') return a.role === 'master'
    if (audience === 'festival_owner') return a.role === 'festival_owner'
    return false
  })
  await Promise.all(targets.map((a) => deliverOne(a, args)))
}
