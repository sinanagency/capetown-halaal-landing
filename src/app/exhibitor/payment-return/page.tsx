// Public payment-return landing page. Yoco redirects here after success/
// cancel/failure on its hosted checkout. We deliberately keep this OUTSIDE
// the gated /exhibitor/portal tree so a vendor whose Supabase session was
// dropped during the cross-domain hop (Safari ITP, WhatsApp in-app browser,
// expired access token mid-checkout) lands on a friendly screen instead of
// being bounced to the login page. The user clicks "Continue to portal" and
// is re-authenticated naturally if needed.
//
// Replaces the previous return targets:
//   /exhibitor/portal/payments?paid=1     -> /exhibitor/payment-return?status=success
//   /exhibitor/portal/payments?cancelled=1 -> /exhibitor/payment-return?status=cancelled
//   (failureUrl)                          -> /exhibitor/payment-return?status=failed

import Link from 'next/link'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Status = 'success' | 'cancelled' | 'failed' | 'unknown'

const COPY: Record<Status, { title: string; body: string; tone: 'success' | 'warn' | 'fail' }> = {
  success: {
    title: 'Payment received',
    body: 'Thanks. Your payment is being confirmed by the bank. Your invoice will be ready in your portal in a moment.',
    tone: 'success',
  },
  cancelled: {
    title: 'Payment cancelled',
    body: 'No charge was made. You can try again any time from your portal, or message the organisers if you would prefer to pay another way.',
    tone: 'warn',
  },
  failed: {
    title: 'Payment did not complete',
    body: 'Your card was not charged. This is usually a bank-side issue. Try again, use a different card, or message the organisers.',
    tone: 'fail',
  },
  unknown: {
    title: 'Returning to your portal',
    body: 'One moment.',
    tone: 'warn',
  },
}

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const raw = (params.status || '').toLowerCase()
  const status: Status =
    raw === 'success' || raw === 'cancelled' || raw === 'failed' ? raw : 'unknown'
  const c = COPY[status]
  const Icon = status === 'success' ? CheckCircle2 : status === 'failed' ? XCircle : AlertCircle
  const iconColour =
    c.tone === 'success' ? 'text-green-600' : c.tone === 'fail' ? 'text-red-600' : 'text-amber-600'
  const bgColour =
    c.tone === 'success' ? 'bg-green-50' : c.tone === 'fail' ? 'bg-red-50' : 'bg-amber-50'
  const borderColour =
    c.tone === 'success' ? 'border-green-200' : c.tone === 'fail' ? 'border-red-200' : 'border-amber-200'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#fbfafa]">
      <div className="max-w-md w-full">
        <div className={`rounded-2xl border ${borderColour} ${bgColour} p-8`}>
          <div className="flex items-start gap-4">
            <Icon className={`w-8 h-8 ${iconColour} shrink-0`} />
            <div>
              <h1 className="font-serif text-2xl text-neutral-900">{c.title}</h1>
              <p className="text-sm text-neutral-700 mt-2 leading-relaxed">{c.body}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/exhibitor/portal/payments"
            className="block text-center bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-5 py-3 text-sm"
          >
            Continue to your portal
          </Link>
          <Link
            href="/exhibitor/portal/support"
            className="block text-center text-sm font-semibold text-neutral-600 hover:text-[#cd2653] py-2"
          >
            Message support
          </Link>
        </div>

        <p className="text-[11px] text-neutral-400 mt-6 text-center">
          Young at Heart Festival 2026, Cape Town Halaal.
        </p>
      </div>
    </div>
  )
}
