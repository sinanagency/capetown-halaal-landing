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
  email?: string
}

export function ApplicationConfirmation({
  businessName,
  contactName,
  email,
}: ApplicationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Application received — Young at Heart Festival 2026</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>Young at Heart</Text>
            <Text style={logoSub}>Festival 2026</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={heading}>Application Received</Text>

            <Text style={paragraph}>Hi {contactName},</Text>

            <Text style={paragraph}>
              Thank you for submitting your exhibitor application for <strong>{businessName}</strong>.
              We're excited that you want to be part of Young at Heart Festival 2026!
            </Text>

            {email && (
              <Section style={infoBox}>
                <Text style={infoLabel}>Confirmation sent to</Text>
                <Text style={infoValue}>{email}</Text>
              </Section>
            )}

            <Text style={subheading}>What happens next?</Text>

            <Section style={timeline}>
              <Text style={timelineItem}>
                <strong style={timelineDot}>1</strong>
                Our team is reviewing your application. No further action is needed from you for now.
              </Text>
              <Text style={timelineItem}>
                <strong style={timelineDot}>2</strong>
                From 1 June 2026, every applicant receives a personal email with the outcome — whether approved or not.
              </Text>
              <Text style={timelineItem}>
                <strong style={timelineDot}>3</strong>
                If approved, that email includes your login details and payment instructions.
              </Text>
            </Section>

            <Text style={paragraph}>
              Please check your spam or junk folder for emails from{' '}
              <Link href="mailto:support@youngatheart.co.za" style={link}>
                support@youngatheart.co.za
              </Link>{' '}
              and mark us as a safe sender, so your outcome email lands properly around 1 June.
            </Text>

            <Hr style={divider} />

            {/* Event Info */}
            <Section style={eventBox}>
              <Text style={eventTitle}>Event Details</Text>
              <Text style={eventDetail}>📅 December 11–13, 2026</Text>
              <Text style={eventDetail}>📍 Youngsfield Military Base, Cape Town</Text>
              <Text style={eventDetail}>🎪 350+ Vendors · 25,000+ Visitors</Text>
            </Section>

            <Text style={paragraph}>
              Questions? Reach out at{' '}
              <Link href="mailto:support@youngatheart.co.za" style={link}>
                support@youngatheart.co.za
              </Link>
            </Text>

            <Text style={signoff}>
              Best regards,
              <br />
              <strong>The Young at Heart Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © 2026 Young at Heart Festival · Cape Town, South Africa
            </Text>
            <Text style={footerLinks}>
              <Link href="https://cthalaal.co.za" style={footerLink}>Website</Link>
              {' · '}
              <Link href="https://instagram.com/youngatheart_capetown" style={footerLink}>Instagram</Link>
              {' · '}
              <Link href="https://facebook.com/capetownhalaal" style={footerLink}>Facebook</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
}
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  marginTop: '40px',
  marginBottom: '40px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}
const header = {
  backgroundColor: '#0a0a0a',
  padding: '32px 40px',
  textAlign: 'center' as const,
}
const logo = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700' as const,
  margin: '0',
  letterSpacing: '-0.3px',
}
const logoSub = {
  color: '#cd2653',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '4px 0 0',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
}
const content = { padding: '40px' }
const heading = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#0a0a0a',
  marginBottom: '20px',
  letterSpacing: '-0.3px',
}
const subheading = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#0a0a0a',
  marginBottom: '16px',
}
const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#525252',
  marginBottom: '16px',
}
const link = { color: '#cd2653', textDecoration: 'underline' }
const infoBox = {
  backgroundColor: '#fafafa',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '20px',
}
const infoLabel = {
  fontSize: '11px',
  fontWeight: '700' as const,
  color: '#a3a3a3',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 4px',
}
const infoValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#0a0a0a',
  margin: '0',
}
const timeline = { marginBottom: '24px' }
const timelineItem = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  marginBottom: '12px',
  paddingLeft: '32px',
}
const timelineDot = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700' as const,
  marginRight: '8px',
  marginLeft: '-32px',
}
const eventBox = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
}
const eventTitle = {
  fontSize: '13px',
  fontWeight: '700' as const,
  color: '#0a0a0a',
  marginBottom: '8px',
}
const eventDetail = {
  fontSize: '14px',
  color: '#525252',
  marginBottom: '4px',
  lineHeight: '22px',
}
const signoff = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#525252',
}
const divider = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = {
  textAlign: 'center' as const,
  padding: '24px 40px',
  backgroundColor: '#fafafa',
  borderTop: '1px solid #e5e5e5',
}
const footerText = {
  fontSize: '12px',
  color: '#a3a3a3',
  margin: '0 0 8px',
}
const footerLinks = {
  fontSize: '12px',
  color: '#a3a3a3',
  margin: '0',
}
const footerLink = { color: '#cd2653', textDecoration: 'none' }

export default ApplicationConfirmation
