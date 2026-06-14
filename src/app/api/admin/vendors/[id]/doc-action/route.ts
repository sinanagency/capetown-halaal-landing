/**
 * POST /api/admin/vendors/[id]/doc-action
 *
 * Approve / reject / request-resubmit a single document slot. Mutates the
 * `portal.docs[]` array on admin_notes and logs a vendor_application_events
 * row so the audit trail picks it up.
 *
 * Body: { type: string, action: 'approve' | 'reject' | 'resubmit', note?: string }
 *
 * When ALL required docs are approved we set docs_complete_at on admin_notes via
 * the ⟦DOCS:complete⟧ marker (matches the marker the broadcast route reads).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState } from '@/lib/portal-state'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const REQUIRED_DOC_TYPES = [
  'halal_cert',
  'public_liability',
  'food_handler_cert',
  'id_document',
  'business_reg',
] as const

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id, role').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const role = ((adminUser as { role?: string }).role || 'operator').toLowerCase()
  if (!['owner', 'operator'].includes(role)) {
    return NextResponse.json({ error: 'insufficient_role' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body.type || '').trim()
  const action = String(body.action || '') as 'approve' | 'reject' | 'resubmit'
  const note = body.note ? String(body.note).slice(0, 400) : undefined
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })
  if (!['approve', 'reject', 'resubmit'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  const next = await updatePortalState(id, (s) => {
    const docs = (s.docs || []).slice()
    const idx = docs.findIndex((d) => d.type === type)
    if (idx === -1) return s
    const status: 'approved' | 'rejected' | 'pending' =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending'
    docs[idx] = { ...docs[idx], status, note }
    return { ...s, docs }
  })

  try {
    await db.from('vendor_application_events').insert({
      application_id: id,
      event_type: `doc_${action}`,
      after_value: { type, status: action },
      actor_email: user.email || null,
      actor_role: 'admin',
      note: note || `Document ${type} ${action}`,
    })
  } catch (e) {
    console.warn('doc-action: event log failed:', (e as Error).message)
  }

  // If every required doc is approved, append the ⟦DOCS:complete⟧ marker so
  // the broadcast filters and dashboards register completion.
  const approvedTypes = new Set((next.docs || []).filter((d) => d.status === 'approved').map((d) => d.type))
  const allRequiredApproved = REQUIRED_DOC_TYPES.every((t) => approvedTypes.has(t))
  if (allRequiredApproved) {
    const { data } = await db.from('vendor_applications').select('admin_notes').eq('id', id).maybeSingle()
    const notes = (data?.admin_notes as string) || ''
    if (!notes.includes('⟦DOCS:complete⟧')) {
      await db.from('vendor_applications')
        .update({ admin_notes: `${notes}\n⟦DOCS:complete⟧`.trim() })
        .eq('id', id)
    }
  }

  return NextResponse.json({ ok: true, docs: next.docs || [], all_required_approved: allRequiredApproved })
}
