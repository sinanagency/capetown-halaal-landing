'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Check, Loader2 } from 'lucide-react'

interface Props {
  /** The phone we already have on file — pre-fills the input. */
  prefillPhone: string
  /** First name for the welcome copy. */
  firstName: string
}

const DISMISS_KEY = 'cth.wa_optin.dismissed'

function normaliseE164(input: string): string {
  const digits = input.replace(/[^\d]/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return '+27' + digits.slice(1) // SA local → +27...
  if (digits.startsWith('27')) return '+' + digits
  if (input.trim().startsWith('+')) return '+' + digits
  return '+' + digits
}

export function WaOptInBanner({ prefillPhone, firstName }: Props) {
  const [dismissed, setDismissed] = useState(false) // session-scope only
  const [expanded, setExpanded] = useState(false)
  const [phone, setPhone] = useState(prefillPhone || '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(DISMISS_KEY) === 'yes') setDismissed(true)
  }, [])

  if (dismissed || done) return null

  async function submit() {
    setBusy(true)
    setError(null)
    const e164 = normaliseE164(phone)
    if (!/^\+\d{8,15}$/.test(e164)) {
      setError('Please enter a valid number (e.g. 0723803393 or +27723803393).')
      setBusy(false)
      return
    }
    try {
      const res = await fetch('/api/exhibitor/wa-optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164 }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function maybeLater() {
    if (typeof window !== 'undefined') sessionStorage.setItem(DISMISS_KEY, 'yes')
    setDismissed(true)
  }

  return (
    <div className="bg-gradient-to-r from-[#cd2653] to-[#7c1d3a] text-white border-b border-[#7c1d3a]/40">
      <div className="container mx-auto px-4 py-3 flex items-start gap-3">
        <div className="bg-white/20 rounded-full p-2 mt-0.5 shrink-0">
          <MessageCircle className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {!expanded ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm">
                <strong>Get festival updates on WhatsApp{firstName ? `, ${firstName}` : ''}.</strong>{' '}
                <span className="text-white/85">Setup reminders, payment receipts, your stall number, all on WhatsApp.</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpanded(true)}
                  className="bg-white text-[#cd2653] rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-white/90"
                >
                  Sign up
                </button>
                <button
                  onClick={maybeLater}
                  className="text-white/80 hover:text-white text-xs px-2 py-1.5"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Confirm your WhatsApp number</p>
              <p className="text-xs text-white/80">
                We&apos;ll send you setup time reminders, stall allocation alerts, payment receipts, and last-minute updates. Reply STOP at any time to unsubscribe.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0723803393 or +27723803393"
                  className="flex-1 min-w-[180px] rounded-lg bg-white/10 border border-white/30 px-3 py-1.5 text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white"
                  disabled={busy}
                />
                <button
                  onClick={submit}
                  disabled={busy || !phone.trim()}
                  className="bg-white text-[#cd2653] rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-60 flex items-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {busy ? 'Saving' : 'Subscribe'}
                </button>
                <button
                  onClick={maybeLater}
                  className="text-white/80 hover:text-white text-xs px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="text-xs bg-white/15 rounded px-2 py-1">{error}</p>}
            </div>
          )}
        </div>

        <button
          onClick={maybeLater}
          aria-label="Dismiss"
          className="text-white/60 hover:text-white shrink-0 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
