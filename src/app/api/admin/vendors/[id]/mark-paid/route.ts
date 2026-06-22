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
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState, syncPortalState } from '@/lib/portal-state'
import { requireOperator } from '@/lib/admin-rbac'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const gate = await requireOperator()
  if (!gate.ok) return gate.response
  const { user } = gate

  const db = createAdminClient()

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

  await syncPortalState(id, db).catch((e) =>
    console.error('[mark-paid] syncPortalState failed:', (e as Error).message)
  )

  return NextResponse.json({ ok: true, payment: before.payment })
}
