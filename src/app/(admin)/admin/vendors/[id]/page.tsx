import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VendorProfileClient } from './VendorProfileClient'

export const dynamic = 'force-dynamic'

// Admin-only relationship-management view for ONE approved vendor.
// Pending applications still go to /admin/applications/[id] (decision mode);
// once status=approved, /admin/applications/[id] redirects here.
//
// A-Z tabs (mobile-friendly stacking on phones):
//   Overview · Application · Documents · Messages · Payments · Activity
export default async function VendorProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) redirect('/admin/login')

  const { data: app } = await admin
    .from('vendor_applications')
    .select('*')
    .eq('id', id)
    .single()
  if (!app) notFound()

  // Pre-load wa_messages count + last preview (full thread loaded async).
  const e164Digits = String(app.phone || '').replace(/[^\d]/g, '').replace(/^0/, '27')
  const { data: msgPreview } = await admin
    .from('wa_messages')
    .select('id, direction, body, created_at, template_name, status')
    .eq('wa_phone', e164Digits)
    .order('created_at', { ascending: false })
    .limit(5)

  // Documents in vendor-docs bucket (logo, gallery, signed contract, COA, etc.)
  // Convention: vendor-docs/<app_id>/* and vendor-docs/signed-contracts/<app_id>.pdf
  let docs: { name: string; path: string; size: number; kind: 'profile' | 'signed-contract' | 'other' }[] = []
  try {
    const profileDocs = await admin.storage.from('vendor-docs').list(`${id}`, { limit: 100 })
    for (const d of profileDocs.data || []) {
      if (!d.id) continue // folders
      docs.push({ name: d.name, path: `${id}/${d.name}`, size: (d.metadata as any)?.size || 0, kind: 'profile' })
    }
    if (app.contract_pdf_path) {
      docs.push({
        name: 'Vendor Contract 2026 (signed)',
        path: app.contract_pdf_path,
        size: 0,
        kind: 'signed-contract',
      })
    }
  } catch {
    // bucket may not exist yet in some envs; render empty.
  }

  return <VendorProfileClient app={app} msgPreview={msgPreview || []} docs={docs} e164={e164Digits} />
}
