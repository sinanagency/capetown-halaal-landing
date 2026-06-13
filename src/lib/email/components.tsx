import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Button as REButton,
  Img,
  Hr,
  Preview,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { brand } from './brand'

/* ----------------------------------------------------------------------------
 * EmailLayout, the branded shell every email pours its content into.
 * White editorial: logo-led white header + slim gradient rule, rich footer.
 * -------------------------------------------------------------------------- */
export function EmailLayout({
  preview,
  children,
  unsubscribeUrl,
}: {
  preview: string
  children: ReactNode
  unsubscribeUrl?: string
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={sBody}>
        <Container style={sContainer}>
          {/* Header */}
          <Section style={sHeader}>
            <Img
              src={brand.url.logo}
              width="72"
              height="72"
              alt="Young at Heart Festival"
              style={{ display: 'block', margin: '0 auto 14px', border: 0 }}
            />
            <Text style={sWordmark}>YOUNG AT HEART FESTIVAL</Text>
            <Text style={sKicker}>
              {brand.contact.dates}&nbsp;&middot;&nbsp;CAPE TOWN
            </Text>
          </Section>

          {/* Gradient rule */}
          <Img
            src={brand.url.accent}
            width="600"
            height="4"
            alt=""
            style={{ display: 'block', width: '100%', height: '4px', border: 0 }}
          />

          {/* Content */}
          <Section style={sContent}>{children}</Section>

          {/* Footer */}
          <Section style={sFooter}>
            <Text style={sFootBrand}>Young at Heart Festival</Text>
            <Text style={sFootLine}>{brand.contact.venue}</Text>
            <Text style={sFootLine}>
              <Link href={`tel:${brand.contact.phone.replace(/\s/g, '')}`} style={sFootMuted}>
                {brand.contact.phone}
              </Link>
              &nbsp;&middot;&nbsp;
              <Link href={`mailto:${brand.contact.email}`} style={sFootMuted}>
                {brand.contact.email}
              </Link>
            </Text>
            <Text style={sFootSocial}>
              <Link href={brand.url.site} style={sFootLink}>cthalaal.co.za</Link>
              <span style={{ color: '#d8d8d8' }}>&nbsp;|&nbsp;</span>
              <Link href={brand.url.instagram} style={sFootLinkPurple}>Instagram</Link>
              <span style={{ color: '#d8d8d8' }}>&nbsp;&middot;&nbsp;</span>
              <Link href={brand.url.facebook} style={sFootLinkPurple}>Facebook</Link>
              <span style={{ color: '#d8d8d8' }}>&nbsp;&middot;&nbsp;</span>
              <Link href={brand.url.linkedin} style={sFootLinkPurple}>LinkedIn</Link>
            </Text>
            <Text style={sCopy}>
              {'© 2026 Young at Heart Festival · Cape Town, South Africa'}
              {unsubscribeUrl && (
                <>
                  {'  ·  '}
                  <Link href={unsubscribeUrl} style={sFootMuted}>Unsubscribe</Link>
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/* ----------------------------------------------------------------------------
 * Reusable content blocks
 * -------------------------------------------------------------------------- */
export const Heading = ({ children }: { children: ReactNode }) => (
  <Text style={sHeading}>{children}</Text>
)
export const Subheading = ({ children }: { children: ReactNode }) => (
  <Text style={sSubheading}>{children}</Text>
)
export const Paragraph = ({ children }: { children: ReactNode }) => (
  <Text style={sParagraph}>{children}</Text>
)
export const Signoff = ({ children }: { children: ReactNode }) => (
  <Text style={sSignoff}>{children}</Text>
)
export const Divider = () => <Hr style={sDivider} />
export const InlineLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} style={sLink}>{children}</Link>
)

export function Button({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', margin: '28px 0' }}>
      <REButton href={href} style={sButton}>{children}</REButton>
    </Section>
  )
}

export function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Section style={sCard}>
      <Text style={sCardLabel}>{label}</Text>
      <Text style={sCardValue}>{value}</Text>
    </Section>
  )
}

export function CredBox({ email, password, note }: { email: string; password: string; note?: string }) {
  return (
    <>
      <Section style={sCred}>
        <Text style={sCredLabel}>Email</Text>
        <Text style={sCredValue}>{email}</Text>
        <Text style={{ ...sCredLabel, marginTop: '14px' }}>Temporary Password</Text>
        <Text style={sCredCode}>{password}</Text>
      </Section>
      {note && <Text style={sSmall}>{note}</Text>}
    </>
  )
}

export function SuccessBadge({ children }: { children: ReactNode }) {
  return (
    <Section style={sBadge}>
      <Text style={sBadgeText}>{children}</Text>
    </Section>
  )
}

export function EventDetails({ rows }: { rows: string[] }) {
  return (
    <Section style={sEvent}>
      <Text style={sEventTitle}>EVENT DETAILS</Text>
      {rows.map((r, i) => (
        <Text key={i} style={sEventRow}>{r}</Text>
      ))}
    </Section>
  )
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <Section style={{ margin: '4px 0 8px' }}>
      {items.map((item, i) => (
        <Row key={i} style={{ marginBottom: '12px' }}>
          <Column style={{ width: '30px', verticalAlign: 'top' }}>
            <Text style={sStepNum}>{i + 1}</Text>
          </Column>
          <Column>
            <Text style={sStepText}>{item}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

/* ----------------------------------------------------------------------------
 * Styles (all reference brand tokens)
 * -------------------------------------------------------------------------- */
const sBody = { backgroundColor: brand.color.page, fontFamily: brand.font.sans, margin: 0, padding: 0 }
const sContainer = {
  backgroundColor: brand.color.white,
  margin: '40px auto',
  maxWidth: '600px',
  borderRadius: '14px',
  overflow: 'hidden' as const,
  boxShadow: '0 4px 24px rgba(122,45,142,0.08)',
}
const sHeader = { backgroundColor: brand.color.white, padding: '34px 40px 22px', textAlign: 'center' as const }
const sWordmark = {
  margin: 0, color: brand.color.ink, fontSize: '15px', fontWeight: 700 as const,
  letterSpacing: '2.5px', fontFamily: brand.font.sans,
}
const sKicker = {
  margin: '6px 0 0', color: brand.color.purple, fontSize: '11px', fontWeight: 600 as const,
  letterSpacing: '1.5px',
}
const sContent = { padding: '36px 40px 8px' }
const sHeading = {
  fontFamily: brand.font.serif, fontSize: '26px', fontWeight: 700 as const,
  color: brand.color.ink, lineHeight: '1.25', margin: '0 0 18px',
}
const sSubheading = {
  fontFamily: brand.font.sans, fontSize: '13px', fontWeight: 700 as const,
  color: brand.color.purple, letterSpacing: '0.5px', textTransform: 'uppercase' as const,
  margin: '26px 0 12px',
}
const sParagraph = { fontSize: '15px', lineHeight: '25px', color: brand.color.body, margin: '0 0 16px' }
const sSignoff = { fontSize: '15px', lineHeight: '25px', color: brand.color.body, margin: '22px 0 0' }
const sLink = { color: brand.color.orange, textDecoration: 'underline' }
const sDivider = { borderColor: brand.color.line, margin: '26px 0' }
const sButton = {
  backgroundColor: brand.gradientFallback,
  backgroundImage: brand.gradient,
  borderRadius: '999px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 36px',
}
const sCard = {
  backgroundColor: brand.color.soft, border: `1px solid ${brand.color.line}`,
  borderRadius: '10px', padding: '16px 18px', margin: '0 0 16px',
}
const sCardLabel = {
  margin: 0, fontSize: '11px', fontWeight: 700 as const, color: brand.color.muted,
  textTransform: 'uppercase' as const, letterSpacing: '1px',
}
const sCardValue = { margin: '5px 0 0', fontSize: '16px', fontWeight: 600 as const, color: brand.color.ink }
const sCred = { backgroundColor: brand.color.soft, border: `1px solid #ead9ef`, borderRadius: '12px', padding: '20px 24px', margin: '0 0 10px' }
const sCredLabel = { margin: 0, fontSize: '11px', fontWeight: 700 as const, color: brand.color.purple, textTransform: 'uppercase' as const, letterSpacing: '1px' }
const sCredValue = { margin: '4px 0 0', fontSize: '15px', fontWeight: 600 as const, color: brand.color.ink }
const sCredCode = { margin: '4px 0 0', fontSize: '26px', fontWeight: 800 as const, color: brand.color.magenta, letterSpacing: '3px', fontFamily: brand.font.mono }
const sSmall = { fontSize: '12px', color: brand.color.muted, margin: '0 0 16px' }
const sBadge = { textAlign: 'center' as const, margin: '0 0 22px' }
const sBadgeText = {
  display: 'inline-block', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
  borderRadius: '999px', color: '#16a34a', fontSize: '11px', fontWeight: 700 as const,
  letterSpacing: '1.5px', padding: '8px 18px', margin: 0,
}
const sEvent = { backgroundColor: brand.color.soft, borderRadius: '12px', padding: '18px 20px', margin: '8px 0 20px' }
const sEventTitle = { margin: '0 0 10px', fontSize: '11px', fontWeight: 700 as const, color: brand.color.purple, letterSpacing: '1.5px' }
const sEventRow = { margin: '0 0 5px', fontSize: '14px', lineHeight: '22px', color: brand.color.body }
const sStepNum = {
  margin: 0, width: '22px', height: '22px', lineHeight: '22px', borderRadius: '50%',
  backgroundColor: brand.color.purple, color: '#ffffff', fontSize: '12px', fontWeight: 700 as const,
  textAlign: 'center' as const,
}
const sStepText = { margin: 0, fontSize: '14px', lineHeight: '22px', color: brand.color.body }
const sFooter = { backgroundColor: brand.color.soft, borderTop: `1px solid ${brand.color.line}`, padding: '26px 40px', textAlign: 'center' as const }
const sFootBrand = { margin: '0 0 6px', fontFamily: brand.font.serif, fontSize: '15px', fontWeight: 700 as const, color: brand.color.ink }
const sFootLine = { margin: '0 0 4px', fontSize: '13px', lineHeight: '20px', color: brand.color.muted }
const sFootMuted = { color: brand.color.muted, textDecoration: 'none' }
const sFootSocial = { margin: '10px 0 0', fontSize: '13px' }
const sFootLink = { color: brand.color.orange, textDecoration: 'none', fontWeight: 700 as const }
const sFootLinkPurple = { color: brand.color.purple, textDecoration: 'none' }
const sCopy = { margin: '14px 0 0', fontSize: '11px', color: '#b0a8b3' }
