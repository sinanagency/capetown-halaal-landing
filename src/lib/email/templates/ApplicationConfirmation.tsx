import {
  EmailLayout,
  Heading,
  Subheading,
  Paragraph,
  Signoff,
  Divider,
  InlineLink,
  InfoCard,
  EventDetails,
  Steps,
} from '../components'
import { brand } from '../brand'

interface ApplicationConfirmationProps {
  businessName: string
  contactName: string
  email?: string
}

export function ApplicationConfirmation({
  businessName,
  contactName,
  email,
}: ApplicationConfirmationProps) {
  return (
    <EmailLayout preview="Application received — Young at Heart Festival 2026">
      <Heading>Application received</Heading>

      <Paragraph>Hi {contactName},</Paragraph>
      <Paragraph>
        Thank you for submitting your exhibitor application for <strong>{businessName}</strong>.
        We&apos;re excited that you want to be part of Young at Heart Festival 2026.
      </Paragraph>

      {email && <InfoCard label="Confirmation sent to" value={email} />}

      <Subheading>What happens next</Subheading>
      <Steps
        items={[
          'Our team is reviewing your application. No further action is needed from you for now.',
          'From 1 June 2026, every applicant receives a personal email with the outcome — whether approved or not.',
          'If approved, that email includes your login details and payment instructions.',
        ]}
      />

      <Paragraph>
        Please check your spam or junk folder for emails from{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>{' '}
        and mark us as a safe sender, so your outcome email lands properly around 1 June.
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
        Questions? Reach out at{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>.
      </Paragraph>

      <Signoff>
        Best regards,
        <br />
        <strong>The Young at Heart Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default ApplicationConfirmation
