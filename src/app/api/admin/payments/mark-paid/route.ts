// Admin-only manual payment confirmation. Used after reconciling an EFT,
// cash-at-door, or off-platform card payment against the FNB statement.
// Path mirrors the yoco webhook outcome via the shared confirmPayment helper
// so the vendor experience is identical regardless of how they paid.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmPayment, type PaymentMethod } from '@/lib/payments/confirm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED: PaymentMethod[] = ['eft', 'cash', 'manual_card', 'waived']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminUser) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const applicationId = String(body.applicationId || '').trim()
  const method = String(body.method || '').trim() as PaymentMethod
  const amount = typeof body.amount === 'number' ? body.amount : undefined
  const providerRef = body.providerRef ? String(body.providerRef).trim().slice(0, 80) : undefined
  const silent = !!body.silent

  if (!applicationId) return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 })
  if (!ALLOWED.includes(method)) {
    return NextResponse.json({ ok: false, error: `method must be one of: ${ALLOWED.join(', ')}` }, { status: 400 })
  }

  const result = await confirmPayment({ applicationId, method, amount, providerRef, silent })
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid, amount: result.amount })
}
