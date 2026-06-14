'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, ListChecks, MessageCircle, ArrowRight } from 'lucide-react'
import { Z_CLASS } from '@/lib/z'

// Welcome-modal that fires ONCE per vendor on first portal landing. We check
// for a localStorage flag (cth_portal_welcomed) before showing. The parent
// (Overview page) is a server component, so this client wrapper is what owns
// the open/close state. The server already filtered out vendors who have a
// returning-vendor marker, so this just guards against duplicate dismissals
// within the browser.
export function WelcomeModal({ firstName, alreadyDismissedServer }: { firstName: string; alreadyDismissedServer: boolean }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    if (alreadyDismissedServer) return
    try {
      const flag = window.localStorage.getItem('cth_portal_welcomed')
      if (!flag) setOpen(true)
    } catch {
      // Private browsing or storage disabled, skip the modal silently.
    }
  }, [alreadyDismissedServer])

  function dismiss() {
    try {
      window.localStorage.setItem('cth_portal_welcomed', new Date().toISOString())
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 ${Z_CLASS.modal} flex items-center justify-center p-4 bg-[#1B1A17]/60 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cth-welcome-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#E5E5E5]">
        <div className="flex items-start justify-between p-5 border-b border-[#E5E5E5]/60">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#cd2653]">
              Step {step} of 3
            </span>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close welcome"
            className="text-[#1B1A17]/50 hover:text-[#1B1A17] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-3">
              <Sparkles className="w-7 h-7 text-[#cd2653]" />
              <h2 id="cth-welcome-title" className="font-serif text-2xl text-[#1B1A17]">
                Welcome {firstName}.
              </h2>
              <p className="text-sm text-[#1B1A17]/70 leading-relaxed">
                You are approved for Young at Heart 2026. This portal is your home for everything between now and show day.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <ListChecks className="w-7 h-7 text-[#cd2653]" />
              <h2 className="font-serif text-2xl text-[#1B1A17]">Here are your 4 tasks.</h2>
              <p className="text-sm text-[#1B1A17]/70 leading-relaxed">
                Sign the contract, pay the stall fee, upload your compliance documents, and register your gate access list. We show your progress on every page.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <MessageCircle className="w-7 h-7 text-[#cd2653]" />
              <h2 className="font-serif text-2xl text-[#1B1A17]">Stuck on anything?</h2>
              <p className="text-sm text-[#1B1A17]/70 leading-relaxed">
                Open the Inbox tab in the top nav. The support team replies on WhatsApp and email, usually within a working day.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 bg-[#FDFAF1] border-t border-[#E5E5E5]/60">
          {step === 1 ? (
            <button
              onClick={dismiss}
              className="text-xs font-semibold text-[#1B1A17]/55 hover:text-[#1B1A17]"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3)}
              className="text-xs font-semibold text-[#1B1A17]/55 hover:text-[#1B1A17]"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s === 1 ? 2 : 3) as 1 | 2 | 3)}
              className="inline-flex items-center gap-2 bg-[#cd2653] hover:bg-[#bf3026] text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="bg-[#cd2653] hover:bg-[#bf3026] text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal
