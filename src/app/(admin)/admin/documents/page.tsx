import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DocumentsClient } from './DocumentsClient'

export const dynamic = 'force-dynamic'

// Admin Documents directory. One place to view every vendor-uploaded document
// AND every issued ticket PDF, with the owner attached to each row.
//
// CTH-DOCTRINE alignment:
//  - Law 2 (vendor PII): server check enforces admin session before render.
//    Each underlying endpoint also re-checks. Public surface = none.
//  - Law 3 (FooEvents no-fork): ticket PDFs link to the WP-resolver-emitted
//    pdf_url (or the WC admin order page fallback). We never re-render the PDF.
//  - Law 4 (ticket source-of-truth): tickets come from ticket_verifications,
//    which is a cached ledger, not a duplicated count. WC + FooEvents remain
//    canonical for revenue/attendee counts.
export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) redirect('/admin/login')

  return <DocumentsClient />
}
