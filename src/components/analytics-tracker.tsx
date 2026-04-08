'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function getSessionId() {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('_sid')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_sid', id)
  }
  return id
}

function getUTM() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  }
}

async function track(type: string, data: Record<string, unknown> = {}) {
  try {
    const session_id = getSessionId()
    if (!session_id) return

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        session_id,
        path: window.location.pathname,
        referrer: document.referrer || undefined,
        ...getUTM(),
        ...data,
      }),
      keepalive: true,
    })
  } catch {
    // Never break user experience
  }
}

function TrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPath = useRef('')

  useEffect(() => {
    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    if (fullPath === lastPath.current) return
    lastPath.current = fullPath
    track('pageview')
  }, [pathname, searchParams])

  return null
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  )
}

// Export track function for use in event tracking
export { track }
