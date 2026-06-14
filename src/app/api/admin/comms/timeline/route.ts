/**
 * GET /api/admin/comms/timeline?contactId=<uuid>&phone=<e164>&email=<lower>
 *
 * Aggregated unified timeline for one contact across:
 *   - wa_messages (matched by last-9 digits of phone, mirrors the existing
 *     vendor-thread route's matching strategy)
 *   - support_inbox_messages (matched by support_inbox_threads.peer_email
 *     case-insensitive)
 *   - vendor_applications.admin_notes (stripped of marker blocks, surfaced as
 *     a single "note" row keyed on updated_at)
 *
 * Each row is normalised to:
 *   { id, channel, direction, body, at, source, source_label, meta }
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface TimelineRow {
  id: string
  channel: 'whatsapp' | 'email' | 'note'
  direction: 'in' | 'out' | 'note'
  body: string
  at: string
  source: string
  source_label: string
  meta?: Record<string, unknown>
}

// Strip the marker blocks (⟦STALL:..⟧, ⟦PORTAL:..⟧, ⟦DOCS:..⟧, etc.) so the
// note we surface is just human prose.
function stripMarkers(notes: string | null | undefined): string {
  if (!notes) return ''
  return notes
    .replace(/⟦STALL:[^⟧]+⟧/g, '')
    .replace(/⟦PORTAL:[^⟧]+⟧/g, '')
    .replace(/⟦DOCS:[^⟧]+⟧/g, '')
    .replace(/⟦CONTRACT_SIGNED⟧/g, '')
    .replace(/⟦PAID⟧/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const contactId = (sp.get('contactId') || '').trim()
  const phoneRaw = (sp.get('phone') || '').trim()
  const emailRaw = (sp.get('email') || '').trim().toLowerCase()

  const rows: TimelineRow[] = []

  // -------- WhatsApp (last-9 digit match, same as vendor-thread route) ------
  if (phoneRaw) {
    const digits = phoneRaw.replace(/[^0-9]/g, '')
    const last9 = digits.slice(-9)
    if (last9.length >= 9) {
      const { data: waMsgs } = await db
        .from('wa_messages')
        .select('id, direction, body, created_at, template_name, status, wa_phone, error')
        .filter('wa_phone', 'like', `%${last9}`)
        .order('created_at', { ascending: false })
        .limit(200)

      for (const m of (waMsgs || []) as Array<{
        id: string
        direction: 'in' | 'out'
        body: string | null
        created_at: string
        template_name: string | null
        status: string | null
        wa_phone: string
        error: string | null
      }>) {
        const body = m.body || (m.template_name ? `[template: ${m.template_name}]` : '')
        if (!body) continue
        rows.push({
          id: `wa:${m.id}`,
          channel: 'whatsapp',
          direction: m.direction === 'in' ? 'in' : 'out',
          body,
          at: m.created_at,
          source: `wa:${m.wa_phone}`,
          source_label: `WhatsApp +${m.wa_phone}`,
          meta: {
            template_name: m.template_name || undefined,
            status: m.status || undefined,
            error: m.error || undefined,
          },
        })
      }
    }
  }

  // -------- Email via support_inbox (peer_email ilike) ----------------------
  if (emailRaw) {
    const { data: threads } = await db
      .from('support_inbox_threads')
      .select('id, peer_email, peer_name, subject')
      .ilike('peer_email', emailRaw)
      .limit(20)
    const threadIds = ((threads || []) as Array<{ id: string }>).map((t) => t.id)
    if (threadIds.length) {
      const threadMap = new Map<string, { peer_email: string; subject: string | null }>()
      for (const t of (threads || []) as Array<{ id: string; peer_email: string; subject: string | null }>) {
        threadMap.set(t.id, { peer_email: t.peer_email, subject: t.subject })
      }
      const { data: msgs } = await db
        .from('support_inbox_messages')
        .select('id, thread_id, direction, from_address, to_address, subject, body_text, received_at, provider')
        .in('thread_id', threadIds)
        .order('received_at', { ascending: false })
        .limit(500)
      for (const m of (msgs || []) as Array<{
        id: string
        thread_id: string
        direction: 'in' | 'out'
        from_address: string
        to_address: string
        subject: string | null
        body_text: string | null
        received_at: string
        provider: string | null
      }>) {
        const thread = threadMap.get(m.thread_id)
        rows.push({
          id: `mail:${m.id}`,
          channel: 'email',
          direction: m.direction === 'in' ? 'in' : 'out',
          body: m.body_text || m.subject || '',
          at: m.received_at,
          source: `mail:${m.thread_id}`,
          source_label: thread?.subject ? `Email: ${thread.subject}` : `Email: ${thread?.peer_email || emailRaw}`,
          meta: {
            subject: m.subject || undefined,
            from: m.from_address,
            to: m.to_address,
            provider: m.provider || undefined,
          },
        })
      }
    }
  }

  // -------- Admin note (single row from vendor_applications.admin_notes) ----
  if (contactId) {
    const { data: app } = await db
      .from('vendor_applications')
      .select('id, admin_notes, updated_at')
      .eq('id', contactId)
      .maybeSingle()
    if (app) {
      const note = stripMarkers((app as { admin_notes: string | null }).admin_notes)
      if (note) {
        rows.push({
          id: `note:${(app as { id: string }).id}`,
          channel: 'note',
          direction: 'note',
          body: note,
          at: (app as { updated_at: string | null }).updated_at || new Date().toISOString(),
          source: `app:${(app as { id: string }).id}`,
          source_label: 'Admin notes',
        })
      }
    }
  }

  rows.sort((a, b) => +new Date(b.at) - +new Date(a.at))

  return NextResponse.json({ rows })
}
