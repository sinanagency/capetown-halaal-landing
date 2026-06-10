'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AcceptTermsForm({ alreadyAccepted }: { alreadyAccepted: boolean }) {
  const router = useRouter()
  const [ticked, setTicked] = useState(alreadyAccepted)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(alreadyAccepted)

  async function submit() {
    if (!ticked) {
      setError('Tick the acknowledgement box first.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/exhibitor/accept-terms', { method: 'POST' })
      if (!res.ok) throw new Error(`Could not save acceptance (${res.status}).`)
      setDone(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save acceptance.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done && alreadyAccepted) {
    return null
  }

  return (
    <div className="rounded-2xl border border-[#cd2653]/20 bg-[#cd2653]/[0.03] p-5 space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={ticked}
          onChange={(e) => setTicked(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#cd2653] cursor-pointer"
        />
        <span className="text-sm text-neutral-800 leading-relaxed">
          I have read the vendor terms and conditions above, and the full{' '}
          <a className="text-[#cd2653] underline" href="/terms" target="_blank" rel="noreferrer">public terms</a>,
          and I accept them on behalf of my business.
        </span>
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {done && !alreadyAccepted && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          Acceptance recorded. You can move on to the next step.
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <a href="/exhibitor/portal" className="text-sm text-neutral-500 hover:text-[#cd2653]">
          ← Back to overview
        </a>
        <button
          onClick={submit}
          disabled={!ticked || submitting || done}
          className="inline-flex items-center gap-2 bg-[#cd2653] hover:bg-[#b01f45] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {done ? 'Accepted' : submitting ? 'Saving…' : 'Accept terms'}
        </button>
      </div>
    </div>
  )
}
