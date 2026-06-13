// Push portal events to the admin allowlist on WhatsApp + log to the Bot Inbox.
// Keeps Samreen "in the loop in real time" per ask. Best-effort: a failure here
// never breaks the originating request — the caller catches+continues.
//
// Pattern source: project_nisria_notifications (lib/notify.ts). Same shape,
// reused here with our approved Meta templates.

import { sendTemplate, sendText, toE164 } from '@/lib/whatsapp'
import { BOT_ADMINS, type BotAdmin } from '@/lib/bot/admins'
import { createAdminClient } from '@/lib/supabase/admin'

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
    if (inWindow) {
      res = await sendText(e164, text)
    } else {
      // festival_announcement {{1}}=name, {{2}}=body. Template strips newlines
      // in substitutions, so flatten the body for the WA channel only.
      const flat = `${args.event.replace(/_/g, ' ').toUpperCase()} - ${args.body.replace(/\s*\n\s*/g, ' · ')}`
      res = await sendTemplate(e164, 'festival_announcement', [firstName, flat], { category: 'marketing' })
    }
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164,
      body: inWindow ? text : `[festival_announcement] ${args.body}`,
      status: res.skipped ? 'failed' : 'sent',
      provider_message_id: res.messageId || null,
      error: res.skipped || null,
    })
  } catch (e) {
    console.error('[notify] deliver failed', admin.name, (e as Error).message)
  }
}

export async function notifyOwners(args: NotifyArgs): Promise<void> {
  const audience = args.audience || 'all'
  const targets = BOT_ADMINS.filter((a) => {
    if (audience === 'all') return true
    if (audience === 'master') return a.role === 'master'
    if (audience === 'festival_owner') return a.role === 'festival_owner'
    return false
  })
  await Promise.all(targets.map((a) => deliverOne(a, args)))
}
