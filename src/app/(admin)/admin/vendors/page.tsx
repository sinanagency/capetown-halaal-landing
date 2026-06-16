import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAllocation, tierLabel } from '@/lib/stalls'
import { parsePortalState } from '@/lib/portal-state'
import { VendorsList, type VendorRow } from '@/components/admin/vendors/VendorsList'

export const dynamic = 'force-dynamic'

// Approved-vendor hub. Lists only status=approved applications + a relationship
// summary per row (allocated stall, payment status, contract signed, todo
// blockers). Clicking opens /admin/vendors/[id], which renders the full
// per-vendor profile already implemented in this folder.
export default async function VendorsListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) redirect('/admin/login')

  const { data: apps } = await admin
    .from('vendor_applications')
    .select(
      'id, business_name, contact_name, email, phone, product_categories, preferred_booth_tier, admin_notes, contract_signed_at, contract_pdf_path, docs_complete_at, created_at'
    )
    .eq('status', 'approved')
    .order('business_name', { ascending: true })

  const rows: VendorRow[] = (apps || []).map((a) => {
    const notes = (a.admin_notes as string) || ''
    const { stall, status: stallStatus } = parseAllocation(notes)
    const portal = parsePortalState(notes)
    const paymentStatus = portal.payment?.status || 'none'
    const paymentAmount = portal.payment?.amount || null
    const docsCount = (portal.docs || []).length
    const contractSigned = !!(a.contract_signed_at || a.contract_pdf_path)

    const blockers: string[] = []
    if (paymentStatus !== 'paid' && paymentStatus !== 'waived') blockers.push('Fee unpaid')
    if (!contractSigned) blockers.push('Contract unsigned')
    if (docsCount === 0) blockers.push('No docs')
    if (!stall) blockers.push('No stall allocated')

    return {
      id: a.id as string,
      business_name: (a.business_name as string) || 'Unnamed vendor',
      contact_name: (a.contact_name as string) || null,
      email: (a.email as string) || null,
      phone: (a.phone as string) || null,
      categories: (a.product_categories as string[]) || [],
      tier_label: tierLabel(a.preferred_booth_tier as string),
      stall: stall,
      stall_status: stall ? stallStatus : null,
      payment_status: paymentStatus,
      payment_amount: paymentAmount,
      docs_count: docsCount,
      contract_signed: contractSigned,
      docs_complete_at: (a.docs_complete_at as string) || null,
      contract_signed_at: (a.contract_signed_at as string) || null,
      blockers,
      created_at: (a.created_at as string) || '',
    }
  })

  if (rows.length === 0) {
    return (
      <div className="p-6 sm:p-8 max-w-5xl">
        <p className="text-xs font-semibold text-[#cd2653] uppercase tracking-[0.2em]">VENDORS</p>
        <h1 className="text-2xl font-bold text-neutral-900">Approved vendors</h1>
        <div className="mt-6 border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-500 text-sm">
          No approved vendors yet.
          <div className="mt-3">
            <Link href="/admin/applications" className="text-[#cd2653] hover:underline font-medium">
              Go to applications →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <VendorsList rows={rows} />
}
