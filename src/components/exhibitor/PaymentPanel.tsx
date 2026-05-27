'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreditCard, CheckCircle2, Clock, Loader2, Upload, Info } from 'lucide-react'

export default function PaymentPanel({
  enabled, status, amount, reference, dueDate,
}: { enabled: boolean; status: string; amount: number | null; reference: string | null; dueDate: string }) {
  const params = useSearchParams()
  const justPaid = params.get('paid') === '1'
  const cancelled = params.get('cancelled') === '1'

  const [paying, setPaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [proofDone, setProofDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isPaid = status === 'paid' || justPaid

  async function payByCard() {
    setPaying(true); setError(null)
    try {
      const res = await fetch('/api/exhibitor/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not start payment')
      window.location.href = j.url
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPaying(false) }
  }

  async function uploadProof(file: File) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/exhibitor/payments', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
      setProofDone(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') } finally { setUploading(false) }
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

      {!isPaid && (
        <>
          {/* card payment */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <p className="font-semibold text-neutral-900 mb-1">Pay by card</p>
            {enabled ? (
              <>
                <p className="text-sm text-neutral-500 mb-4">Secure card payment, processed by Transaction Junction.</p>
                <button onClick={payByCard} disabled={paying || !amount}
                  className="bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-60">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {amount ? `Pay R${amount.toFixed(2)} now` : 'Amount pending'}
                </button>
              </>
            ) : (
              <p className="text-sm text-neutral-500 flex items-start gap-2"><Info className="w-4 h-4 text-[#cd2653] mt-0.5 shrink-0" /> Card payment is being set up with our bank and opens shortly. Your spot is held in the meantime.</p>
            )}
          </div>

          {/* EFT proof upload */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <p className="font-semibold text-neutral-900 mb-1">Paid by EFT?</p>
            <p className="text-sm text-neutral-500 mb-4">If you paid by bank transfer, upload your proof of payment here and the organisers will confirm it{reference ? `. Use reference ${reference}` : ''}.</p>
            {proofDone ? (
              <p className="text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Proof received. The organisers will confirm shortly.</p>
            ) : (
              <label className="inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 border border-neutral-200 hover:border-[#cd2653] hover:text-[#cd2653] cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload proof of payment
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f) }} />
              </label>
            )}
          </div>
        </>
      )}
    </div>
  )
}
