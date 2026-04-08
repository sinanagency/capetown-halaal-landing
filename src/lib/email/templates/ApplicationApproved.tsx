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
  Img,
} from '@react-email/components'

interface ApplicationApprovedProps {
  businessName: string
  contactName: string
  boothTier?: string
  applicationId?: string
  tempPassword?: string
  loginUrl?: string
}

export function ApplicationApproved({
  businessName,
  contactName,
  boothTier,
  applicationId,
  tempPassword,
  loginUrl = 'https://cthalaal.co.za/exhibitor',
}: ApplicationApprovedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your vendor application has been approved — Young at Heart Festival 2026</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>Young at Heart</Text>
            <Text style={logoSub}>Festival 2026</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Section style={successBadge}>
              <Text style={successBadgeText}>✓ APPLICATION APPROVED</Text>
            </Section>

            <Text style={heading}>Welcome aboard, {contactName}!</Text>

            <Text style={paragraph}>
              Great news! Your exhibitor application for <strong>{businessName}</strong> has been
              approved for Young at Heart Festival 2026.
            </Text>

            {boothTier && (
              <Section style={infoBox}>
                <Text style={infoLabel}>Booth Preference</Text>
                <Text style={infoValue}>{boothTier}</Text>
              </Section>
            )}

            {tempPassword && (
              <>
                <Hr style={divider} />
                <Text style={subheading}>Your Login Credentials</Text>
                <Text style={paragraph}>
                  Use the following temporary password to log into your exhibitor portal.
                  You will be prompted to set a new password on first login.
                </Text>
                <Section style={credBox}>
                  <Text style={credLabel}>Email</Text>
                  <Text style={credValue}>{businessName}</Text>
                  <Text style={credLabel}>Temporary Password</Text>
                  <Text style={otpCode}>{tempPassword}</Text>
                </Section>
                <Text style={smallText}>This password expires in 48 hours.</Text>
              </>
            )}

            <Hr style={divider} />

            <Text style={subheading}>Next Steps</Text>
            <Section style={stepsList}>
              <Text style={stepItem}>
                <strong style={stepNum}>1</strong>
                Log into your exhibitor portal using the credentials above
              </Text>
              <Text style={stepItem}>
                <strong style={stepNum}>2</strong>
                Select your booth location and complete payment
              </Text>
              <Text style={stepItem}>
                <strong style={stepNum}>3</strong>
                Receive your exhibitor pack with all event details
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button href={loginUrl} style={button}>
                Log In to Exhibitor Portal
              </Button>
            </Section>

            <Hr style={divider} />

            {/* Event Info */}
            <Section style={eventBox}>
              <Text style={eventTitle}>Event Details</Text>
              <Text style={eventDetail}>📅 December 11–13, 2026</Text>
              <Text style={eventDetail}>📍 Youngsfield Military Base, Cape Town</Text>
              <Text style={eventDetail}>⏰ Fri 2PM–11PM · Sat & Sun 11AM–11PM</Text>
            </Section>

            <Text style={paragraph}>
              Questions? Contact us at{' '}
              <Link href="mailto:support@youngatheart.co.za" style={link}>
                support@youngatheart.co.za
              </Link>
            </Text>

            <Text style={signoff}>
              See you at the festival!
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

// Styles
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
const successBadge = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}
const successBadgeText = {
  color: '#16a34a',
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '1px',
  margin: '0',
}
const heading = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#0a0a0a',
  marginBottom: '16px',
  letterSpacing: '-0.3px',
}
const subheading = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#0a0a0a',
  marginBottom: '12px',
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
  marginBottom: '16px',
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
const credBox = {
  backgroundColor: '#0a0a0a',
  borderRadius: '10px',
  padding: '20px 24px',
  marginBottom: '12px',
}
const credLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  color: '#a3a3a3',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 4px',
}
const credValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#ffffff',
  margin: '0 0 16px',
}
const otpCode = {
  fontSize: '28px',
  fontWeight: '800' as const,
  color: '#cd2653',
  letterSpacing: '4px',
  margin: '0',
  fontFamily: 'monospace',
}
const smallText = {
  fontSize: '12px',
  color: '#a3a3a3',
  marginBottom: '16px',
}
const stepsList = { marginBottom: '24px' }
const stepItem = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  marginBottom: '12px',
  paddingLeft: '32px',
  position: 'relative' as const,
}
const stepNum = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  backgroundColor: '#cd2653',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700' as const,
  marginRight: '8px',
  marginLeft: '-32px',
}
const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const button = {
  backgroundColor: '#cd2653',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
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

export default ApplicationApproved
