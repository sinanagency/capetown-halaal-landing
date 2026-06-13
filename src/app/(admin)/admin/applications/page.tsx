'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ApplicationCard } from '@/components/admin/ApplicationCard'
import type { VendorApplication, ApplicationStatus } from '@/lib/supabase/types'
import { Search, Loader2, FileText, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'info_requested', label: 'Info Requested' },
]

export default function ApplicationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<VendorApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const currentStatus = searchParams.get('status') || 'all'

  useEffect(() => {
    async function loadApplications() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (currentStatus !== 'all') {
          params.set('status', currentStatus)
        }
        if (searchQuery) {
          params.set('search', searchQuery)
        }

        const res = await fetch(`/api/applications?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setApplications(data.applications)
        }
      } catch (error) {
        console.error('Failed to load applications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [currentStatus, searchQuery])

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/admin/applications?${params.toString()}`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Applications</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Manage vendor booth applications</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by business, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 min-h-[44px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent text-base"
            />
          </div>

          {/* Status Filter — wraps on mobile, ≥44px tap targets */}
          <div className="flex items-start md:items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-2 md:mt-0" />
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => handleStatusChange(filter.value)}
                  className={cn(
                    'px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                    currentStatus === filter.value
                      ? 'bg-[#cd2653] text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-neutral-200">
          <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p className="text-neutral-500">No applications found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  )
}
