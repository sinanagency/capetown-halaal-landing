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
} from '../components'
import { brand } from '../brand'

interface ApplicationDelayNoticeProps {
  firstName: string
  businessName: string
}

export function ApplicationDelayNotice({
  firstName,
  businessName,
}: ApplicationDelayNoticeProps) {
  return (
    <EmailLayout preview="An update on your Young at Heart Festival 2026 application">
      <Heading>A quick update on your application</Heading>

      <Paragraph>Hi {firstName},</Paragraph>
      <Paragraph>
        Thank you for your patience, and for applying to trade at Young at Heart Festival 2026
        with <strong>{businessName}</strong>.
      </Paragraph>
      <Paragraph>
        We have received an overwhelming number of vendor applications this year, far beyond what
        we anticipated. Because of this, our selection committee is taking extra time to review
        each application carefully, fairly, and in full.
      </Paragraph>

      <Subheading>What this means for you</Subheading>
      <Steps
        items={[
          'Your application is in the queue, and it will be reviewed.',
          'Decisions are being rolled out in waves over the coming weeks.',
          'Every applicant will receive a personal email with the outcome, whether approved or not.',
        ]}
      />

      <Paragraph>
        No action is needed from you right now. If your business details or contact information
        have changed, simply reply to this email and we will update our records.
      </Paragraph>

      <Divider />

      <EventDetails
        rows={[
          `📅  ${brand.contact.dates}`,
          `📍  ${brand.contact.venue}`,
          '🎪  350+ Vendors · 25,000+ Visitors',
        ]}
      />

      <Paragraph>
        If you do not see future emails from us, please check your spam or junk folder, and mark{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>{' '}
        as a safe sender.
      </Paragraph>
      <Paragraph>
        Questions? Reach out at{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>{' '}
        or call {brand.contact.phone}.
      </Paragraph>

      <Signoff>
        Thank you again for your patience, and for wanting to be part of Young at Heart Festival 2026.
        <br />
        <br />
        Warm regards,
        <br />
        <strong>The Young at Heart Festival Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default ApplicationDelayNotice
