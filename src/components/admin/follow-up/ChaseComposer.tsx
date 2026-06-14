'use client'

/**
 * ChaseComposer — modal that follows the Follow-up workbench row "Chase"
 * button. Two side-by-side panes (Email | WhatsApp), template picker shared
 * between them, free-text mode, "Send both" action.
 *
 * Sends through /api/admin/chase. Logs to mail_messages + vendor_application_events
 * for surfacing in the unified timeline.
 */

import { useState, useMemo } from 'react'
import { X, Mail, MessageCircle, Send, Loader2 } from 'lucide-react'
import {
  TEMPLATE_KEYS, TEMPLATE_LABELS, renderMailTemplatePreview, findMailTemplate,
  type TemplateKey, type TemplateVars,
} from '@/lib/mail/templates'
import { renderTemplate as interpolate } from '@/lib/interpolate'

export interface ChaseRecipient {
  id?: string
  email?: string | null
  phone?: string | null
  name?: string | null
  business_name?: string | null
  stall?: string | null
}

interface Props {
  recipients: ChaseRecipient[]
  onClose: () => void
  initialTemplate?: TemplateKey
  initialChannel?: 'mail' | 'wa' | 'both'
}

export function ChaseComposer({ recipients, onClose, initialTemplate, initialChannel = 'both' }: Props) {
  const [mode, setMode] = useState<'template' | 'free'>(initialTemplate ? 'template' : 'free')
  const [templateKey, setTemplateKey] = useState<TemplateKey>(initialTemplate || 'doc_chase')
  const [customMessage, setCustomMessage] = useState('')
  const [emailEnabled, setEmailEnabled] = useState(initialChannel !== 'wa')
  const [waEnabled, setWaEnabled] = useState(initialChannel !== 'mail')
  const [emailSubject, setEmailSubject] = useState('A note from Young at Heart Festival')
  const [emailBody, setEmailBody] = useState('')
  const [waBody, setWaBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Live preview using the first recipient as the merge sample.
  const sample = recipients[0]
  const previewVars: TemplateVars = useMemo(() => ({
    first_name: sample?.name?.trim().split(/\s+/)[0] || null,
    business_name: sample?.business_name || null,
    stall_code: sample?.stall || null,
    custom_message: customMessage || undefined,
  }), [sample, customMessage])

  const templatePreview = useMemo(() => {
    if (mode !== 'template') return { subject: '', body: '' }
    const spec = findMailTemplate(templateKey)
    if (!spec) return { subject: '', body: '' }
    return renderMailTemplatePreview(spec, previewVars)
  }, [mode, templateKey, previewVars])

  async function send() {
    if (!emailEnabled && !waEnabled) return
    setBusy(true)
    setResult(null)
    try {
      const channel = emailEnabled && waEnabled ? 'both' : emailEnabled ? 'mail' : 'wa'
      const payload: Record<string, unknown> = {
        recipients: recipients.map((r) => ({
          id: r.id,
          email: r.email,
          phone: r.phone,
          name: r.name,
          business_name: r.business_name,
          stall: r.stall,
        })),
        channel,
      }
      if (mode === 'template') {
        payload.template_key = templateKey
        if (customMessage) payload.custom_vars = { custom_message: customMessage }
      } else {
        if (emailEnabled) {
          payload.email_subject = emailSubject
          payload.email_body = emailBody
        }
        if (waEnabled) payload.wa_body = waBody
      }
      const r = await fetch('/api/admin/chase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setResult({ ok: false, msg: j.error || `HTTP ${r.status}` })
      } else {
        const m = `Sent. Mail ${j.mail?.sent || 0}/${j.mail?.attempted || 0}, WhatsApp ${j.wa?.sent || 0}/${j.wa?.attempted || 0}.`
        setResult({ ok: true, msg: m })
      }
    } catch (e) {
      setResult({ ok: false, msg: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const mailable = recipients.filter((r) => r.email).length
  const waable = recipients.filter((r) => r.phone).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg text-[#1B1A17]">
              Chase {recipients.length === 1 ? recipients[0]?.business_name || recipients[0]?.name || '1 contact' : `${recipients.length} contacts`}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {mailable} reachable by email, {waable} by WhatsApp.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-100 flex-wrap">
          <div className="inline-flex border border-neutral-200 rounded-md overflow-hidden">
            <button onClick={() => setMode('template')} className={`px-3 py-1.5 text-xs font-medium ${mode === 'template' ? 'bg-[#cd2653] text-white' : 'bg-white text-neutral-700'}`}>Template</button>
            <button onClick={() => setMode('free')} className={`px-3 py-1.5 text-xs font-medium ${mode === 'free' ? 'bg-[#cd2653] text-white' : 'bg-white text-neutral-700'}`}>Free text</button>
          </div>
          {mode === 'template' && (
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value as TemplateKey)} className="border border-neutral-200 rounded-md px-2 py-1 text-sm">
              {TEMPLATE_KEYS.map((k) => <option key={k} value={k}>{TEMPLATE_LABELS[k]}</option>)}
            </select>
          )}
          <label className="text-xs text-neutral-600 inline-flex items-center gap-1">
            <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
            Email
          </label>
          <label className="text-xs text-neutral-600 inline-flex items-center gap-1">
            <input type="checkbox" checked={waEnabled} onChange={(e) => setWaEnabled(e.target.checked)} />
            WhatsApp
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto flex-1">
          {/* Email pane */}
          <section className={`p-5 border-b md:border-b-0 md:border-r border-neutral-100 ${emailEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-blue-600" /> Email
            </h3>
            {mode === 'template' ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-neutral-500">Subject preview</p>
                <p className="text-sm font-medium text-neutral-900 break-words">{templatePreview.subject || '—'}</p>
                <p className="text-xs text-neutral-500 mt-3">Body preview (first recipient)</p>
                <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-sans bg-neutral-50 rounded-md p-3 border border-neutral-100 max-h-72 overflow-y-auto">{templatePreview.body || '—'}</pre>
                <label className="block text-xs font-medium text-neutral-600 mt-2">Extra paragraph (optional)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  placeholder="Optional extra line that flows into {{custom_message}}."
                  className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm resize-y"
                />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-neutral-600">Subject</label>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm" />
                <label className="block text-xs font-medium text-neutral-600">Body</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10}
                  placeholder={'Hi {{first_name}},\n\n...'}
                  className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm font-mono resize-y" />
                <p className="text-xs text-neutral-400">First recipient preview: {sample ? interpolate(emailBody, previewVars as Record<string, string | number | null | undefined>).slice(0, 200) || '—' : '—'}</p>
              </div>
            )}
          </section>

          {/* WhatsApp pane */}
          <section className={`p-5 ${waEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
            </h3>
            {mode === 'template' ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-neutral-500">Sends through the same approved template, with the body merge tag from the email side.</p>
                <p className="text-xs text-neutral-400">Template: {templateKey}</p>
                {customMessage && (
                  <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-sans bg-neutral-50 rounded-md p-3 border border-neutral-100 max-h-72 overflow-y-auto">{customMessage}</pre>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-neutral-600">Body (general_announcement template)</label>
                <textarea value={waBody} onChange={(e) => setWaBody(e.target.value)} rows={10}
                  placeholder={'Hi {{first_name}}, ...'}
                  className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm font-mono resize-y" />
                <p className="text-xs text-neutral-400">First recipient preview: {sample ? interpolate(waBody, previewVars as Record<string, string | number | null | undefined>).slice(0, 200) || '—' : '—'}</p>
              </div>
            )}
          </section>
        </div>

        {result && (
          <div className={`px-5 py-2 text-sm border-t border-neutral-100 ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            {result.msg}
          </div>
        )}

        <footer className="px-5 py-3 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-sm text-neutral-600 hover:underline">Close</button>
          <button
            onClick={send}
            disabled={busy || (!emailEnabled && !waEnabled)}
            className="inline-flex items-center gap-1.5 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send {emailEnabled && waEnabled ? 'both' : emailEnabled ? 'email' : 'WhatsApp'}
          </button>
        </footer>
      </div>
    </div>
  )
}
