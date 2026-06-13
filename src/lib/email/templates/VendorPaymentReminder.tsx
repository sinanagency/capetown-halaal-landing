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
import { formatRand } from '@/lib/payments/pricing'

interface VendorPaymentReminderProps {
  contactName: string
  businessName: string
  amount: number
  dueDate: string         // e.g. "10 July 2026"
  daysRemaining: number   // e.g. 14 (negative = overdue)
  invoiceUrl: string
  payUrl: string          // direct portal payments link
  weekNumber: number      // 1, 2, 3, 4 (tone hardens per week)
}

const TONES: Record<number, { heading: string; lede: string }> = {
  1: {
    heading: 'A friendly reminder, your stall is waiting',
    lede: `Quick note: your stall fee is still outstanding. Settle it to lock in your spot.`,
  },
  2: {
    heading: 'Heads up on your stall fee',
    lede: `It's been a couple of weeks since approval. Your spot is held, but stalls are limited.`,
  },
  3: {
    heading: 'Almost time, your stall is at risk',
    lede: `Your deadline is close. After it passes, the spot may be re-allocated to another approved vendor.`,
  },
  4: {
    heading: 'Final notice, payment overdue',
    lede: `Your payment is now past due. Reply to this email if you need an extension, otherwise the spot will be released within 7 days.`,
  },
}

/**
 * Weekly payment reminder. The cron at /api/cron/payment-reminders fires this
 * once per week (each Monday 09:00 SAST) until the vendor pays or the deadline
 * passes. Tone hardens slightly week by week.
 */
export function VendorPaymentReminder({
  contactName,
  businessName,
  amount,
  dueDate,
  daysRemaining,
  invoiceUrl,
  payUrl,
  weekNumber,
}: VendorPaymentReminderProps) {
  const tone = TONES[Math.min(Math.max(weekNumber, 1), 4)]
  const isOverdue = daysRemaining < 0
  return (
    <EmailLayout preview={`Stall fee reminder for ${businessName}, ${formatRand(amount)} due ${dueDate}`}>
      <Heading>{tone.heading}</Heading>

      <Paragraph>Hi {contactName},</Paragraph>
      <Paragraph>{tone.lede}</Paragraph>

      <Divider />

      <Paragraph>
        <strong>Vendor:</strong> {businessName}
        <br />
        <strong>Amount due:</strong> {formatRand(amount)}
        <br />
        <strong>Due date:</strong> {dueDate}
        <br />
        <strong>Status:</strong>{' '}
        <span style={{
          color: isOverdue ? '#bf3026' : daysRemaining <= 7 ? '#B8924A' : '#1f7050',
          fontWeight: 700,
        }}>
          {isOverdue
            ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} overdue`
            : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
        </span>
      </Paragraph>

      <Button href={payUrl}>Pay now via Yoco card</Button>

      <Paragraph>
        Prefer EFT or have a query? Reply to this email and an organiser will help, or message us on{' '}
        <InlineLink href={`mailto:${brand.contact.email}`}>{brand.contact.email}</InlineLink>{' '}
        or {brand.contact.phone}.
      </Paragraph>

      <Paragraph>
        Your full invoice and breakdown sit in your portal:{' '}
        <InlineLink href={invoiceUrl}>{invoiceUrl}</InlineLink>.
      </Paragraph>

      <Signoff>
        Warm regards,
        <br />
        <strong>The Young at Heart Festival Team</strong>
      </Signoff>
    </EmailLayout>
  )
}

export default VendorPaymentReminder
