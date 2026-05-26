import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { updatePortalState, parsePortalState, type StaffMember } from '@/lib/portal-state'

// GET: list the signed-in vendor's registered staff.
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const state = parsePortalState(ctx.application.admin_notes as string)
  return NextResponse.json({ staff: state.staff || [] })
}

// POST: add a staff member { name, id_number, vehicle_reg }.
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const applicationId = ctx.application.id as string

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const member: StaffMember = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    id_number: String(body.id_number || '').trim(),
    vehicle_reg: String(body.vehicle_reg || '').trim(),
    added_at: new Date().toISOString(),
  }

  const next = await updatePortalState(applicationId, (s) => ({
    ...s,
    staff: [...(s.staff || []), member],
  }))
  return NextResponse.json({ success: true, staff: next.staff })
}

// DELETE: remove a staff member by ?id=
export async function DELETE(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const applicationId = ctx.application.id as string
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const next = await updatePortalState(applicationId, (s) => ({
    ...s,
    staff: (s.staff || []).filter((m) => m.id !== id),
  }))
  return NextResponse.json({ success: true, staff: next.staff })
}
