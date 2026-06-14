'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Search, Phone, Mail, MapPin, FileCheck, AlertTriangle, Users } from 'lucide-react'

export interface VendorRow {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  categories: string[]
  tier_label: string
  stall: string | null
  stall_status: string | null
  payment_status: string
  payment_amount: number | null
  docs_count: number
  contract_signed: boolean
  blockers: string[]
  created_at: string
}

type Filter = 'all' | 'has_blockers' | 'ready' | 'unallocated'

const PAYMENT_PILL: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  waived: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  deferred: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  none: 'bg-rose-50 text-rose-700 border-rose-200',
}

// Approved vendors list. Designed for Samreen's morning sweep: scan blockers
// at a glance, click into the profile for the full A-Z view.
export function VendorsList({ rows }: { rows: VendorRow[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'has_blockers' && r.blockers.length === 0) return false
      if (filter === 'ready' && r.blockers.length > 0) return false
      if (filter === 'unallocated' && r.stall) return false
      if (!q) return true
      const hay = `${r.business_name} ${r.contact_name || ''} ${r.email || ''} ${r.phone || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query, filter])

  const counts = useMemo(() => ({
    all: rows.length,
    has_blockers: rows.filter((r) => r.blockers.length > 0).length,
    ready: rows.filter((r) => r.blockers.length === 0).length,
    unallocated: rows.filter((r) => !r.stall).length,
  }), [rows])

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-[#cd2653] uppercase tracking-[0.2em]">VENDORS</p>
          <h1 className="text-2xl font-bold text-neutral-900">Approved vendors</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {rows.length} approved, {filtered.length} shown.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search business, contact, phone, email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { k: 'all', label: 'All' },
          { k: 'has_blockers', label: 'Has blockers' },
          { k: 'ready', label: 'Ready' },
          { k: 'unallocated', label: 'No stall yet' },
        ] as const).map((opt) => (
          <button
            key={opt.k}
            type="button"
            onClick={() => setFilter(opt.k)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
              filter === opt.k
                ? 'bg-[#cd2653] text-white border-[#cd2653]'
                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
            )}
          >
            {opt.label}
            <span className={cn(
              'text-[10px] px-1 rounded tabular-nums',
              filter === opt.k ? 'bg-white/20' : 'bg-neutral-100 text-neutral-500'
            )}>
              {counts[opt.k]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Users className="w-10 h-10 mb-3 text-neutral-300" />
            <p>No vendors match these filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">Business</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2 w-24">Stall</th>
                <th className="px-4 py-2 w-28">Payment</th>
                <th className="px-4 py-2 w-24">Contract</th>
                <th className="px-4 py-2 w-16">Docs</th>
                <th className="px-4 py-2">Blockers</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/60"
                >
                  <td className="px-4 py-3 max-w-[260px]">
                    <Link
                      href={`/admin/vendors/${r.id}`}
                      className="font-medium text-neutral-900 hover:text-[#cd2653] block truncate"
                      title={r.business_name}
                    >
                      {r.business_name}
                    </Link>
                    <p className="text-[11px] text-neutral-500 truncate">{r.tier_label}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-neutral-700 truncate" title={r.contact_name || ''}>
                      {r.contact_name || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                      {r.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {r.phone}
                        </span>
                      )}
                      {r.email && (
                        <span className="inline-flex items-center gap-1 truncate" title={r.email}>
                          <Mail className="w-3 h-3" /> {r.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.stall ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-mono font-semibold text-neutral-900">
                        <MapPin className="w-3 h-3 text-[#cd2653]" />
                        {r.stall}
                      </span>
                    ) : (
                      <Link
                        href={`/admin/allocation`}
                        className="text-[11px] text-[#cd2653] underline hover:no-underline"
                      >
                        assign
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium',
                      PAYMENT_PILL[r.payment_status] || PAYMENT_PILL.none
                    )}>
                      {r.payment_status}
                    </span>
                    {r.payment_amount ? (
                      <p className="text-[10px] text-neutral-500 mt-0.5 tabular-nums">
                        R{r.payment_amount.toLocaleString()}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {r.contract_signed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                        <FileCheck className="w-3 h-3" /> signed
                      </span>
                    ) : (
                      <span className="text-[11px] text-rose-600">unsigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] tabular-nums text-neutral-700">
                    {r.docs_count}
                  </td>
                  <td className="px-4 py-3">
                    {r.blockers.length === 0 ? (
                      <span className="text-[11px] text-emerald-700">ready</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.blockers.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" /> {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
