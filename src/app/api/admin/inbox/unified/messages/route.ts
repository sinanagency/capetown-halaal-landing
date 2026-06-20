// Unified thread view — all messages for a CONTACT across WhatsApp + email.
// Takes the contact's phone and/or email directly (the unified list provides
// both), so it works for ticketed AND ticketless conversations. No wa_threads.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CommItem {
  id: string
  channel: 'whatsapp' | 'email'
  direction: 'in' | 'out'
  body: string
  at: string
  from: string
  subject?: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const phone = (url.searchParams.get('phone') || '').trim()
  const email = (url.searchParams.get('email') || '').trim().toLowerCase()

  const comms: CommItem[] = []

  // ---- WhatsApp by phone (both +27… and 27… forms) ----
  if (phone) {
    const noPlus = phone.replace(/^\+/, '')
    const { data: msgs } = await db
      .from('wa_messages')
      .select('id, direction, body, created_at, wa_phone, template_name')
      .or(`wa_phone.eq.+${noPlus},wa_phone.eq.${noPlus}`)
      .order('created_at', { ascending: true })
      .limit(400)
    for (const m of (msgs || []) as Array<{ id: string; direction: string; body: string | null; created_at: string; wa_phone: string; template_name: string | null }>) {
      const body = m.body || (m.template_name ? `[template: ${m.template_name}]` : '')
      if (!body) continue
      if (/^\s*\[[A-Z_]+\]/.test(body) || /HUMAN_HANDOVER/.test(body)) continue
      comms.push({
        id: `wa:${m.id}`,
        channel: 'whatsapp',
        direction: m.direction === 'in' ? 'in' : 'out',
        body,
        at: m.created_at,
        from: m.direction === 'in' ? `+${m.wa_phone.replace(/^\+/, '')}` : 'Team',
      })
    }
  }

  // ---- Email by peer_email ----
  if (email) {
    const { data: threads } = await db
      .from('support_inbox_threads')
      .select('id, peer_email, subject')
      .ilike('peer_email', email)
    if (threads?.length) {
      const ids = threads.map((t) => t.id)
      const { data: msgs } = await db
        .from('support_inbox_messages')
        .select('id, thread_id, direction, from_address, subject, body_text, received_at')
        .in('thread_id', ids)
        .order('received_at', { ascending: true })
        .limit(500)
      const subjById = new Map(threads.map((t) => [t.id, t.subject]))
      for (const m of (msgs || []) as Array<{ id: string; thread_id: string; direction: string; from_address: string; subject: string | null; body_text: string | null; received_at: string }>) {
        const body = m.body_text || m.subject || ''
        if (!body) continue
        comms.push({
          id: `mail:${m.id}`,
          channel: 'email',
          direction: m.direction === 'in' ? 'in' : 'out',
          body,
          at: m.received_at,
          from: m.direction === 'in' ? m.from_address : 'Team',
          subject: m.subject || subjById.get(m.thread_id) || undefined,
        })
      }
    }
  }

  comms.sort((a, b) => +new Date(a.at) - +new Date(b.at))
  return NextResponse.json({ messages: comms })
}
