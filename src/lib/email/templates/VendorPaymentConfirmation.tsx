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
  SuccessBadge,
} from '../components'
import { brand } from '../brand'
import { formatRand } from '@/lib/payments/pricing'

interface VendorPaymentConfirmationProps {
  contactName: string
  businessName: string
  amount: number
  providerRef: string
  invoiceUrl: string
  portalUrl: string
}

/**
 * Payment-confirmation + welcome email. Tone matches ApplicationRejected /
 * ApplicationApproved so every comms touchpoint feels like one brand. Inline
 * receipt details + a link to the printable invoice page.
 */
export function VendorPaymentConfirmation({
  contactName,
  businessName,
  amount,
  providerRef,
  invoiceUrl,
  portalUrl,
}: VendorPaymentConfirmationProps) {
  return (
    <EmailLayout preview={`Payment confirmed for ${businessName}, Young at Heart Festival 2026`}>
      <Heading>Payment received. See you in December.</Heading>

      <SuccessBadge>Your stall is confirmed</SuccessBadge>

      <Paragraph>Hi {contactName},</Paragraph>
      <Paragraph>
        Thank you. We&apos;ve received your payment for <strong>{businessName}</strong>. Your trading
        spot at Young at Heart Festival 2026 is now secured. Welcome to the family.
      </Paragraph>

      <Subheading>Your receipt</Subheading>
      <Paragraph>
        Amount paid: <strong>{formatRand(amount)}</strong>
        <br />
        Reference: <strong>{providerRef}</strong>
        <br />
        Method: Yoco (debit/credit card)
      </Paragraph>

      <Button href={invoiceUrl}>View &amp; print your invoice</Button>

      <Subheading>What happens next</Subheading>
      <Steps
        items={[
          <>
            Log in to your exhibitor portal:{' '}
            <InlineLink href={portalUrl}>{portalUrl}</InlineLink>
          </>,
          'Upload your halaal certificate and any outstanding documents.',
          'Add your staff (we issue gate passes from this list).',
          'Watch your portal Announcements for setup times and load-in details closer to the festival.',
        ]}
      />

      <Divider />

      <EventDetails
        rows={[
          `📅  ${brand.contact.dates}`,
          `📍  ${brand.contact.venue}`,
          '🎪  350+ Vendors · 25,000+ Visitors',
        ]}
      />

      <Paragraph>
        Questions? Reach the team at{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink> or call{' '}
        {brand.contact.phone}.
      </Paragraph>

      <Signoff>
        We can&apos;t wait to have you with us.
        <br />
        <br />
        Warm regards,
        <br />
        <strong>The Young at Heart Festival Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default VendorPaymentConfirmation
