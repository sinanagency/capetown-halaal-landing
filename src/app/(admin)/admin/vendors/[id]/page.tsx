import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import { VendorHub } from './VendorHub'

export const dynamic = 'force-dynamic'

// Vendor Profile Hub. One long scroll, no tabs. Each section is independent:
// hero, AI summary, contract, payments, documents, booth + neighbours, comms
// timeline, blockers checklist, audit log. Data is pre-loaded server-side
// where possible; everything mutable goes through admin API routes.
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

  const a = app as Record<string, unknown>
  const e164Digits = String(a.phone || '').replace(/[^\d]/g, '').replace(/^0/, '27')
  const portal = parsePortalState((a.admin_notes as string) || '')
  const { stall } = parseAllocation((a.admin_notes as string) || '')

  // Zone prefix for neighbours: ⟦STALL:FT-12⟧ -> "FT-1" (first 4 chars of code)
  let neighbours: Array<{ id: string; business_name: string; stall: string }> = []
  if (stall) {
    const prefix = stall.slice(0, Math.max(2, stall.indexOf('-') >= 0 ? stall.indexOf('-') : 2))
    const { data: zoneRows } = await admin
      .from('vendor_applications')
      .select('id, business_name, admin_notes')
      .neq('id', id)
      .eq('status', 'approved')
      .ilike('admin_notes', `%⟦STALL:${prefix}%`)
      .limit(20)
    for (const r of (zoneRows || []) as Array<{ id: string; business_name: string | null; admin_notes: string | null }>) {
      const { stall: rs } = parseAllocation(r.admin_notes || '')
      if (rs) neighbours.push({ id: r.id, business_name: r.business_name || 'Vendor', stall: rs })
    }
  }

  // Last 50 audit events (best-effort, table may be missing on stale envs).
  let events: Array<{ id: string; event_type: string; note: string | null; created_at: string; actor_email: string | null }> = []
  try {
    const { data: ev } = await admin
      .from('vendor_application_events')
      .select('id, event_type, note, created_at, actor_email')
      .eq('application_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    events = (ev || []) as typeof events
  } catch {
    // table may not exist; ignore.
  }

  return (
    <VendorHub
      app={a}
      e164={e164Digits}
      portal={portal}
      stall={stall}
      neighbours={neighbours}
      events={events}
    />
  )
}
