// Unified inbox list — merges WhatsApp + email into ONE conversation list.
//
// A conversation = a CONTACT (person), keyed by phone and/or email. Built at
// query time with NO dependency on wa_threads (which doesn't exist in this prod
// DB — DDL blocked, Law 8; the old inbox spine silently errored on it):
//   - WhatsApp: aggregate wa_messages by wa_phone.
//   - Email: support_inbox_threads by peer_email.
//   - Resolve each phone/email to a vendor_application so a vendor's WhatsApp
//     and email collapse into ONE row.
//
// Returns a contact list the unified inbox renders, plus per-contact phone/email
// so the thread view + reply can act on either channel.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Contact {
  id: string                 // synthetic: vendor:<id> | wa:<phone> | mail:<email>
  business_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  channels: Array<'whatsapp' | 'email'>
  identity: 'vendor' | 'ticket_buyer' | 'unknown'
  last_message_at: string | null
  last_preview: string | null
  unread_count: number
  application_id: string | null
  status: string             // ticket status if any, else 'open'
}

const norm = (p: string) => p.replace(/^\+/, '')
const isMarker = (b: string) => /^\s*\[[A-Z_]+\]/.test(b) || /HUMAN_HANDOVER/.test(b)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const channelFilter = (url.searchParams.get('channel') || 'all') as 'all' | 'whatsapp' | 'email'

  // ---- Resolution maps: phone -> vendor, email -> vendor ----
  const { data: apps } = await db
    .from('vendor_applications')
    .select('id, business_name, contact_name, phone, email')
    .limit(2000)
  const byPhone = new Map<string, { id: string; business_name: string | null; contact_name: string | null; email: string | null }>()
  const byEmail = new Map<string, { id: string; business_name: string | null; contact_name: string | null; phone: string | null }>()
  for (const a of (apps || []) as Array<{ id: string; business_name: string | null; contact_name: string | null; phone: string | null; email: string | null }>) {
    if (a.phone) byPhone.set(norm(a.phone), { id: a.id, business_name: a.business_name, contact_name: a.contact_name, email: a.email })
    if (a.email) byEmail.set(a.email.toLowerCase(), { id: a.id, business_name: a.business_name, contact_name: a.contact_name, phone: a.phone })
  }

  // Ticket status by application id (for the status pill).
  const { data: tickets } = await db
    .from('vendor_tickets')
    .select('vendor_application_id, ticket_buyer_email, status, unread_count')
  const ticketStatusByApp = new Map<string, string>()
  const ticketStatusByEmail = new Map<string, string>()
  for (const t of (tickets || []) as Array<{ vendor_application_id: string | null; ticket_buyer_email: string | null; status: string }>) {
    if (t.vendor_application_id) ticketStatusByApp.set(t.vendor_application_id, t.status)
    if (t.ticket_buyer_email) ticketStatusByEmail.set(t.ticket_buyer_email.toLowerCase(), t.status)
  }

  // Contacts keyed by a stable conversation key (vendor id if resolved, else
  // the raw phone/email) so a vendor's WhatsApp + email merge into one.
  const contacts = new Map<string, Contact>()
  const keyFor = (vendorId: string | null, phone: string | null, email: string | null) =>
    vendorId ? `vendor:${vendorId}` : phone ? `wa:${norm(phone)}` : `mail:${(email || '').toLowerCase()}`

  function touch(c: Partial<Contact> & { phone?: string | null; email?: string | null }, at: string | null, preview: string, unread: number, channel: 'whatsapp' | 'email') {
    const phone = c.phone || null
    const email = c.email || null
    const vendorId = c.application_id || null
    const key = keyFor(vendorId, phone, email)
    const existing = contacts.get(key)
    if (!existing) {
      contacts.set(key, {
        id: key,
        business_name: c.business_name || null,
        contact_name: c.contact_name || null,
        phone, email,
        channels: [channel],
        identity: c.identity || 'unknown',
        last_message_at: at,
        last_preview: preview.slice(0, 120),
        unread_count: unread,
        application_id: vendorId,
        status: c.status || 'open',
      })
    } else {
      if (!existing.channels.includes(channel)) existing.channels.push(channel)
      if (phone && !existing.phone) existing.phone = phone
      if (email && !existing.email) existing.email = email
      if (c.business_name && !existing.business_name) existing.business_name = c.business_name
      if (at && (!existing.last_message_at || new Date(at) > new Date(existing.last_message_at))) {
        existing.last_message_at = at
        existing.last_preview = preview.slice(0, 120)
      }
      existing.unread_count += unread
    }
  }

  // ---- WhatsApp: aggregate wa_messages by phone ----
  if (channelFilter !== 'email') {
    const { data: wa } = await db
      .from('wa_messages')
      .select('wa_phone, direction, body, created_at')
      .order('created_at', { ascending: false })
      .limit(2000)
    const seenPhone = new Set<string>()
    for (const m of (wa || []) as Array<{ wa_phone: string; direction: string; body: string | null; created_at: string }>) {
      const phone = norm(m.wa_phone || '')
      if (!phone) continue
      const body = (m.body || '').trim()
      if (isMarker(body)) continue
      const vendor = byPhone.get(phone)
      const appId = vendor?.id || null
      const status = appId ? (ticketStatusByApp.get(appId) || 'open') : 'open'
      // Only the FIRST (most recent) message per phone sets the preview/time.
      const isFirst = !seenPhone.has(phone)
      seenPhone.add(phone)
      touch(
        {
          phone: `+${phone}`,
          email: vendor?.email || null,
          business_name: vendor?.business_name || null,
          contact_name: vendor?.contact_name || null,
          application_id: appId,
          identity: appId ? 'vendor' : 'unknown',
          status,
        },
        isFirst ? m.created_at : null,
        isFirst ? (body || '[no text]') : '',
        m.direction === 'in' && isFirst ? 1 : 0,
        'whatsapp',
      )
    }
  }

  // ---- Email: support_inbox_threads by peer_email ----
  if (channelFilter !== 'whatsapp') {
    const { data: threads } = await db
      .from('support_inbox_threads')
      .select('peer_email, peer_name, subject, last_handled_at, unread_count, created_at')
      .order('last_handled_at', { ascending: false, nullsFirst: false })
      .limit(1000)
    for (const t of (threads || []) as Array<{ peer_email: string; peer_name: string | null; subject: string | null; last_handled_at: string | null; unread_count: number | null; created_at: string }>) {
      const email = (t.peer_email || '').toLowerCase()
      if (!email) continue
      const vendor = byEmail.get(email)
      const appId = vendor?.id || null
      const status = appId ? (ticketStatusByApp.get(appId) || 'open') : (ticketStatusByEmail.get(email) || 'open')
      touch(
        {
          email,
          phone: vendor?.phone || null,
          business_name: vendor?.business_name || null,
          contact_name: t.peer_name || vendor?.contact_name || null,
          application_id: appId,
          identity: appId ? 'vendor' : (ticketStatusByEmail.has(email) ? 'ticket_buyer' : 'unknown'),
          status,
        },
        t.last_handled_at || t.created_at,
        t.subject || '[email]',
        t.unread_count || 0,
        'email',
      )
    }
  }

  const list = Array.from(contacts.values()).sort(
    (a, b) => +new Date(b.last_message_at || 0) - +new Date(a.last_message_at || 0),
  )

  const counts = {
    all: list.length,
    whatsapp: list.filter((c) => c.channels.includes('whatsapp')).length,
    email: list.filter((c) => c.channels.includes('email')).length,
    unread: list.reduce((s, c) => s + (c.unread_count > 0 ? 1 : 0), 0),
  }

  return NextResponse.json({ contacts: list.slice(0, 500), counts })
}
