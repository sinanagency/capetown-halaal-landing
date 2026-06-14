/**
 * POST /api/admin/chase
 *
 * Unified chase route: send a message to one or many recipients across email
 * and/or WhatsApp in a single call. Used by the Follow-up Chase workbench and
 * the Vendor list bulk-message toolbar.
 *
 * Body:
 *   {
 *     recipients: Array<{ id?: string; email?: string; phone?: string;
 *                          name?: string; business_name?: string; stall?: string }>
 *     template_key?: TemplateKey         // optional pre-rendered template
 *     email_subject?: string             // free-text mode subject
 *     email_body?: string                // free-text mode body (with merge tags)
 *     wa_body?: string                   // free-text WA body (becomes general_announcement.custom_message)
 *     wa_template?: string               // explicit WABA template name override
 *     custom_vars?: Record<string,string> // extra merge tags for both channels
 *     channel?: 'mail' | 'wa' | 'both'   // default 'both'
 *     dry_run?: boolean
 *   }
 *
 * Doctrine:
 *   - Law 5 (email throttle): mail goes via sendZaniiMail at 4/sec (250ms).
 *     GoDaddy SMTP is NOT touched here. Resend handles batching.
 *   - Law 7 (no em-dashes): every body string is filtered before send.
 *   - Logs to mail_messages + wa_messages so the unified timeline picks it up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendZaniiMail, pacer } from '@/lib/mail/zanii-sender'
import { sendTemplate } from '@/lib/whatsapp/sender'
import { renderTemplate, type TemplateKey, type TemplateVars, TEMPLATE_KEYS } from '@/lib/mail/templates'
import { buildUnsubUrl } from '@/lib/mail/unsubscribe-token'
import { renderTemplate as interpolate, type InterpolateVars } from '@/lib/interpolate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

interface Recipient {
  id?: string
  email?: string | null
  phone?: string | null
  name?: string | null
  business_name?: string | null
  stall?: string | null
}

interface ChaseBody {
  recipients: Recipient[]
  template_key?: TemplateKey
  email_subject?: string
  email_body?: string
  wa_body?: string
  wa_template?: string
  custom_vars?: Record<string, string>
  channel?: 'mail' | 'wa' | 'both'
  dry_run?: boolean
}

function firstName(name?: string | null): string | null {
  if (!name) return null
  const t = name.trim().split(/\s+/)[0]
  return t || null
}

// Law 7: scrub em-dashes / en-dashes from any operator-authored copy.
function scrub(s: string | undefined | null): string {
  if (!s) return ''
  return String(s).replace(/[–—]/g, ',')
}

async function assertAdmin(): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'unauthorized' }
  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return { ok: false, status: 403, error: 'forbidden' }
  return { ok: true, userId: user.id }
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: ChaseBody
  try {
    body = await req.json() as ChaseBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const channel = body.channel || 'both'
  const dryRun = !!body.dry_run
  const recipients = Array.isArray(body.recipients) ? body.recipients : []
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'recipients required' }, { status: 400 })
  }
  if (body.template_key && !TEMPLATE_KEYS.includes(body.template_key)) {
    return NextResponse.json({ error: 'unknown template_key' }, { status: 400 })
  }

  const useTemplate = !!body.template_key
  const useEmailFreeText = !useTemplate && !!(body.email_body && body.email_body.trim().length > 0)
  const useWaFreeText    = !useTemplate && !!(body.wa_body && body.wa_body.trim().length > 0)

  if (channel === 'mail' && !useTemplate && !useEmailFreeText) {
    return NextResponse.json({ error: 'email_body or template_key required for mail channel' }, { status: 400 })
  }
  if (channel === 'wa' && !useTemplate && !useWaFreeText) {
    return NextResponse.json({ error: 'wa_body or template_key required for wa channel' }, { status: 400 })
  }

  const db = createAdminClient()
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  const results = {
    audience_total: recipients.length,
    mail: { attempted: 0, sent: 0, failed: 0, skipped: 0 },
    wa:   { attempted: 0, sent: 0, failed: 0, skipped: 0 },
    dry_run: dryRun,
    errors: [] as Array<{ kind: 'mail' | 'wa'; to: string; error: string }>,
  }

  for (const r of recipients) {
    const vars: TemplateVars = {
      first_name: firstName(r.name),
      business_name: r.business_name || null,
      stall_code: r.stall || null,
      custom_message: scrub(body.custom_vars?.custom_message) || undefined,
      ...((body.custom_vars || {}) as TemplateVars),
    }

    // -------- mail --------
    if (channel === 'mail' || channel === 'both') {
      const emailRaw = (r.email || '').trim().toLowerCase()
      if (emailRaw && !seenEmails.has(emailRaw)) {
        seenEmails.add(emailRaw)
        results.mail.attempted++
        if (!dryRun) {
          const unsub = buildUnsubUrl(emailRaw)
          let subject: string, html: string | undefined, text: string
          if (useTemplate) {
            const rendered = await renderTemplate(body.template_key!, { ...vars, unsubscribe_url: unsub })
            subject = scrub(rendered.subject)
            html = rendered.body_html
            text = scrub(rendered.body_text)
          } else {
            const rawText = interpolate(scrub(body.email_body), vars as InterpolateVars)
            subject = scrub(interpolate(body.email_subject || 'A note from Young at Heart Festival', vars as InterpolateVars))
            text = rawText
            const escaped = rawText.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
            html = `<div style="font-family:Inter,Arial,sans-serif;color:#1B1A17;line-height:1.55;font-size:15px">` +
                   escaped.split('\n').map((l) => l.trim() ? `<p style="margin:0 0 12px">${l}</p>` : '<br/>').join('') +
                   `<p style="margin-top:24px;font-size:12px;color:#666">Unsubscribe: <a href="${unsub}">${unsub}</a></p>` +
                   `</div>`
          }
          const send = await sendZaniiMail({
            to: emailRaw,
            subject,
            html,
            text,
            unsubscribeToken: unsub.split('/').pop(),
            tags: [
              { name: 'template', value: body.template_key || 'chase_free_text' },
              { name: 'channel', value: 'mail' },
              { name: 'origin', value: 'chase' },
            ],
          })
          if (send.ok) results.mail.sent++
          else { results.mail.failed++; results.errors.push({ kind: 'mail', to: emailRaw, error: send.error || 'unknown' }) }
          try {
            await db.from('mail_messages').insert({
              direction: 'out',
              mailbox: send.fromUsed || 'hello@youngatheart.co.za',
              from_addr: send.fromUsed || 'hello@youngatheart.co.za',
              to_addr: emailRaw,
              subject,
              body_text: text,
              body_html: html || null,
              message_id: send.messageId || `<chase-${Date.now()}@event.youngatheart.co.za>`,
              status: send.ok ? 'sent' : 'failed',
              error: send.ok ? null : (send.error || null),
              provider_message_id: send.providerMessageId || null,
              vendor_application_id: r.id || null,
            })
          } catch (e) {
            console.warn('chase: mail_messages insert failed', (e as Error).message)
          }
          if (r.id) {
            try {
              await db.from('vendor_application_events').insert({
                application_id: r.id,
                event_type: 'chase_email',
                after_value: { to: emailRaw, template: body.template_key || 'free_text', message_id: send.messageId },
                actor_role: 'admin',
                note: `Chase email sent: ${subject}`.slice(0, 400),
              })
            } catch { /* swallow */ }
          }
          await pacer(250)
        } else {
          results.mail.sent++
        }
      } else if (emailRaw) {
        results.mail.skipped++
      }
    }

    // -------- whatsapp --------
    if (channel === 'wa' || channel === 'both') {
      const phoneRaw = (r.phone || '').replace(/[^0-9]/g, '')
      if (phoneRaw && phoneRaw.length >= 9 && !seenPhones.has(phoneRaw)) {
        seenPhones.add(phoneRaw)
        results.wa.attempted++
        if (!dryRun) {
          const waTemplate = body.wa_template || body.template_key || 'general_announcement'
          const waCustom = useWaFreeText
            ? scrub(interpolate(body.wa_body || '', vars as InterpolateVars))
            : scrub(body.custom_vars?.custom_message || '')
          const send = await sendTemplate({
            to: phoneRaw,
            template: waTemplate,
            variables: [
              vars.first_name || 'there',
              vars.business_name || '',
              vars.stall_code || '',
              waCustom,
            ].filter((v) => v && v.length > 0),
          })
          if (send.ok) results.wa.sent++
          else if (send.skipped) results.wa.skipped++
          else { results.wa.failed++; results.errors.push({ kind: 'wa', to: phoneRaw, error: send.error || 'unknown' }) }
          if (r.id) {
            try {
              await db.from('vendor_application_events').insert({
                application_id: r.id,
                event_type: 'chase_whatsapp',
                after_value: { to: phoneRaw, template: waTemplate },
                actor_role: 'admin',
                note: `Chase WhatsApp sent`,
              })
            } catch { /* swallow */ }
          }
          await pacer(250)
        } else {
          results.wa.sent++
        }
      } else if (phoneRaw) {
        results.wa.skipped++
      }
    }
  }

  return NextResponse.json(results)
}
