// =============================================================================
// Mass outreach template registry.
//
// Each template is a pure function (vars) => { subject, body_text, body_html }.
// body_html is rendered through the Campaign template in src/lib/email/templates
// so the brand wrapper, footer, and unsubscribe link stay consistent.
//
// Merge tags supported in every template:
//   {{first_name}}      — vendor contact_name first token
//   {{business_name}}   — vendor business_name
//   {{stall_code}}      — allocated stall code (if confirmed)
//   {{amount_due}}      — outstanding stall fee in R formatted text
//   {{due_date}}        — payment due date (e.g. "10 July 2026")
//
// Doctrine: every body string is em-dash free. The Campaign wrapper enforces
// the brand voice, but the template author is responsible for the substance.
// =============================================================================

import { render } from '@react-email/components'
import { Campaign, type CampaignProps } from '@/lib/email/templates/Campaign'
import { createElement } from 'react'

export type TemplateKey =
  | 'doc_chase'
  | 'payment_reminder'
  | 'contract_sign_reminder'
  | 'stall_allocation_notice'
  | 'general_announcement'

export interface TemplateVars {
  first_name?: string
  business_name?: string
  stall_code?: string
  amount_due?: string
  due_date?: string
  custom_message?: string
  unsubscribe_url?: string
}

export interface RenderedTemplate {
  subject: string
  body_text: string
  body_html: string
}

// ---- merge helper ---------------------------------------------------------

const MERGE_RE = /\{\{\s*(first_name|business_name|stall_code|amount_due|due_date|custom_message)\s*\}\}/g

function merge(input: string, vars: TemplateVars): string {
  return input.replace(MERGE_RE, (_, key: keyof TemplateVars) => {
    const v = vars[key]
    return (v == null || v === '') ? '' : String(v)
  })
}

// ---- spec for each template ------------------------------------------------

interface TemplateSpec {
  subject: string
  preview: string
  heading: string
  greeting?: string
  paragraphs: string[]
  cta?: { label: string; href: string }
  signoff?: string
  showEvent?: boolean
}

const SPECS: Record<TemplateKey, TemplateSpec> = {
  doc_chase: {
    subject: 'Documents still outstanding for {{business_name}}',
    preview: 'A couple of documents are still outstanding from your application.',
    heading: 'A quick nudge on outstanding documents',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      'Thanks again for applying as an exhibitor at Young at Heart Festival 2026. To finalise your application for {{business_name}}, we still need a couple of documents from you.',
      'Please log into your exhibitor portal and upload the items listed under My Documents. Once everything is in, your application moves to the next review pass.',
      '{{custom_message}}',
    ],
    cta: { label: 'Open my exhibitor portal', href: 'https://cthalaal.co.za/exhibitor' },
  },
  payment_reminder: {
    subject: 'Stall fee outstanding for {{business_name}}',
    preview: 'A friendly reminder about your stall fee.',
    heading: 'A friendly nudge on your stall fee',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      'Your stall at Young at Heart Festival 2026 is provisionally held for {{business_name}}, and we just need to settle the stall fee to fully lock it in.',
      'Amount due: {{amount_due}}. Due date: {{due_date}}.',
      'You can pay by card from the portal, or reply to this email if you prefer EFT and we will send the banking details.',
      '{{custom_message}}',
    ],
    cta: { label: 'Pay my stall fee', href: 'https://cthalaal.co.za/exhibitor' },
  },
  contract_sign_reminder: {
    subject: 'Please sign your exhibitor contract, {{business_name}}',
    preview: 'Your exhibitor contract is ready for signature.',
    heading: 'Your contract is ready for signature',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      'The exhibitor contract for {{business_name}} is waiting on your signature in the portal. It locks in your stall, the dates, and the rules of the festival.',
      'Open the portal, click Sign contract, and you are done in a minute.',
      '{{custom_message}}',
    ],
    cta: { label: 'Sign my contract', href: 'https://cthalaal.co.za/exhibitor' },
  },
  stall_allocation_notice: {
    subject: 'Your stall location at Young at Heart 2026',
    preview: 'Your stall has been allocated.',
    heading: 'You have a stall',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      'We have allocated stall {{stall_code}} to {{business_name}} for Young at Heart Festival 2026.',
      'Open the portal to see exactly where you sit on the festival map, who your neighbours are, and the load-in window for your section.',
      '{{custom_message}}',
    ],
    cta: { label: 'View my stall on the map', href: 'https://cthalaal.co.za/exhibitor' },
  },
  general_announcement: {
    subject: 'An update from Young at Heart Festival',
    preview: 'An update from the Young at Heart team.',
    heading: 'An update from Young at Heart',
    greeting: 'Hi {{first_name}},',
    paragraphs: [
      '{{custom_message}}',
    ],
    showEvent: true,
  },
}

// ---- public render ---------------------------------------------------------

export async function renderTemplate(key: TemplateKey, vars: TemplateVars): Promise<RenderedTemplate> {
  const spec = SPECS[key]
  if (!spec) throw new Error(`Unknown template key: ${key}`)

  const subject = merge(spec.subject, vars)
  const mergedParagraphs = spec.paragraphs
    .map((p) => merge(p, vars))
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  // Build the React email element via Campaign for the HTML.
  const props: CampaignProps = {
    preview: merge(spec.preview, vars),
    heading: merge(spec.heading, vars),
    greeting: spec.greeting ? merge(spec.greeting, vars) : undefined,
    paragraphs: mergedParagraphs,
    cta: spec.cta,
    showEvent: spec.showEvent,
    signoff: spec.signoff,
    unsubscribeUrl: vars.unsubscribe_url,
  }
  const body_html = await render(createElement(Campaign, props))

  // Plain-text fallback. No HTML tags, paragraph spacing preserved.
  const lines: string[] = []
  if (props.greeting) lines.push(props.greeting, '')
  for (const p of mergedParagraphs) {
    lines.push(p, '')
  }
  if (props.cta) {
    lines.push(`${props.cta.label}: ${props.cta.href}`, '')
  }
  lines.push(props.signoff || 'Warm regards,')
  lines.push('The Young at Heart Festival Team')
  if (vars.unsubscribe_url) {
    lines.push('', `Unsubscribe: ${vars.unsubscribe_url}`)
  }
  const body_text = lines.join('\n')

  return { subject, body_text, body_html }
}

export const TEMPLATE_KEYS: TemplateKey[] = [
  'doc_chase',
  'payment_reminder',
  'contract_sign_reminder',
  'stall_allocation_notice',
  'general_announcement',
]

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  doc_chase: 'Documents outstanding',
  payment_reminder: 'Stall fee reminder',
  contract_sign_reminder: 'Sign contract reminder',
  stall_allocation_notice: 'Stall allocation notice',
  general_announcement: 'General announcement',
}
