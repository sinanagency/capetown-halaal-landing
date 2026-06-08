'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, Search, Download, Users, Mail, Phone, Calendar, Filter } from 'lucide-react'

interface Contact {
  email: string
  name: string | null
  phone: string | null
  source: 'vendor_applicant' | 'ticket_buyer_archive' | 'ticket_buyer_2026' | 'captured_email'
  year: string
  created_at: string
  meta: Record<string, unknown>
}

interface ContactsResponse {
  contacts: Contact[]
  total: number
  by_source: Record<string, number>
  by_year: Record<string, number>
}

const SOURCE_LABEL: Record<Contact['source'], string> = {
  vendor_applicant: '2026 Vendor Applicant',
  ticket_buyer_archive: 'Past Ticket Buyer',
  ticket_buyer_2026: '2026 Ticket Buyer',
  captured_email: 'Started Application (incomplete)',
}

const SOURCE_COLOR: Record<Contact['source'], string> = {
  vendor_applicant: 'bg-blue-100 text-blue-800',
  ticket_buyer_archive: 'bg-neutral-100 text-neutral-700',
  ticket_buyer_2026: 'bg-green-100 text-green-800',
  captured_email: 'bg-amber-100 text-amber-800',
}

function formatDate(d: string) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d.slice(0, 10) }
}

function toCSV(rows: Contact[]): string {
  const head = ['Email', 'Name', 'Phone', 'Source', 'Year', 'Created', 'Total', 'Business']
  const out = [head.join(',')]
  for (const c of rows) {
    const total = (c.meta?.total as string) || ''
    const business = (c.meta?.business_name as string) || (c.meta?.business as string) || ''
    out.push([
      JSON.stringify(c.email),
      JSON.stringify(c.name || ''),
      JSON.stringify(c.phone || ''),
      JSON.stringify(SOURCE_LABEL[c.source]),
      JSON.stringify(c.year),
      JSON.stringify(c.created_at?.slice(0, 10) || ''),
      JSON.stringify(total),
      JSON.stringify(business),
    ].join(','))
  }
  return out.join('\n')
}

export default function ContactsPage() {
  const [data, setData] = useState<ContactsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/contacts')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.contacts.filter((c) => {
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false
      if (yearFilter !== 'all' && c.year !== yearFilter) return false
      if (!q) return true
      return (
        c.email.includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        ((c.meta?.business_name as string) || '').toLowerCase().includes(q) ||
        ((c.meta?.business as string) || '').toLowerCase().includes(q)
      )
    })
  }, [data, search, sourceFilter, yearFilter])

  const handleExport = () => {
    const csv = toCSV(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cth-contacts-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Failed to load contacts.'}
        </div>
      </div>
    )
  }

  const years = Object.keys(data.by_year).sort().reverse()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Users className="w-6 h-6" /> Contacts
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Everyone across every source, in one place. {data.total.toLocaleString()} contacts total.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(SOURCE_LABEL).map(([src, label]) => {
          const count = data.by_source[src] || 0
          return (
            <div key={src} className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${SOURCE_COLOR[src as Contact['source']]} mb-2`}>
                {label}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{count.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            placeholder="Search by name, email, phone, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-[#cd2653] text-white rounded-lg text-sm font-medium hover:bg-[#b82049] transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export CSV ({filtered.length.toLocaleString()})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Source</th>
                <th className="text-left px-4 py-3 font-semibold">Year</th>
                <th className="text-left px-4 py-3 font-semibold">Spent / Stall</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-neutral-400">
                    No contacts match these filters.
                  </td>
                </tr>
              )}
              {filtered.slice(0, 500).map((c, i) => {
                const total = c.meta?.total as string | undefined
                const business = (c.meta?.business_name as string) || (c.meta?.business as string) || ''
                return (
                  <tr key={`${c.source}-${c.email}-${i}`} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{c.name || '—'}</div>
                      {business && <div className="text-xs text-neutral-500">{business}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {c.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-neutral-700 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${SOURCE_COLOR[c.source]}`}>
                        {SOURCE_LABEL[c.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{c.year}</td>
                    <td className="px-4 py-3 text-neutral-700">{total ? `R${total}` : '—'}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500 flex items-center gap-2">
            <Filter className="w-3 h-3" />
            Showing first 500 of {filtered.length.toLocaleString()}. Use search/filters to narrow, or Export CSV for the full set.
          </div>
        )}
      </div>
    </div>
  )
}
