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

interface ApplicationDelayNoticeProps {
  firstName: string
  businessName: string
}

export function ApplicationDelayNotice({
  firstName,
  businessName,
}: ApplicationDelayNoticeProps) {
  return (
    <Html>
      <Head />
      <Preview>An update on your Young at Heart Festival 2026 application</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Young at Heart</Text>
            <Text style={logoSub}>Festival 2026</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>A quick update on your application</Text>

            <Text style={paragraph}>Hi {firstName},</Text>

            <Text style={paragraph}>
              Thank you for your patience, and for applying to trade at
              Young at Heart Festival 2026 with <strong>{businessName}</strong>.
            </Text>

            <Text style={paragraph}>
              We have received an overwhelming number of vendor applications
              this year, far beyond what we anticipated. Because of this, our
              selection committee is taking extra time to review each
              application carefully, fairly, and in full.
            </Text>

            <Text style={subheading}>What this means for you</Text>

            <Section style={timeline}>
              <Text style={timelineItem}>
                <strong style={timelineDot}>1</strong>
                Your application is in the queue, and it will be reviewed.
              </Text>
              <Text style={timelineItem}>
                <strong style={timelineDot}>2</strong>
                Decisions are being rolled out in waves over the coming weeks.
              </Text>
              <Text style={timelineItem}>
                <strong style={timelineDot}>3</strong>
                Every applicant will receive a personal email with the outcome,
                whether approved or not.
              </Text>
            </Section>

            <Text style={paragraph}>
              No action is needed from you right now. If your business details
              or contact information have changed, simply reply to this email
              and we will update our records.
            </Text>

            <Hr style={divider} />

            <Section style={eventBox}>
              <Text style={eventTitle}>Event Details</Text>
              <Text style={eventDetail}>📅 December 11 to 13, 2026</Text>
              <Text style={eventDetail}>📍 Youngsfield Military Base, Cape Town</Text>
              <Text style={eventDetail}>🎪 350+ Vendors · 25,000+ Visitors</Text>
            </Section>

            <Text style={paragraph}>
              If you do not see future emails from us, please check your spam
              or junk folder, and mark{' '}
              <Link href="mailto:support@youngatheart.co.za" style={link}>
                support@youngatheart.co.za
              </Link>{' '}
              as a safe sender.
            </Text>

            <Text style={paragraph}>
              Questions? Reach out at{' '}
              <Link href="mailto:support@youngatheart.co.za" style={link}>
                support@youngatheart.co.za
              </Link>{' '}
              or call 065 943 5012.
            </Text>

            <Text style={signoff}>
              Thank you again for your patience, and for wanting to be part of
              Young at Heart Festival 2026.
              <br />
              <br />
              Warm regards,
              <br />
              <strong>The Young at Heart Festival Team</strong>
            </Text>
          </Section>

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

export default ApplicationDelayNotice
