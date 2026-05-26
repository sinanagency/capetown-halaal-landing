import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { updatePortalState, parsePortalState, type SupportMessage } from '@/lib/portal-state'

// GET: the signed-in vendor's support thread.
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const state = parsePortalState(ctx.application.admin_notes as string)
  return NextResponse.json({ messages: state.support || [] })
}

// POST: vendor sends a message.
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const applicationId = ctx.application.id as string
  const body = await req.json().catch(() => ({}))
  const text = String(body.body || '').trim().slice(0, 2000)
  if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 })

  const msg: SupportMessage = { id: `${Date.now()}`, from: 'vendor', body: text, at: new Date().toISOString() }
  const next = await updatePortalState(applicationId, (s) => ({ ...s, support: [...(s.support || []), msg] }))
  return NextResponse.json({ success: true, messages: next.support })
}
