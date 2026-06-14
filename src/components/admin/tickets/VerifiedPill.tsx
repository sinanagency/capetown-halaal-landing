'use client'

/**
 * VerifiedPill
 *
 * Renders BOTH verification states from `ticket_verifications`:
 *   - verified_at + no error                   -> green "Verified"
 *   - verification_error present               -> red   "Verify failed"
 *   - neither                                  -> gray  "Pending verify"
 *   - checked_in_at present (separate pill)    -> blue  "Checked in HH:MM"
 *
 * Used by /admin/verifier (per result) and /admin/people (per row).
 * Hover for full context (method, timestamp, error reason).
 */

import { cn } from '@/lib/utils'

export interface TicketVerificationRow {
  verified_at: string | null
  verified_method: string | null
  verified_by_email: string | null
  verification_error: string | null
  checked_in_at: string | null
  checked_in_method: string | null
  checked_in_by_email: string | null
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function pillBase(className: string) {
  return cn(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
    className,
  )
}

export function VerifiedPill({ row }: { row: TicketVerificationRow | null | undefined }) {
  if (!row) {
    return (
      <span
        className={pillBase('bg-gray-100 text-gray-700 border-gray-200')}
        title="No verification record yet. The auto-verifier runs every 6 hours."
      >
        Pending verify
      </span>
    )
  }

  const pills: React.ReactNode[] = []

  if (row.verified_at && !row.verification_error) {
    const method = row.verified_method === 'auto_cron' ? 'auto' : row.verified_method || 'manual'
    pills.push(
      <span
        key="verified"
        className={pillBase('bg-green-100 text-green-800 border-green-200')}
        title={`Verified ${fmtDateTime(row.verified_at)}, method: ${method}${
          row.verified_by_email ? `, by ${row.verified_by_email}` : ''
        }`}
      >
        Verified
      </span>,
    )
  } else if (row.verification_error) {
    pills.push(
      <span
        key="failed"
        className={pillBase('bg-red-100 text-red-800 border-red-200')}
        title={`Verify failed: ${row.verification_error}`}
      >
        Verify failed
      </span>,
    )
  } else {
    pills.push(
      <span
        key="pending"
        className={pillBase('bg-gray-100 text-gray-700 border-gray-200')}
        title="Awaiting next verifier run (every 6 hours)."
      >
        Pending verify
      </span>,
    )
  }

  if (row.checked_in_at) {
    pills.push(
      <span
        key="checkedin"
        className={pillBase('bg-blue-100 text-blue-800 border-blue-200')}
        title={`Checked in ${fmtDateTime(row.checked_in_at)}${
          row.checked_in_method ? `, via ${row.checked_in_method}` : ''
        }${row.checked_in_by_email ? `, by ${row.checked_in_by_email}` : ''}`}
      >
        Checked in {fmtTime(row.checked_in_at)}
      </span>,
    )
  }

  return <span className="inline-flex flex-wrap items-center gap-1">{pills}</span>
}
