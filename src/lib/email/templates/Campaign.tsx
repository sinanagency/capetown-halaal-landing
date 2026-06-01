import { Section, Text } from '@react-email/components'
import {
  EmailLayout,
  Heading,
  Paragraph,
  Signoff,
  Divider,
  Button,
  EventDetails,
} from '../components'
import { brand } from '../brand'

export interface CampaignProps {
  /** Inbox preview line + hidden preheader text. */
  preview: string
  /** Big serif headline at the top of the body. */
  heading: string
  /** Optional greeting line, e.g. "Hi Aisha," — personalise via {name} upstream. */
  greeting?: string
  /** Body as plain paragraphs (each rendered with safe spacing). */
  paragraphs?: string[]
  /** OR raw inner HTML for full control (overrides paragraphs when present). */
  bodyHtml?: string
  /** Optional call-to-action button. */
  cta?: { label: string; href: string }
  /** Show the standard event-details block. */
  showEvent?: boolean
  /** Closing line above the team sign-off. */
  signoff?: string
  /** Personalised unsubscribe link (required for true bulk sends). */
  unsubscribeUrl?: string
}

export function Campaign({
  preview,
  heading,
  greeting,
  paragraphs = [],
  bodyHtml,
  cta,
  showEvent,
  signoff,
  unsubscribeUrl,
}: CampaignProps) {
  return (
    <EmailLayout preview={preview} unsubscribeUrl={unsubscribeUrl}>
      <Heading>{heading}</Heading>

      {greeting && <Paragraph>{greeting}</Paragraph>}

      {bodyHtml ? (
        <Section
          style={bodyStyle}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        paragraphs.map((p, i) => <Paragraph key={i}>{p}</Paragraph>)
      )}

      {cta && <Button href={cta.href}>{cta.label}</Button>}

      {showEvent && (
        <>
          <Divider />
          <EventDetails
            rows={[
              `📅  ${brand.contact.dates}`,
              `📍  ${brand.contact.venue}`,
              '🎪  350+ Vendors · 25,000+ Visitors',
            ]}
          />
        </>
      )}

      <Signoff>
        {signoff || 'Warm regards,'}
        <br />
        <strong>The Young at Heart Festival Team</strong>
      </Signoff>

      <Text style={ps}>
        You&apos;re receiving this because you applied to, registered for, or bought tickets to
        Young at Heart Festival.
      </Text>
    </EmailLayout>
  )
}

const bodyStyle = { fontSize: '15px', lineHeight: '25px', color: brand.color.body }
const ps = { fontSize: '11px', lineHeight: '18px', color: '#b0a8b3', margin: '24px 0 0' }

export default Campaign
