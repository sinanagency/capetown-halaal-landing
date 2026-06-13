import { redirect } from 'next/navigation'
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

  // NOTE: contract-sign gate moved out of the layout into individual pages
  // (Overview + paygate). Path-detection in Next 16 layouts is unreliable, so a
  // layout-level redirect either silently fails or infinite-loops on /contract
  // itself. See KT #248.

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
