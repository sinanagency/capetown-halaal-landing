import {
  EmailLayout,
  Heading,
  Paragraph,
  Signoff,
  Divider,
  InlineLink,
  Button,
} from '../components'
import { brand } from '../brand'

interface PasswordResetProps {
  resetUrl: string
  contactName?: string
}

/**
 * Branded exhibitor password-reset email. Replaces Supabase's generic default
 * reset mail so the security-sensitive flow stays on-brand. The resetUrl is a
 * Supabase recovery action_link (generateLink type:'recovery') that lands the
 * exhibitor on /exhibitor/set-password with an active recovery session.
 */
export function PasswordReset({ resetUrl, contactName }: PasswordResetProps) {
  return (
    <EmailLayout preview="Reset your Young at Heart Festival exhibitor password">
      <Heading>Reset your password</Heading>

      <Paragraph>Hi {contactName || 'there'},</Paragraph>
      <Paragraph>
        We received a request to reset the password for your Young at Heart Festival exhibitor
        account. Click the button below to choose a new one. This link expires in one hour.
      </Paragraph>

      <Button href={resetUrl}>Reset my password →</Button>

      <Paragraph>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <InlineLink href={resetUrl}>{resetUrl}</InlineLink>
      </Paragraph>

      <Divider />

      <Paragraph>
        If you didn&apos;t request this, you can safely ignore this email, your password will not
        change. For anything else, reach us at{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>.
      </Paragraph>

      <Signoff>
        Warm regards,
        <br />
        <strong>The Young at Heart Festival Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default PasswordReset
