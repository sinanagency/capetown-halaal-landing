import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { BOT_ADMINS, adminPhones } from '@/lib/bot/admins'
import { BotInboxClient, type AdminThread, type GuestThread } from './BotInboxClient'
import { redirect } from 'next/navigation'

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

  // Resolve vendor names from vendor_applications by phone (for header label)
  const uniquePhones = Array.from(new Set(guestMessages.map((m) => m.wa_phone)))
  const { data: vendorRows } = uniquePhones.length
    ? await db.from('vendor_applications').select('business_name, contact_name, phone').in('phone', uniquePhones)
    : { data: [] as Array<{ business_name?: string; contact_name?: string; phone?: string }> }
  const vendorByPhone = new Map<string, { business_name: string; contact_name: string }>()
  for (const v of vendorRows || []) {
    if (v.phone) vendorByPhone.set(v.phone, { business_name: v.business_name || '', contact_name: v.contact_name || '' })
  }

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
    const v = vendorByPhone.get(phone)
    return {
      phone,
      label: v?.business_name || v?.contact_name || phone,
      sublabel: v ? (v.business_name && v.contact_name ? v.contact_name : phone) : '',
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

  return <BotInboxClient adminThreads={adminThreads} guestThreads={guestThreads} />
}
