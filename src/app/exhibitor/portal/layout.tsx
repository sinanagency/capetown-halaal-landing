import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getExhibitorContext } from '@/lib/exhibitor'
import PortalNav from '@/components/exhibitor/PortalNav'
import { parsePortalState } from '@/lib/portal-state'
import { WaOptInBanner } from '@/components/exhibitor/WaOptInBanner'
import { hasUnreadAdminReply } from '@/components/exhibitor/InboxCard'

export const dynamic = 'force-dynamic'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getExhibitorContext()
  if (!ctx) redirect('/exhibitor/login')
  if (ctx.mustChangePassword) redirect('/exhibitor/set-password')

  // Contract sign gate: approved vendors who haven't signed yet must sign
  // before they can use the rest of the portal. The /contract route itself
  // is exempt (otherwise we redirect-loop).
  const app = ctx.application as any
  if (app?.status === 'approved' && !app?.contract_signed_at) {
    const h = await headers()
    const path = h.get('x-invoke-path') || h.get('next-url') || h.get('referer') || ''
    if (!path.includes('/exhibitor/portal/contract')) {
      redirect('/exhibitor/portal/contract')
    }
  }

  const businessName = (ctx.application?.business_name as string) || ctx.email
  const state = parsePortalState((ctx.application?.admin_notes as string) || null)
  const showWaBanner = !state.wa?.opted_in_at
  const contactName = (ctx.application?.contact_name as string) || ctx.email
  const firstName = (contactName || '').trim().split(/\s+/)[0] || ''
  const prefillPhone = (ctx.application?.phone as string) || ''
  const inboxUnread = await hasUnreadAdminReply({ vendorPhone: prefillPhone })

  return (
    <div className="min-h-screen bg-[#F6F2E8] text-[#1B1A17]">
      <PortalNav businessName={businessName} inboxUnread={inboxUnread} />
      {showWaBanner && <WaOptInBanner prefillPhone={prefillPhone} firstName={firstName} />}
      <main>{children}</main>
    </div>
  )
}
