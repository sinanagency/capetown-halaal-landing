import { getExhibitorContext } from '@/lib/exhibitor'
import { redirect } from 'next/navigation'
import { PageShell, Card } from '@/components/chrome/PageChrome'
import Link from 'next/link'
import NotificationPreferences from '@/components/exhibitor/NotificationPreferences'

export default async function AccountSettingsPage() {
  const ctx = await getExhibitorContext()
  if (!ctx) redirect('/exhibitor/login')

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-serif text-2xl">Account Settings</h1>

        <Card>
          <h2 className="font-semibold mb-4">Contact Information</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Email</dt>
              <dd>{ctx.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Phone</dt>
              <dd>
                {ctx.application?.phone as string || 'Not set'}
                <Link href="/exhibitor/portal" className="ml-2 text-[#cd2653] text-xs">Change</Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Password</dt>
              <dd>
                ••••••••
                <Link href="/exhibitor/set-password" className="ml-2 text-[#cd2653] text-xs">Change</Link>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4">Notifications</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Choose how you receive updates. Changes apply immediately.
          </p>
          <NotificationPreferences applicationId={(ctx.application?.id as string) || ''} />
        </Card>
      </div>
    </PageShell>
  )
}
