/**
 * GET /api/admin/vendors/csv?ids=<csv>&status=<filter>
 *
 * Streams a CSV of approved vendors with the columns Samreen uses for ops
 * planning. Defaults to all approved vendors when no ids are supplied.
 *
 * Columns: business_name, contact_name, phone, email, sector, status,
 * stall_code, payment_status, contract_signed_at.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function escapeCsv(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const idsParam = sp.get('ids')
  const ids = idsParam ? idsParam.split(',').map((x) => x.trim()).filter(Boolean) : null
  const status = sp.get('status') || 'approved'

  let q = db
    .from('vendor_applications')
    .select('id, business_name, contact_name, email, phone, product_categories, item_category, status, admin_notes, contract_signed_at')
    .order('business_name', { ascending: true })
  if (ids && ids.length) q = q.in('id', ids)
  else if (status && status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = [
    'business_name', 'contact_name', 'phone', 'email', 'sector', 'status',
    'stall_code', 'payment_status', 'contract_signed_at',
  ]
  const lines: string[] = [headers.join(',')]
  for (const row of (data || []) as Array<{
    business_name: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
    product_categories: string[] | null
    item_category: string | null
    status: string | null
    admin_notes: string | null
    contract_signed_at: string | null
  }>) {
    const portal = parsePortalState(row.admin_notes || '')
    const { stall } = parseAllocation(row.admin_notes || '')
    const sector = row.product_categories?.[0] || row.item_category || ''
    const paymentStatus = portal.payment?.status || 'none'
    lines.push([
      escapeCsv(row.business_name),
      escapeCsv(row.contact_name),
      escapeCsv(row.phone),
      escapeCsv(row.email),
      escapeCsv(sector),
      escapeCsv(row.status),
      escapeCsv(stall),
      escapeCsv(paymentStatus),
      escapeCsv(row.contract_signed_at),
    ].join(','))
  }

  const filename = `vendors-${new Date().toISOString().slice(0, 10)}.csv`
  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
