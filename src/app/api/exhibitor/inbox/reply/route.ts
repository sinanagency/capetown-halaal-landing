import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/exhibitor/inbox/reply
//
// Vendor portal replies. This endpoint does NOT send anything on WhatsApp —
// portal replies are explicitly admin-facing only (the bot already pushes the
// outbound traffic on WA, the portal is the structured back-channel). We write
// a wa_messages row with direction='in' so it shows in the same /admin/vendors
// thread the admin already reads, tagged via metadata.sender_type so guards
// can tell a portal reply apart from a real inbound WhatsApp message.
//
// The wa_threads table (last_handled_at) is updated when present so the admin
// inbox can sort by "needs you" freshness. If the table does not exist (older
// environments), the failure is swallowed — the message row itself is the
// load-bearing write.
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const text = String(body.body || '').trim().slice(0, 2000)
  if (!text) {
    return NextResponse.json({ ok: false, error: 'Message is empty' }, { status: 400 })
  }

  const app = ctx.application as Record<string, unknown>
  const phoneRaw = String(app.phone || '')
  const email = String(app.email || ctx.email || '').toLowerCase()
  if (!phoneRaw && !email) {
    return NextResponse.json({ ok: false, error: 'No contact channel on file' }, { status: 400 })
  }

  const e164 = phoneRaw ? toE164(phoneRaw) : ''
  const waPhone = e164.replace(/^\+/, '')

  const db = createAdminClient()
  const nowIso = new Date().toISOString()

  // Write the portal reply as wa_messages.direction='in', sender flagged in
  // metadata. We do not call sendText here — portal -> admin only.
  const { data: inserted, error: insErr } = await db
    .from('wa_messages')
    .insert({
      direction: 'in',
      wa_phone: waPhone || 'portal',
      body: text,
      status: 'received',
      metadata: {
        sender_type: 'vendor_portal',
        application_id: app.id,
        vendor_email: email,
        business_name: app.business_name || null,
      },
      created_at: nowIso,
    })
    .select('id')
    .single()

  if (insErr) {
    console.error('[exhibitor/inbox/reply] insert failed:', insErr.message)
    return NextResponse.json({ ok: false, error: 'Could not save reply' }, { status: 500 })
  }

  // Touch the thread row (used by the admin "needs you" inbox).
  // Optional table — swallow errors if not present yet.
  if (waPhone) {
    try {
      await db
        .from('wa_threads')
        .upsert(
          { wa_phone: waPhone, last_handled_at: nowIso, last_inbound_at: nowIso },
          { onConflict: 'wa_phone' }
        )
    } catch (e) {
      console.warn('[exhibitor/inbox/reply] wa_threads upsert skipped:', (e as Error).message)
    }
  }

  // Realtime: site_events doubles as a simple realtime fanout because the
  // admin inbox is already subscribed to it. New row -> admin client repaints.
  try {
    await db.from('site_events').insert({
      session_id: `portal-${app.id}`,
      event_type: 'vendor_portal_reply',
      path: '/exhibitor/portal',
      metadata: {
        application_id: app.id,
        wa_phone: waPhone || null,
        message_id: inserted?.id || null,
      },
    })
  } catch (e) {
    console.warn('[exhibitor/inbox/reply] site_events insert skipped:', (e as Error).message)
  }

  return NextResponse.json({ ok: true, message_id: inserted?.id || null })
}
