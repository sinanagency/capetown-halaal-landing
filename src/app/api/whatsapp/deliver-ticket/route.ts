import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTicket, toE164, uploadMedia } from '@/lib/whatsapp'
import { recordConsent } from '@/lib/wa-consent'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by WordPress/WooCommerce when a FooEvents ticket is purchased, to
// deliver the SAME PDF ticket (the exact one FooEvents emails the buyer, QR
// embedded) to the buyer over WhatsApp.
//
// Auth: Bearer CRON_SECRET (set the same value on the WP side).
// Body: { phone, firstName, orderNumber, ticketSummary, pdfBase64 | pdfUrl, filename? }
//   - phone:        buyer's WhatsApp number (any format; normalised to E.164)
//   - pdfBase64:    PREFERRED — base64 of the exact ticket PDF FooEvents attaches
//                   to the purchase email. We upload it to WhatsApp and send by id.
//   - pdfUrl:       fallback — a public https URL Meta can fetch instead.
//   - ticketSummary e.g. "2x Weekend Pass"
export async function POST(request: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let b: { phone?: string; firstName?: string; lastName?: string; email?: string; orderNumber?: string; ticketSummary?: string; ticketQty?: number; orderTotal?: number; pdfBase64?: string; pdfUrl?: string; filename?: string }
  try { b = await request.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const e164 = toE164(b.phone || '')
  if (!e164) return NextResponse.json({ error: 'Valid phone required' }, { status: 400 })
  const hasBytes = typeof b.pdfBase64 === 'string' && b.pdfBase64.length > 0
  const hasUrl = b.pdfUrl && /^https:\/\//.test(b.pdfUrl)
  if (!hasBytes && !hasUrl) {
    return NextResponse.json({ error: 'Provide pdfBase64 (preferred) or a public pdfUrl' }, { status: 400 })
  }

  const firstName = (b.firstName || '').trim().split(/\s+/)[0] || 'there'
  const orderNumber = (b.orderNumber || '').toString().trim() || '—'
  const ticketSummary = (b.ticketSummary || 'Your ticket').toString().trim()
  const filename = (b.filename || `YAH-Ticket-${orderNumber}.pdf`).toString()

  // Buying a ticket = transactional consent + auto opt-in (T&C). Record it.
  try {
    await recordConsent({ waPhone: e164, source: 'checkout', orderId: orderNumber, isBuyer: true })
  } catch (e) {
    console.error('[deliver-ticket] consent record failed:', e)
  }

  // Upload the exact emailed PDF to WhatsApp's media store (preferred path).
  let mediaId: string | undefined
  if (hasBytes) {
    try {
      const bytes = Buffer.from(b.pdfBase64 as string, 'base64')
      mediaId = await uploadMedia(bytes, 'application/pdf', filename)
    } catch (e) {
      console.error('[deliver-ticket] media upload failed:', e)
      if (!hasUrl) return NextResponse.json({ error: 'PDF upload failed' }, { status: 502 })
    }
  }

  const res = await sendTicket({
    to: e164,
    firstName,
    orderNumber,
    ticketSummary,
    ...(mediaId ? { mediaId } : { pdfUrl: b.pdfUrl }),
    filename,
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

  // Identity-side: upsert the buyer so the bot's identity resolver greets
  // them by name in any future inbound. Schema: email is the unique key,
  // name+phone+ticket_count+total_spent+last_purchase_at.
  if (b.email) {
    try {
      const db = createAdminClient()
      const fullName = [b.firstName, b.lastName].filter(Boolean).join(' ').trim() || null
      const qty = Math.max(1, Math.floor(Number(b.ticketQty) || 1))
      const spent = Number(b.orderTotal) || 0
      const { data: existing } = await db
        .from('ticket_buyers')
        .select('id, ticket_count, total_spent')
        .ilike('email', b.email)
        .maybeSingle()
      if (existing) {
        await db.from('ticket_buyers').update({
          name: fullName,
          phone: e164,
          ticket_count: (Number(existing.ticket_count) || 0) + qty,
          total_spent: (Number(existing.total_spent) || 0) + spent,
          last_purchase_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await db.from('ticket_buyers').insert({
          email: b.email,
          name: fullName,
          phone: e164,
          ticket_count: qty,
          total_spent: spent,
          last_purchase_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('[deliver-ticket] ticket_buyers upsert failed:', e)
    }
  }

  if (res.skipped) {
    return NextResponse.json({ ok: false, skipped: res.skipped }, { status: 200 })
  }
  return NextResponse.json({ ok: true, messageId: res.messageId, to: e164 })
}
