import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { createAdminClient } from '@/lib/supabase/admin'
import DocumentsManager, { type DocView } from '@/components/exhibitor/DocumentsManager'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Documents</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Compliance & paperwork</h1>
        <p className="text-neutral-500 text-sm mt-1">Upload your certificates here. The organisers review each one before the festival.</p>
      </div>
      <DocumentsManager docs={views} />
    </div>
  )
}
