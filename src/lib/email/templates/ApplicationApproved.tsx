import {
  EmailLayout,
  Heading,
  Subheading,
  Paragraph,
  Signoff,
  Divider,
  InlineLink,
  InfoCard,
  CredBox,
  SuccessBadge,
  EventDetails,
  Steps,
  Button,
} from '../components'
import { brand } from '../brand'

interface ApplicationApprovedProps {
  businessName: string
  contactName: string
  boothTier?: string
  applicationId?: string
  tempPassword?: string
  loginUrl?: string
  paymentDueDate?: string
}

export function ApplicationApproved({
  businessName,
  contactName,
  boothTier,
  tempPassword,
  loginUrl = 'https://cthalaal.co.za/exhibitor/login',
}: ApplicationApprovedProps) {
  return (
    <EmailLayout preview="Your vendor application has been approved — Young at Heart Festival 2026">
      <SuccessBadge>✓ APPLICATION APPROVED</SuccessBadge>

      <Heading>Welcome aboard, {contactName}!</Heading>

      <Paragraph>
        Great news — your exhibitor application for <strong>{businessName}</strong> has been
        approved for Young at Heart Festival 2026.
      </Paragraph>

      {boothTier && <InfoCard label="Booth Preference" value={boothTier} />}

      {tempPassword && (
        <>
          <Divider />
          <Subheading>Your login credentials</Subheading>
          <Paragraph>
            Use the temporary password below to log into your exhibitor portal. You&apos;ll be
            prompted to set a new password on first login.
          </Paragraph>
          <CredBox
            email={businessName}
            password={tempPassword}
            note="This password expires in 48 hours."
          />
        </>
      )}

      <Divider />

      <Subheading>Next steps</Subheading>
      <Steps
        items={[
          'Log into your exhibitor portal using the credentials above.',
          'Select your booth location and complete payment.',
          'Receive your exhibitor pack with all event details.',
        ]}
      />

      <Button href={loginUrl}>Log in to Exhibitor Portal →</Button>

      <Divider />

      <EventDetails
        rows={[
          `📅  ${brand.contact.dates}`,
          `📍  ${brand.contact.venue}`,
          '⏰  Fri 2PM–11PM · Sat & Sun 11AM–11PM',
        ]}
      />

      <Paragraph>
        Questions? Contact us at{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>.
      </Paragraph>

      <Signoff>
        See you at the festival!
        <br />
        <strong>The Young at Heart Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default ApplicationApproved
