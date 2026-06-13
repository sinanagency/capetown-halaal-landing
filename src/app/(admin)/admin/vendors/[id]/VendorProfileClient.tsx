'use client'

import { useState, useEffect } from 'react'

type Tab = 'overview' | 'application' | 'documents' | 'messages' | 'payments' | 'activity'

interface Doc {
  name: string
  path: string
  size: number
  kind: 'profile' | 'signed-contract' | 'other'
}

interface MsgPreview {
  id: string
  direction: 'in' | 'out'
  body: string | null
  created_at: string
  template_name: string | null
  status: string | null
}

interface Msg extends MsgPreview {
  template_name: string | null
  category: string | null
  error: string | null
  provider_message_id: string | null
}

interface Props {
  app: any
  msgPreview: MsgPreview[]
  docs: Doc[]
  e164: string
}

// Vendor profile (A-Z relationship view). Mobile-first: tab bar scrolls
// horizontally on phones, content stacks vertically, all targets ≥44px tap.
export function VendorProfileClient({ app, msgPreview, docs, e164 }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const businessName = String(app.business_name || 'Vendor')
  const contactName = String(app.contact_name || '')
  const phone = String(app.phone || '')
  const status = String(app.status || 'pending')
  const reviewedAt = app.reviewed_at ? new Date(app.reviewed_at) : null
  const contractSignedAt = app.contract_signed_at ? new Date(app.contract_signed_at) : null

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* HEADER — sticky on mobile so the vendor identity is always visible */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-serif text-xl sm:text-2xl text-[#1B1A17] leading-tight">{businessName}</h1>
              <p className="text-sm text-neutral-600 mt-0.5">
                {contactName ? `${contactName} · ` : ''}
                <a href={`tel:${phone}`} className="underline">{phone}</a>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={status} />
              {contractSignedAt && <Pill tone="emerald">Contract signed</Pill>}
              {!contractSignedAt && status === 'approved' && <Pill tone="amber">Contract pending</Pill>}
            </div>
          </div>
        </div>

        {/* Tab bar — horizontally scrollable on phones */}
        <nav className="max-w-5xl mx-auto px-2 sm:px-4 overflow-x-auto">
          <div className="flex gap-1 sm:gap-2 -mb-px">
            {(['overview', 'application', 'documents', 'messages', 'payments', 'activity'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
                  tab === t
                    ? 'border-[#cd2653] text-[#cd2653]'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">
        {tab === 'overview' && <OverviewTab app={app} msgPreview={msgPreview} docs={docs} />}
        {tab === 'application' && <ApplicationTab app={app} />}
        {tab === 'documents' && <DocumentsTab app={app} docs={docs} />}
        {tab === 'messages' && <MessagesTab e164={e164} />}
        {tab === 'payments' && <PaymentsTab app={app} />}
        {tab === 'activity' && <ActivityTab app={app} />}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────

function OverviewTab({ app, msgPreview, docs }: { app: any; msgPreview: MsgPreview[]; docs: Doc[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card title="Business">
        <Row k="Brand" v={app.stall_brand_name || app.business_name} />
        <Row k="Category" v={app.item_category} />
        <Row k="Stall tier" v={app.preferred_booth_tier || '—'} />
        <Row k="Stall code" v={extractStall(app.admin_notes)} />
      </Card>
      <Card title="Contact">
        <Row k="Owner" v={app.contact_name} />
        <Row k="Email" v={<a href={`mailto:${app.email}`} className="underline">{app.email}</a>} />
        <Row k="WhatsApp" v={<a href={`tel:${app.phone}`} className="underline">{app.phone}</a>} />
        <Row k="Socials" v={app.social_media_links || '—'} />
      </Card>
      <Card title={`Recent messages (${msgPreview.length})`}>
        {msgPreview.length === 0 ? (
          <p className="text-sm text-neutral-500">No WhatsApp activity yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {msgPreview.slice(0, 3).map((m) => (
              <li key={m.id} className="flex items-start gap-2">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.direction === 'in' ? 'bg-emerald-500' : 'bg-[#cd2653]'}`} />
                <span className="text-neutral-800 leading-snug line-clamp-2">{m.body || (m.template_name ? `template: ${m.template_name}` : '—')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={`Documents (${docs.length})`}>
        {docs.length === 0 ? (
          <p className="text-sm text-neutral-500">No documents on file.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {docs.slice(0, 5).map((d) => (
              <li key={d.path} className="flex items-center justify-between gap-2">
                <span className="truncate">{d.name}</span>
                <DocBadge kind={d.kind} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ApplicationTab({ app }: { app: any }) {
  return (
    <Card title="Application detail">
      <div className="space-y-2 text-sm">
        <Row k="Submitted" v={fmtDate(app.created_at)} />
        <Row k="Status" v={app.status} />
        <Row k="Reviewed" v={fmtDate(app.reviewed_at)} />
        <Row k="Items / menu" v={<pre className="whitespace-pre-wrap font-sans text-sm">{app.items_description || '—'}</pre>} />
        <Row k="Previously traded" v={app.previously_traded ? 'Yes' : 'No'} />
        <Row k="Power required" v={app.power_required || '—'} />
        <Row k="Admin notes" v={<pre className="whitespace-pre-wrap font-sans text-sm">{app.admin_notes || '—'}</pre>} />
      </div>
    </Card>
  )
}

function DocumentsTab({ app, docs }: { app: any; docs: Doc[] }) {
  return (
    <Card title="Documents folder">
      {docs.length === 0 ? (
        <p className="text-sm text-neutral-500">No documents on file yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {docs.map((d) => (
            <li key={d.path} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="text-xs text-neutral-500">{d.path}{d.size ? ` · ${fmtSize(d.size)}` : ''}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <DocBadge kind={d.kind} />
                <a
                  href={`/api/admin/vendor-doc?path=${encodeURIComponent(d.path)}`}
                  className="text-sm text-[#cd2653] underline whitespace-nowrap"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      {app.contract_signed_at && (
        <div className="mt-4 text-xs text-neutral-500 border-t pt-3">
          Contract version: <span className="font-mono">{app.contract_version || 'cth-vendor-2026-v1'}</span> · IP: {app.contract_signed_ip || '—'}
        </div>
      )}
    </Card>
  )
}

function MessagesTab({ e164 }: { e164: string }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [draft, setDraft] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'portal'>('whatsapp')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/vendor-thread?phone=${encodeURIComponent(e164)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setMsgs(d.messages || []) })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)) })
    return () => { cancelled = true }
  }, [e164, reload])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    setSendErr(null)
    try {
      const res = await fetch('/api/admin/bot-inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: e164, body: draft, channel }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSendErr(String(j.error || 'Send failed'))
        return
      }
      setDraft('')
      setReload((n) => n + 1)
    } finally {
      setSending(false)
    }
  }

  const Composer = (
    <form onSubmit={onSend} className="mt-4 border-t border-neutral-200 pt-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span>Send via</span>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'whatsapp' | 'portal')}
          className="border border-neutral-200 rounded-md px-2 py-1 text-xs"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="portal">Portal note (no WA send)</option>
        </select>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Reply to the vendor..."
        rows={3}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653] resize-none"
      />
      {sendErr && <p className="text-xs text-red-600">{sendErr}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-[#cd2653] hover:bg-[#b01f45] text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {sending ? 'Sending...' : 'Send reply'}
        </button>
      </div>
    </form>
  )

  if (error) return <Card title="Messages"><p className="text-sm text-red-600">Failed: {error}</p>{Composer}</Card>
  if (!msgs) return <Card title="Messages"><p className="text-sm text-neutral-500">Loading thread...</p></Card>
  if (msgs.length === 0) return <Card title="Messages"><p className="text-sm text-neutral-500">No WhatsApp activity yet.</p>{Composer}</Card>

  return (
    <Card title={`Conversation with ${e164} (${msgs.length} messages)`}>
      <ol className="space-y-3">
        {msgs.map((m) => (
          <li key={m.id} className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
              m.direction === 'in'
                ? 'bg-white border border-neutral-200 text-neutral-900'
                : m.status === 'failed'
                  ? 'bg-red-50 border border-red-200 text-red-900'
                  : 'bg-[#cd2653] text-white'
            }`}>
              {m.template_name && (
                <div className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${m.direction === 'in' ? 'text-neutral-500' : 'text-white/80'}`}>
                  {m.template_name}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{m.body || '—'}</div>
              <div className={`text-[10px] mt-1 ${m.direction === 'in' ? 'text-neutral-500' : 'text-white/70'}`}>
                {new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                {m.status && m.status !== 'sent' ? ` · ${m.status}` : ''}
                {m.error ? ` · ${m.error}` : ''}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {Composer}
    </Card>
  )
}

function PaymentsTab({ app }: { app: any }) {
  return (
    <Card title="Payments">
      <Row k="Payment status" v={app.payment_status || '—'} />
      <Row k="Due date" v={app.payment_due_date || '—'} />
      <Row k="Reference" v={app.payment_reference || '—'} />
      <p className="text-xs text-neutral-500 mt-3">Detailed history view shipping next.</p>
    </Card>
  )
}

function ActivityTab({ app }: { app: any }) {
  const events: { at: string; what: string }[] = []
  if (app.created_at) events.push({ at: app.created_at, what: 'Application submitted' })
  if (app.reviewed_at) events.push({ at: app.reviewed_at, what: `Status set to ${app.status}` })
  if (app.contract_signed_at) events.push({ at: app.contract_signed_at, what: 'Vendor Contract 2026 signed' })
  events.sort((a, b) => +new Date(b.at) - +new Date(a.at))
  return (
    <Card title="Activity">
      {events.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing yet.</p>
      ) : (
        <ol className="space-y-3">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-2 h-2 mt-2 rounded-full bg-[#cd2653] flex-shrink-0" />
              <div>
                <div className="text-neutral-900">{e.what}</div>
                <div className="text-xs text-neutral-500">{fmtDate(e.at)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6">
      <h2 className="font-serif text-base sm:text-lg text-[#1B1A17] mb-3 sm:mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 py-1.5">
      <span className="text-xs sm:text-sm text-neutral-500 sm:w-32 sm:flex-shrink-0">{k}</span>
      <span className="text-sm text-neutral-900 break-words">{v ?? '—'}</span>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'approved' ? 'emerald' :
    status === 'rejected' ? 'red' :
    status === 'info_requested' ? 'amber' :
    'neutral'
  return <Pill tone={tone}>{status}</Pill>
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

function DocBadge({ kind }: { kind: Doc['kind'] }) {
  const label = kind === 'signed-contract' ? 'Contract' : kind === 'profile' ? 'Profile' : 'Other'
  const tone = kind === 'signed-contract' ? 'emerald' : 'neutral'
  return <Pill tone={tone as any}>{label}</Pill>
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return d }
}
function fmtSize(n: number): string {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}
function extractStall(notes: string | null | undefined): string {
  if (!notes) return '—'
  const m = String(notes).match(/⟦STALL:([^⟧]+)⟧/)
  return m ? m[1].trim() : '—'
}
