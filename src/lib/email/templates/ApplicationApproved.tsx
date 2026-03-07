import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface ApplicationApprovedProps {
  businessName: string
  contactName: string
  boothTier?: string
}

export function ApplicationApproved({
  businessName,
  contactName,
  boothTier,
}: ApplicationApprovedProps) {
  return (
    <Html>
      <Head />
      <Preview>Congratulations! Your Application Has Been Approved</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Young at Heart Festival</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Congratulations!</Text>

            <Text style={paragraph}>Hi {contactName},</Text>

            <Text style={paragraph}>
              Great news! Your exhibitor application for <strong>{businessName}</strong> has been
              approved for Young at Heart Festival 2026!
            </Text>

            {boothTier && (
              <Section style={infoBox}>
                <Text style={infoBoxText}>
                  <strong>Booth Preference:</strong> {boothTier}
                </Text>
              </Section>
            )}

            <Text style={paragraph}>
              <strong>Next Steps:</strong>
            </Text>

            <Text style={paragraph}>
              1. You'll receive a separate email with booth selection details and payment instructions.
              <br />
              2. Complete your payment to secure your booth.
              <br />
              3. Once confirmed, you'll receive your exhibitor pack with all event details.
            </Text>

            <Section style={buttonContainer}>
              <Button href="https://cthalaal.co.za/exhibitor" style={button}>
                View Booth Options
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              <strong>Event Details:</strong>
              <br />
              December 11-13, 2026
              <br />
              Youngsfield Military Base, Cape Town
            </Text>

            <Text style={paragraph}>
              If you have any questions about the booking process, contact us at{' '}
              <Link href="mailto:exhibitors@cthalaal.co.za" style={link}>
                exhibitors@cthalaal.co.za
              </Link>
            </Text>

            <Text style={paragraph}>
              We're looking forward to having you at the festival!
              <br />
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
  color: '#16a34a',
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

const infoBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
}

const infoBoxText = {
  fontSize: '14px',
  color: '#166534',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '24px',
}

const button = {
  backgroundColor: '#cd2653',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
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

export default ApplicationApproved
