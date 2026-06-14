import { NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { STALL_LIST, STALL_GRID, STALL_ZONES, TYPE_META, parseAllocation, type StallType } from '@/lib/stalls'
import { parsePortalState } from '@/lib/portal-state'

// CTH-DOCTRINE Law 2 (vendor-data-privacy).
//
// Authenticated vendors should NOT receive every other vendor's business_name.
// Previously this endpoint returned occupant.business_name for every allocated
// stall — a vendor-to-vendor data leak. New contract:
//
//   - occupant.business_name is returned ONLY when:
//       (a) the stall belongs to the requesting vendor, OR
//       (b) the occupying vendor has opted in via portalState.profile.publish_stall === true
//   - All other allocated stalls expose only sector LABEL (zone), allocation
//     status, and geometry. No vendor identity escapes the session boundary.
//
// publish_stall is not yet a UI toggle — defaults to undefined/false, which
// fails closed (Law 2 conservative default). Add a vendor-facing opt-in toggle
// before relying on this to surface anyone but the requester.
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: apps } = await admin
    .from('vendor_applications')
    .select('id, business_name, admin_notes')

  type Row = { id: string; business_name: string; admin_notes: string | null }
  const myId = (ctx.application as unknown as { id: string }).id
  const myAdminNotes = (ctx.application as unknown as { admin_notes: string | null }).admin_notes

  const byCode = new Map<string, { ownerId: string; business_name: string; status: 'held' | 'allocated'; publishStall: boolean }>()
  for (const a of (apps || []) as Row[]) {
    const { stall, status } = parseAllocation(a.admin_notes)
    if (!stall) continue
    const state = parsePortalState(a.admin_notes)
    // publish_stall is an optional opt-in flag on profile. Optional-chained
    // so missing flag = false (fail-closed per Law 2).
    const publishStall = Boolean((state.profile as (typeof state.profile & { publish_stall?: boolean }) | undefined)?.publish_stall)
    byCode.set(stall, {
      ownerId: a.id,
      business_name: a.business_name,
      status: status === 'held' ? 'held' : 'allocated',
      publishStall,
    })
  }

  const mine = parseAllocation(myAdminNotes).stall

  const stalls = STALL_LIST.map((s) => {
    const occ = byCode.get(s.code)
    let occupant: { business_name: string } | null = null
    if (occ) {
      const isOwner = occ.ownerId === myId
      if (isOwner) {
        occupant = { business_name: occ.business_name }
      } else if (occ.publishStall) {
        occupant = { business_name: occ.business_name }
      } else {
        // Non-owner, non-opted-in: surface ONLY the sector label, never the
        // real business_name. The UI will render this as a generic chip.
        occupant = { business_name: TYPE_META[s.type as StallType].label }
      }
    }
    return {
      code: s.code, type: s.type, num: s.num, col: s.col, row: s.row, w: s.w, h: s.h,
      status: (occ ? occ.status : 'available') as 'available' | 'held' | 'allocated',
      occupant,
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
