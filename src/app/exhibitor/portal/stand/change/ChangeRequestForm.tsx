'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'

interface TierOption {
  slug: string
  label: string
  price: number
}

interface Props {
  currentTier: string
  currentTierLabel: string
  stallCode: string | null
  tiers: TierOption[]
}

export function ChangeRequestForm({ currentTier, currentTierLabel, stallCode, tiers }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedMeta = tiers.find((t) => t.slug === selected)
  const currentMeta = tiers.find((t) => t.slug === currentTier)
  const isSame = selected === currentTier
  const priceDiff = selectedMeta && currentMeta ? selectedMeta.price - currentMeta.price : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/exhibitor/stand/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selected, reason }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'Failed to submit request'); return }
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-medium text-emerald-800">Change request submitted.</p>
        <p className="text-xs text-emerald-600 mt-1">
          {isSame
            ? 'Same stall tier. Your stall allocation will be updated shortly.'
            : 'Your request has been sent to the organisers for review. They will follow up with you.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Current stall</p>
          <p className="text-sm font-medium text-neutral-900 mt-1">{currentTierLabel}{stallCode ? ` (${stallCode})` : ''}</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
            Requested stall tier
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]"
          >
            <option value="">Select a stall tier</option>
            {tiers.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label} (R{t.price.toLocaleString('en-ZA')})
              </option>
            ))}
          </select>
        </div>

        {isSame && selected && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            Same tier as your current allocation. This will be auto-approved and your stall assignment will be refreshed.
          </div>
        )}

        {selectedMeta && currentMeta && !isSame && (
          <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-700">
            {priceDiff > 0 ? (
              <>Price increase: R{priceDiff.toLocaleString('en-ZA')} additional fee will apply.</>
            ) : priceDiff < 0 ? (
              <>Price decrease: R{Math.abs(priceDiff).toLocaleString('en-ZA')} refund or credit will be processed.</>
            ) : (
              <>Same price tier. No payment change.</>
            )}
            <span className="block mt-1 text-neutral-500">Organiser approval required for tier changes.</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
            Reason for change (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Tell the organisers why you need to change your stall."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#cd2653] resize-none"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !selected}
        className="inline-flex items-center gap-2 bg-[#cd2653] hover:bg-[#b01f45] text-white text-sm font-medium rounded-full px-6 py-2.5 transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Submit change request
      </button>
    </form>
  )
}
