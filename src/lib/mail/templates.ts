/**
 * Mail template registry for the unified inbox composer.
 *
 * These are LIGHTWEIGHT plain-text templates that the inbox picker can stage
 * into the textarea (channel=mail, mode=template). They are NOT the rich
 * React-Email templates under `src/lib/email/templates/` — those are reserved
 * for one-shot transactional sends (approval, rejection, payment confirm)
 * fired by their own routes.
 *
 * The inbox templates are short replies an operator sends during a back and
 * forth: "we got it", "follow up", "need more info". They render via
 * `renderMailTemplate({key, params})` into a subject + body that the reply
 * endpoint passes to Resend.
 *
 * CTH-DOCTRINE law 7: no em-dashes anywhere. Law 5: Resend only.
 * Brand law: identity sign-off lives in templates flagged `signoff: true`.
 */

export interface MailTemplateParam {
  key: string
  label: string
  placeholder?: string
  required?: boolean
}

export interface MailTemplateSpec {
  key: string
  label: string
  description: string
  params: MailTemplateParam[]
  subject: string // supports {{key}}
  body: string // supports {{key}}; plain text, paragraph breaks via \n\n
  signoff: boolean // true = include "Zanii AI on behalf of Young at Heart" footer
}

export const MAIL_TEMPLATES: MailTemplateSpec[] = [
  {
    key: 'mail_quick_ack',
    label: 'Quick acknowledgement',
    description: 'Confirm we received their message and will reply soon.',
    params: [
      { key: 'first_name', label: 'First name', placeholder: 'Aisha', required: true },
    ],
    subject: 'We got your message, Young at Heart Festival 2026',
    body:
      'Hi {{first_name}},\n\n' +
      'Thanks for reaching out. We have received your message and a team member will reply within one working day.\n\n' +
      'If you need anything urgent in the meantime, you can WhatsApp us on the same number we use for vendors.',
    signoff: true,
  },
  {
    key: 'mail_followup_docs',
    label: 'Follow up: outstanding documents',
    description: 'Nudge a vendor whose paperwork is still missing.',
    params: [
      { key: 'first_name', label: 'First name', placeholder: 'Aisha', required: true },
      { key: 'document_label', label: 'Document needed', placeholder: 'Public liability insurance certificate', required: true },
    ],
    subject: 'Reminder: outstanding documents for your stall',
    body:
      'Hi {{first_name}},\n\n' +
      'A quick reminder that we still need the following from you to finalise your stall: {{document_label}}.\n\n' +
      'You can reply directly to this email with a clear photo or PDF, or send it on WhatsApp.',
    signoff: true,
  },
  {
    key: 'mail_payment_followup',
    label: 'Follow up: payment',
    description: 'Polite nudge about an outstanding stall payment.',
    params: [
      { key: 'first_name', label: 'First name', placeholder: 'Aisha', required: true },
      { key: 'amount', label: 'Amount (ZAR)', placeholder: '3500', required: true },
      { key: 'due_date', label: 'Due date', placeholder: '20 June 2026', required: true },
    ],
    subject: 'Reminder: stall payment due {{due_date}}',
    body:
      'Hi {{first_name}},\n\n' +
      'A friendly reminder that your stall fee of R{{amount}} is due on {{due_date}}.\n\n' +
      'Reply to this email if you need the payment link again or if anything has changed on your side.',
    signoff: true,
  },
  {
    key: 'mail_resolved',
    label: 'Mark resolved with summary',
    description: 'Close the loop on a request, summarising what we did.',
    params: [
      { key: 'first_name', label: 'First name', placeholder: 'Aisha', required: true },
      { key: 'summary', label: 'What you did', placeholder: 'updated your stall code to F-12', required: true },
    ],
    subject: 'Sorted: your Young at Heart Festival 2026 request',
    body:
      'Hi {{first_name}},\n\n' +
      'All done. We have {{summary}}. If anything still looks off, just reply to this email.',
    signoff: true,
  },
]

export function findMailTemplate(key: string): MailTemplateSpec | undefined {
  return MAIL_TEMPLATES.find((t) => t.key === key)
}

function interpolate(s: string, params: Record<string, string>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] ?? '').trim() || `{{${k}}}`)
}

const ZANII_SIGNOFF =
  '\n\nZanii AI on behalf of Young at Heart\n' +
  'support@youngatheart.co.za'

export function renderMailTemplate(
  spec: MailTemplateSpec,
  params: Record<string, string>
): { subject: string; body: string } {
  const subject = interpolate(spec.subject, params)
  let body = interpolate(spec.body, params)
  if (spec.signoff) body += ZANII_SIGNOFF
  return { subject, body }
}

export function validateMailTemplate(
  spec: MailTemplateSpec,
  params: Record<string, string>
): { ok: true } | { ok: false; error: string } {
  for (const p of spec.params) {
    if (p.required && !(params[p.key] ?? '').trim()) {
      return { ok: false, error: `missing required param: ${p.key}` }
    }
  }
  return { ok: true }
}
