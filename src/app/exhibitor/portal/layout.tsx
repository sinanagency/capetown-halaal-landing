import { redirect } from 'next/navigation'
import { getExhibitorContext } from '@/lib/exhibitor'
import PortalNav from '@/components/exhibitor/PortalNav'

export const dynamic = 'force-dynamic'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getExhibitorContext()
  if (!ctx) redirect('/exhibitor/login')
  if (ctx.mustChangePassword) redirect('/exhibitor/set-password')

  const businessName = (ctx.application?.business_name as string) || ctx.email

  return (
    <div className="min-h-screen bg-neutral-50">
      <PortalNav businessName={businessName} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
