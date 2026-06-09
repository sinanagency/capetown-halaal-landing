'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreditCard, CheckCircle2, Clock, Loader2, Info, RefreshCw, MessageSquare } from 'lucide-react'

export default function PaymentPanel({
  enabled, status, amount, reference, dueDate,
}: {
  enabled: boolean
  status: string
  amount: number | null
  reference: string | null
  dueDate: string
}) {
  const params = useSearchParams()
  const justPaid = params.get('paid') === '1'
  const cancelled = params.get('cancelled') === '1'

  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const isPaid = status === 'paid' || justPaid
  // "Locked" = a card payment is in-flight. We hide the Pay-now CTA so the
  // vendor doesn't get charged twice. They can still force a retry (rare:
  // abandoned Yoco session or webhook never fired) via the explicit button.
  const isPending = !isPaid && status === 'pending'
  const showPayBlock = !isPaid && (!isPending || retrying || cancelled)

  async function payByCard() {
    setPaying(true); setError(null)
    try {
      const res = await fetch('/api/exhibitor/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not start payment')
      window.location.href = j.url
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPaying(false) }
  }

  return (
    <div className="space-y-6">
      {justPaid && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">Thanks, your payment is being confirmed. This page will update once it clears.</div>}
      {cancelled && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">Payment was cancelled. You can try again below.</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* fee status */}
      <div className={`rounded-2xl p-6 border ${isPaid ? 'bg-green-50 border-green-200' : 'bg-[#1a1416] border-[#1a1416] text-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-white/10 text-[#ff7a9c]'}`}>
            {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
          </div>
          <div>
            <p className={`text-sm ${isPaid ? 'text-green-700' : 'text-white/60'}`}>Stall fee</p>
            <p className={`text-2xl font-bold ${isPaid ? 'text-green-900' : 'text-white'}`}>
              {isPaid ? 'Paid' : amount ? `R${amount.toFixed(2)} due` : 'Amount pending'}
            </p>
            {!isPaid && <p className="text-sm text-white/60 mt-0.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Payable by {dueDate}{reference ? ` · ref ${reference}` : ''}</p>}
          </div>
        </div>
      </div>

      {/* Pending banner — webhook hasn't confirmed yet. Show this INSTEAD of the
          Pay-now button so we don't double-charge if the user reloads while the
          gateway is still processing. */}
      {isPending && !retrying && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 mb-1">Payment in progress</p>
            <p className="text-sm text-blue-800 mb-3">
              We&apos;re waiting for the bank to confirm your last payment.
              This usually takes under a minute. Refresh this page in a moment.
            </p>
            <button
              onClick={() => setRetrying(true)}
              className="text-xs font-semibold text-blue-900 underline hover:no-underline inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Didn&apos;t go through? Try again
            </button>
          </div>
        </div>
      )}

      {showPayBlock && (
        <>
          {/* card payment */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <p className="font-semibold text-neutral-900 mb-1">Pay by card</p>
            {enabled ? (
              <>
                <p className="text-sm text-neutral-500 mb-4">Secure card payment in South African Rand (ZAR), processed on FNB&rsquo;s 3D-Secure page. We never see or store your card number.</p>
                <button onClick={payByCard} disabled={paying || !amount}
                  className="bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-60">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {amount ? `Pay R${amount.toFixed(2)} now` : 'Amount pending'}
                </button>
                <p className="text-xs text-neutral-400 mt-3">By paying you agree to our <a href="/terms" className="underline hover:text-neutral-600">Terms</a> and <a href="/refund-policy" className="underline hover:text-neutral-600">Refund &amp; Cancellation Policy</a>.</p>
              </>
            ) : (
              <p className="text-sm text-neutral-500 flex items-start gap-2"><Info className="w-4 h-4 text-[#cd2653] mt-0.5 shrink-0" /> Card payment is being set up with our bank and opens shortly. Your spot is held in the meantime.</p>
            )}
          </div>

          {/* Card trouble? Route to support, organisers reconcile manually. */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
            <p className="text-sm text-neutral-700 mb-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#cd2653] mt-0.5 shrink-0" />
              Card not going through, or paying another way? Message the organisers and we&apos;ll sort it out with you.
            </p>
            <Link
              href="/exhibitor/portal/support"
              className="inline-flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 bg-white border border-neutral-200 hover:border-[#cd2653] hover:text-[#cd2653]"
            >
              <MessageSquare className="w-4 h-4" /> Message support
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
