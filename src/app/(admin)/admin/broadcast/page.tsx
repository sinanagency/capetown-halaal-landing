'use client'

// =============================================================================
// /admin/broadcast, mass outreach console.
//
// Layout (top to bottom):
//   1. Filter chip rail, status, sector, booth tier, document, contract, paid.
//   2. Channel toggle, Email / WhatsApp / Both.
//   3. Template picker, dropdown from TEMPLATE_LABELS.
//   4. Optional custom message, appended as {{custom_message}}.
//   5. Live count (fetched from GET ?counts=1 as filters change).
//   6. Send button, confirmation modal showing exact mail_count + wa_count.
//
// Design language: white canvas, neutral grays, festival red accents
// (#cd2653 borrowed from the admin sidebar), tight typography. No glassmorphism.
// =============================================================================

import { useEffect, useMemo, useState } from 'react'

type Channel = 'mail' | 'wa' | 'both'
type TemplateKey =
  | 'doc_chase'
  | 'payment_reminder'
  | 'contract_sign_reminder'
  | 'stall_allocation_notice'
  | 'general_announcement'

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  doc_chase: 'Documents outstanding',
  payment_reminder: 'Stall fee reminder',
  contract_sign_reminder: 'Sign contract reminder',
  stall_allocation_notice: 'Stall allocation notice',
  general_announcement: 'General announcement',
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'info_requested', label: 'Info requested' },
]

const TRISTATE: { value: '' | 'true' | 'false'; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

interface Filters {
  status: string
  sector: string
  booth_tier: string
  has_docs: '' | 'true' | 'false'
  contract_signed: '' | 'true' | 'false'
  paid: '' | 'true' | 'false'
}

const EMPTY_FILTERS: Filters = {
  status: '',
  sector: '',
  booth_tier: '',
  has_docs: '',
  contract_signed: '',
  paid: '',
}

interface CountsResponse {
  audience_total: number
  mail_count: number
  wa_count: number
  optout_count: number
}

interface DispatchResponse {
  audience_total: number
  mail: { attempted: number; sent: number; failed: number; skipped: number }
  wa: { attempted: number; sent: number; failed: number; skipped: number }
  dry_run: boolean
  errors: Array<{ kind: 'mail' | 'wa'; to: string; error: string }>
}

function buildQuery(filters: Filters): string {
  const p = new URLSearchParams({ counts: '1' })
  if (filters.status) p.set('status', filters.status)
  if (filters.sector) p.set('sector', filters.sector)
  if (filters.booth_tier) p.set('booth_tier', filters.booth_tier)
  if (filters.has_docs) p.set('has_docs', filters.has_docs)
  if (filters.contract_signed) p.set('contract_signed', filters.contract_signed)
  if (filters.paid) p.set('paid', filters.paid)
  return p.toString()
}

export default function BroadcastPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [channel, setChannel] = useState<Channel>('mail')
  const [templateKey, setTemplateKey] = useState<TemplateKey>('general_announcement')
  const [customMessage, setCustomMessage] = useState('')
  const [counts, setCounts] = useState<CountsResponse | null>(null)
  const [countsLoading, setCountsLoading] = useState(false)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<DispatchResponse | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // Refresh counts when filters change.
  useEffect(() => {
    let cancelled = false
    setCountsLoading(true)
    setCountsError(null)
    fetch(`/api/admin/whatsapp-broadcast?${buildQuery(filters)}`, {
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`)
        return r.json() as Promise<CountsResponse>
      })
      .then((j) => { if (!cancelled) setCounts(j) })
      .catch((e: Error) => { if (!cancelled) setCountsError(e.message) })
      .finally(() => { if (!cancelled) setCountsLoading(false) })
    return () => { cancelled = true }
  }, [filters])

  const expectedCount = useMemo(() => {
    if (!counts) return 0
    if (channel === 'mail') return counts.mail_count
    if (channel === 'wa') return counts.wa_count
    return Math.max(counts.mail_count, counts.wa_count)
  }, [channel, counts])

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const send = async () => {
    setSending(true)
    setSendError(null)
    setResult(null)
    try {
      const filtersBody = {
        status: filters.status || null,
        sector: filters.sector || null,
        booth_tier: filters.booth_tier || null,
        has_docs: filters.has_docs === '' ? null : filters.has_docs === 'true',
        contract_signed: filters.contract_signed === '' ? null : filters.contract_signed === 'true',
        paid: filters.paid === '' ? null : filters.paid === 'true',
      }
      const res = await fetch('/api/admin/whatsapp-broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          filters: filtersBody,
          template_key: templateKey,
          custom_message: customMessage,
        }),
      })
      const json = await res.json() as DispatchResponse | { error?: string }
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
      setResult(json as DispatchResponse)
      setConfirmOpen(false)
    } catch (e) {
      setSendError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const sendDisabled = expectedCount === 0 || !templateKey || sending

  return (
    <div className="px-8 py-10 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Broadcast</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Reach a filtered slice of your vendor base on email, WhatsApp, or both.
        </p>
      </header>

      {/* Filter rail */}
      <section className="mb-7 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FilterSelect label="Application status" value={filters.status}
          onChange={(v) => update('status', v)} options={STATUS_OPTIONS} />
        <FilterInput label="Sector" placeholder="e.g. food, fashion" value={filters.sector}
          onChange={(v) => update('sector', v)} />
        <FilterInput label="Booth tier" placeholder="e.g. food-truck-6m" value={filters.booth_tier}
          onChange={(v) => update('booth_tier', v)} />
        <FilterTri label="Documents complete" value={filters.has_docs}
          onChange={(v) => update('has_docs', v)} />
        <FilterTri label="Contract signed" value={filters.contract_signed}
          onChange={(v) => update('contract_signed', v)} />
        <FilterTri label="Stall fee paid" value={filters.paid}
          onChange={(v) => update('paid', v)} />
      </section>

      {/* Channel toggle */}
      <section className="mb-7">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Channel</h2>
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
          {(['mail', 'wa', 'both'] as Channel[]).map((c) => (
            <button key={c} type="button"
              onClick={() => setChannel(c)}
              className={
                'px-4 py-2 text-sm font-medium rounded-md transition-colors ' +
                (channel === c ? 'bg-[#cd2653] text-white' : 'text-neutral-600 hover:bg-neutral-100')
              }>
              {c === 'mail' ? 'Email' : c === 'wa' ? 'WhatsApp' : 'Both'}
            </button>
          ))}
        </div>
      </section>

      {/* Template picker */}
      <section className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
          Template
        </label>
        <select value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
          className="w-full md:w-96 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#cd2653]/40">
          {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((k) => (
            <option key={k} value={k}>{TEMPLATE_LABELS[k]}</option>
          ))}
        </select>
      </section>

      {/* Custom message */}
      <section className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
          Optional custom message
        </label>
        <textarea value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={4}
          placeholder="Anything extra to add. Injected as {{custom_message}} in the template."
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#cd2653]/40" />
      </section>

      {/* Count + Send */}
      <section className="rounded-lg border border-neutral-200 bg-white p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-neutral-500">
            Audience
          </p>
          {countsLoading && <p className="text-sm text-neutral-500 mt-1">Counting...</p>}
          {countsError && <p className="text-sm text-red-600 mt-1">{countsError}</p>}
          {counts && !countsLoading && !countsError && (
            <p className="text-sm text-neutral-700 mt-1">
              <span className="text-2xl font-semibold text-neutral-900 mr-2">{expectedCount}</span>
              recipients
              <span className="text-neutral-400">
                {' · '}{counts.mail_count} email
                {' · '}{counts.wa_count} WhatsApp
                {counts.optout_count > 0 && ` · ${counts.optout_count} opted out`}
              </span>
            </p>
          )}
        </div>
        <button type="button"
          disabled={sendDisabled}
          onClick={() => setConfirmOpen(true)}
          className="rounded-md bg-[#cd2653] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#b22149] transition-colors">
          Send broadcast
        </button>
      </section>

      {result && (
        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-medium text-emerald-900">Dispatch complete.</p>
          <ul className="mt-2 text-sm text-emerald-900 list-disc list-inside space-y-1">
            <li>Mail: {result.mail.sent} sent, {result.mail.failed} failed, {result.mail.skipped} skipped (of {result.mail.attempted}).</li>
            <li>WhatsApp: {result.wa.sent} sent, {result.wa.failed} failed, {result.wa.skipped} skipped (of {result.wa.attempted}).</li>
          </ul>
          {result.errors.length > 0 && (
            <details className="mt-3 text-sm text-emerald-900">
              <summary className="cursor-pointer">First {Math.min(result.errors.length, 5)} errors</summary>
              <ul className="mt-2 list-disc list-inside">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e.kind} → {e.to}: {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {sendError && (
        <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {sendError}
        </section>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900">Confirm broadcast</h3>
            <p className="mt-2 text-sm text-neutral-600">
              You are about to send <strong className="text-neutral-900">{TEMPLATE_LABELS[templateKey]}</strong> via
              {' '}<strong className="text-neutral-900">
                {channel === 'mail' ? 'Email' : channel === 'wa' ? 'WhatsApp' : 'Email and WhatsApp'}
              </strong>{' '}
              to
              {' '}<strong className="text-neutral-900">{expectedCount}</strong> recipient{expectedCount === 1 ? '' : 's'}.
            </p>
            {counts && channel === 'both' && (
              <p className="mt-1 text-xs text-neutral-500">
                Up to {counts.mail_count} emails and {counts.wa_count} WhatsApp messages will go out, dedupe applied.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 rounded-md hover:bg-neutral-100">
                Cancel
              </button>
              <button type="button" onClick={send} disabled={sending}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#cd2653] rounded-md hover:bg-[#b22149] disabled:opacity-50">
                {sending ? 'Sending...' : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- subcomponents ----------------

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#cd2653]/40">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function FilterInput({ label, placeholder, value, onChange }: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">{label}</span>
      <input type="text" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#cd2653]/40" />
    </label>
  )
}

function FilterTri({ label, value, onChange }: {
  label: string
  value: '' | 'true' | 'false'
  onChange: (v: '' | 'true' | 'false') => void
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">{label}</span>
      <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
        {TRISTATE.map((opt) => (
          <button key={opt.value} type="button"
            onClick={() => onChange(opt.value)}
            className={
              'px-3 py-1.5 text-xs font-medium rounded transition-colors ' +
              (value === opt.value ? 'bg-[#cd2653] text-white' : 'text-neutral-600 hover:bg-neutral-100')
            }>
            {opt.label}
          </button>
        ))}
      </div>
    </label>
  )
}
