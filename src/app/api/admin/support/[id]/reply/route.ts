// Admin reply into a vendor support thread. Appends a {from:'admin'} message
// to that vendor's PORTAL marker support[] array, where the vendor sees it
// next time they open /exhibitor/portal/support.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState, type SupportMessage } from '@/lib/portal-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id: applicationId } = await params
  const body = await req.json().catch(() => ({}))
  const text = String(body.body || '').trim().slice(0, 2000)
  if (!text) return NextResponse.json({ ok: false, error: 'Message is empty' }, { status: 400 })

  const { data: app } = await db
    .from('vendor_applications')
    .select('id')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app) return NextResponse.json({ ok: false, error: 'Vendor not found' }, { status: 404 })

  const msg: SupportMessage = { id: `${Date.now()}-a`, from: 'admin', body: text, at: new Date().toISOString() }
  const next = await updatePortalState(applicationId, (s) => ({
    ...s,
    support: [...(s.support || []), msg],
  }))
  return NextResponse.json({ ok: true, messages: next.support })
}
