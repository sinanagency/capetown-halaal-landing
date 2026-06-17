'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, MousePointer, CheckCircle2 } from 'lucide-react'
import { Z_CLASS } from '@/lib/z'

interface TourStep {
  /** Title shown in the tooltip */
  title: string
  /** Body text */
  body: string
  /** CSS selector for the element to highlight. If absent, show centered (no highlight) */
  selector?: string
  /** Where to place the tooltip relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Navigate to this URL when the Next button is clicked */
  navigateTo?: string
  /** The page path where this step is shown. If null, shows on any page. */
  page?: string
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to the Admin Portal',
    body: 'This interactive guide will walk you through the key features. Click Next to begin.',
  },
  {
    title: 'Review Vendor Applications',
    body: 'Click here to see all vendor applications. Use j/k to navigate, a to approve, r to reject. You can also filter by status and sector, and use the Duplicate button to find duplicates by phone.',
    selector: 'a[href="/admin/applications"]',
    placement: 'right',
    navigateTo: '/admin/applications',
    page: '/admin',
  },
  {
    title: 'Applications Workbench',
    body: 'Each row is a vendor application. Click any row to preview their details. Press j/k to move, a to approve, r to reject. Try it now — click any application row.',
    selector: 'main a[href*="/admin/applications/"]',
    placement: 'right',
    page: '/admin/applications',
  },
  {
    title: 'Assign Stalls on the Map',
    body: 'Click Allocation in the sidebar to open the 2D floor plan. Click any stall to assign it to a vendor. Use filters above the map to narrow by sector or status.',
    selector: 'a[href="/admin/allocation"]',
    placement: 'right',
    navigateTo: '/admin/allocation',
    page: '/admin/applications',
  },
  {
    title: 'Floor Plan Map',
    body: 'This is the festival floor plan. Click any stall to assign or release it. The colored dots show available (green), allocated (red), and held (amber) stalls.',
    selector: 'main',
    placement: 'top',
    page: '/admin/allocation',
  },
  {
    title: 'Manage Approved Vendors',
    body: 'Click Vendors in the sidebar to see every approved vendor. Click any vendor to open their full profile with AI summary, payments, documents, staff badges, and activity timeline.',
    selector: 'a[href="/admin/vendors"]',
    placement: 'right',
    navigateTo: '/admin/vendors',
    page: '/admin/allocation',
  },
  {
    title: 'Track Payments',
    body: 'Click Finance under MONEY to see payment status for every vendor. The Payments tab shows who has paid, who is overdue. The Reconciliation tab matches payments against WooCommerce.',
    selector: 'a[href="/admin/finance"]',
    placement: 'right',
    navigateTo: '/admin/finance',
    page: '/admin/vendors',
  },
  {
    title: 'Handle Support Emails',
    body: 'Click Support Inbox under COMMUNICATIONS to read and reply to emails from vendors and ticket buyers. Tag, assign, snooze, or resolve threads.',
    selector: 'a[href="/admin/support-inbox"]',
    placement: 'right',
    navigateTo: '/admin/support-inbox',
    page: '/admin/finance',
  },
  {
    title: 'Search Everything with Cmd+K',
    body: 'Press Cmd+K (or Ctrl+K) from any page to search vendors by name, email, phone, or stall code. Also searches ticket buyers and support emails. Keyboard arrows to navigate, Enter to open.',
    selector: '[data-cmdk-trigger]',
    placement: 'bottom',
    page: '/admin/support-inbox',
  },
  {
    title: 'You are all set!',
    body: 'You now know the key features of the admin portal. Reopen this guide anytime from the Guide button at the bottom of the sidebar. Happy organising!',
  },
]

const STORAGE_KEY = 'admin.tour_state'

interface TourState {
  step: number
  active: boolean
}

function loadState(): TourState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TourState
    if (typeof parsed.step === 'number' && typeof parsed.active === 'boolean') return parsed
    return null
  } catch {
    return null
  }
}

function saveState(state: TourState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

export function InteractiveTour({ email }: { email?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [navBusy, setNavBusy] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  // Initialize: check localStorage on mount
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const saved = loadState()
    if (saved && saved.active) {
      setStep(saved.step)
      setOpen(true)
    } else {
      // First time: auto-show
      setStep(0)
      setOpen(true)
      saveState({ step: 0, active: true })
    }
  }, [])

  // Find and measure target element when step or pathname changes
  const measureTarget = useCallback(() => {
    const s = STEPS[step]
    if (!s.selector) {
      setTargetRect(null)
      return
    }

    // Wait a tick for DOM to be ready
    requestAnimationFrame(() => {
      const el = document.querySelector(s.selector!)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
      } else {
        setTargetRect(null)
      }
    })
  }, [step])

  useEffect(() => {
    if (open) measureTarget()
  }, [open, step, pathname, measureTarget])

  // Re-measure on scroll/resize
  useEffect(() => {
    if (!open) return
    function handle() { measureTarget() }
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [open, measureTarget])

  function goTo(newStep: number) {
    setStep(newStep)
    saveState({ step: newStep, active: true })
  }

  function next() {
    const s = STEPS[step]
    if (s.navigateTo) {
      setNavBusy(true)
      saveState({ step: step + 1, active: true })
      router.push(s.navigateTo)
    } else {
      goTo(Math.min(step + 1, STEPS.length - 1))
    }
  }

  function prev() {
    goTo(Math.max(step - 1, 0))
  }

  function close() {
    clearState()
    setOpen(false)
    setNavBusy(false)
  }

  if (!open) return null

  const s = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const hasTarget = !!s.selector && !!targetRect
  const showSteps = !isFirst && !isLast

  // Tooltip position based on placement and target rect
  let tooltipStyle: React.CSSProperties = {}
  let tooltipArrow: string | null = null

  if (hasTarget && targetRect) {
    const gap = 12
    switch (s.placement || 'bottom') {
      case 'right':
        tooltipStyle = {
          left: `${targetRect.right + gap}px`,
          top: `${targetRect.top + targetRect.height / 2}px`,
          transform: 'translateY(-50%)',
        }
        tooltipArrow = 'left'
        break
      case 'left':
        tooltipStyle = {
          right: `${window.innerWidth - targetRect.left + gap}px`,
          top: `${targetRect.top + targetRect.height / 2}px`,
          transform: 'translateY(-50%)',
        }
        tooltipArrow = 'right'
        break
      case 'top':
        tooltipStyle = {
          left: `${targetRect.left + targetRect.width / 2}px`,
          bottom: `${window.innerHeight - targetRect.top + gap}px`,
          transform: 'translateX(-50%)',
        }
        tooltipArrow = 'bottom'
        break
      case 'bottom':
      default:
        tooltipStyle = {
          left: `${targetRect.left + targetRect.width / 2}px`,
          top: `${targetRect.bottom + gap}px`,
          transform: 'translateX(-50%)',
        }
        tooltipArrow = 'top'
        break
    }
  }

  return (
    <>
      {/* Backdrop overlay with cutout */}
      {hasTarget && targetRect ? (
        <div className={`fixed inset-0 ${Z_CLASS.modal} pointer-events-none`} style={{ zIndex: 9998 }}>
          {/* Top strip */}
          <div
            className="bg-black/40"
            style={{ height: `${targetRect.top}px`, width: '100%' }}
          />
          {/* Middle strip: left + gap + right */}
          <div className="flex" style={{ height: `${targetRect.height}px` }}>
            <div
              className="bg-black/40"
              style={{ width: `${targetRect.left}px`, minWidth: 0 }}
            />
            <div style={{ width: `${targetRect.width}px`, minWidth: 0, position: 'relative' }}>
              {/* Glow ring around target */}
              <div
                className="absolute inset-0 rounded-lg ring-2 ring-[#cd2653] ring-offset-4 ring-offset-transparent animate-pulse"
                style={{ pointerEvents: 'auto' }}
              />
            </div>
            <div
              className="bg-black/40 flex-1"
              style={{ minWidth: 0 }}
            />
          </div>
          {/* Bottom strip */}
          <div
            className="bg-black/40"
            style={{ flex: 1, width: '100%' }}
          />
        </div>
      ) : (
        <div className={`fixed inset-0 bg-black/40 ${Z_CLASS.modal}`} style={{ zIndex: 9998 }} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed ${Z_CLASS.modal} w-80 max-w-[calc(100vw-32px)]`}
        style={{
          zIndex: 9999,
          ...(hasTarget && targetRect ? tooltipStyle : {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }),
          ...(navBusy ? { opacity: 0.5, pointerEvents: 'none' as const } : {}),
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
          {/* Arrow */}
          {tooltipArrow && (
            <div
              className="absolute w-3 h-3 bg-white border-neutral-200 rotate-45"
              style={{
                [tooltipArrow === 'top' ? 'bottom' :
                  tooltipArrow === 'bottom' ? 'top' :
                  tooltipArrow === 'left' ? 'right' : 'left']: '-6px',
                [tooltipArrow === 'top' || tooltipArrow === 'bottom' ? 'left' : 'top']: '50%',
                marginLeft: tooltipArrow === 'top' || tooltipArrow === 'bottom' ? '-6px' : '0',
                marginTop: tooltipArrow === 'left' || tooltipArrow === 'right' ? '-6px' : '0',
                borderRight: tooltipArrow === 'left' ? '1px solid' : 'none',
                borderBottom: tooltipArrow === 'top' ? '1px solid' : 'none',
                borderLeft: tooltipArrow === 'right' ? '1px solid' : 'none',
                borderTop: tooltipArrow === 'bottom' ? '1px solid' : 'none',
                borderColor: '#e5e5e5',
              }}
            />
          )}

          {/* Header */}
          <div className="flex items-start justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              {isLast ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <MousePointer className="w-5 h-5 text-[#cd2653]" />
              )}
              <h3 className="font-serif text-lg text-neutral-900">{s.title}</h3>
            </div>
            <button onClick={close} className="text-neutral-400 hover:text-neutral-900 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 pb-3">
            <p className="text-sm text-neutral-600 leading-relaxed">{s.body}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button onClick={prev} className="text-xs font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              )}
              {isFirst && (
                <button onClick={close} className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
                  Skip
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {showSteps && (
                <div className="flex gap-1">
                  {STEPS.slice(1, -1).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step - 1 ? 'bg-[#cd2653]' : 'bg-neutral-200'}`} />
                  ))}
                </div>
              )}
              <button
                onClick={isLast ? close : next}
                className="inline-flex items-center gap-1.5 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-full px-4 py-2 text-sm transition-colors"
              >
                {isLast ? 'Done' : navBusy ? 'Loading...' : 'Next'}
                {!isLast && !navBusy && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
