'use client'

import { useEffect, useState } from 'react'
import { X, ArrowRight, ArrowLeft, LayoutDashboard, FileText, Map, Users, Wallet, Mail, Megaphone, Search, BookOpen } from 'lucide-react'
import { Z_CLASS } from '@/lib/z'

interface TourStep {
  icon: React.ReactNode
  title: string
  body: string
  href?: string
}

const STEPS: TourStep[] = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Welcome to the Admin Portal',
    body: 'This guide walks through every feature. Use the sidebar to navigate or press Cmd+K to search. You can reopen this guide anytime from the bottom of the sidebar.',
  },
  {
    icon: <LayoutDashboard className="w-6 h-6" />,
    title: 'Dashboard — Your Home Base',
    body: 'The Task Center at the top shows what needs attention: pending applications, unread support emails, failed WhatsApp messages, and stale applications. Stats row shows tickets sold, vendor revenue, active apps. Hover a task and click X to dismiss it. Tasks auto-refresh every 60 seconds.',
    href: '/admin',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Applications — Review Vendors',
    body: 'Click Applications in the sidebar. Use j/k to move through applications, a to approve, r to reject. Filter by status, sector, stall type, or completeness. Use the Duplicate button to find and merge duplicates by phone number. Select multiple and bulk approve/reject.',
    href: '/admin/applications',
  },
  {
    icon: <Map className="w-6 h-6" />,
    title: 'Allocation — Assign Stalls',
    body: 'Click Allocation in the sidebar. Pan and zoom the 2D floor plan. Click any stall to assign it to a vendor. Filters above the map let you filter by sector, stall type, or status. The slot countdown shows how many stalls are available matching your active filters.',
    href: '/admin/allocation',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Vendors — Manage Approved Vendors',
    body: 'Click Vendors in the sidebar. See every approved vendor with business name, stall code, and payment status. Click any vendor to open their full profile: AI summary, contact info, contract status, payments, staff badges, uploaded documents, activity timeline, and communication log. Select multiple vendors and send bulk WhatsApp or email.',
    href: '/admin/vendors',
  },
  {
    icon: <Wallet className="w-6 h-6" />,
    title: 'Finance — Track Payments',
    body: 'Click Finance under MONEY in the sidebar. The Payments tab shows every vendor with their payment status, amount, and due date. Filter by paid, pending, overdue, or not invoiced. The Reconciliation tab matches payments against WooCommerce orders and flags mismatches.',
    href: '/admin/finance',
  },
  {
    icon: <Mail className="w-6 h-6" />,
    title: 'Support Inbox — Handle Emails',
    body: 'Click Support Inbox under COMMUNICATIONS. This mirrors emails sent to support@youngatheart.co.za. Read, reply, tag, assign to an operator, snooze, or resolve threads. The inbox shows emails from both vendors and ticket buyers. Use the identity filter (Vendors / Ticket Buyers / Unknown) to narrow down.',
    href: '/admin/support-inbox',
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: 'Broadcast — Mass Message Vendors',
    body: 'Click Broadcast under COMMUNICATIONS. Choose your audience by status, sector, stall tier, or document completeness. Pick a channel (Email, WhatsApp, or Both). Use a pre-written template or write your own. Preview the message for the first recipient, then send. The system respects opt-outs and throttle limits.',
    href: '/admin/broadcast',
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Cmd+K — Quick Search Everywhere',
    body: 'Press Cmd+K (or Ctrl+K) from any admin page to open the global search. Search for vendors by name, email, phone, or stall code. Search ticket buyers, WhatsApp threads, and support emails. Keyboard arrows to navigate, Enter to open. Your recent searches are saved for quick access.',
  },
]

const TOTAL = STEPS.length

const STORAGE_KEY = 'admin.tour_completed'

export function AdminTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(STORAGE_KEY)
      if (!done) setOpen(true)
    } catch {
      // private browsing
    }

    // Listen for re-open requests from the sidebar Guide button
    function handler() {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('cth:open-tour', handler)
    return () => window.removeEventListener('cth:open-tour', handler)
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch { /* ignore */ }
    setOpen(false)
  }

  function next() {
    if (step < TOTAL - 1) setStep(step + 1)
  }

  function prev() {
    if (step > 0) setStep(step - 1)
  }

  function goToHref(href?: string) {
    if (href) window.location.href = href
  }

  if (!open) return null

  const s = STEPS[step]

  return (
    <div
      className={`fixed inset-0 ${Z_CLASS.modal} flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200">
        <div className="flex items-start justify-between p-5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
              Step {step + 1} of {TOTAL}
            </span>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-[#cd2653]' : 'bg-neutral-200'}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close guide"
            className="text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-[#cd2653] mb-4">{s.icon}</div>
          <h2 className="font-serif text-2xl text-neutral-900 mb-3">{s.title}</h2>
          <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{s.body}</p>
          {s.href && (
            <button
              onClick={() => goToHref(s.href)}
              className="mt-4 text-xs font-medium text-[#cd2653] hover:underline inline-flex items-center gap-1"
            >
              Open this page <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between p-5 bg-neutral-50 border-t border-neutral-100">
          <div className="flex gap-2">
            {step === 0 ? (
              <button onClick={dismiss} className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
                Skip guide
              </button>
            ) : (
              <button
                onClick={prev}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>
          <button
            onClick={step < TOTAL - 1 ? next : dismiss}
            className="inline-flex items-center gap-2 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors"
          >
            {step < TOTAL - 1 ? (
              <>Next <ArrowRight className="w-4 h-4" /></>
            ) : (
              'Done'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAdminTour() {
  const [show, setShow] = useState(false)

  function openTour() {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
    setShow(true)
  }

  return { show, setShow, openTour }
}
