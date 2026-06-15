'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Loader2, Search } from 'lucide-react'
import {
  PageShell, PageHeader, Card, Pill, Tabs,
} from '@/components/chrome/PageChrome'
import { DOC_LABEL } from '@/lib/exhibitor/required-docs'
import { DocViewerDrawer } from '@/components/admin/documents/DocViewerDrawer'

type TabKey = 'vendors' | 'tickets'

interface VendorDocRow {
  application_id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  application_status: string | null
  doc_type: string
  doc_name: string
  doc_status: 'pending' | 'approved' | 'rejected'
  uploaded_at: string
  storage_path: string
  note: string | null
}

interface TicketRow {
  id: string
  wc_order_id: number
  fooevents_ticket_id: string | null
  ticket_type: string | null
  holder_first_name: string | null
  holder_last_name: string | null
  holder_email: string | null
  holder_phone: string | null
  attendance_date: string | null
  verified_at: string | null
  checked_in_at: string | null
  pdf_url: string | null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function titleize(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function docTypeLabel(type: string): string {
  const known = (DOC_LABEL as Record<string, string>)[type]
  return known || titleize(type)
}

function docStatusTone(s: VendorDocRow['doc_status']): 'success' | 'warn' | 'danger' {
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  return 'warn'
}

// Resolve the URL the inline viewer should load for a vendor doc row.
// `contract:<application_id>` is the sentinel emitted by the synthetic
// contract row in /api/admin/documents/vendors and points the viewer at
// the admin-gated contract PDF route. Everything else flows through the
// existing vendor-doc signed-URL endpoint.
function vendorDocUrl(row: VendorDocRow): string {
  if (row.storage_path.startsWith('contract:')) {
    return `/api/admin/applications/${row.application_id}/contract/pdf`
  }
  return `/api/admin/vendor-doc?path=${encodeURIComponent(row.storage_path)}`
}

interface ViewerState {
  open: boolean
  url: string | null
  label: string
  holder: string | null
}

const VIEWER_CLOSED: ViewerState = { open: false, url: null, label: '', holder: null }

export function DocumentsClient() {
  const [tab, setTab] = useState<TabKey>('vendors')
  const [search, setSearch] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [docStatusFilter, setDocStatusFilter] = useState('')
  const [ticketTypeFilter, setTicketTypeFilter] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')

  const [vendorRows, setVendorRows] = useState<VendorDocRow[] | null>(null)
  const [ticketRows, setTicketRows] = useState<TicketRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Inline viewer state. Shared by both tabs; we only ever surface one
  // PDF at a time so a single state slot is enough.
  const [viewer, setViewer] = useState<ViewerState>(VIEWER_CLOSED)

  // Debounce search so we are not firing on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(id)
  }, [search])

  // Load vendor docs
  useEffect(() => {
    if (tab !== 'vendors') return
    let cancelled = false
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (docTypeFilter) params.set('doc_type', docTypeFilter)
    if (docStatusFilter) params.set('status', docStatusFilter)
    fetch(`/api/admin/documents/vendors?${params.toString()}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login'
          return
        }
        if (!res.ok) throw new Error(`Server ${res.status}`)
        const body = await res.json()
        if (!cancelled) setVendorRows(body.rows || [])
      })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, debouncedSearch, docTypeFilter, docStatusFilter])

  // Load tickets
  useEffect(() => {
    if (tab !== 'tickets') return
    let cancelled = false
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (ticketTypeFilter) params.set('ticket_type', ticketTypeFilter)
    if (verifiedFilter) params.set('verified', verifiedFilter)
    fetch(`/api/admin/documents/tickets?${params.toString()}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login'
          return
        }
        if (!res.ok) throw new Error(`Server ${res.status}`)
        const body = await res.json()
        if (!cancelled) setTicketRows(body.rows || [])
      })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, debouncedSearch, ticketTypeFilter, verifiedFilter])

  // Unique values for the filter dropdowns. Derived from the loaded rows so
  // the option list always matches reality.
  const docTypeOptions = useMemo(() => {
    const set = new Set<string>()
    ;(vendorRows || []).forEach((r) => set.add(r.doc_type))
    return Array.from(set).sort()
  }, [vendorRows])

  const ticketTypeOptions = useMemo(() => {
    const set = new Set<string>()
    ;(ticketRows || []).forEach((r) => r.ticket_type && set.add(r.ticket_type))
    return Array.from(set).sort()
  }, [ticketRows])

  return (
    <PageShell>
      <PageHeader
        kicker="Operations"
        title="Documents"
        subtitle="Every vendor document and ticket PDF in one place. Click View to preview the file inline."
      />

      <div className="space-y-4">
        <Tabs
          items={[
            { k: 'vendors', label: 'Vendor Documents' },
            { k: 'tickets', label: 'Tickets' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {/* Filter row */}
        <Card>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1B1A17]/45" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'vendors' ? 'Search vendor, contact, or email' : 'Search holder name or email'}
                className="w-full pl-9 pr-3 py-2.5 rounded-full border border-[#E5E5E5]/40 bg-[#FFFFFF] text-sm focus:outline-none focus:border-[#cd2653]/60"
              />
            </div>

            {tab === 'vendors' && (
              <>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-full border border-[#E5E5E5]/40 bg-[#FFFFFF] text-sm focus:outline-none focus:border-[#cd2653]/60"
                >
                  <option value="">All document types</option>
                  {docTypeOptions.map((t) => (
                    <option key={t} value={t}>{docTypeLabel(t)}</option>
                  ))}
                </select>
                <select
                  value={docStatusFilter}
                  onChange={(e) => setDocStatusFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-full border border-[#E5E5E5]/40 bg-[#FFFFFF] text-sm focus:outline-none focus:border-[#cd2653]/60"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </>
            )}

            {tab === 'tickets' && (
              <>
                <select
                  value={ticketTypeFilter}
                  onChange={(e) => setTicketTypeFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-full border border-[#E5E5E5]/40 bg-[#FFFFFF] text-sm focus:outline-none focus:border-[#cd2653]/60"
                >
                  <option value="">All ticket types</option>
                  {ticketTypeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-full border border-[#E5E5E5]/40 bg-[#FFFFFF] text-sm focus:outline-none focus:border-[#cd2653]/60"
                >
                  <option value="">All</option>
                  <option value="yes">Verified</option>
                  <option value="no">Not verified</option>
                </select>
              </>
            )}
          </div>
        </Card>

        {error && (
          <Card>
            <p className="text-sm text-[#bf3026]">{error}</p>
          </Card>
        )}

        {tab === 'vendors' && (
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#1B1A17]/55 border-b border-[#E5E5E5]/30 bg-[#FFFFFF]/40">
                    <th className="p-3 font-bold">Vendor</th>
                    <th className="p-3 font-bold">Document</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Uploaded</th>
                    <th className="p-3 font-bold text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1B1A17]/45 mx-auto" />
                      </td>
                    </tr>
                  )}
                  {!loading && vendorRows && vendorRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#1B1A17]/45 text-sm">
                        No documents match these filters.
                      </td>
                    </tr>
                  )}
                  {!loading && (vendorRows || []).map((r, i) => (
                    <tr key={`${r.application_id}-${r.doc_type}-${i}`} className="border-b border-[#E5E5E5]/15 last:border-b-0 hover:bg-[#FFFFFF]/60">
                      <td className="p-3">
                        <p className="text-sm font-medium text-[#1B1A17]">{r.business_name}</p>
                        <p className="text-xs text-[#1B1A17]/45">
                          {[r.contact_name, r.email].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-[#1B1A17]">{docTypeLabel(r.doc_type)}</p>
                        <p className="text-xs text-[#1B1A17]/45 truncate max-w-[260px]" title={r.doc_name}>{r.doc_name}</p>
                      </td>
                      <td className="p-3">
                        <Pill tone={docStatusTone(r.doc_status)}>{r.doc_status}</Pill>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[#1B1A17]/70">{formatDateTime(r.uploaded_at)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewer({
                            open: true,
                            url: vendorDocUrl(r),
                            label: `${docTypeLabel(r.doc_type)} · ${r.doc_name}`,
                            holder: r.business_name,
                          })}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#cd2653] hover:text-[#bf3026]"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'tickets' && (
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#1B1A17]/55 border-b border-[#E5E5E5]/30 bg-[#FFFFFF]/40">
                    <th className="p-3 font-bold">Holder</th>
                    <th className="p-3 font-bold">Ticket</th>
                    <th className="p-3 font-bold">Order</th>
                    <th className="p-3 font-bold">Verified</th>
                    <th className="p-3 font-bold text-right">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1B1A17]/45 mx-auto" />
                      </td>
                    </tr>
                  )}
                  {!loading && ticketRows && ticketRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#1B1A17]/45 text-sm">
                        No tickets match these filters.
                      </td>
                    </tr>
                  )}
                  {!loading && (ticketRows || []).map((r) => {
                    const holder = [r.holder_first_name, r.holder_last_name].filter(Boolean).join(' ') || 'Unknown'
                    return (
                      <tr key={r.id} className="border-b border-[#E5E5E5]/15 last:border-b-0 hover:bg-[#FFFFFF]/60">
                        <td className="p-3">
                          <p className="text-sm font-medium text-[#1B1A17]">{holder}</p>
                          <p className="text-xs text-[#1B1A17]/45">
                            {[r.holder_email, r.holder_phone].filter(Boolean).join(' · ')}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-[#1B1A17]">{r.ticket_type || 'Unknown type'}</p>
                          {r.fooevents_ticket_id && (
                            <p className="text-xs text-[#1B1A17]/45 truncate max-w-[200px]" title={r.fooevents_ticket_id}>
                              {r.fooevents_ticket_id}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-[#1B1A17]/70">#{r.wc_order_id}</span>
                        </td>
                        <td className="p-3">
                          {r.verified_at
                            ? <Pill tone="success">Verified</Pill>
                            : <Pill tone="warn">Pending</Pill>}
                        </td>
                        <td className="p-3 text-right">
                          {r.pdf_url ? (
                            <button
                              type="button"
                              onClick={() => setViewer({
                                open: true,
                                // Route through our same-origin proxy so the
                                // drawer iframe can render the FooEvents PDF
                                // inline (cross-origin direct embed is blocked
                                // by tickets.youngatheart.co.za).
                                url: `/api/admin/documents/tickets/proxy?url=${encodeURIComponent(r.pdf_url ?? '')}`,
                                label: r.ticket_type ? `Ticket · ${r.ticket_type}` : 'Ticket',
                                holder,
                              })}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[#cd2653] hover:text-[#bf3026]"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          ) : (
                            <span className="text-xs text-[#1B1A17]/40">No PDF</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <DocViewerDrawer
        open={viewer.open}
        url={viewer.url}
        label={viewer.label}
        holder={viewer.holder}
        onClose={() => setViewer(VIEWER_CLOSED)}
      />
    </PageShell>
  )
}
