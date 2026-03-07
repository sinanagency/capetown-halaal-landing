'use client'

import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import type { VendorApplication } from '@/lib/supabase/types'
import { Building2, Mail, Phone, Calendar } from 'lucide-react'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ApplicationCard({ application }: { application: VendorApplication }) {
  return (
    <Link
      href={`/admin/applications/${application.id}`}
      className="block bg-white rounded-xl border border-neutral-200 p-6 hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-neutral-900 text-lg">
            {application.business_name}
          </h3>
          <p className="text-sm text-neutral-500">{application.contact_name}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="space-y-2 text-sm text-neutral-600">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span>{application.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          <span>{application.phone}</span>
        </div>
        {application.preferred_booth_tier && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>{application.preferred_booth_tier}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>Applied {formatDate(application.created_at)}</span>
        </div>
      </div>

      {application.product_categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {application.product_categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full"
            >
              {cat}
            </span>
          ))}
          {application.product_categories.length > 3 && (
            <span className="px-2 py-0.5 text-neutral-400 text-xs">
              +{application.product_categories.length - 3} more
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
