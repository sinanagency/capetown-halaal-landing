import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  STALL_LIST, STALL_GRID, STALL_ZONES, TYPE_META,
  parseAllocation, tierLabel, type StallType,
} from '@/lib/stalls'

// Public lookup: a vendor enters the email they applied with and sees their
// stall ("you are here") + the neighbouring businesses. Only returns data when
// the email matches a real application; business names of non-neighbours are
// never exposed.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Enter your email' }, { status: 400 })

    const admin = createAdminClient()
    const { data: apps } = await admin
      .from('vendor_applications')
      .select('id, business_name, email, product_categories, preferred_booth_tier, status, admin_notes')

    const codeToName = new Map<string, string>()
    let me: { business_name: string; stall: string | null; stall_status: string; tier: string | null; status: string; categories: string[] } | null = null
    const target = email.trim().toLowerCase()

    for (const a of apps || []) {
      const { stall, status } = parseAllocation(a.admin_notes as string)
      if (stall) codeToName.set(stall, a.business_name)
      if ((a.email || '').trim().toLowerCase() === target) {
        me = { business_name: a.business_name, stall, stall_status: status, tier: a.preferred_booth_tier, status: a.status, categories: a.product_categories || [] }
      }
    }

    if (!me) return NextResponse.json({ error: 'No application found for that email.' }, { status: 404 })

    // geometry for the whole plan, names only where relevant
    const myStall = me.stall ? STALL_LIST.find((s) => s.code === me!.stall) : null

    let neighbours: { code: string; type: StallType; business_name: string; zone: string }[] = []
    if (myStall) {
      const cx = myStall.col + myStall.w / 2, cy = myStall.row + myStall.h / 2
      neighbours = STALL_LIST
        .filter((s) => s.code !== myStall.code && codeToName.has(s.code))
        .map((s) => ({ s, d: Math.hypot(s.col + s.w / 2 - cx, s.row + s.h / 2 - cy) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 8)
        .map(({ s }) => ({ code: s.code, type: s.type, business_name: codeToName.get(s.code)!, zone: TYPE_META[s.type].label }))
    }

    const neighbourCodes = new Set(neighbours.map((n) => n.code))
    const stalls = STALL_LIST.map((s) => ({
      code: s.code, type: s.type, num: s.num, col: s.col, row: s.row, w: s.w, h: s.h,
      status: (codeToName.has(s.code) ? 'allocated' : 'available') as 'allocated' | 'available',
      // expose business name only for the vendor's own stall + immediate neighbours
      occupant: s.code === me.stall || neighbourCodes.has(s.code) ? { business_name: codeToName.get(s.code) } : null,
    }))

    return NextResponse.json({
      business_name: me.business_name,
      application_status: me.status,
      tier_label: tierLabel(me.tier),
      placed: !!myStall,
      you: myStall ? { code: myStall.code, zone: TYPE_META[myStall.type].label, status: me.stall_status } : null,
      neighbours,
      stalls, grid: STALL_GRID, zones: STALL_ZONES,
    })
  } catch (e) {
    console.error('exhibitor placement', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
