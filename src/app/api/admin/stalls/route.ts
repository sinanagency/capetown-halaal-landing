import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  STALL_LIST, STALL_GRID, STALL_ZONES, STALL_CAPACITY, TYPE_META,
  parseAllocation, withAllocation, tierLabel, stallTypeOf,
  type StallType, type StallStatus,
} from '@/lib/stalls'
import { parsePortalState, syncPortalState } from '@/lib/portal-state'
import { notifyVendor } from '@/lib/notifications'
import { computeVendorPricing } from '@/lib/payments/pricing'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id,email').eq('id', user.id).single()
  if (!adminUser) return { error: 'Forbidden', status: 403 as const }
  return { admin, adminUser }
}

// Pull every application's allocation marker once, return a code -> occupant map.
async function loadOccupants(admin: ReturnType<typeof createAdminClient>) {
  const { data: apps } = await admin
    .from('vendor_applications')
    .select('id, business_name, contact_name, phone, email, product_categories, preferred_booth_tier, status, admin_notes, special_requirements')

  const byCode = new Map<string, Record<string, unknown>>()
  const allocatable: Record<string, unknown>[] = []

  for (const a of apps || []) {
    const { stall, status } = parseAllocation(a.admin_notes as string)
    const portal = parsePortalState(a.admin_notes as string)
    const pricing = computeVendorPricing({
      preferred_booth_tier: a.preferred_booth_tier as string,
      special_requirements: a.special_requirements,
    })
    const paymentStatus = (portal.payment?.status || 'none') as string
    const paymentAmount =
      portal.payment?.amount && portal.payment.amount > 0 ? portal.payment.amount : pricing.total
    const row = {
      id: a.id,
      business_name: a.business_name,
      contact_name: a.contact_name,
      phone: a.phone,
      email: a.email,
      categories: a.product_categories || [],
      tier: a.preferred_booth_tier,
      tier_label: tierLabel(a.preferred_booth_tier as string),
      app_status: a.status,
      stall,
      stall_status: stall ? status : null,
      payment_status: paymentStatus,
      payment_amount: paymentAmount,
      payment_ref: portal.payment?.provider_ref || portal.payment?.reference || null,
    }
    if (stall) byCode.set(stall, row)
    // dropdown = approved applicants + anyone already placed (so you can move them)
    if (a.status === 'approved' || stall) allocatable.push(row)
  }
  return { byCode, allocatable }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { byCode, allocatable } = await loadOccupants(auth.admin)

    const stalls = STALL_LIST.map((s) => {
      const occ = byCode.get(s.code)
      const status: StallStatus = occ ? (occ.stall_status as StallStatus) : 'available'
      return { ...s, status, occupant: occ || null }
    })

    const availability: Record<StallType, { total: number; allocated: number; held: number; available: number }> =
      { FT: { total: 0, allocated: 0, held: 0, available: 0 }, FS: { total: 0, allocated: 0, held: 0, available: 0 }, TS: { total: 0, allocated: 0, held: 0, available: 0 }, BS: { total: 0, allocated: 0, held: 0, available: 0 } }
    for (const t of Object.keys(STALL_CAPACITY) as StallType[]) availability[t].total = STALL_CAPACITY[t]
    for (const s of stalls) {
      if (s.status === 'allocated') availability[s.type].allocated++
      else if (s.status === 'held') availability[s.type].held++
    }
    for (const t of Object.keys(availability) as StallType[]) {
      availability[t].available = availability[t].total - availability[t].allocated - availability[t].held
    }

    allocatable.sort((a, b) => String(a.business_name).localeCompare(String(b.business_name)))

    return NextResponse.json({
      stalls, availability, applications: allocatable,
      grid: STALL_GRID, zones: STALL_ZONES, types: TYPE_META,
    })
  } catch (e) {
    console.error('stalls GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const admin = auth.admin

    const body = await req.json().catch(() => ({}))
    const stallCode: string = body.stall_code
    const applicationId: string | null = body.application_id ?? null
    const action: 'allocated' | 'held' | 'clear' = body.status || 'allocated'

    if (!stallCode || !stallTypeOf(stallCode)) {
      return NextResponse.json({ error: `Unknown stall ${stallCode}` }, { status: 400 })
    }

    const { byCode } = await loadOccupants(admin)
    const current = byCode.get(stallCode) as { id: string; business_name?: string } | undefined

    // ---- CLEAR a stall ----
    if (action === 'clear' || !applicationId) {
      if (!current) return NextResponse.json({ ok: true, message: `${stallCode} already free` })
      const { data: app } = await admin.from('vendor_applications').select('admin_notes').eq('id', current.id).single()
      await admin.from('vendor_applications').update({ admin_notes: withAllocation(app?.admin_notes, null) }).eq('id', current.id)
      return NextResponse.json({ ok: true, message: `${stallCode} cleared` })
    }

    // ---- OVER-CONFIRM GUARD: stall already taken by a different vendor ----
    if (current && current.id !== applicationId) {
      return NextResponse.json({
        error: `${stallCode} is already taken by ${current.business_name || 'another vendor'}. Clear it first.`,
        code: 'STALL_TAKEN',
      }, { status: 409 })
    }

    // application must exist
    const { data: app } = await admin
      .from('vendor_applications')
      .select('id, business_name, admin_notes, status')
      .eq('id', applicationId).single()
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // moving a vendor: their old marker is on THIS app row, withAllocation overwrites it,
    // so the previously-held stall is freed automatically.
    const newNotes = withAllocation(app.admin_notes, stallCode, action)
    const { error } = await admin.from('vendor_applications').update({ admin_notes: newNotes }).eq('id', applicationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Best-effort: fire the vendor_stall_allocation WhatsApp template ONLY on
    // a fresh allocation (not on hold). Vendor learns their stall + zone.
    if (action === 'allocated') {
      try {
        const { data: full } = await admin
          .from('vendor_applications')
          .select('phone, contact_name')
          .eq('id', applicationId).single()
        const phone = full?.phone as string | undefined
        if (phone && full) {
          const stallMeta = STALL_LIST.find((s) => s.code === stallCode)
          const zone = STALL_ZONES.find((z) =>
            stallMeta && stallMeta.col >= z.col && stallMeta.col < z.col + z.w
            && stallMeta.row >= z.row && stallMeta.row < z.row + z.h
          )?.label || 'Main marquee'
          const firstName = (full.contact_name as string || '').trim().split(/\s+/)[0] || 'there'
          const { sendTemplate, toE164 } = await import('@/lib/whatsapp')
          await sendTemplate(toE164(phone), 'vendor_stall_allocation', [firstName, stallCode, zone], { category: 'utility' })
        }
      } catch (e) {
        console.error('[stalls] vendor_stall_allocation WA failed:', (e as Error).message)
      }
    }

    if (action === 'allocated') {
      await syncPortalState(applicationId, admin).catch((e) =>
        console.error('[stalls] syncPortalState failed:', (e as Error).message)
      )
      await notifyVendor({
        event: 'stall_allocated',
        applicationId,
        data: { stall: stallCode },
      }).catch((e) =>
        console.error('[stalls] notifyVendor failed:', (e as Error).message)
      )
    }

    return NextResponse.json({ ok: true, message: `${stallCode} → ${app.business_name} (${action})` })
  } catch (e) {
    console.error('stalls POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
