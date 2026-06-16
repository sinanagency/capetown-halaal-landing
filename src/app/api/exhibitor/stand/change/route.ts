import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState, updatePortalState, type PortalState } from '@/lib/portal-state'
import { TIER_META } from '@/lib/stalls'

export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const app = ctx.application as Record<string, unknown>
  const state = parsePortalState((app.admin_notes as string) || null)

  return NextResponse.json({ changeRequest: state.stallChangeRequest || null })
}

export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const app = ctx.application as Record<string, unknown>
  const body = await req.json()
  const requestedTier = body.tier as string

  if (!requestedTier || !TIER_META[requestedTier]) {
    return NextResponse.json({ error: 'Invalid stall tier' }, { status: 400 })
  }

  const currentTier = (app.preferred_booth_tier as string) || ''
  const id = String(app.id)
  const admin = createAdminClient()

  const changeRequest = {
    requestedTier,
    currentTier,
    reason: (body.reason as string) || '',
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  }

  await updatePortalState(id, (s: PortalState) => ({ ...s, stallChangeRequest: changeRequest }))

  try {
    await admin.from('vendor_application_events').insert({
      application_id: id,
      event_type: 'stall_change_requested',
      note: `Vendor requested change from ${currentTier || 'none'} to ${requestedTier}`,
      actor_email: ctx.email,
    })
  } catch { /* table may not exist */ }

  return NextResponse.json({ changeRequest })
}
