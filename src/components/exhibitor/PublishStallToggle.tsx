'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'

interface Props {
  initialPublish: boolean
  /** When the vendor has no stall allocated yet, the toggle is disabled and
   *  the helper text explains why. */
  hasStall: boolean
}

export default function PublishStallToggle({ initialPublish, hasStall }: Props) {
  const [publish, setPublish] = useState<boolean>(initialPublish)
  const [pending, setPending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  async function onToggle() {
    if (pending || !hasStall) return
    const next = !publish
    setPending(true)
    setError(null)
    // Optimistic update with rollback on failure.
    setPublish(next)
    try {
      const res = await fetch('/api/exhibitor/profile/publish-stall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publish: next }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPublish(!next)
        setError(j.error || 'Could not save')
      }
    } catch (e) {
      setPublish(!next)
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5]/40 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center shrink-0">
          {publish ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1B1A17]">Public profile</p>
          <p className="text-sm text-[#1B1A17]/55 mt-0.5">
            Control what attendees see on your festival page.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="publish-stall" className="block text-sm font-medium text-[#1B1A17]">
            Show my stall code on my public profile
          </label>
          <p className="text-xs text-[#1B1A17]/55 mt-1 leading-relaxed">
            When on, attendees browsing the festival site can see your stall code on your sectors page.
            Default off for privacy. You can change this any time.
          </p>
          {!hasStall && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F2EBD8] px-2.5 py-1 text-[11px] font-medium text-[#1B1A17]/70">
              Stall allocation pending, toggle unlocks after admin assigns your stall
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-[#bf3026]">{error}</p>
          )}
        </div>
        <button
          id="publish-stall"
          type="button"
          role="switch"
          aria-checked={publish}
          disabled={!hasStall || pending}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${publish ? 'bg-[#cd2653]' : 'bg-[#E5DCC4]'}`}
        >
          <span className="sr-only">Toggle stall code visibility</span>
          {pending ? (
            <Loader2 className="absolute left-1/2 -translate-x-1/2 h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publish ? 'translate-x-6' : 'translate-x-1'}`}
            />
          )}
        </button>
      </div>
    </div>
  )
}
