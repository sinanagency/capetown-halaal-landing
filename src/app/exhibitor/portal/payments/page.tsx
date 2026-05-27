import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { paymentsEnabled, paymentReference } from '@/lib/payments'
import PaymentPanel from '@/components/exhibitor/PaymentPanel'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application
  const state = parsePortalState(app?.admin_notes as string)
  const status = state.payment?.status || 'none'
  const amount = state.payment?.amount ?? null
  const due = (app?.payment_due_date as string) || '1 September 2026'
  const reference = state.payment?.reference || (app ? paymentReference(app.id as string) : null)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Payments</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Your stall fee</h1>
        <p className="text-neutral-500 text-sm mt-1">Pay your booth fee by card, or upload proof if you paid by EFT.</p>
      </div>
      <PaymentPanel enabled={paymentsEnabled()} status={status} amount={amount} reference={reference} dueDate={due} />
    </div>
  )
}
