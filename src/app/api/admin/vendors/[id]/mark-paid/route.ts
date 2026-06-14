/**
 * POST /api/admin/vendors/[id]/mark-paid
 *
 * Mark a vendor's stall fee paid manually (cash, EFT off-platform, comp).
 * Writes:
 *   - portal-state marker `payment.status = 'paid'` + paid_at + reference
 *   - vendor_application_events entry { event_type: 'payment_manual', note: ... }
 *
 * Body: { amount?: number, reference?: string, note?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState } from '@/lib/portal-state'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const amount = typeof body.amount === 'number' ? body.amount : undefined
  const reference = body.reference ? String(body.reference).slice(0, 80) : undefined
  const note = body.note ? String(body.note).slice(0, 500) : 'Marked paid manually by admin.'

  const before = await updatePortalState(id, (s) => ({
    ...s,
    payment: {
      ...(s.payment || {}),
      status: 'paid',
      paid_at: new Date().toISOString(),
      amount: amount ?? s.payment?.amount,
      reference: reference || s.payment?.reference,
    },
  }))

  try {
    await db.from('vendor_application_events').insert({
      application_id: id,
      event_type: 'payment_manual',
      after_value: { paid_at: before.payment?.paid_at, amount, reference, note },
      actor_email: user.email || null,
      actor_role: 'admin',
      note,
    })
  } catch (e) {
    console.warn('mark-paid: event log insert failed:', (e as Error).message)
  }

  return NextResponse.json({ ok: true, payment: before.payment })
}
