import {
  EmailLayout,
  Heading,
  Subheading,
  Paragraph,
  Signoff,
  Divider,
  InlineLink,
  EventDetails,
  Steps,
  Button,
} from '../components'
import { brand } from '../brand'

interface ApplicationIncompleteProps {
  contactName?: string
  businessName?: string
  applyUrl?: string
}

/**
 * Friendly nudge for people who started a vendor application but didn't finish.
 * Branded HTML body; the route keeps a plain-text fallback for deliverability.
 */
export function ApplicationIncomplete({
  contactName,
  businessName,
  applyUrl = 'https://cthalaal.co.za/apply',
}: ApplicationIncompleteProps) {
  return (
    <EmailLayout preview="You're almost there — finish your Young at Heart Festival 2026 application">
      <Heading>You&apos;re almost there</Heading>

      <Paragraph>Hi {contactName || 'there'},</Paragraph>
      <Paragraph>
        We noticed you started a vendor application
        {businessName ? (
          <>
            {' '}for <strong>{businessName}</strong>
          </>
        ) : null}{' '}
        for Young at Heart Festival 2026 but didn&apos;t quite finish. We&apos;d love to have you
        with us.
      </Paragraph>

      <Subheading>What you&apos;re applying for</Subheading>
      <Steps
        items={[
          '264 booth spaces across food, fashion, wellness, and more.',
          'Booth prices from R3,700 to R12,000.',
          '25,000+ expected visitors over three days.',
        ]}
      />

      <Paragraph>
        It only takes a couple of minutes to complete, and spots are filling up fast.
      </Paragraph>

      <Button href={applyUrl}>Finish my application →</Button>

      <Divider />

      <EventDetails
        rows={[
          `📅  ${brand.contact.dates}`,
          `📍  ${brand.contact.venue}`,
          '🎪  350+ Vendors · 25,000+ Visitors',
        ]}
      />

      <Paragraph>
        Any questions? Just reply to this email, write to{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>, or
        call {brand.contact.phone}.
      </Paragraph>

      <Signoff>
        We look forward to welcoming you.
        <br />
        <br />
        Warm regards,
        <br />
        <strong>The Young at Heart Festival Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default ApplicationIncomplete
