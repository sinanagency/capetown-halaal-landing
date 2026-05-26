import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { CreditCard, CheckCircle2, Clock, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application
  const state = parsePortalState(app?.admin_notes as string)
  const isPaid = state.payment?.status === 'paid' || app?.payment_status === 'paid'
  const due = (app?.payment_due_date as string) || '1 September 2026'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Payments</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Your stall fee</h1>
        <p className="text-neutral-500 text-sm mt-1">Track your balance and pay your stall fee here.</p>
      </div>

      <div className={`rounded-2xl p-6 border ${isPaid ? 'bg-green-50 border-green-200' : 'bg-[#1a1416] border-[#1a1416] text-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-white/10 text-[#ff7a9c]'}`}>
            {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
          </div>
          <div>
            <p className={`text-sm ${isPaid ? 'text-green-700' : 'text-white/60'}`}>Stall fee status</p>
            <p className={`text-2xl font-bold ${isPaid ? 'text-green-900' : 'text-white'}`}>{isPaid ? 'Paid' : 'Due'}</p>
            {!isPaid && <p className="text-sm text-white/60 mt-0.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Payable by {due}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#cd2653] mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-neutral-900">Online payment opens soon</p>
            <p className="text-sm text-neutral-600 mt-1">We're finalising the payment provider. The moment it's live, you'll be able to pay your stall fee here by card or pay-by-bank, get a unique reference, upload proof of payment, and download a receipt. Your spot is held until then.</p>
            <p className="text-sm text-neutral-500 mt-3">Questions about your fee? <a href="/exhibitor/portal/support" className="text-[#cd2653] font-medium">Message the organisers</a>.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
