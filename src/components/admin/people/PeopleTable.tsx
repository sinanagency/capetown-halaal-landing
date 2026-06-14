'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'

export type PersonType = 'buyer' | 'staff' | 'vendor'

export interface PersonRow {
  key: string
  type: PersonType
  name: string
  phone: string | null
  email: string | null
  reference: string
  vendor_name: string | null
  vendor_id: string | null
  order_id: number | null
}

const PAGE_SIZE = 50

const TYPE_PILL: Record<PersonType, { label: string; cls: string }> = {
  buyer:  { label: 'Buyer',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  staff:  { label: 'Staff',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  vendor: { label: 'Vendor', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
}

export function PeopleTable({ rows }: { rows: PersonRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState<PersonType | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (!q) return true
      const hay = `${r.name} ${r.phone || ''} ${r.email || ''} ${r.reference} ${r.vendor_name || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const counts = useMemo(() => {
    return {
      all: rows.length,
      buyer: rows.filter((r) => r.type === 'buyer').length,
      staff: rows.filter((r) => r.type === 'staff').length,
      vendor: rows.filter((r) => r.type === 'vendor').length,
    }
  }, [rows])

  const goVerify = (row: PersonRow) => {
    if (row.order_id) {
      const q = new URLSearchParams({ mode: 'number', value: String(row.order_id) })
      router.push(`/admin/verifier?${q.toString()}`)
      return
    }
    if (row.vendor_id) {
      router.push(`/admin/vendors/${row.vendor_id}`)
      return
    }
    const q = new URLSearchParams({ mode: 'search', value: row.name })
    router.push(`/admin/verifier?${q.toString()}`)
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search across name, phone, email, reference, vendor"
            className="w-full text-sm pl-9 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653]/40"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'buyer', 'staff', 'vendor'] as const).map((t) => {
            const active = typeFilter === t
            const label = t === 'all' ? 'All' : TYPE_PILL[t].label
            const count = counts[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setTypeFilter(t); setPage(0) }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  active
                    ? 'bg-[#cd2653] text-white border-[#cd2653]'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {label} <span className="opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500 text-sm">
                  No people match that filter.
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const pill = TYPE_PILL[row.type]
              return (
                <tr key={row.key} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${pill.cls}`}>
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{row.phone || ','}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.email || ','}</td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{row.reference}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {row.vendor_id ? (
                      <Link href={`/admin/vendors/${row.vendor_id}`} className="text-[#cd2653] hover:underline">
                        {row.vendor_name || 'Vendor'}
                      </Link>
                    ) : (
                      <span className="text-neutral-400">,</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => goVerify(row)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
          <span>
            {safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-2 rounded hover:bg-neutral-100 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">Page {safePage + 1} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-2 rounded hover:bg-neutral-100 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
