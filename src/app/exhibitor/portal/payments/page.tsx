import Link from 'next/link'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { paymentsEnabled, paymentReference } from '@/lib/payments'
import { computeVendorPricing, formatRand } from '@/lib/payments/pricing'
import { computePaymentDue, daysUntil, fmtDate } from '@/lib/exhibitor-paygate'
import PaymentPanel from '@/components/exhibitor/PaymentPanel'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import {
  PageShell, PageHeader, Card
} from '@/components/chrome/PageChrome'
import MiniTaskStrip from '@/components/exhibitor/MiniTaskStrip'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application
  const state = parsePortalState(app?.admin_notes as string)
  const status = state.payment?.status || 'none'
  const dueDate = app ? computePaymentDue(app as { payment_due_date?: string | null; reviewed_at?: string | null }) : null
  const due = dueDate ? fmtDate(dueDate) : (app?.payment_due_date as string) || 'TBC'
  const daysLeft = dueDate ? daysUntil(dueDate) : null
  const reference = state.payment?.reference || (app ? paymentReference(app.id as string) : null)
  const attemptedAt = state.payment?.attempted_at as string | undefined
  const failedAttempts = (state.payment?.failed_attempts as number | undefined) || 0

  // Compute the itemised breakdown from the application data so the vendor sees
  // exactly what they're paying for. An organiser-set state.payment.amount
  // overrides only the total (e.g. for special-case quotes).
  const pricing = app
    ? computeVendorPricing({
        preferred_booth_tier: app.preferred_booth_tier as string,
        special_requirements: app.special_requirements,
      })
    : null
  const amount = state.payment?.amount && state.payment.amount > 0
    ? state.payment.amount
    : pricing?.total ?? null

  // Countdown banner. Until the vendor pays, the rest of the portal is locked
  // (requirePaid on every other route redirects them here). The banner makes
  // the 30-day window obvious and the consequence concrete.
  const showCountdown = status !== 'paid' && daysLeft !== null
  const countdownTone =
    daysLeft === null ? 'neutral'
    : daysLeft < 0 ? 'overdue'
    : daysLeft <= 7 ? 'urgent'
    : daysLeft <= 14 ? 'warn'
    : 'ok'
  const toneStyles: Record<string, string> = {
    ok:      'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn:    'bg-amber-50  border-amber-200 text-amber-800',
    urgent:  'bg-orange-50 border-orange-200 text-orange-800',
    overdue: 'bg-[#cd2653]/10 border-[#cd2653]/40 text-[#bf3026]',
    neutral: 'bg-neutral-50 border-neutral-200 text-neutral-700',
  }

  return (
    <PageShell>
      <MiniTaskStrip activeKey="payment" />
      <PageHeader
        kicker="Payments"
        title={status === 'paid' ? 'You are paid in full' : 'Pay your stall fee'}
        subtitle={status === 'paid'
          ? 'Thank you. Your booth is confirmed. The full festival portal is unlocked for you below.'
          : 'Your portal unlocks the moment your stall fee clears. Pay by card via Yoco, EFT details on request via support.'}
      />

      {/* Countdown banner */}
      {showCountdown && (
        <div className={`rounded-2xl border p-5 mb-6 flex items-start gap-4 ${toneStyles[countdownTone]}`}>
          {countdownTone === 'overdue' ? <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" /> : <Clock className="w-6 h-6 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-bold text-base">
              {daysLeft! < 0
                ? `${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) === 1 ? '' : 's'} overdue`
                : daysLeft === 0
                ? 'Due today'
                : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
            </p>
            <p className="text-sm mt-1 opacity-90">
              Stall fee due by <strong>{due}</strong>. Until you pay, every other page in your portal is locked. We send reminders by email and WhatsApp once a week until payment clears.
            </p>
          </div>
        </div>
      )}

      {status === 'paid' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mb-6 flex items-start gap-4 text-emerald-800">
          <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Payment confirmed</p>
            <p className="text-sm mt-1 opacity-90">
              Your booth is locked in. Use the menu above to view your stand, upload documents, register staff and watch announcements.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {pricing && pricing.total > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-[#1B1A17]/55 font-semibold">Itemised breakdown</p>
              {status === 'paid' && (
                <Link
                  href="/exhibitor/portal/invoice"
                  className="text-xs font-semibold text-[#cd2653] hover:underline"
                >
                  View invoice
                </Link>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#1B1A17]/70">{pricing.stallLabel}</span>
                <span className="text-[#1B1A17] font-medium">{formatRand(pricing.stallPrice)}</span>
              </div>
              {pricing.electricalItems.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#1B1A17]/70">
                    {it.label}
                    {it.qty && it.qty > 1 ? ` × ${it.qty}` : ''}
                  </span>
                  <span className="text-[#1B1A17] font-medium">{formatRand(it.amount)}</span>
                </div>
              ))}
              {pricing.chairsQty > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#1B1A17]/70">Chairs hired × {pricing.chairsQty}</span>
                  <span className="text-[#1B1A17] font-medium">{formatRand(pricing.chairsAmount)}</span>
                </div>
              )}
              {pricing.tablesQty > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#1B1A17]/70">Tables hired × {pricing.tablesQty}</span>
                  <span className="text-[#1B1A17] font-medium">{formatRand(pricing.tablesAmount)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-[#B8924A]/15 mt-4 pt-3 flex justify-between items-baseline">
              <span className="font-semibold text-[#1B1A17]">Total</span>
              <span className="font-serif text-2xl text-[#cd2653] font-semibold">
                {amount !== null ? formatRand(amount) : 'TBC'}
              </span>
            </div>
          </Card>
        )}

        <PaymentPanel
          enabled={paymentsEnabled()}
          status={status}
          amount={amount}
          reference={reference}
          dueDate={due}
          attemptedAt={attemptedAt || null}
          failedAttempts={failedAttempts}
        />
      </div>
    </PageShell>
  )
}
