import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

interface ApplicationConfirmationProps {
  businessName: string
  contactName: string
}

export function ApplicationConfirmation({
  businessName,
  contactName,
}: ApplicationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Application Received - Young at Heart Festival 2026</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Young at Heart Festival</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Application Received!</Text>

            <Text style={paragraph}>Hi {contactName},</Text>

            <Text style={paragraph}>
              Thank you for submitting your exhibitor application for <strong>{businessName}</strong>.
              We're excited that you're interested in joining Young at Heart Festival 2026!
            </Text>

            <Text style={paragraph}>
              <strong>What happens next?</strong>
            </Text>

            <Text style={paragraph}>
              Our team will review your application within 3-5 business days. We'll evaluate your
              application based on product fit, booth availability, and category balance.
            </Text>

            <Text style={paragraph}>
              You'll receive an email notification once we've made a decision about your application.
            </Text>

            <Hr style={divider} />

            <Text style={paragraph}>
              <strong>Event Details:</strong>
              <br />
              December 11-13, 2026
              <br />
              Youngsfield Military Base, Cape Town
            </Text>

            <Text style={paragraph}>
              If you have any questions, feel free to reach out to us at{' '}
              <Link href="mailto:support@youngatheart.co.za" style={link}>
                support@youngatheart.co.za
              </Link>
            </Text>

            <Text style={paragraph}>
              Best regards,
              <br />
              <strong>The Young at Heart Festival Team</strong>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © 2026 Young at Heart Festival. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#cd2653',
  padding: '24px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const content = {
  padding: '40px',
}

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: '24px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
}

const link = {
  color: '#cd2653',
  textDecoration: 'underline',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const footer = {
  textAlign: 'center' as const,
  padding: '24px',
}

const footerText = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0',
}

export default ApplicationConfirmation
