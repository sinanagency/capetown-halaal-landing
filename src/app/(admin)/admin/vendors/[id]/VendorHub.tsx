'use client'

/**
 * VendorHub — one long scroll, no tabs. Sections in fixed order:
 *   1 Hero · 2 AI summary · 3 Contract · 4 Payments · 5 Documents ·
 *   6 Booth + neighbours · 7 Unified comms timeline · 8 Tasks/Blockers ·
 *   9 Audit log strip.
 *
 * Mutations:
 *   - Mark paid manually  -> /api/admin/vendors/[id]/mark-paid
 *   - Doc approve/reject  -> /api/admin/vendors/[id]/doc-action
 *   - Resend signing link -> existing exhibitor invite (graceful fail)
 *   - Chase via WA/Email  -> opens a hash-link to /admin/follow-up?chase=<id>
 *
 * The summary endpoint caches by application.updated_at so opening this page
 * across sessions costs ~1 Haiku call per real change.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  MessageSquare, FileText, CreditCard, FolderOpen, MapPin, ClipboardList,
  History, Sparkles, AlertTriangle, Check, X, RefreshCw, ExternalLink, Loader2,
} from 'lucide-react'
import { UnifiedTimeline } from '@/components/admin/comms/UnifiedTimeline'
import type { PortalState, DocRecord } from '@/lib/portal-state'
import { REQUIRED_DOC_LABELS, REQUIRED_DOC_TYPES } from './doc-types'

interface AuditEvent {
  id: string
  event_type: string
  note: string | null
  created_at: string
  actor_email: string | null
}

interface Neighbour {
  id: string
  business_name: string
  stall: string
}

interface Props {
  app: Record<string, unknown>
  e164: string
  portal: PortalState
  stall: string | null
  neighbours: Neighbour[]
  events: AuditEvent[]
}

function fmtDate(d: unknown): string {
  if (!d) return '—'
  try { return new Date(String(d)).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '—' }
}

function fmtMoney(n?: number | null): string {
  if (!n) return '—'
  return `R ${n.toLocaleString('en-ZA')}`
}

export function VendorHub({ app, e164, portal: initialPortal, stall, neighbours, events: initialEvents }: Props) {
  const [portal, setPortal] = useState<PortalState>(initialPortal)
  const [events, setEvents] = useState<AuditEvent[]>(initialEvents)
  const id = String(app.id)
  const businessName = String(app.business_name || 'Vendor')
  const contactName = String(app.contact_name || '')
  const phone = String(app.phone || '')
  const email = String(app.email || '')
  const status = String(app.status || 'pending')
  const sector = (app.product_categories as string[])?.[0] || (app.item_category as string) || '—'
  const contractSignedAt = app.contract_signed_at ? String(app.contract_signed_at) : null
  const contractPath = app.contract_pdf_path ? String(app.contract_pdf_path) : null

  const blockers: Array<{ key: string; label: string; chase_template: string }> = []
  const paymentStatus = portal.payment?.status || 'none'
  if (paymentStatus !== 'paid' && paymentStatus !== 'waived') {
    blockers.push({ key: 'payment', label: 'Stall fee unpaid', chase_template: 'payment_reminder' })
  }
  if (!contractSignedAt && !contractPath) {
    blockers.push({ key: 'contract', label: 'Contract unsigned', chase_template: 'contract_sign_reminder' })
  }
  const docs = portal.docs || []
  if (docs.length === 0) {
    blockers.push({ key: 'docs', label: 'No documents on file', chase_template: 'doc_chase' })
  }
  if (!stall) {
    blockers.push({ key: 'stall', label: 'No stall allocated', chase_template: 'doc_chase' })
  }

  // -------- mutation helpers --------------------------------------------------

  async function refreshEvents() {
    try {
      const r = await fetch(`/api/admin/applications/events?application_id=${id}&limit=50`)
      const j = await r.json()
      if (Array.isArray(j.events)) setEvents(j.events as AuditEvent[])
    } catch { /* swallow */ }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ─── Hero ─── */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <Link href="/admin/vendors" className="text-xs text-neutral-500 hover:text-[#cd2653]">← All vendors</Link>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#1B1A17] leading-tight mt-1">{businessName}</h1>
              <p className="text-sm text-neutral-600 mt-1">
                {contactName && <span>{contactName} · </span>}
                {phone && <a href={`tel:${phone}`} className="underline mr-2">{phone}</a>}
                {email && <a href={`mailto:${email}`} className="underline">{email}</a>}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Pill tone="neutral">{sector}</Pill>
                <Pill tone={status === 'approved' ? 'emerald' : status === 'rejected' ? 'red' : 'amber'}>{status}</Pill>
                {stall && <Pill tone="emerald"><MapPin className="w-3 h-3 inline -mt-0.5" /> {stall}</Pill>}
                {blockers.length > 0 && (
                  <Pill tone="amber"><AlertTriangle className="w-3 h-3 inline -mt-0.5" /> {blockers.length} blocker{blockers.length === 1 ? '' : 's'}</Pill>
                )}
              </div>
            </div>
            {phone && (
              <a
                href={`whatsapp://send?phone=${e164}`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp now
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ─── 2: AI Summary ─── */}
        <Section icon={<Sparkles className="w-4 h-4 text-[#cd2653]" />} title="Summary">
          <AISummary id={id} />
        </Section>

        {/* ─── 3: Contract ─── */}
        <Section icon={<FileText className="w-4 h-4 text-[#cd2653]" />} title="Contract">
          <ContractSection
            applicationId={id}
            contractSignedAt={contractSignedAt}
            contractPath={contractPath}
            signedIp={String((app.contract_signed_ip as string) || '')}
            signedUa={String((app.contract_signed_user_agent as string) || '')}
          />
        </Section>

        {/* ─── 4: Payments ─── */}
        <Section icon={<CreditCard className="w-4 h-4 text-[#cd2653]" />} title="Payments">
          <PaymentsSection
            applicationId={id}
            payment={portal.payment}
            onUpdated={(payment) => setPortal((p) => ({ ...p, payment }))}
            onRefreshEvents={refreshEvents}
          />
        </Section>

        {/* ─── 5: Documents ─── */}
        <Section icon={<FolderOpen className="w-4 h-4 text-[#cd2653]" />} title="Documents">
          <DocumentsSection
            applicationId={id}
            docs={portal.docs || []}
            onUpdated={(docs) => setPortal((p) => ({ ...p, docs }))}
            onRefreshEvents={refreshEvents}
          />
        </Section>

        {/* ─── 6: Booth + neighbours ─── */}
        <Section icon={<MapPin className="w-4 h-4 text-[#cd2653]" />} title="Booth">
          <BoothSection stall={stall} neighbours={neighbours} />
        </Section>

        {/* ─── 7: Unified comms timeline ─── */}
        <Section icon={<MessageSquare className="w-4 h-4 text-[#cd2653]" />} title="Comms timeline">
          <UnifiedTimeline contactId={id} phone={phone || undefined} email={email || undefined} />
        </Section>

        {/* ─── 8: Tasks/Blockers checklist ─── */}
        <Section icon={<ClipboardList className="w-4 h-4 text-[#cd2653]" />} title="Outstanding gates">
          <BlockersChecklist
            applicationId={id}
            blockers={blockers}
            phone={phone}
            email={email}
            contactName={contactName}
            businessName={businessName}
            stall={stall}
          />
        </Section>

        {/* ─── 9: Audit log ─── */}
        <Section icon={<History className="w-4 h-4 text-[#cd2653]" />} title="Audit log">
          <AuditLog events={events} />
        </Section>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section atoms
// ─────────────────────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6">
      <h2 className="font-serif text-lg text-[#1B1A17] mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </section>
  )
}

function Pill({ tone, children }: { tone: 'emerald' | 'red' | 'amber' | 'neutral'; children: React.ReactNode }) {
  const map = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    neutral: 'bg-neutral-100 border-neutral-200 text-neutral-700',
  }
  return <span className={`text-xs font-medium px-2 py-1 rounded-full border ${map[tone]}`}>{children}</span>
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 py-1.5">
      <span className="text-xs sm:text-sm text-neutral-500 sm:w-36 sm:flex-shrink-0">{k}</span>
      <span className="text-sm text-neutral-900 break-words">{v ?? '—'}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Summary
// ─────────────────────────────────────────────────────────────────────────────

function AISummary({ id }: { id: string }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cached, setCached] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/vendors/${id}/summary`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d.summary) {
          setSummary(d.summary as string)
          setCached(!!d.cached)
        } else {
          setError(d.error || 'No summary available')
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  if (loading) return <p className="text-sm text-neutral-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading summary...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  return (
    <div>
      <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{summary}</p>
      <p className="text-xs text-neutral-400 mt-2">{cached ? 'Cached.' : 'Fresh.'}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────────────────────────────────────

function ContractSection({
  applicationId, contractSignedAt, contractPath, signedIp, signedUa,
}: {
  applicationId: string
  contractSignedAt: string | null
  contractPath: string | null
  signedIp: string
  signedUa: string
}) {
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  async function resendSigningLink() {
    setResending(true)
    setResendMsg(null)
    try {
      const r = await fetch(`/api/admin/vendors/${applicationId}/resend-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) setResendMsg('Signing link sent.')
      else setResendMsg(j.error || 'Resend failed.')
    } catch (e) {
      setResendMsg((e as Error).message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {contractSignedAt ? (
          <Pill tone="emerald">Signed {fmtDate(contractSignedAt)}</Pill>
        ) : (
          <Pill tone="amber">Unsigned</Pill>
        )}
        <button
          onClick={resendSigningLink}
          disabled={resending}
          className="text-xs text-[#cd2653] hover:underline inline-flex items-center gap-1 disabled:opacity-60"
        >
          <RefreshCw className="w-3 h-3" /> Resend signing link
        </button>
        {resendMsg && <span className="text-xs text-neutral-500">{resendMsg}</span>}
      </div>
      {contractPath && (
        <div className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
          <iframe
            src={`/api/admin/vendor-doc?path=${encodeURIComponent(contractPath)}`}
            title="Signed contract"
            className="w-full h-[400px] bg-white"
          />
          <div className="px-3 py-2 text-xs text-neutral-500 border-t border-neutral-200 flex items-center justify-between">
            <span>Stored at: <code className="font-mono">{contractPath}</code></span>
            <a href={`/api/admin/vendor-doc?path=${encodeURIComponent(contractPath)}`} target="_blank" rel="noopener noreferrer" className="text-[#cd2653] hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Open
            </a>
          </div>
        </div>
      )}
      {contractSignedAt && (
        <p className="text-xs text-neutral-500 mt-3">
          Signed at: {fmtDate(contractSignedAt)}
          {signedIp ? ` · IP ${signedIp}` : ''}
          {signedUa ? ` · ${signedUa.slice(0, 80)}` : ''}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

function PaymentsSection({
  applicationId, payment, onUpdated, onRefreshEvents,
}: {
  applicationId: string
  payment?: PortalState['payment']
  onUpdated: (p: PortalState['payment']) => void
  onRefreshEvents: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState<string>(payment?.amount ? String(payment.amount) : '')
  const [reference, setReference] = useState<string>('')
  const [note, setNote] = useState<string>('')

  const status = payment?.status || 'none'
  const tone: 'emerald' | 'amber' | 'red' | 'neutral' =
    status === 'paid' || status === 'waived' ? 'emerald' :
    status === 'pending' ? 'amber' :
    status === 'none' ? 'red' : 'neutral'

  async function markPaid() {
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`/api/admin/vendors/${applicationId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount ? Number(amount) : undefined,
          reference: reference || undefined,
          note: note || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Failed'); return }
      onUpdated(j.payment)
      setShowForm(false)
      onRefreshEvents()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Pill tone={tone}>{status}</Pill>
        {payment?.amount && <span className="text-sm font-medium">{fmtMoney(payment.amount)}</span>}
        {payment?.paid_at && <span className="text-xs text-neutral-500">paid {fmtDate(payment.paid_at)}</span>}
      </div>
      <Row k="Reference" v={payment?.reference || '—'} />
      <Row k="Provider txn" v={payment?.provider_ref || '—'} />
      <Row k="Last attempt" v={payment?.attempted_at ? fmtDate(payment.attempted_at) : '—'} />
      <Row k="Attempts" v={payment?.attempts ?? 0} />

      {!showForm ? (
        <div className="pt-3 flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-white bg-[#cd2653] hover:bg-[#b01f45] px-3 py-1.5 rounded-md"
          >
            Mark paid manually
          </button>
          <button
            disabled
            title="Refunds ship next sprint"
            className="text-sm text-neutral-400 border border-neutral-200 px-3 py-1.5 rounded-md cursor-not-allowed"
          >
            Refund (next sprint)
          </button>
        </div>
      ) : (
        <div className="pt-3 space-y-2 border-t border-neutral-100">
          <p className="text-xs text-neutral-500">Logs a payment_manual audit event and flips the portal marker.</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Amount (R)" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="border border-neutral-200 rounded-md px-2 py-1.5 text-sm" />
            <input type="text" placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)}
              className="border border-neutral-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm" />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex items-center gap-2">
            <button onClick={markPaid} disabled={busy}
              className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md disabled:opacity-60">
              {busy ? 'Saving...' : 'Confirm paid'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-neutral-600 hover:underline">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────────────────

function DocumentsSection({
  applicationId, docs, onUpdated, onRefreshEvents,
}: {
  applicationId: string
  docs: DocRecord[]
  onUpdated: (docs: DocRecord[]) => void
  onRefreshEvents: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function act(type: string, action: 'approve' | 'reject' | 'resubmit') {
    setBusy(`${type}:${action}`); setErr(null)
    try {
      const r = await fetch(`/api/admin/vendors/${applicationId}/doc-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Failed'); return }
      if (Array.isArray(j.docs)) onUpdated(j.docs as DocRecord[])
      onRefreshEvents()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <ul className="divide-y divide-neutral-100">
        {REQUIRED_DOC_TYPES.map((type) => {
          const doc = docs.find((d) => d.type === type)
          const label = REQUIRED_DOC_LABELS[type]
          return (
            <li key={type} className="py-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">{label}</p>
                {doc ? (
                  <p className="text-xs text-neutral-500 truncate">
                    {doc.name} · uploaded {fmtDate(doc.uploaded_at)}
                  </p>
                ) : (
                  <p className="text-xs text-rose-600">missing</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc && (
                  <>
                    <Pill tone={doc.status === 'approved' ? 'emerald' : doc.status === 'rejected' ? 'red' : 'amber'}>
                      {doc.status}
                    </Pill>
                    <a
                      href={`/api/admin/vendor-doc?path=${encodeURIComponent(doc.path)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#cd2653] hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                    <button
                      onClick={() => act(type, 'approve')}
                      disabled={busy === `${type}:approve`}
                      className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-0.5 disabled:opacity-60"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => act(type, 'reject')}
                      disabled={busy === `${type}:reject`}
                      className="text-xs text-rose-700 hover:underline inline-flex items-center gap-0.5 disabled:opacity-60"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                    <button
                      onClick={() => act(type, 'resubmit')}
                      disabled={busy === `${type}:resubmit`}
                      className="text-xs text-neutral-700 hover:underline disabled:opacity-60"
                    >
                      Resubmit
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Booth + neighbours (uses static SVG snippet rather than full StallMap so the
// hub stays lightweight; full map lives at /admin/allocation).
// ─────────────────────────────────────────────────────────────────────────────

function BoothSection({ stall, neighbours }: { stall: string | null; neighbours: Neighbour[] }) {
  if (!stall) {
    return (
      <div>
        <p className="text-sm text-neutral-600">No stall allocated yet.</p>
        <Link href="/admin/allocation" className="text-sm text-[#cd2653] hover:underline mt-2 inline-block">
          Go to allocation map →
        </Link>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Allocated stall</p>
        <p className="font-mono text-2xl text-[#cd2653] font-semibold">{stall}</p>
        <Link
          href={`/admin/allocation?focus=${encodeURIComponent(stall)}`}
          className="text-sm text-[#cd2653] hover:underline mt-2 inline-block"
        >
          Open on full map →
        </Link>
      </div>
      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Neighbours in zone</p>
        {neighbours.length === 0 ? (
          <p className="text-sm text-neutral-500">No neighbours allocated yet in this zone.</p>
        ) : (
          <ul className="space-y-1">
            {neighbours.map((n) => (
              <li key={n.id} className="text-sm">
                <Link href={`/admin/vendors/${n.id}`} className="text-neutral-900 hover:text-[#cd2653]">
                  <span className="font-mono text-xs text-neutral-500 mr-2">{n.stall}</span>
                  {n.business_name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Blockers checklist with inline chase buttons.
// ─────────────────────────────────────────────────────────────────────────────

function BlockersChecklist({
  applicationId, blockers, phone, email, contactName, businessName, stall,
}: {
  applicationId: string
  blockers: Array<{ key: string; label: string; chase_template: string }>
  phone: string
  email: string
  contactName: string
  businessName: string
  stall: string | null
}) {
  if (blockers.length === 0) {
    return <p className="text-sm text-emerald-700">All gates clear. Vendor is ready.</p>
  }

  const firstName = contactName.trim().split(/\s+/)[0] || null

  function chaseLink(via: 'wa' | 'mail', template: string) {
    const sp = new URLSearchParams({
      target: applicationId,
      via,
      template,
      first_name: firstName || '',
      business_name: businessName,
      email,
      phone,
      stall_code: stall || '',
    })
    return `/admin/follow-up?chase=${sp.toString()}`
  }

  return (
    <ul className="space-y-2">
      {blockers.map((b) => (
        <li key={b.key} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-b-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-neutral-900">{b.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={chaseLink('wa', b.chase_template)} className="text-xs text-emerald-700 hover:underline">
              Chase via WhatsApp
            </Link>
            <Link href={chaseLink('mail', b.chase_template)} className="text-xs text-blue-700 hover:underline">
              Chase via Email
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log
// ─────────────────────────────────────────────────────────────────────────────

function AuditLog({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No audit events recorded yet.</p>
  }
  return (
    <ol className="space-y-2 text-sm">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-2">
          <span className="text-xs text-neutral-400 tabular-nums w-32 flex-shrink-0">{fmtDate(e.created_at)}</span>
          <span className="font-medium text-neutral-900 w-40 flex-shrink-0 truncate">{e.event_type}</span>
          <span className="text-neutral-700 break-words">
            {e.note}
            {e.actor_email ? <span className="text-neutral-400"> · {e.actor_email}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
