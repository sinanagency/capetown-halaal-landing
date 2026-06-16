'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MessageCircle, Mail, CreditCard, MapPin, Phone,
  FileText, Users, History, Eye, ChevronDown, ChevronUp, Loader2,
  StickyNote, Plus,
} from 'lucide-react'
import { AdminPage } from '@/components/admin/AdminPage'
import { KpiStrip } from '@/components/chrome/KpiStrip'
import { Kpi } from '@/components/chrome/Kpi'
import { DenseTable } from '@/components/chrome/DenseTable'
import { StatusPill } from '@/components/chrome/StatusPill'
import { ActionChipGrid } from '@/components/chrome/ActionChipGrid'
import { ActionChip } from '@/components/chrome/ActionChip'
import { RightDrawer } from '@/components/chrome/RightDrawer'
import type { PortalState, DocRecord, StaffMember } from '@/lib/portal-state'
import { REQUIRED_DOC_LABELS, type RequiredDocType } from './doc-types'

interface CommItem {
  id: string
  channel: 'whatsapp' | 'email'
  direction: 'in' | 'out'
  body: string
  at: string
  from: string
  to?: string
  subject?: string
  template?: string | null
}

interface AuditEvent {
  id: string
  event_type: string
  note: string | null
  created_at: string
  actor_email: string | null
}

interface Stats {
  days_since_approval: number | null
  document_count: number
  staff_count: number
  approved_count: number
}

interface InitialData {
  vendor: Record<string, unknown>
  stall: string | null
  portal: PortalState
  communications: CommItem[]
  events: AuditEvent[]
  stats: Stats
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '—' }
}

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium' }) } catch { return '—' }
}

function fmtMoney(n?: number | null): string {
  if (!n) return '—'
  return `R ${n.toLocaleString('en-ZA')}`
}

function statusTone(status: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'approved': case 'paid': case 'confirmed': case 'active': return 'success'
    case 'pending': case 'invoiced': case 'deferred': return 'warn'
    case 'rejected': case 'cancelled': case 'failed': return 'danger'
    case 'reviewed': case 'submitted': return 'info'
    default: return 'neutral'
  }
}

export function Vendor360({ initialData }: { initialData: InitialData }) {
  const router = useRouter()
  const v = initialData.vendor
  const portal = initialData.portal
  const businessName = String(v.business_name || 'Vendor')
  const category = ((v.product_categories as string[])?.[0] || v.item_category || '') as string
  const phone = String(v.phone || '')
  const email = String(v.email || '')
  const contactName = String(v.contact_name || '')
  const status = String(v.status || 'pending')
  const stallCode = initialData.stall
  const stats = initialData.stats

  const [commExpanded, setCommExpanded] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerView, setDrawerView] = useState<'contact' | 'doc' | 'paid'>('contact')
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null)
  const [markPaidBusy, setMarkPaidBusy] = useState(false)
  const [markPaidAmount, setMarkPaidAmount] = useState('')
  const [markPaidRef, setMarkPaidRef] = useState('')
  const [markPaidNote, setMarkPaidNote] = useState('')
  const [markPaidErr, setMarkPaidErr] = useState<string | null>(null)

  function toggleCommExpanded(id: string) {
    setCommExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openContactDrawer() {
    setDrawerView('contact')
    setDrawerOpen(true)
  }

  function openDocPreview(doc: DocRecord) {
    setPreviewDoc(doc)
    setDrawerView('doc')
    setDrawerOpen(true)
  }

  function openMarkPaid() {
    setDrawerView('paid')
    setMarkPaidAmount(portal.payment?.amount ? String(portal.payment.amount) : '')
    setMarkPaidRef('')
    setMarkPaidNote('')
    setMarkPaidErr(null)
    setDrawerOpen(true)
  }

  async function handleMarkPaid() {
    setMarkPaidBusy(true)
    setMarkPaidErr(null)
    try {
      const r = await fetch(`/api/admin/vendors/${v.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: markPaidAmount ? Number(markPaidAmount) : undefined,
          reference: markPaidRef || undefined,
          note: markPaidNote || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setMarkPaidErr(j.error || 'Failed'); return }
      setDrawerOpen(false)
    } catch (e) {
      setMarkPaidErr((e as Error).message)
    } finally {
      setMarkPaidBusy(false)
    }
  }

  const whatsappLink = phone
    ? `https://wa.me/${phone.replace(/[^0-9]/g, '').replace(/^0/, '27')}`
    : null

  return (
    <AdminPage
      caption="Vendor Profile"
      title={businessName}
      subtitle={category || undefined}
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to vendors
        </Link>
        <span className="text-neutral-300">|</span>
        <span className="font-serif text-xl text-neutral-800">{businessName}</span>
        {category && (
          <span className="inline-flex items-center h-5 px-2.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
            {category}
          </span>
        )}
        {stallCode && (
          <span className="font-mono text-xs text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
            {stallCode}
          </span>
        )}
        <StatusPill tone={statusTone(status)} label={status} />
      </div>

      <ActionChipGrid>
        <ActionChip
          icon={<MessageCircle className="w-4 h-4" />}
          label="Send WhatsApp"
          tone="mint"
          onClick={whatsappLink ? () => window.open(whatsappLink, '_blank') : undefined}
        />
        <ActionChip
          icon={<Mail className="w-4 h-4" />}
          label="Send Email"
          tone="sky"
          onClick={email ? () => window.open(`mailto:${email}`) : undefined}
        />
        <ActionChip
          icon={<CreditCard className="w-4 h-4" />}
          label="Mark Paid"
          tone="butter"
          onClick={openMarkPaid}
        />
        <ActionChip
          icon={<MapPin className="w-4 h-4" />}
          label="View Stand"
          tone="lavender"
          onClick={stallCode ? () => router.push(`/admin/allocation?focus=${encodeURIComponent(stallCode)}`) : undefined}
        />
      </ActionChipGrid>

      <KpiStrip>
        <Kpi
          label="Payment"
          value={
            <span className="flex items-center gap-2">
              {fmtMoney(portal.payment?.amount)}
              <StatusPill
                tone={statusTone(portal.payment?.status || 'none')}
                label={portal.payment?.status || 'none'}
              />
            </span>
          }
          hint={portal.payment?.reference ? `Ref: ${portal.payment.reference}` : undefined}
        />
        <Kpi
          label="Documents"
          value={`${stats.approved_count}/${stats.document_count}`}
          hint={stats.document_count === 0 ? 'None uploaded' : `${stats.approved_count} approved`}
        />
        <Kpi
          label="Staff"
          value={stats.staff_count}
          hint={stats.staff_count === 0 ? 'None registered' : undefined}
        />
        <Kpi
          label="Days since approval"
          value={stats.days_since_approval !== null ? stats.days_since_approval : '—'}
          hint={stats.days_since_approval !== null ? 'Since approval' : 'Not yet approved'}
        />
      </KpiStrip>

      <Section title="Contact Info" icon={<Phone className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledField label="Contact person" value={contactName} />
          <LabeledField label="Email" value={email} mono />
          <LabeledField label="Phone" value={phone} mono />
          <LabeledField label="Contact ID" value={String(v.id)} mono />
        </div>
        <button
          onClick={openContactDrawer}
          className="mt-3 text-xs text-blue-700 hover:underline"
        >
          Edit contact info
        </button>
      </Section>

      <Section title="Application Details" icon={<FileText className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledField
            label="Stall tier"
            value={v.preferred_booth_tier ? String(v.preferred_booth_tier).replace(/-/g, ' ') : '—'}
          />
          <LabeledField label="Stall code" value={stallCode || '—'} mono />
          <LabeledField label="Sector" value={category || '—'} />
          <LabeledField label="Special requirements" value={v.special_requirements ? String(v.special_requirements) : '—'} />
          <LabeledField label="Items / menu" value={v.items_description ? String(v.items_description).slice(0, 200) : '—'} />
          <LabeledField label="Applied" value={v.created_at ? fmtDate(v.created_at as string) : '—'} />
        </div>
      </Section>

      <Section title="Quick Notes" icon={<StickyNote className="w-4 h-4" />}>
        <QuickNotesSection applicationId={String(v.id)} />
      </Section>

      <Section title="Communication Log" icon={<Mail className="w-4 h-4" />}>
        {initialData.communications.length === 0 ? (
          <p className="text-sm text-neutral-500">No messages recorded.</p>
        ) : (
          <div className="space-y-1">
            {initialData.communications.map((c) => {
              const expanded = commExpanded.has(c.id)
              const preview = c.body.length > 120 ? c.body.slice(0, 120) + '...' : c.body
              return (
                <div
                  key={c.id}
                  className="border border-neutral-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleCommExpanded(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-500">
                      {c.channel === 'whatsapp' ? (
                        <MessageCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400 tabular-nums w-28">
                      {fmtDate(c.at)}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-neutral-600 w-20 truncate">
                      {c.from}
                    </span>
                    <span className="flex-1 text-xs text-neutral-700 truncate">
                      {preview}
                    </span>
                    {c.body.length > 120 && (
                      <span className="shrink-0 text-neutral-400">
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </button>
                  {expanded && c.body.length > 120 && (
                    <div className="px-3 pb-3 pt-1 text-xs text-neutral-700 whitespace-pre-wrap border-t border-neutral-100 bg-neutral-50">
                      {c.body}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Documents" icon={<FileText className="w-4 h-4" />}>
        <DenseTable<DocRecord>
          columns={[
            { key: 'type', header: 'Type', render: (doc) => REQUIRED_DOC_LABELS[doc.type as RequiredDocType] || doc.type },
            { key: 'name', header: 'File' },
            { key: 'uploaded_at', header: 'Uploaded', render: (doc) => fmtShortDate(doc.uploaded_at) },
            {
              key: 'status', header: 'Status', render: (doc) => (
                <StatusPill
                  tone={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warn'}
                  label={doc.status}
                />
              ),
            },
            {
              key: 'actions', header: '', width: '60px', render: (doc) => (
                <button
                  onClick={(e) => { e.stopPropagation(); openDocPreview(doc) }}
                  className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
              ),
            },
          ]}
          rows={portal.docs || []}
          emptyState={{ label: 'No documents uploaded' }}
        />
      </Section>

      <Section title="Staff" icon={<Users className="w-4 h-4" />}>
        <DenseTable<StaffMember>
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
            {
              key: 'role', header: 'Role', render: (s) => s.role || 'staff',
            },
            {
              key: 'badge', header: 'Badge status', render: (s) => {
                if (s.revoked_at) return <StatusPill tone="danger" label="Revoked" />
                if (s.checked_in_at) return <StatusPill tone="success" label={`Checked in ${fmtShortDate(s.checked_in_at)}`} />
                return <StatusPill tone="warn" label="Not yet" />
              },
            },
            {
              key: 'wc_order_id', header: 'Order', render: (s) => s.wc_order_id
                ? <span className="font-mono text-xs">#{s.wc_order_number || s.wc_order_id}</span>
                : '—',
            },
          ]}
          rows={portal.staff || []}
          emptyState={{ label: 'No staff registered' }}
        />
      </Section>

      <Section title="Activity Timeline" icon={<History className="w-4 h-4" />}>
        {initialData.events.length === 0 ? (
          <p className="text-sm text-neutral-500">No events recorded.</p>
        ) : (
          <div className="relative pl-6 space-y-0">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-neutral-200" />
            {initialData.events.map((e) => (
              <div key={e.id} className="relative pb-4 pl-4">
                <div className="absolute left-[-14px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-neutral-300 bg-white" />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                    {fmtDate(e.created_at)}
                  </span>
                  <span className="text-xs font-medium text-neutral-700 capitalize">
                    {e.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {e.note || ''}
                    {e.actor_email ? <span className="text-neutral-400"> · {e.actor_email}</span> : null}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerView === 'contact' ? 'Edit Contact Info' : drawerView === 'paid' ? 'Mark as Paid' : previewDoc ? REQUIRED_DOC_LABELS[previewDoc.type as RequiredDocType] || previewDoc.type : 'Document Preview'}
      >
        {drawerView === 'contact' && (
          <div className="space-y-4">
            <LabeledField label="Business name" value={businessName} />
            <LabeledField label="Contact person" value={contactName} />
            <LabeledField label="Email" value={email} />
            <LabeledField label="Phone" value={phone} />
            <p className="text-xs text-neutral-400 mt-4">
              Contact editing will be available in the next update.
            </p>
          </div>
        )}

        {drawerView === 'paid' && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500">Logs a payment_manual audit event and flips the portal marker.</p>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Amount (R)</label>
              <input
                type="number"
                value={markPaidAmount}
                onChange={(e) => setMarkPaidAmount(e.target.value)}
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                placeholder="e.g. 6500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Reference</label>
              <input
                type="text"
                value={markPaidRef}
                onChange={(e) => setMarkPaidRef(e.target.value)}
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                placeholder="EFT ref / invoice #"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Note</label>
              <input
                type="text"
                value={markPaidNote}
                onChange={(e) => setMarkPaidNote(e.target.value)}
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                placeholder="Optional note"
              />
            </div>
            {markPaidErr && <p className="text-xs text-red-600">{markPaidErr}</p>}
            <button
              onClick={handleMarkPaid}
              disabled={markPaidBusy}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-md disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {markPaidBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Confirm Paid
            </button>
          </div>
        )}

        {drawerView === 'doc' && previewDoc && (
          <div className="space-y-4">
            <div>
              <LabeledField label="File" value={previewDoc.name} />
              <LabeledField label="Type" value={REQUIRED_DOC_LABELS[previewDoc.type as RequiredDocType] || previewDoc.type} />
              <LabeledField label="Uploaded" value={fmtDate(previewDoc.uploaded_at)} />
              <LabeledField
                label="Status"
                value={<StatusPill tone={previewDoc.status === 'approved' ? 'success' : previewDoc.status === 'rejected' ? 'danger' : 'warn'} label={previewDoc.status} />}
              />
            </div>
            <div className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
              {previewDoc.path ? (
                <iframe
                  src={`/api/admin/vendor-doc?path=${encodeURIComponent(previewDoc.path)}`}
                  title={previewDoc.name}
                  className="w-full h-[400px] bg-white"
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-neutral-400 text-sm">
                  No file path
                </div>
              )}
            </div>
          </div>
        )}
      </RightDrawer>
    </AdminPage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Notes
// ─────────────────────────────────────────────────────────────────────────────

interface QuickNoteItem {
  id: string
  text: string
  created_at: string
  author: string | null
}

function QuickNotesSection({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState<QuickNoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vendors/${applicationId}/notes`)
      if (!res.ok) return
      const d = await res.json()
      setNotes((d.notes as QuickNoteItem[]) ?? [])
    } catch (e) {
      setError(String((e as Error)?.message || e))
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  async function saveNote() {
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/vendors/${applicationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Failed to save note')
        return
      }
      const d = await res.json()
      setNotes((prev) => [d.note as QuickNoteItem, ...prev])
      setText('')
    } catch (e) {
      setError(String((e as Error)?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a quick note..."
          rows={3}
          className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#cd2653]"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={saveNote}
          disabled={saving || !text.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[#cd2653] text-white hover:bg-[#b01f45] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Note
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading notes...
        </p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-neutral-500">No notes yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-sm text-neutral-900 whitespace-pre-wrap break-words">{n.text}</p>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                {n.author && <span>{n.author} · </span>}
                {fmtDate(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] shadow-sm p-5">
      <h3 className="font-serif text-lg text-[var(--text-primary)] mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </section>
  )
}

function LabeledField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-neutral-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}
