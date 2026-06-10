'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ApplicationCard } from '@/components/admin/ApplicationCard'
import type { VendorApplication, ApplicationStatus } from '@/lib/supabase/types'
import { Search, Loader2, Mail, X, AlertCircle, CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react'
import {
  PageShell, PageHeader, Card, Tabs, ButtonPrimary, ButtonSecondary, Empty,
} from '@/components/chrome/PageChrome'

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
    <PageShell>
      <PageHeader
        kicker="Vendor Pipeline"
        title="Applications"
        subtitle="Manage vendor booth applications"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/api/admin/vendor-list?format=csv"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#1a1416] bg-white border border-neutral-200 rounded-lg hover:border-[#cd2653] hover:text-[#cd2653] transition-colors"
              title="Approved vendor list with stall allocations, Excel format"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </a>
            <a
              href="/api/admin/vendor-list?format=pdf"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#1a1416] bg-white border border-neutral-200 rounded-lg hover:border-[#cd2653] hover:text-[#cd2653] transition-colors"
              title="Approved vendor list with stall allocations, printable PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </a>
            <ButtonPrimary onClick={openDelayModal} className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Send delay notice
            </ButtonPrimary>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5E5E5]" />
            <input
              type="text"
              placeholder="Search by business, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5]/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
            />
          </div>
          <div className="[&>div]:mb-0">
            <Tabs
              items={statusFilters.map((f) => ({ k: f.value, label: f.label }))}
              active={currentStatus}
              onChange={handleStatusChange}
            />
          </div>
        </div>
      </Card>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5E5E5]" />
        </div>
      ) : applications.length === 0 ? (
        <Empty
          title="No applications found"
          hint="Try a different status filter or search term."
        />
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
            className="bg-[#FFFFFF] border border-[#E5E5E5]/40 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-[#E5E5E5]/20">
              <div>
                <h2 className="font-serif text-xl text-[#1B1A17]">Send delay notice</h2>
                <p className="text-sm text-[#1B1A17]/55 mt-1">
                  Emails every pending and info_requested applicant who has not yet received a delay notice.
                </p>
              </div>
              <button
                onClick={closeDelayModal}
                disabled={delaySending}
                className="p-1 text-[#1B1A17]/45 hover:text-[#1B1A17] disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {delayLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#E5E5E5]" />
                </div>
              )}

              {!delayLoading && delayResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-900">Broadcast complete</p>
                      <p className="text-sm text-emerald-700">
                        Sent: {delayResult.sent} · Failed: {delayResult.failed} · Eligible: {delayResult.eligibleCount}
                      </p>
                    </div>
                  </div>
                  {delayResult.failures.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-[#1B1A17] mb-2">Failures</p>
                      <div className="border border-[#E5E5E5]/30 rounded-lg divide-y divide-[#E5E5E5]/15 max-h-60 overflow-y-auto">
                        {delayResult.failures.map((f, i) => (
                          <div key={i} className="px-3 py-2 text-sm">
                            <div className="font-medium text-[#1B1A17]">{f.email}</div>
                            <div className="text-xs text-[#bf3026]">{f.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!delayLoading && !delayResult && delayPreview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#FFFFFF] border border-[#E5E5E5]/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-[#E5E5E5]" />
                    <div>
                      <p className="font-semibold text-[#1B1A17]">
                        {delayPreview.eligibleCount} eligible {delayPreview.eligibleCount === 1 ? 'applicant' : 'applicants'}
                      </p>
                      <p className="text-sm text-[#1B1A17]/65">
                        Each recipient receives one email. Already notified applicants are skipped automatically.
                      </p>
                    </div>
                  </div>

                  {delayPreview.preview.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-[#1B1A17] mb-2">
                        Preview (first {delayPreview.preview.length})
                      </p>
                      <div className="border border-[#E5E5E5]/30 rounded-lg divide-y divide-[#E5E5E5]/15 max-h-60 overflow-y-auto">
                        {delayPreview.preview.map((p, i) => (
                          <div key={i} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-[#1B1A17]">{p.firstName} · {p.businessName}</div>
                              <div className="text-xs text-[#1B1A17]/55">{p.email}</div>
                            </div>
                            <div className="text-xs text-[#1B1A17]/45">
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

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E5E5E5]/20">
              {delayResult ? (
                <ButtonPrimary onClick={closeDelayModal}>Close</ButtonPrimary>
              ) : (
                <>
                  <ButtonSecondary onClick={closeDelayModal} disabled={delaySending}>
                    Cancel
                  </ButtonSecondary>
                  <ButtonPrimary
                    onClick={confirmSendDelay}
                    disabled={delaySending || delayLoading || !delayPreview || delayPreview.eligibleCount === 0}
                    className="flex items-center gap-2"
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
                  </ButtonPrimary>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
