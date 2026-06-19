// Capture + acknowledge a payment for a NON-marquee / outside vendor.
//
// Marquee vendors pay via Yoco and get a stall code. Bedouin, truck, and loose
// "outside" vendors are NOT allocated on the floor plan — but their money still
// has to be tracked. This endpoint lets an operator record an EFT/cash/manual
// payment against a vendor, tagged with the venue zone, so it shows up in
// /admin/finance alongside Yoco + ticket revenue. State lives in portal_state
// (no DDL — the payment columns don't exist; Law 8).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState } from '@/lib/portal-state'
import { zoneByKey } from '@/lib/venue-zones'
import { notifyOwners } from '@/lib/bot/notify'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  applicationId: z.string().uuid(),
  zone: z.string().min(1).max(40), // venue-zones key, or 'outside'
  amount: z.number().positive().max(10_000_000),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('id, role, email')
    .eq('id', user.id)
    .single()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const role = (adminUser.role || 'operator') as string
  if (!['owner', 'operator'].includes(role)) {
    return NextResponse.json({ error: 'insufficient_role' }, { status: 403 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await req.json())
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'invalid body', details: e.issues }, { status: 400 })
    throw e
  }

  // 'outside' is a valid loose bucket; otherwise it must be a known zone.
  const zoneOk = parsed.zone === 'outside' || !!zoneByKey(parsed.zone)
  if (!zoneOk) return NextResponse.json({ error: `unknown zone: ${parsed.zone}` }, { status: 400 })

  const { data: appRow } = await admin
    .from('vendor_applications')
    .select('id, business_name, email')
    .eq('id', parsed.applicationId)
    .single()
  if (!appRow) return NextResponse.json({ error: 'application not found' }, { status: 404 })

  const paidAt = new Date().toISOString()
  await updatePortalState(parsed.applicationId, (s) => ({
    ...s,
    payment: {
      ...(s.payment || {}),
      status: 'paid',
      amount: parsed.amount,
      method: 'manual',
      zone: parsed.zone,
      reference: parsed.reference || (s.payment?.reference ?? undefined),
      capture_note: parsed.note,
      paid_at: s.payment?.paid_at || paidAt,
    },
  }))

  // Audit row.
  try {
    await admin.from('vendor_application_events').insert({
      application_id: parsed.applicationId,
      event_type: 'payment_captured',
      after_value: { amount: parsed.amount, zone: parsed.zone, method: 'manual', reference: parsed.reference || null },
      actor_email: (adminUser.email as string | null) || user.email || null,
      actor_role: 'operator',
      note: parsed.note || null,
    })
  } catch (e) {
    console.error('[capture] audit insert failed:', (e as Error).message)
  }

  const zoneLabel = zoneByKey(parsed.zone)?.label || 'Outside'
  notifyOwners({
    event: 'payment_succeeded',
    body: `${appRow.business_name || 'Vendor'} payment captured (${zoneLabel}): R${parsed.amount.toLocaleString('en-ZA')}${parsed.reference ? ` · ref ${parsed.reference}` : ''}.`,
  }).catch((e) => console.error('[capture] notifyOwners failed:', (e as Error).message))

  return NextResponse.json({
    ok: true,
    applicationId: parsed.applicationId,
    business_name: appRow.business_name,
    amount: parsed.amount,
    zone: parsed.zone,
    zoneLabel,
    paid_at: paidAt,
  })
}
