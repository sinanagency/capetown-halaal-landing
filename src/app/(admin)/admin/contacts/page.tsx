'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, Search, Download, Mail, Phone, Calendar, Filter } from 'lucide-react'
import {
  PageShell, PageHeader, Card, StatCard, Pill, Tabs, ButtonPrimary,
} from '@/components/chrome/PageChrome'

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

const SOURCE_TONE: Record<Contact['source'], 'brand' | 'neutral' | 'success' | 'warn'> = {
  vendor_applicant: 'brand',
  ticket_buyer_archive: 'neutral',
  ticket_buyer_2026: 'success',
  captured_email: 'warn',
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
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-[#E5E5E5]" />
        </div>
      </PageShell>
    )
  }
  if (error || !data) {
    return (
      <PageShell>
        <Card className="max-w-2xl border-[#cd2653]/40 text-[#bf3026]">
          {error || 'Failed to load contacts.'}
        </Card>
      </PageShell>
    )
  }

  const years = Object.keys(data.by_year).sort().reverse()

  return (
    <PageShell>
      <PageHeader
        kicker="Audience"
        title="Contacts"
        subtitle={`Everyone across every source, in one place. ${data.total.toLocaleString()} contacts total.`}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(SOURCE_LABEL).map(([src, label]) => (
          <StatCard
            key={src}
            label={label}
            value={(data.by_source[src] || 0).toLocaleString()}
          />
        ))}
      </div>

      {/* Source filter */}
      <Tabs
        items={[
          { k: 'all', label: 'All sources' },
          ...Object.entries(SOURCE_LABEL).map(([k, v]) => ({ k, label: v })),
        ]}
        active={sourceFilter}
        onChange={setSourceFilter}
      />

      {/* Controls */}
      <Card className="mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5E5E5]" />
            <input
              type="search"
              placeholder="Search by name, email, phone, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#E5E5E5]/40 rounded-lg text-sm"
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ButtonPrimary onClick={handleExport} className="flex items-center gap-2 justify-center">
            <Download className="w-4 h-4" /> Export CSV ({filtered.length.toLocaleString()})
          </ButtonPrimary>
        </div>
      </Card>

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#1B1A17]/55 border-b border-[#E5E5E5]/30 bg-[#FFFFFF]/40">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Phone</th>
                <th className="px-4 py-3 font-bold">Source</th>
                <th className="px-4 py-3 font-bold">Year</th>
                <th className="px-4 py-3 font-bold">Spent / Stall</th>
                <th className="px-4 py-3 font-bold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]/15">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#1B1A17]/45">
                    No contacts match these filters.
                  </td>
                </tr>
              )}
              {filtered.slice(0, 500).map((c, i) => {
                const total = c.meta?.total as string | undefined
                const business = (c.meta?.business_name as string) || (c.meta?.business as string) || ''
                return (
                  <tr key={`${c.source}-${c.email}-${i}`} className="hover:bg-[#FFFFFF]/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1B1A17]">{c.name || ','}</div>
                      {business && <div className="text-xs text-[#1B1A17]/55">{business}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${c.email}`} className="text-[#cd2653] hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {c.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-[#1B1A17]/70 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-[#1B1A17]/30">,</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={SOURCE_TONE[c.source]}>{SOURCE_LABEL[c.source]}</Pill>
                    </td>
                    <td className="px-4 py-3 text-[#1B1A17]/70">{c.year}</td>
                    <td className="px-4 py-3 text-[#1B1A17]/70">{total ? `R${total}` : ','}</td>
                    <td className="px-4 py-3 text-[#1B1A17]/55 text-xs">
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
          <div className="px-4 py-3 bg-[#FFFFFF]/60 border-t border-[#E5E5E5]/20 text-xs text-[#1B1A17]/55 flex items-center gap-2">
            <Filter className="w-3 h-3" />
            Showing first 500 of {filtered.length.toLocaleString()}. Use search/filters to narrow, or Export CSV for the full set.
          </div>
        )}
      </Card>
    </PageShell>
  )
}
