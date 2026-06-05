import Link from 'next/link'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { paymentsEnabled, paymentReference } from '@/lib/payments'
import { computeVendorPricing, formatRand } from '@/lib/payments/pricing'
import PaymentPanel from '@/components/exhibitor/PaymentPanel'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application
  const state = parsePortalState(app?.admin_notes as string)
  const status = state.payment?.status || 'none'
  const due = (app?.payment_due_date as string) || '1 September 2026'
  const reference = state.payment?.reference || (app ? paymentReference(app.id as string) : null)

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Payments</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Your stall fee</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Pay your booth fee securely by card via Yoco. Once paid, your invoice
          is in your portal and we&apos;ll email a copy too.
        </p>
      </div>

      {pricing && pricing.total > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Itemised breakdown</p>
            {status === 'paid' && (
              <Link
                href="/exhibitor/portal/invoice"
                className="text-xs font-semibold text-[#cd2653] hover:underline"
              >
                View invoice →
              </Link>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-700">{pricing.stallLabel}</span>
              <span className="text-neutral-900 font-medium">{formatRand(pricing.stallPrice)}</span>
            </div>
            {pricing.electricalItems.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-neutral-700">
                  {it.label}
                  {it.qty && it.qty > 1 ? ` × ${it.qty}` : ''}
                </span>
                <span className="text-neutral-900 font-medium">{formatRand(it.amount)}</span>
              </div>
            ))}
            {pricing.chairsQty > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-700">Chairs hired × {pricing.chairsQty}</span>
                <span className="text-neutral-900 font-medium">{formatRand(pricing.chairsAmount)}</span>
              </div>
            )}
            {pricing.tablesQty > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-700">Tables hired × {pricing.tablesQty}</span>
                <span className="text-neutral-900 font-medium">{formatRand(pricing.tablesAmount)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-neutral-200 mt-4 pt-3 flex justify-between items-baseline">
            <span className="font-semibold text-neutral-900">Total</span>
            <span className="font-serif text-2xl text-[#cd2653] font-semibold">
              {amount !== null ? formatRand(amount) : '—'}
            </span>
          </div>
        </div>
      )}

      <PaymentPanel
        enabled={paymentsEnabled()}
        status={status}
        amount={amount}
        reference={reference}
        dueDate={due}
      />
    </div>
  )
}
