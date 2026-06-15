import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { createAdminClient } from '@/lib/supabase/admin'
import DocumentsManager, { type DocView } from '@/components/exhibitor/DocumentsManager'
import { PageShell, PageHeader } from '@/components/chrome/PageChrome'
import { requirePaid } from '@/lib/exhibitor-paygate'
import MiniTaskStrip from '@/components/exhibitor/MiniTaskStrip'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const state = parsePortalState(ctx?.application?.admin_notes as string)
  const docs = state.docs || []

  // Legacy + seed rows may carry doc records without a `path` field (e.g. the
  // Demo Halal Kitchen fixture stamped status=approved with no storage object).
  // The Supabase storage SDK throws when path is null/undefined, which used to
  // surface as a hard 500 for the vendor (digest 3115685589). We null-guard
  // here so the page renders, with the URL simply nulled out for those rows.
  const admin = createAdminClient()
  const views: DocView[] = await Promise.all(
    docs.map(async (d) => {
      let url: string | null = null
      if (d.path && typeof d.path === 'string' && d.path.trim().length > 0) {
        try {
          const { data } = await admin.storage.from('vendor-docs').createSignedUrl(d.path, 3600)
          url = data?.signedUrl || null
        } catch {
          url = null
        }
      }
      return { type: d.type, name: d.name, status: d.status, uploaded_at: d.uploaded_at, url, note: d.note }
    })
  )

  return (
    <PageShell>
      <MiniTaskStrip activeKey="documents" />
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