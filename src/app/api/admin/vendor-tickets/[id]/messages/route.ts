import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch WA threads linked to this ticket
  const { data: waThreads } = await admin
    .from('wa_threads')
    .select('id, wa_phone')
    .eq('ticket_id', id)

  const comms: CommItem[] = []

  if (waThreads?.length) {
    const waPhones = waThreads.map((t) => t.wa_phone)
    for (const phone of waPhones) {
      const { data: msgs } = await admin
        .from('wa_messages')
        .select('id, direction, body, created_at, wa_phone, template_name')
        .eq('wa_phone', phone)
        .order('created_at', { ascending: false })
        .limit(200)

      for (const m of (msgs || []) as Array<{
        id: string; direction: string; body: string | null; created_at: string
        wa_phone: string; template_name: string | null
      }>) {
        const body = m.body || (m.template_name ? `[template: ${m.template_name}]` : '')
        if (!body) continue
        comms.push({
          id: `wa:${m.id}`,
          channel: 'whatsapp',
          direction: m.direction === 'in' ? 'in' : 'out',
          body,
          at: m.created_at,
          from: m.direction === 'in' ? `+${m.wa_phone}` : 'Admin',
        })
      }
    }
  }

  // Fetch support inbox threads linked to this ticket
  const { data: mailThreads } = await admin
    .from('support_inbox_threads')
    .select('id, peer_email, subject')
    .eq('ticket_id', id)

  if (mailThreads?.length) {
    const threadIds = mailThreads.map((t) => t.id)
    const { data: msgs } = await admin
      .from('support_inbox_messages')
      .select('id, thread_id, direction, from_address, to_address, subject, body_text, received_at')
      .in('thread_id', threadIds)
      .order('received_at', { ascending: false })
      .limit(500)

    const threadMap = new Map(mailThreads.map((t) => [t.id, { peer_email: t.peer_email, subject: t.subject }]))

    for (const m of (msgs || []) as Array<{
      id: string; thread_id: string; direction: string; from_address: string
      to_address: string; subject: string | null; body_text: string | null; received_at: string
    }>) {
      const thread = threadMap.get(m.thread_id)
      const body = m.body_text || m.subject || ''
      if (!body) continue
      comms.push({
        id: `mail:${m.id}`,
        channel: 'email',
        direction: m.direction === 'in' ? 'in' : 'out',
        body,
        at: m.received_at,
        from: m.direction === 'in' ? m.from_address : (thread?.peer_email || 'Admin'),
        subject: m.subject || thread?.subject || undefined,
      })
    }
  }

  comms.sort((a, b) => +new Date(b.at) - +new Date(a.at))

  return NextResponse.json({ messages: comms })
}
