/**
 * POST /api/admin/vendors/[id]/resend-contract
 *
 * Resend the contract-signing reminder email to the vendor's email of record.
 * Uses the existing contract_sign_reminder mail template (Resend channel, per
 * Law 5). Logs the send to vendor_application_events so the audit log shows
 * who pinged the vendor and when.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendZaniiMail } from '@/lib/mail/zanii-sender'
import { renderTemplate } from '@/lib/mail/templates'
import { buildUnsubUrl } from '@/lib/mail/unsubscribe-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: app } = await db
    .from('vendor_applications')
    .select('id, business_name, contact_name, email')
    .eq('id', id)
    .maybeSingle()
  if (!app) return NextResponse.json({ error: 'vendor not found' }, { status: 404 })

  const row = app as { id: string; business_name: string | null; contact_name: string | null; email: string | null }
  const email = (row.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'vendor has no email on file' }, { status: 400 })

  const firstName = row.contact_name?.trim().split(/\s+/)[0] || null
  const unsubscribeUrl = buildUnsubUrl(email)
  const rendered = await renderTemplate('contract_sign_reminder', {
    first_name: firstName,
    business_name: row.business_name,
    unsubscribe_url: unsubscribeUrl,
  })
  const send = await sendZaniiMail({
    to: email,
    subject: rendered.subject,
    html: rendered.body_html,
    text: rendered.body_text,
    unsubscribeToken: unsubscribeUrl.split('/').pop(),
    tags: [
      { name: 'template', value: 'contract_sign_reminder' },
      { name: 'channel', value: 'mail' },
      { name: 'origin', value: 'vendor-hub' },
    ],
  })
  if (!send.ok) return NextResponse.json({ error: send.error || 'send failed' }, { status: 502 })

  try {
    await db.from('vendor_application_events').insert({
      application_id: id,
      event_type: 'contract_resend',
      after_value: { email, message_id: send.messageId, provider_message_id: send.providerMessageId },
      actor_email: user.email || null,
      actor_role: 'admin',
      note: 'Resent contract signing link.',
    })
  } catch (e) {
    console.warn('resend-contract: event insert failed', (e as Error).message)
  }

  return NextResponse.json({ ok: true })
}
