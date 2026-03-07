'use client'

import { cn } from '@/lib/utils'
import type { ApplicationStatus } from '@/lib/supabase/types'

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  info_requested: {
    label: 'Info Requested',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
