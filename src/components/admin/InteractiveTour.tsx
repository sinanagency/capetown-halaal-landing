'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TourOverlay } from './TourOverlay'

interface TourStep {
  title: string
  body: string
  target?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  navigateTo?: string
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to the Admin Portal',
    body: 'This interactive tour will show you where to click and how to use each feature. Let\'s get started!',
    placement: 'bottom',
  },
  {
    title: 'Review Vendor Applications',
    body: 'Click here to see all vendor applications. You\'ll use keyboard shortcuts: j/k to navigate, a to approve, r to reject.',
    target: 'a[href="/admin/applications"]',
    placement: 'right',
    navigateTo: '/admin/applications',
  },
  {
    title: 'Applications Workbench',
    body: 'Each row is a vendor application. Click any row to preview their details in the right panel. Use j/k to move between applications.',
    target: '[data-testid="application-row"]:first-child',
    placement: 'right',
  },
  {
    title: 'Assign Stalls on the Map',
    body: 'Click here to open the 2D floor plan. You can click any stall to assign it to a vendor or release it.',
    target: 'a[href="/admin/allocation"]',
    placement: 'right',
    navigateTo: '/admin/allocation',
  },
  {
    title: 'Floor Plan Map',
    body: 'This is the festival floor plan. Click any colored stall to assign or release it. Use the filters above to narrow by sector or status.',
    target: '[data-testid="floor-map"]',
    placement: 'bottom',
  },
  {
    title: 'Manage Approved Vendors',
    body: 'Click here to see every approved vendor. Click any vendor card to open their full profile with AI summary, payments, and documents.',
    target: 'a[href="/admin/vendors"]',
    placement: 'right',
    navigateTo: '/admin/vendors',
  },
  {
    title: 'Vendor Profile',
    body: 'This shows the vendor\'s complete information: contact details, payment status, uploaded documents, staff badges, and activity timeline.',
    target: '[data-testid="vendor-card"]:first-child',
    placement: 'right',
  },
  {
    title: 'Track Payments',
    body: 'Click here to see payment status for every vendor. The Payments tab shows who has paid. Reconciliation matches payments against WooCommerce orders.',
    target: 'a[href="/admin/finance"]',
    placement: 'right',
    navigateTo: '/admin/finance',
  },
  {
    title: 'Handle Support Emails',
    body: 'Click here to read and reply to emails from vendors and ticket buyers. You can tag, assign, snooze, or resolve threads.',
    target: 'a[href="/admin/support-inbox"]',
    placement: 'right',
    navigateTo: '/admin/support-inbox',
  },
  {
    title: 'Search Everything with Cmd+K',
    body: 'Press Cmd+K (or Ctrl+K) from any page to search vendors, buyers, and support threads. Use arrow keys to navigate, Enter to open.',
    placement: 'bottom',
  },
  {
    title: 'You\'re All Set!',
    body: 'You now know how to use the admin portal. You can reopen this tour anytime by clicking the "Guide" button at the bottom of the sidebar.',
    placement: 'bottom',
  },
]

const STORAGE_KEY = 'admin.tour_state'

export function InteractiveTour({ email }: { email?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { step: savedStep, active } = JSON.parse(saved)
        if (active && typeof savedStep === 'number') {
          setStep(savedStep)
          setOpen(true)
          return
        }
      }
      setStep(0)
      setOpen(true)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 0, active: true }))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const currentStep = STEPS[step]
    if (currentStep.navigateTo && !pathname.startsWith(currentStep.navigateTo)) {
      setOpen(false)
    }
  }, [pathname, open, step])

  function next() {
    const s = STEPS[step]
    if (s.navigateTo) {
      setNavigating(true)
      const nextStep = step + 1
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: nextStep, active: true }))
      setStep(nextStep)
      router.push(s.navigateTo)
    } else {
      const nextStep = Math.min(step + 1, STEPS.length - 1)
      setStep(nextStep)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: nextStep, active: true }))
    }
  }

  function prev() {
    const prevStep = Math.max(step - 1, 0)
    setStep(prevStep)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: prevStep, active: true }))
  }

  function close() {
    localStorage.removeItem(STORAGE_KEY)
    setOpen(false)
  }

  if (!open) return null

  const s = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  return (
    <TourOverlay
      targetSelector={s.target}
      placement={s.placement}
      onNext={next}
      onPrev={prev}
      onClose={close}
      isFirst={isFirst}
      isLast={isLast}
      navigating={navigating}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#cd2653] text-white text-xs font-bold flex items-center justify-center">
              {step + 1}
            </div>
            <h3 className="font-serif text-xl text-neutral-900">{s.title}</h3>
          </div>
        </div>
        <p className="text-sm text-neutral-600 leading-relaxed">{s.body}</p>
        {s.target && (
          <p className="text-xs text-[#cd2653] mt-3 font-medium flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#cd2653]"></span>
            Click the highlighted element to continue
          </p>
        )}
      </div>
    </TourOverlay>
  )
}
