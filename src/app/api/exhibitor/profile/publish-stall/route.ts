// Vendor opt-in toggle for publishing the allocated stall code on the public
// sectors page. Default is OFF (privacy-first per CTH-DOCTRINE Law 2). The
// public reader at /api/sectors/[slug]/[vendor] gates stall_code on:
//   alloc.status === 'allocated' && profile.publish_stall === true
// so flipping this flag is the only thing that ever moves a stall code from
// the vendor portal to public HTML.
//
// Concurrency: updatePortalState is a read-modify-write on admin_notes with
// no row-lock. A vendor double-clicking the toggle in two tabs could race
// itself; the known limitation is accepted at this surface (single human
// operator per vendor, low write rate).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePortalState, updatePortalState } from '@/lib/portal-state'
import { capJsonbSize } from '@/lib/audit/cap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  publish: z.boolean(),
})

export async function POST(request: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const app = ctx.application as Record<string, unknown>
  const applicationId = app.id as string

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    )
  }
  const publish = parsed.data.publish

  // Snapshot for audit before mutating.
  const beforeState = parsePortalState(app.admin_notes as string)
  const beforePublish = Boolean(beforeState.profile?.publish_stall)

  try {
    await updatePortalState(applicationId, (s) => ({
      ...s,
      profile: {
        ...(s.profile || {}),
        publish_stall: publish,
      },
    }))
  } catch (e) {
    console.error('[publish-stall] updatePortalState failed:', (e as Error).message)
    return NextResponse.json({ error: 'Could not save preference' }, { status: 500 })
  }

  // Audit row. Best-effort; failure here does NOT roll back the state write.
  try {
    const admin = createAdminClient()
    const eventType = publish ? 'profile_published' : 'profile_unpublished'
    await admin.from('vendor_application_events').insert({
      application_id: applicationId,
      event_type: eventType,
      before_value: capJsonbSize({ publish_stall: beforePublish }),
      after_value: capJsonbSize({ publish_stall: publish }),
      actor_email: ctx.email || null,
      actor_role: 'vendor',
      note: null,
    })
  } catch (e) {
    console.error('[publish-stall] event insert failed:', (e as Error).message)
  }

  return NextResponse.json({ ok: true, publish_stall: publish })
}
