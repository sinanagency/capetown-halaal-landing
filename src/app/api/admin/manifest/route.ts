import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'

// GET /api/admin/manifest -> gate manifest CSV (names + IDs + vehicles + stall).
// Auth: admin session OR ?secret=<CRON_SECRET>.
export async function GET(request: NextRequest) {
  const secret = new URL(request.url).searchParams.get('secret')
  const cronSecret = (process.env.CRON_SECRET || '').trim()

  let authorized = false
  if (secret && cronSecret && secret === cronSecret) {
    authorized = true
  } else {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const { data: adminUser } = await admin.from('admin_users').select().eq('id', user.id).single()
        if (adminUser) authorized = true
      }
    } catch { /* fall through */ }
  }
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: apps } = await admin
    .from('vendor_applications')
    .select('business_name, contact_name, status, admin_notes')
    .order('business_name')

  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [['Business', 'Stall', 'Staff name', 'Phone', 'Vehicle reg', 'Application status'].map(esc).join(',')]

  for (const a of apps || []) {
    const { stall } = parseAllocation(a.admin_notes as string)
    const state = parsePortalState(a.admin_notes as string)
    for (const m of state.staff || []) {
      rows.push([a.business_name, stall || '', m.name, m.phone || m.id_number || '', m.vehicle_reg, a.status].map(esc).join(','))
    }
  }

  const csv = rows.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="youngsfield-gate-manifest-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
