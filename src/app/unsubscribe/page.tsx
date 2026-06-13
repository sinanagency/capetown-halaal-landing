'use client'

// =============================================================================
// /unsubscribe — public page. Decodes the token (?token= or /:token), shows
// the email it is unsubscribing, and confirms with a POST to the API.
//
// Vendor-facing copy: no em-dashes, calm tone, "Zanii AI on behalf of Young at
// Heart" is NOT required here because this is a transactional self-service
// surface (not a first-contact/sign-off/identity-question bot reply).
// =============================================================================

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function decodeEmailHint(token: string | null): string | null {
  if (!token) return null
  try {
    const [emailB64] = token.split('.', 1)
    if (!emailB64) return null
    const pad = emailB64.length % 4 === 0 ? '' : '='.repeat(4 - (emailB64.length % 4))
    const decoded = atob(emailB64.replace(/-/g, '+').replace(/_/g, '/') + pad)
    return decoded.includes('@') ? decoded : null
  } catch {
    return null
  }
}

function UnsubscribeInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const emailHint = decodeEmailHint(token)
  const initialMissing = !token
    ? 'This unsubscribe link is missing a token. Please use the link from your email.'
    : null
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'error'>(
    (token && emailHint) ? 'idle' : 'error'
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(initialMissing)
  const [reason, setReason] = useState('')

  const confirm = async () => {
    if (!token) return
    setState('pending')
    try {
      const res = await fetch(`/api/unsubscribe/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setErrorMsg(json.error || `HTTP ${res.status}`)
        setState('error')
        return
      }
      setState('done')
    } catch (e) {
      setErrorMsg((e as Error).message)
      setState('error')
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Unsubscribe from Young at Heart emails
        </h1>

        {state === 'idle' && emailHint && (
          <>
            <p className="mt-3 text-sm text-neutral-600">
              We will stop sending broadcast emails to{' '}
              <strong className="text-neutral-900">{emailHint}</strong>.
              Critical account messages (application outcome, payment receipt) will
              still go through.
            </p>
            <label className="block mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Reason (optional)
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Help us understand what didn't land."
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#cd2653]/40" />
            <button type="button" onClick={confirm}
              className="mt-5 w-full rounded-md bg-[#cd2653] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b22149]">
              Confirm unsubscribe
            </button>
          </>
        )}

        {state === 'pending' && (
          <p className="mt-3 text-sm text-neutral-600">Unsubscribing...</p>
        )}

        {state === 'done' && (
          <div className="mt-3">
            <p className="text-sm text-neutral-600">
              You are unsubscribed. We will not send you broadcast emails again.
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Changed your mind? Reply to any past email and we will re-enable.
            </p>
          </div>
        )}

        {state === 'error' && (
          <p className="mt-3 text-sm text-red-600">
            {errorMsg || 'Could not process this unsubscribe link. Please contact support@youngatheart.co.za.'}
          </p>
        )}
      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <UnsubscribeInner />
    </Suspense>
  )
}
