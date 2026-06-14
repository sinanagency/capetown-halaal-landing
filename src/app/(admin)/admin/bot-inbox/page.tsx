import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { BOT_ADMINS, adminPhones } from '@/lib/bot/admins'
import { BotInboxClient, type AdminThread, type GuestThread, type MailThread } from './BotInboxClient'
import { redirect } from 'next/navigation'
import { lookupPhones, type ContactBadge, type PhoneContact } from '@/lib/contacts/lookup-by-phone'

export const dynamic = 'force-dynamic'

interface WaMessage {
  id: string
  wa_phone: string
  direction: 'in' | 'out'
  body: string | null
  status: string | null
  created_at: string
  provider_message_id: string | null
}

const SCAN_WINDOW_DAYS = 30
const HANDOVER_ON = '[HUMAN_HANDOVER_ON]'
const HANDOVER_OFF = '[HUMAN_HANDOVER_OFF]'

export default async function BotInboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const adminCheck = createAdminClient()
  const { data: adminUser } = await adminCheck.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) redirect('/admin/login')

  const db = createAdminClient()
  const since = new Date(Date.now() - SCAN_WINDOW_DAYS * 86400000).toISOString()

  // 1) Admin threads, scoped to known admin phones (Taona, Samreen)
  const adminPhonesList = adminPhones()
  const { data: adminRows } = await db
    .from('wa_messages')
    .select('id, wa_phone, direction, body, status, created_at, provider_message_id')
    .in('wa_phone', adminPhonesList)
    .order('created_at', { ascending: false })
    .limit(500)
  const adminMessages = (adminRows || []) as WaMessage[]

  const adminThreads: AdminThread[] = BOT_ADMINS.map((admin) => {
    const mine = adminMessages.filter((m) => m.wa_phone === admin.phone)
    const latest = mine[0]
    const lastIn = mine.find((m) => m.direction === 'in')
    const unreadSinceLastOut = (() => {
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

  // 2) Guest/vendor threads. Pull every message in the last 30 days that is NOT
  //    on an admin phone. Group by wa_phone. Skip marker-only outbounds
  //    ([HUMAN_HANDOVER_*], [PENDING_ACTION:*]) from the user-visible preview.
  const { data: guestRows } = await db
    .from('wa_messages')
    .select('id, wa_phone, direction, body, status, created_at, provider_message_id')
    .gte('created_at', since)
    .not('wa_phone', 'in', `(${adminPhonesList.map((p) => `"${p}"`).join(',')})`)
    .order('created_at', { ascending: false })
    .limit(2000)
  const guestMessages = (guestRows || []) as WaMessage[]

  // Resolve every phone against vendor_applications AND ticket_buyers via
  // last-9-digit suffix matching. The previous IN-clause exact-match missed
  // rows whose vendor row was stored as +27... but wa_messages came in as 27...
  // (Meta WABA strips the leading +). Same problem for ticket buyers whose
  // phones often have a leading 0 from the WC checkout form.
  const uniquePhones = Array.from(new Set(guestMessages.map((m) => m.wa_phone)))
  const phoneContacts: Map<string, PhoneContact> = uniquePhones.length
    ? await lookupPhones(uniquePhones, db)
    : new Map<string, PhoneContact>()

  function isMarker(body: string | null): boolean {
    if (!body) return true
    return body.startsWith(HANDOVER_ON) || body.startsWith(HANDOVER_OFF) || body.startsWith('[PENDING_ACTION:') || body.startsWith('[PENDING_ACTION_DONE:')
  }
  function handoverState(mine: WaMessage[]): 'human' | 'bot' {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const recent = mine.find((m) => m.direction === 'out' && m.created_at > since24h && (m.body || '').startsWith(HANDOVER_ON))
    const recentOff = mine.find((m) => m.direction === 'out' && m.created_at > since24h && (m.body || '').startsWith(HANDOVER_OFF))
    if (!recent) return 'bot'
    if (recentOff && recentOff.created_at > recent.created_at) return 'bot'
    return 'human'
  }

  const guestThreads: GuestThread[] = uniquePhones.map((phone) => {
    const mine = guestMessages.filter((m) => m.wa_phone === phone)
    const visible = mine.filter((m) => !isMarker(m.body))
    const latest = visible[0] || mine[0]
    const lastIn = visible.find((m) => m.direction === 'in')
    const lastOutAt = visible.find((m) => m.direction === 'out')?.created_at
    const unread = lastOutAt
      ? visible.filter((m) => m.direction === 'in' && m.created_at > lastOutAt).length
      : visible.filter((m) => m.direction === 'in').length
    const c = phoneContacts.get(phone)
    return {
      phone,
      label: c?.displayName || phone,
      sublabel: c?.displayName ? phone : '',
      badge: (c?.badge || 'unknown') as ContactBadge,
      vendorApplicationId: c?.vendorApplicationId || null,
      ticketBuyerEmail: c?.ticketBuyerEmail || null,
      messages: visible,
      handover: handoverState(mine),
      latestAt: latest?.created_at || null,
      latestPreview: (latest?.body || '').slice(0, 140),
      lastInboundAt: lastIn?.created_at || null,
      unreadCount: unread,
    }
  })
    .filter((t) => t.messages.length > 0)
    .sort((a, b) => (b.latestAt || '').localeCompare(a.latestAt || ''))

  // 3) Mail threads. support@youngatheart and any other inbound mail lands in
  //    mail_messages via the IMAP mail-fetcher cron, and a row in wa_threads
  //    is upserted per from_addr. Surface those as a third section so the
  //    operator has every conversation in one place. Per Taona Message 12:
  //    "support at young at heart must show up on the bot inbox."
  let mailThreads: MailThread[] = []
  try {
    const { data: mailRows } = await db
      .from('mail_messages')
      .select('id, direction, from_addr, to_addr, subject, body_text, created_at, message_id')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    const rows = (mailRows || []) as Array<{
      id: string; direction: 'in' | 'out'; from_addr: string; to_addr: string;
      subject: string | null; body_text: string | null; created_at: string; message_id: string;
    }>
    // Group by counterpart address (the non-internal address)
    const INTERNAL = new Set([
      'support@youngatheart.co.za',
      'hello@youngatheart.co.za',
      'info@youngatheart.co.za',
    ])
    const byPeer = new Map<string, typeof rows>()
    for (const r of rows) {
      const peer = (r.direction === 'in' ? r.from_addr : r.to_addr).toLowerCase()
      if (INTERNAL.has(peer)) continue
      const arr = byPeer.get(peer) || []
      arr.push(r)
      byPeer.set(peer, arr)
    }
    mailThreads = Array.from(byPeer.entries()).map(([peer, msgs]) => {
      const latest = msgs[0]
      const lastIn = msgs.find((m) => m.direction === 'in')
      const lastOutAt = msgs.find((m) => m.direction === 'out')?.created_at
      const unread = lastOutAt
        ? msgs.filter((m) => m.direction === 'in' && m.created_at > lastOutAt).length
        : msgs.filter((m) => m.direction === 'in').length
      return {
        peer,
        subject: latest?.subject || '(no subject)',
        messages: msgs.map((m) => ({
          id: m.id,
          direction: m.direction,
          from_addr: m.from_addr,
          to_addr: m.to_addr,
          subject: m.subject,
          body: m.body_text,
          created_at: m.created_at,
        })),
        latestAt: latest?.created_at || null,
        latestPreview: (latest?.body_text || latest?.subject || '').slice(0, 140),
        lastInboundAt: lastIn?.created_at || null,
        unreadCount: unread,
      }
    }).sort((a, b) => (b.latestAt || '').localeCompare(a.latestAt || ''))
  } catch {
    // mail_messages table may not exist on stale environments — fail soft.
    mailThreads = []
  }

  return <BotInboxClient adminThreads={adminThreads} guestThreads={guestThreads} mailThreads={mailThreads} />
}
