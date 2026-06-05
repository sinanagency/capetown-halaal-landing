import { createAdminClient } from '@/lib/supabase/admin'
import { BOT_ADMINS, adminPhones } from '@/lib/bot/admins'
import { BotInboxClient, type AdminThread } from './BotInboxClient'

export const dynamic = 'force-dynamic'

export default async function BotInboxPage() {
  const db = createAdminClient()
  const phones = adminPhones()

  // Pull every message ever exchanged with a known admin phone. Cheap because
  // we have only 2 admin numbers today; if we add more we'll cap with a limit.
  const { data: rows } = await db
    .from('wa_messages')
    .select('id, wa_phone, direction, body, status, created_at, provider_message_id')
    .in('wa_phone', phones)
    .order('created_at', { ascending: false })
    .limit(500)

  const messages = (rows || []) as Array<{
    id: string
    wa_phone: string
    direction: 'in' | 'out'
    body: string | null
    status: string | null
    created_at: string
    provider_message_id: string | null
  }>

  // Group by admin phone, build a thread per admin (newest message first).
  const threads: AdminThread[] = BOT_ADMINS.map((admin) => {
    const mine = messages.filter((m) => m.wa_phone === admin.phone)
    const latest = mine[0]
    const lastIn = mine.find((m) => m.direction === 'in')
    const unreadSinceLastOut = (() => {
      // "Unread" = inbound messages newer than the most recent outbound.
      const lastOutAt = mine.find((m) => m.direction === 'out')?.created_at
      if (!lastOutAt) return mine.filter((m) => m.direction === 'in').length
      return mine.filter((m) => m.direction === 'in' && m.created_at > lastOutAt).length
    })()
    return {
      admin,
      messages: mine,
      latestAt: latest?.created_at || null,
      latestPreview: (latest?.body || '').slice(0, 140),
      lastInboundAt: lastIn?.created_at || null,
      unreadCount: unreadSinceLastOut,
    }
  }).sort((a, b) => (b.latestAt || '').localeCompare(a.latestAt || ''))

  return <BotInboxClient threads={threads} />
}
