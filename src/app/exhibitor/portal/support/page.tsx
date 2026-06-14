import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState, type SupportMessage } from '@/lib/portal-state'
import { createAdminClient } from '@/lib/supabase/admin'
import SupportThread from '@/components/exhibitor/SupportThread'
import { MessageCircle, Phone, Mail } from 'lucide-react'
import { PageShell, PageHeader, Card } from '@/components/chrome/PageChrome'

export const dynamic = 'force-dynamic'

const SUPPORT_WA = '+27 68 227 5246'
const SUPPORT_WA_E164 = '+27682275246'
const SUPPORT_EMAIL = 'support@youngatheart.co.za'

export default async function SupportPage() {
  const ctx = await getExhibitorContext()
  const state = parsePortalState(ctx?.application?.admin_notes as string)
  const businessName = (ctx?.application?.business_name as string) || ''

  // Merge in WhatsApp conversation history for this vendor so "every interaction
  // matches on the portal." Reads wa_messages by their registered phone, skips
  // marker rows ([HUMAN_HANDOVER_*], [PENDING_ACTION:*]), then folds in with
  // the existing portal_state.support messages, sorted by time.
  const portalMsgs: SupportMessage[] = state.support || []
  const phone = (ctx?.application?.phone as string) || ''
  let mergedMessages: SupportMessage[] = portalMsgs
  if (phone) {
    try {
      const db = createAdminClient()
      const { data: rows } = await db
        .from('wa_messages')
        .select('id, direction, body, created_at')
        .eq('wa_phone', phone)
        .order('created_at', { ascending: true })
        .limit(200)
      const waMessages: SupportMessage[] = (rows || [])
        .filter((r) => r.body && !String(r.body).startsWith('[') && !String(r.body).startsWith('🛎️'))
        .map((r) => ({
          id: `wa-${r.id}`,
          from: (r.direction === 'in' ? 'vendor' : 'admin') as SupportMessage['from'],
          body: String(r.body),
          at: r.created_at as string,
        }))
      mergedMessages = [...portalMsgs, ...waMessages].sort((a, b) => a.at.localeCompare(b.at))
    } catch (e) {
      console.error('[support/page] WA merge failed:', (e as Error).message)
    }
  }

  const waPrefill = businessName
    ? `Hi, this is ${businessName} from YAH Festival 2026. `
    : 'Hi, this is about my YAH Festival 2026 stall. '
  const waUrl = `https://wa.me/${SUPPORT_WA_E164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waPrefill)}`

  return (
    <PageShell>
      <PageHeader
        kicker="Inbox"
        title="Talk to the organisers"
        subtitle="Every message you send here is delivered to support on WhatsApp in real time. Support replies in this thread, or messages you on WhatsApp if it is faster."
      />

      {/* Direct WhatsApp tile at the top */}
      <Card className="mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-[#25d366]/15 text-[#1f8a4a] flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1f8a4a]">WhatsApp</p>
            <p className="font-serif text-2xl text-neutral-900 mt-0.5">{SUPPORT_WA}</p>
            <p className="text-sm text-neutral-600 mt-1">
              Support handles every vendor question personally. Voice calls are not monitored, please WhatsApp. Reply time during office hours is usually under 30 minutes.
            </p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-[#25d366] hover:bg-[#1f8a4a] text-white font-semibold rounded-full px-5 py-2.5 text-sm shrink-0 flex items-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Support now
          </a>
        </div>
      </Card>

      {/* In-portal thread, notifies support on WhatsApp + email automatically */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cd2653] mb-2">
        Or message us here
      </p>
      <SupportThread initial={mergedMessages} />
      <p className="text-[11px] text-neutral-500 mt-3 leading-relaxed">
        Every message you send below is automatically WhatsApp&apos;d to support and emailed to the support inbox. Support replies in this thread as soon as possible. Use the WhatsApp button above if you need someone live.
      </p>

      {/* Secondary channels */}
      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl p-4 hover:border-[#cd2653]/50 transition-colors"
        >
          <Mail className="w-5 h-5 text-neutral-500" />
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Email</p>
            <p className="text-sm text-neutral-900">{SUPPORT_EMAIL}</p>
          </div>
        </a>
        <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl p-4 opacity-60">
          <Phone className="w-5 h-5 text-neutral-500" />
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Voice call</p>
            <p className="text-sm text-neutral-900">Not monitored. Please WhatsApp instead.</p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
