'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ApplicationCard } from '@/components/admin/ApplicationCard'
import type { VendorApplication, ApplicationStatus } from '@/lib/supabase/types'
import { Search, Loader2, FileText, Filter, Mail, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'info_requested', label: 'Info Requested' },
]

type DelayPreview = {
  eligibleCount: number
  preview: Array<{ email: string; firstName: string; businessName: string; createdAt: string }>
}

type DelayResult = {
  eligibleCount: number
  sent: number
  failed: number
  failures: Array<{ email: string; error: string }>
}

export default function ApplicationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<VendorApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [delayModalOpen, setDelayModalOpen] = useState(false)
  const [delayPreview, setDelayPreview] = useState<DelayPreview | null>(null)
  const [delayLoading, setDelayLoading] = useState(false)
  const [delaySending, setDelaySending] = useState(false)
  const [delayResult, setDelayResult] = useState<DelayResult | null>(null)

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

  const openDelayModal = async () => {
    setDelayModalOpen(true)
    setDelayPreview(null)
    setDelayResult(null)
    setDelayLoading(true)
    try {
      const res = await fetch('/api/admin/applications/send-delay-notice?minDaysOld=0')
      if (res.ok) {
        const data: DelayPreview = await res.json()
        setDelayPreview(data)
      }
    } catch (e) {
      console.error('Failed to load delay preview:', e)
    } finally {
      setDelayLoading(false)
    }
  }

  const confirmSendDelay = async () => {
    setDelaySending(true)
    try {
      const res = await fetch('/api/admin/applications/send-delay-notice?minDaysOld=0', {
        method: 'POST',
      })
      if (res.ok) {
        const data: DelayResult = await res.json()
        setDelayResult(data)
      }
    } catch (e) {
      console.error('Failed to send delay notices:', e)
    } finally {
      setDelaySending(false)
    }
  }

  const closeDelayModal = () => {
    if (delaySending) return
    setDelayModalOpen(false)
    setDelayPreview(null)
    setDelayResult(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Applications</h1>
          <p className="text-neutral-500">Manage vendor booth applications</p>
        </div>
        <button
          onClick={openDelayModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-lg text-sm font-semibold hover:bg-[#262626] transition-colors"
        >
          <Mail className="w-4 h-4" />
          Send delay notice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by business, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-400" />
            <div className="flex gap-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => handleStatusChange(filter.value)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    currentStatus === filter.value
                      ? 'bg-[#cd2653] text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}

      {delayModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDelayModal}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-neutral-200">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Send delay notice</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Emails every pending and info_requested applicant who has not yet received a delay notice.
                </p>
              </div>
              <button
                onClick={closeDelayModal}
                disabled={delaySending}
                className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {delayLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                </div>
              )}

              {!delayLoading && delayResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Broadcast complete</p>
                      <p className="text-sm text-green-700">
                        Sent: {delayResult.sent} · Failed: {delayResult.failed} · Eligible: {delayResult.eligibleCount}
                      </p>
                    </div>
                  </div>
                  {delayResult.failures.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 mb-2">Failures</p>
                      <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                        {delayResult.failures.map((f, i) => (
                          <div key={i} className="px-3 py-2 text-sm">
                            <div className="font-medium text-neutral-900">{f.email}</div>
                            <div className="text-xs text-red-600">{f.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!delayLoading && !delayResult && delayPreview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-neutral-600" />
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {delayPreview.eligibleCount} eligible {delayPreview.eligibleCount === 1 ? 'applicant' : 'applicants'}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Each recipient receives one email. Already notified applicants are skipped automatically.
                      </p>
                    </div>
                  </div>

                  {delayPreview.preview.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 mb-2">
                        Preview (first {delayPreview.preview.length})
                      </p>
                      <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                        {delayPreview.preview.map((p, i) => (
                          <div key={i} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-neutral-900">{p.firstName} · {p.businessName}</div>
                              <div className="text-xs text-neutral-500">{p.email}</div>
                            </div>
                            <div className="text-xs text-neutral-400">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
              {delayResult ? (
                <button
                  onClick={closeDelayModal}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={closeDelayModal}
                    disabled={delaySending}
                    className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSendDelay}
                    disabled={delaySending || delayLoading || !delayPreview || delayPreview.eligibleCount === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[#cd2653] text-white rounded-lg text-sm font-semibold hover:bg-[#b01f47] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {delaySending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send to {delayPreview?.eligibleCount ?? 0} {delayPreview?.eligibleCount === 1 ? 'applicant' : 'applicants'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
