// Payment gate for exhibitor portal pages.
//
// Until a vendor has paid their stall fee, the ONLY thing they can do in the
// portal is pay. Every other page calls requirePaid() at the top of its
// server-side render function and gets redirected to /exhibitor/portal/payments
// if they haven't paid yet.
//
// /payments and /support are the two exceptions (they don't call this helper).

import { redirect } from 'next/navigation'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'

/** Redirect to /payments unless the signed-in vendor has paid. */
export async function requirePaid(): Promise<void> {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return // layout will redirect to login
  const state = parsePortalState((ctx.application.admin_notes as string) || null)
  if (state.payment?.status !== 'paid') {
    redirect('/exhibitor/portal/payments')
  }
}

/** Return number of days between today and a target date string (negative = overdue). */
export function daysUntil(target: Date | string | null | undefined): number | null {
  if (!target) return null
  const d = typeof target === 'string' ? new Date(target) : target
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

/** Format a date string (YYYY-MM-DD or ISO) as "DD Month YYYY" UK-style. */
export function fmtDate(target: Date | string | null | undefined, fallback = 'TBC'): string {
  if (!target) return fallback
  const d = typeof target === 'string' ? new Date(target) : target
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Compute due-date for a vendor: explicit column → fallback to approved_at + 30 days. */
export function computePaymentDue(app: { payment_due_date?: string | null; reviewed_at?: string | null }): Date | null {
  if (app.payment_due_date) {
    const d = new Date(app.payment_due_date)
    if (!isNaN(d.getTime())) return d
  }
  if (app.reviewed_at) {
    const d = new Date(app.reviewed_at)
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 30)
      return d
    }
  }
  return null
}
