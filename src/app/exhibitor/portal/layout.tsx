import { redirect } from 'next/navigation'
import { getExhibitorContext } from '@/lib/exhibitor'
import PortalNav from '@/components/exhibitor/PortalNav'
import { parsePortalState } from '@/lib/portal-state'
import { WaOptInBanner } from '@/components/exhibitor/WaOptInBanner'

export const dynamic = 'force-dynamic'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getExhibitorContext()
  if (!ctx) redirect('/exhibitor/login')
  if (ctx.mustChangePassword) redirect('/exhibitor/set-password')

  const businessName = (ctx.application?.business_name as string) || ctx.email
  const state = parsePortalState((ctx.application?.admin_notes as string) || null)
  const showWaBanner = !state.wa?.opted_in_at
  const contactName = (ctx.application?.contact_name as string) || ctx.email
  const firstName = (contactName || '').trim().split(/\s+/)[0] || ''
  const prefillPhone = (ctx.application?.phone as string) || ''

  return (
    <div className="min-h-screen relative">
      {/* warm editorial backdrop (Nisria-style ambient, kept light for CTH) */}
      <div className="fixed inset-0 -z-10" style={{ background: 'radial-gradient(50% 38% at 100% 0%, rgba(205,38,83,0.07), transparent 60%), radial-gradient(45% 35% at 0% 8%, rgba(205,38,83,0.04), transparent 55%), linear-gradient(180deg, #fbfafa, #f4f2f3)' }} />
      <PortalNav businessName={businessName} />
      {showWaBanner && <WaOptInBanner prefillPhone={prefillPhone} firstName={firstName} />}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
