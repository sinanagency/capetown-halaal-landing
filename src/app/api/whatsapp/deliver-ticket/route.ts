import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTicket, toE164 } from '@/lib/whatsapp'
import { recordConsent } from '@/lib/wa-consent'

export const runtime = 'nodejs'

// Called by WordPress/WooCommerce when a FooEvents ticket is purchased, to
// deliver the SAME PDF ticket (QR embedded) to the buyer over WhatsApp.
//
// Auth: Bearer CRON_SECRET (set the same value on the WP side).
// Body: { phone, firstName, orderNumber, ticketSummary, pdfUrl }
//   - phone:        buyer's WhatsApp number (any format; we normalise to E.164)
//   - pdfUrl:       PUBLICLY reachable URL of the FooEvents ticket PDF (Meta fetches it)
//   - ticketSummary e.g. "2x Weekend Pass"
export async function POST(request: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let b: { phone?: string; firstName?: string; orderNumber?: string; ticketSummary?: string; pdfUrl?: string }
  try { b = await request.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const e164 = toE164(b.phone || '')
  if (!e164) return NextResponse.json({ error: 'Valid phone required' }, { status: 400 })
  if (!b.pdfUrl || !/^https:\/\//.test(b.pdfUrl)) {
    return NextResponse.json({ error: 'pdfUrl must be a public https URL' }, { status: 400 })
  }

  const firstName = (b.firstName || '').trim().split(/\s+/)[0] || 'there'
  const orderNumber = (b.orderNumber || '').toString().trim() || '—'
  const ticketSummary = (b.ticketSummary || 'Your ticket').toString().trim()

  // Buying a ticket = transactional consent + auto opt-in (T&C). Record it.
  try {
    await recordConsent({ waPhone: e164, source: 'checkout', orderId: orderNumber, isBuyer: true })
  } catch (e) {
    console.error('[deliver-ticket] consent record failed:', e)
  }

  const res = await sendTicket({
    to: e164,
    firstName,
    orderNumber,
    ticketSummary,
    qrUrl: b.pdfUrl,
  })

  // Log the delivery.
  try {
    const db = createAdminClient()
    await db.from('wa_messages').insert({
      direction: 'out',
      wa_phone: e164,
      template_name: 'ticket_delivery',
      category: 'utility',
      body: `Ticket delivery: ${ticketSummary} (order ${orderNumber})`,
      status: res.skipped ? 'failed' : 'sent',
      error: res.skipped || null,
      provider_message_id: res.messageId || null,
      related_order_id: orderNumber,
    })
  } catch (e) {
    console.error('[deliver-ticket] log failed:', e)
  }

  if (res.skipped) {
    return NextResponse.json({ ok: false, skipped: res.skipped }, { status: 200 })
  }
  return NextResponse.json({ ok: true, messageId: res.messageId, to: e164 })
}
