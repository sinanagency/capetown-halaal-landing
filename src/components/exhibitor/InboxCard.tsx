import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/whatsapp'
import { Card } from '@/components/chrome/PageChrome'
import { Inbox, MessageCircle } from 'lucide-react'
import InboxComposer from './InboxComposer'

interface ThreadMessage {
  id: string
  direction: 'in' | 'out'
  body: string | null
  template_name: string | null
  status: string | null
  created_at: string
  channel: 'whatsapp' | 'email' | 'portal'
}

interface Props {
  vendorPhone: string | null | undefined
  vendorEmail: string | null | undefined
  applicationId: string | null | undefined
}

// Last 5 messages between vendor and admin (wa_messages + mail_messages).
// Mail messages are merged in only if the table exists in this environment.
async function loadThread({ vendorPhone, vendorEmail }: Props): Promise<ThreadMessage[]> {
  const db = createAdminClient()
  const e164 = vendorPhone ? toE164(vendorPhone) : ''
  const waPhone = e164.replace(/^\+/, '')

  const wa: ThreadMessage[] = []
  if (waPhone) {
    const { data } = await db
      .from('wa_messages')
      .select('id, direction, body, template_name, status, created_at, metadata')
      .eq('wa_phone', waPhone)
      .order('created_at', { ascending: false })
      .limit(20)
    for (const r of data || []) {
      const meta = (r.metadata || {}) as Record<string, unknown>
      const isPortal = meta.sender_type === 'vendor_portal'
      wa.push({
        id: r.id,
        direction: r.direction as 'in' | 'out',
        body: r.body,
        template_name: r.template_name,
        status: r.status,
        created_at: r.created_at,
        channel: isPortal ? 'portal' : 'whatsapp',
      })
    }
  }

  // Optional mail_messages join. Schema (when present) is assumed compatible:
  // direction in('in','out'), to_email, from_email, subject, body, created_at.
  const mail: ThreadMessage[] = []
  if (vendorEmail) {
    try {
      const { data, error } = await db
        .from('mail_messages')
        .select('id, direction, body, subject, created_at')
        .or(`to_email.ilike.${vendorEmail},from_email.ilike.${vendorEmail}`)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!error) {
        for (const r of data || []) {
          mail.push({
            id: String(r.id),
            direction: (r.direction || 'out') as 'in' | 'out',
            body: r.subject ? `${r.subject}\n${r.body || ''}` : (r.body || ''),
            template_name: null,
            status: null,
            created_at: r.created_at,
            channel: 'email',
          })
        }
      }
    } catch {
      // Table not provisioned yet — fall back to WA-only.
    }
  }

  return [...wa, ...mail]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5)
}

/**
 * Compute whether the admin has replied since the last vendor portal message.
 * Used by both the InboxCard header and the PortalNav notification dot.
 *
 * Rule: there is an unread admin message when the most recent admin outbound
 * message timestamp is AFTER the most recent vendor_portal inbound timestamp.
 */
export async function hasUnreadAdminReply(opts: {
  vendorPhone: string | null | undefined
}): Promise<boolean> {
  const e164 = opts.vendorPhone ? toE164(opts.vendorPhone) : ''
  const waPhone = e164.replace(/^\+/, '')
  if (!waPhone) return false
  const db = createAdminClient()
  const { data } = await db
    .from('wa_messages')
    .select('direction, created_at, metadata')
    .eq('wa_phone', waPhone)
    .order('created_at', { ascending: false })
    .limit(20)

  let lastAdminOut: number | null = null
  let lastVendorPortalIn: number | null = null
  for (const r of data || []) {
    const t = +new Date(r.created_at)
    const meta = (r.metadata || {}) as Record<string, unknown>
    if (r.direction === 'out' && lastAdminOut === null) lastAdminOut = t
    if (r.direction === 'in' && meta.sender_type === 'vendor_portal' && lastVendorPortalIn === null) {
      lastVendorPortalIn = t
    }
    if (lastAdminOut !== null && lastVendorPortalIn !== null) break
  }
  if (lastAdminOut === null) return false
  if (lastVendorPortalIn === null) return true
  return lastAdminOut > lastVendorPortalIn
}

export default async function InboxCard(props: Props) {
  const messages = await loadThread(props)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#1B1A17]">
          <Inbox className="w-4 h-4 text-[#cd2653]" />
          <p className="font-semibold">Inbox</p>
        </div>
        <a href="/exhibitor/portal/support" className="text-xs text-[#cd2653] hover:underline">Open full thread</a>
      </div>

      {messages.length === 0 ? (
        <div className="text-sm text-[#1B1A17]/55 py-4 text-center">
          <MessageCircle className="w-5 h-5 mx-auto mb-2 text-[#1B1A17]/30" />
          No messages yet. Send a note below and the organisers will get back to you.
        </div>
      ) : (
        <ul className="space-y-2 mb-4">
          {messages.map((m) => {
            const fromVendor = m.direction === 'in'
            return (
              <li key={`${m.channel}-${m.id}`} className={`flex ${fromVendor ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm ${fromVendor ? 'bg-[#cd2653] text-white' : 'bg-[#F2EBD8] text-[#1B1A17]'}`}>
                  <p className="whitespace-pre-wrap break-words">
                    {m.body || (m.template_name ? `Template: ${m.template_name}` : '...')}
                  </p>
                  <p className={`text-[10px] mt-1 ${fromVendor ? 'text-white/70' : 'text-[#1B1A17]/55'}`}>
                    {fromVendor ? 'You' : 'Organisers'} ·{' '}
                    {new Date(m.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {m.channel === 'email' ? ' · email' : ''}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <InboxComposer />
    </Card>
  )
}
