import { NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { STALL_LIST, STALL_GRID, STALL_ZONES, TYPE_META, parseAllocation, type StallType } from '@/lib/stalls'

// Authenticated vendors see the SAME full floor plan as admin Vendor Ops:
// every stall's occupancy + business name, with their own stall highlighted.
// (The public /exhibitor lookup stays limited — this richer view is sign-in only.)
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: apps } = await admin
    .from('vendor_applications')
    .select('business_name, admin_notes')

  const byCode = new Map<string, { business_name: string; status: 'held' | 'allocated' }>()
  for (const a of apps || []) {
    const { stall, status } = parseAllocation(a.admin_notes as string)
    if (stall) byCode.set(stall, { business_name: a.business_name, status: status === 'held' ? 'held' : 'allocated' })
  }

  const mine = parseAllocation(ctx.application.admin_notes as string).stall
  const stalls = STALL_LIST.map((s) => {
    const occ = byCode.get(s.code)
    return {
      code: s.code, type: s.type, num: s.num, col: s.col, row: s.row, w: s.w, h: s.h,
      status: (occ ? occ.status : 'available') as 'available' | 'held' | 'allocated',
      occupant: occ ? { business_name: occ.business_name } : null,
    }
  })

  const myStall = mine ? STALL_LIST.find((s) => s.code === mine) : null
  return NextResponse.json({
    stalls,
    grid: STALL_GRID,
    zones: STALL_ZONES,
    mine,
    placed: !!myStall,
    you: myStall ? { code: myStall.code, zone: TYPE_META[myStall.type as StallType].label } : null,
    counts: { allocated: byCode.size, total: STALL_LIST.length },
  })
}
