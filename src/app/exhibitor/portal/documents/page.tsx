import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { createAdminClient } from '@/lib/supabase/admin'
import DocumentsManager, { type DocView } from '@/components/exhibitor/DocumentsManager'
import { PageShell, PageHeader } from '@/components/chrome/PageChrome'
import { requirePaid } from '@/lib/exhibitor-paygate'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const state = parsePortalState(ctx?.application?.admin_notes as string)
  const docs = state.docs || []

  const admin = createAdminClient()
  const views: DocView[] = await Promise.all(
    docs.map(async (d) => {
      const { data } = await admin.storage.from('vendor-docs').createSignedUrl(d.path, 3600)
      return { type: d.type, name: d.name, status: d.status, uploaded_at: d.uploaded_at, url: data?.signedUrl || null, note: d.note }
    })
  )

  return (
    <PageShell>
      <PageHeader
        kicker="Documents"
        title="Compliance & paperwork"
        subtitle="Upload your certificates here. The organisers review each one before the festival."
      />
      <div className="max-w-3xl">
        <DocumentsManager docs={views} />
      </div>
    </PageShell>
  )
}