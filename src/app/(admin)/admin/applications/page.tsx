'use client'

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { VendorApplication, ApplicationStatus } from '@/lib/supabase/types'
import {
  Search,
  Loader2,
  FileText,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  X,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { scoreCompleteness } from '@/lib/triage/completeness'
import {
  findDuplicateClusters,
} from '@/lib/triage/duplicates'
import {
  matchesBucket,
  type BucketKey,
} from '@/lib/triage/buckets'

// --- chip definitions -------------------------------------------------------

type ChipGroup = 'status' | 'sector' | 'tier' | 'flag'

interface Chip {
  key: string
  label: string
  group: ChipGroup
  bucket?: BucketKey
  status?: ApplicationStatus
  sector?: string
  tier?: string
}

const STATUS_CHIPS: Chip[] = [
  { key: 'pending', label: 'Pending', group: 'status', status: 'pending' },
  { key: 'approved', label: 'Approved', group: 'status', status: 'approved' },
  { key: 'rejected', label: 'Rejected', group: 'status', status: 'rejected' },
  { key: 'info_requested', label: 'Info requested', group: 'status', status: 'info_requested' },
]

const FLAG_CHIPS: Chip[] = [
  { key: 'has_email', label: 'Has email', group: 'flag', bucket: 'has_email' },
  { key: 'has_phone', label: 'Has phone', group: 'flag', bucket: 'has_phone' },
  { key: 'has_docs', label: 'Has docs', group: 'flag', bucket: 'has_docs' },
  { key: 'contract_signed', label: 'Contract signed', group: 'flag', bucket: 'contract_signed' },
  { key: 'paid', label: 'Paid', group: 'flag', bucket: 'paid' },
  { key: 'over_30d_pending', label: 'Over 30d pending', group: 'flag', bucket: 'over_30d_pending' },
  { key: 'traded_before', label: 'Traded before', group: 'flag', bucket: 'traded_before' },
  { key: 'ready_to_approve', label: 'Ready to approve', group: 'flag', bucket: 'ready_to_approve' },
  { key: 'duplicates', label: 'Duplicates', group: 'flag', bucket: 'duplicates' },
]

// --- status pill ------------------------------------------------------------

const STATUS_PILL: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  info_requested: 'bg-sky-50 text-sky-700 border-sky-200',
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  info_requested: 'Info req.',
}

// --- helpers ----------------------------------------------------------------

function formatShort(d: string): string {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
}

function completenessFor(row: VendorApplication): number {
  return typeof row.completeness_score === 'number'
    ? row.completeness_score
    : scoreCompleteness(row)
}

function CompletenessBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 50
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'
  return (
    <span
      title={`Completeness ${score}/100`}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium tabular-nums',
        tone
      )}
    >
      {score}
    </span>
  )
}

// --- inner page (Suspense-wrapped to satisfy useSearchParams) ---------------

function ApplicationsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<VendorApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionBusy, setActionBusy] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)

  // Parse multi-select chip state from URL
  const activeKeys = useMemo<Set<string>>(() => {
    const raw = searchParams.get('chips') ?? ''
    return new Set(raw ? raw.split(',').filter(Boolean) : [])
  }, [searchParams])

  // Load all applications once; filtering is client-side because Samreen
  // works through ~few hundred rows and needs instant chip-toggle feedback.
  useEffect(() => {
    let abort = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/applications')
        if (res.ok) {
          const data = await res.json()
          if (!abort) setApplications(data.applications ?? [])
        }
      } catch (err) {
        console.error('Failed to load applications:', err)
      } finally {
        if (!abort) setLoading(false)
      }
    }
    load()
    return () => {
      abort = true
    }
  }, [])

  // Decorate with client-side duplicate markers if the server hasn't already.
  const decorated = useMemo<VendorApplication[]>(() => {
    if (!applications.length) return applications
    const needsClustering = applications.some((r) => !r.dup_marker)
    if (!needsClustering) return applications
    const clusters = findDuplicateClusters(applications)
    return applications.map((r) =>
      r.dup_marker ? r : { ...r, dup_marker: clusters.get(r.id) ?? null }
    )
  }, [applications])

  // Derive sector and tier chips from the data so we never hardcode them.
  const sectorChips = useMemo<Chip[]>(() => {
    const seen = new Set<string>()
    for (const r of decorated) {
      for (const c of r.product_categories ?? []) {
        if (c) seen.add(c)
      }
    }
    return [...seen]
      .sort()
      .slice(0, 20)
      .map<Chip>((c) => ({
        key: `sector:${c}`,
        label: c,
        group: 'sector',
        sector: c,
      }))
  }, [decorated])

  const tierChips = useMemo<Chip[]>(() => {
    const seen = new Set<string>()
    for (const r of decorated) {
      if (r.preferred_booth_tier) seen.add(r.preferred_booth_tier)
    }
    return [...seen]
      .sort()
      .map<Chip>((c) => ({
        key: `tier:${c}`,
        label: c,
        group: 'tier',
        tier: c,
      }))
  }, [decorated])

  // Filter pipeline
  const filtered = useMemo<VendorApplication[]>(() => {
    if (!decorated.length) return decorated
    const q = searchQuery.trim().toLowerCase()
    const chips = [
      ...STATUS_CHIPS,
      ...FLAG_CHIPS,
      ...sectorChips,
      ...tierChips,
    ].filter((c) => activeKeys.has(c.key))

    const statusKeys = new Set(chips.filter((c) => c.group === 'status').map((c) => c.status!))
    const sectorKeys = new Set(chips.filter((c) => c.group === 'sector').map((c) => c.sector!))
    const tierKeys = new Set(chips.filter((c) => c.group === 'tier').map((c) => c.tier!))
    const flagBuckets = chips.filter((c) => c.group === 'flag' && c.bucket).map((c) => c.bucket!)

    return decorated.filter((r) => {
      if (statusKeys.size > 0 && !statusKeys.has(r.status)) return false
      if (sectorKeys.size > 0) {
        const cats = r.product_categories ?? []
        if (!cats.some((c) => sectorKeys.has(c))) return false
      }
      if (tierKeys.size > 0 && (!r.preferred_booth_tier || !tierKeys.has(r.preferred_booth_tier))) {
        return false
      }
      for (const b of flagBuckets) {
        if (!matchesBucket(r, b)) return false
      }
      if (q) {
        const hay = (
          (r.business_name ?? '') +
          ' ' +
          (r.contact_name ?? '') +
          ' ' +
          (r.email ?? '') +
          ' ' +
          (r.phone ?? '')
        ).toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [decorated, activeKeys, searchQuery, sectorChips, tierChips])

  // Counts shown next to every chip
  const counts = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    if (!decorated.length) return result
    for (const c of STATUS_CHIPS) {
      result[c.key] = decorated.filter((r) => r.status === c.status).length
    }
    for (const c of FLAG_CHIPS) {
      result[c.key] = decorated.filter((r) => matchesBucket(r, c.bucket!)).length
    }
    for (const c of sectorChips) {
      result[c.key] = decorated.filter((r) => (r.product_categories ?? []).includes(c.sector!)).length
    }
    for (const c of tierChips) {
      result[c.key] = decorated.filter((r) => r.preferred_booth_tier === c.tier).length
    }
    return result
  }, [decorated, sectorChips, tierChips])

  // --- chip toggle helpers --------------------------------------------------

  const setChips = useCallback(
    (next: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.size === 0) {
        params.delete('chips')
      } else {
        params.set('chips', [...next].join(','))
      }
      router.push(`/admin/applications?${params.toString()}`)
    },
    [router, searchParams]
  )

  const toggleChip = useCallback(
    (key: string) => {
      const next = new Set(activeKeys)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      setChips(next)
    },
    [activeKeys, setChips]
  )

  const clearChips = useCallback(() => setChips(new Set()), [setChips])

  // --- selection -----------------------------------------------------------

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))
  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      const next = new Set(selected)
      for (const r of filtered) next.delete(r.id)
      setSelected(next)
    } else {
      const next = new Set(selected)
      for (const r of filtered) next.add(r.id)
      setSelected(next)
    }
  }, [allFilteredSelected, filtered, selected])

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  // --- bulk actions --------------------------------------------------------

  const runBulk = useCallback(
    async (action: 'approve' | 'reject' | 'request_info' | 'send_template', templateKey?: string) => {
      if (selected.size === 0) return
      const confirmMsg =
        action === 'reject'
          ? `Reject ${selected.size} applications? This will email each applicant.`
          : action === 'approve'
            ? `Approve ${selected.size} applications? Each will get an approval email + WA template.`
            : action === 'request_info'
              ? `Request info from ${selected.size} applicants?`
              : `Send the "${templateKey}" template to ${selected.size} applicants?`
      if (!window.confirm(confirmMsg)) return

      setActionBusy(true)
      try {
        const res = await fetch('/api/applications/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [...selected],
            action,
            template_key: templateKey,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          window.alert(json?.error || 'Bulk action failed.')
          return
        }
        window.alert(
          `Done. ${json.ok}/${json.processed} succeeded${json.failed ? `, ${json.failed} failed.` : '.'}`
        )

        // Reload list
        const refresh = await fetch('/api/applications')
        if (refresh.ok) {
          const data = await refresh.json()
          setApplications(data.applications ?? [])
        }
        setSelected(new Set())
        setShowTemplateMenu(false)
      } catch (err) {
        console.error('Bulk action error:', err)
        window.alert('Bulk action failed.')
      } finally {
        setActionBusy(false)
      }
    },
    [selected]
  )

  // --- render --------------------------------------------------------------

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Applications</h1>
          <p className="text-sm text-neutral-500">
            {decorated.length} total, {filtered.length} shown
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search business, name, email, phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
          />
        </div>
      </div>

      {/* Chip rail */}
      <div className="mb-4 space-y-2">
        <ChipRow
          title="Status"
          chips={STATUS_CHIPS}
          active={activeKeys}
          counts={counts}
          onToggle={toggleChip}
        />
        {sectorChips.length > 0 && (
          <ChipRow
            title="Sector"
            chips={sectorChips}
            active={activeKeys}
            counts={counts}
            onToggle={toggleChip}
          />
        )}
        {tierChips.length > 0 && (
          <ChipRow
            title="Booth tier"
            chips={tierChips}
            active={activeKeys}
            counts={counts}
            onToggle={toggleChip}
          />
        )}
        <ChipRow
          title="Flags"
          chips={FLAG_CHIPS}
          active={activeKeys}
          counts={counts}
          onToggle={toggleChip}
          trailing={
            activeKeys.size > 0 ? (
              <button
                onClick={clearChips}
                className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            ) : null
          }
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Inbox className="w-10 h-10 mb-3 text-neutral-300" />
            <p>No applications match these filters.</p>
            {activeKeys.size > 0 && (
              <button
                onClick={clearChips}
                className="mt-3 text-sm text-[#cd2653] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all filtered"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2">Business</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2 w-16">Reach</th>
                <th className="px-3 py-2">Sector</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2 w-12">Score</th>
                <th className="px-3 py-2 w-20">Applied</th>
                <th className="px-3 py-2 w-24">Status</th>
                <th className="px-3 py-2 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <Row
                  key={r.id}
                  app={r}
                  selected={selected.has(r.id)}
                  onToggle={() => toggleRow(r.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-neutral-900 text-white rounded-xl shadow-2xl flex items-center gap-2 px-3 py-2">
            <span className="text-sm font-medium px-2">
              {selected.size} selected
            </span>
            <span className="w-px h-6 bg-neutral-700" />
            <button
              onClick={() => runBulk('approve')}
              disabled={actionBusy}
              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve all
            </button>
            <button
              onClick={() => runBulk('request_info')}
              disabled={actionBusy}
              className="px-3 py-1.5 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4" />
              Request info
            </button>
            <button
              onClick={() => runBulk('reject')}
              disabled={actionBusy}
              className="px-3 py-1.5 text-sm rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <div className="relative">
              <button
                onClick={() => setShowTemplateMenu((v) => !v)}
                disabled={actionBusy}
                className="px-3 py-1.5 text-sm rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                Send template
                <ChevronDown className="w-4 h-4" />
              </button>
              {showTemplateMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-white text-neutral-900 rounded-lg shadow-xl border border-neutral-200 min-w-[220px] overflow-hidden">
                  {[
                    'vendor_application_reminder',
                    'vendor_payment_reminder',
                    'vendor_contract_reminder',
                    'vendor_event_briefing',
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => runBulk('send_template', tpl)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="w-px h-6 bg-neutral-700" />
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-neutral-800"
            >
              Clear
            </button>
            {actionBusy && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
          </div>
        </div>
      )}
    </div>
  )
}

// --- subcomponents ----------------------------------------------------------

function ChipRow({
  title,
  chips,
  active,
  counts,
  onToggle,
  trailing,
}: {
  title: string
  chips: Chip[]
  active: Set<string>
  counts: Record<string, number>
  onToggle: (key: string) => void
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-wide text-neutral-400 w-16 shrink-0">
        {title}
      </span>
      {chips.map((c) => {
        const on = active.has(c.key)
        const count = counts[c.key] ?? 0
        return (
          <button
            key={c.key}
            onClick={() => onToggle(c.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors',
              on
                ? 'bg-[#cd2653] text-white border-[#cd2653]'
                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
            )}
          >
            {c.label}
            <span
              className={cn(
                'text-[10px] px-1 rounded tabular-nums',
                on ? 'bg-white/20' : 'bg-neutral-100 text-neutral-500'
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
      {trailing}
    </div>
  )
}

function Row({
  app,
  selected,
  onToggle,
}: {
  app: VendorApplication
  selected: boolean
  onToggle: () => void
}) {
  const score = completenessFor(app)
  const primarySector = app.product_categories?.[0]
  return (
    <tr
      className={cn(
        'h-14 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/60',
        selected && 'bg-rose-50/40'
      )}
    >
      <td className="px-3">
        <input
          type="checkbox"
          aria-label={`Select ${app.business_name}`}
          checked={selected}
          onChange={onToggle}
          className="cursor-pointer"
        />
      </td>
      <td className="px-3 max-w-[280px]">
        <Link
          href={`/admin/applications/${app.id}`}
          className="font-medium text-neutral-900 hover:text-[#cd2653] truncate block"
          title={app.business_name}
        >
          {app.business_name}
        </Link>
        {app.dup_marker && (
          <span className="text-[10px] text-rose-600 font-medium">
            possible duplicate
          </span>
        )}
      </td>
      <td className="px-3 text-neutral-600 truncate max-w-[160px]" title={app.contact_name}>
        {app.contact_name}
      </td>
      <td className="px-3">
        <div className="flex items-center gap-1.5 text-neutral-500">
          <Mail
            className={cn('w-3.5 h-3.5', app.email ? 'text-emerald-600' : 'text-neutral-300')}
            aria-label={app.email ? `Email: ${app.email}` : 'No email'}
          />
          <Phone
            className={cn('w-3.5 h-3.5', app.phone ? 'text-emerald-600' : 'text-neutral-300')}
            aria-label={app.phone ? `Phone: ${app.phone}` : 'No phone'}
          />
        </div>
      </td>
      <td className="px-3">
        {primarySector ? (
          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px]">
            {primarySector}
          </span>
        ) : (
          <span className="text-neutral-300 text-[11px]">—</span>
        )}
      </td>
      <td className="px-3">
        {app.preferred_booth_tier ? (
          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px]">
            {app.preferred_booth_tier}
          </span>
        ) : (
          <span className="text-neutral-300 text-[11px]">—</span>
        )}
      </td>
      <td className="px-3">
        <CompletenessBadge score={score} />
      </td>
      <td className="px-3 text-neutral-500 text-[11px] tabular-nums">
        {formatShort(app.created_at)}
      </td>
      <td className="px-3">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium',
            STATUS_PILL[app.status]
          )}
        >
          {STATUS_LABEL[app.status]}
        </span>
      </td>
      <td className="px-3 text-right">
        <Link
          href={`/admin/applications/${app.id}`}
          className="inline-flex items-center gap-1 text-[#cd2653] text-xs font-medium hover:underline"
        >
          <FileText className="w-3.5 h-3.5" /> Open
        </Link>
      </td>
    </tr>
  )
}

// --- exported page (Suspense for useSearchParams in client component) -------

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ApplicationsPageInner />
    </Suspense>
  )
}
