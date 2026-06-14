'use client'

/**
 * VendorBulkComposer — modal that opens from the Vendors list "Message
 * selected" action. Two send modes:
 *   - Template: pick a template_key from src/lib/mail/templates.ts and the
 *     /api/admin/chase route renders it per recipient (interpolated).
 *   - Free text: type a single body, merge tags expanded server-side.
 *
 * Sends across both channels by default; the operator can flip channel.
 */

import { useState } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'
import { TEMPLATE_KEYS, TEMPLATE_LABELS, type TemplateKey } from '@/lib/mail/templates'

interface Recipient {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  stall: string | null
}

interface Props {
  recipients: Recipient[]
  onClose: () => void
}

export function VendorBulkComposer({ recipients, onClose }: Props) {
  const [mode, setMode] = useState<'template' | 'free'>('template')
  const [channel, setChannel] = useState<'mail' | 'wa' | 'both'>('both')
  const [templateKey, setTemplateKey] = useState<TemplateKey>('general_announcement')
  const [customMessage, setCustomMessage] = useState('')
  const [emailSubject, setEmailSubject] = useState('A note from Young at Heart Festival')
  const [emailBody, setEmailBody] = useState('')
  const [waBody, setWaBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const mailable = recipients.filter((r) => r.email).length
  const waable = recipients.filter((r) => r.phone).length

  async function send() {
    setBusy(true)
    setResult(null)
    try {
      const payload: Record<string, unknown> = {
        recipients: recipients.map((r) => ({
          id: r.id,
          email: r.email,
          phone: r.phone,
          name: r.contact_name,
          business_name: r.business_name,
          stall: r.stall,
        })),
        channel,
      }
      if (mode === 'template') {
        payload.template_key = templateKey
        if (customMessage) payload.custom_vars = { custom_message: customMessage }
      } else {
        payload.email_subject = emailSubject
        payload.email_body = emailBody
        payload.wa_body = waBody
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg text-[#1B1A17]">Message {recipients.length} vendors</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {mailable} with email, {waable} with phone. Merge tags fill per recipient.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">Mode:</label>
            <div className="inline-flex border border-neutral-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('template')}
                className={`px-3 py-1.5 text-xs font-medium ${mode === 'template' ? 'bg-[#cd2653] text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'}`}
              >
                <Sparkles className="w-3 h-3 inline mr-1" /> Template
              </button>
              <button
                type="button"
                onClick={() => setMode('free')}
                className={`px-3 py-1.5 text-xs font-medium ${mode === 'free' ? 'bg-[#cd2653] text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'}`}
              >
                Free text
              </button>
            </div>

            <span className="text-neutral-300">·</span>
            <label className="text-xs text-neutral-500">Channel:</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as 'mail' | 'wa' | 'both')}
              className="border border-neutral-200 rounded-md px-2 py-1 text-sm">
              <option value="both">Both</option>
              <option value="mail">Email only</option>
              <option value="wa">WhatsApp only</option>
            </select>
          </div>

          {mode === 'template' ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-600">Template</label>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
                className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm"
              >
                {TEMPLATE_KEYS.map((k) => (
                  <option key={k} value={k}>{TEMPLATE_LABELS[k]}</option>
                ))}
              </select>
              <label className="block text-xs font-medium text-neutral-600 mt-2">
                Extra paragraph (optional, fills {`{{custom_message}}`})
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                placeholder="An optional extra line that gets merged into the template."
                className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm resize-y"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {(channel === 'mail' || channel === 'both') && (
                <>
                  <label className="block text-xs font-medium text-neutral-600">Email subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm"
                  />
                  <label className="block text-xs font-medium text-neutral-600">Email body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={6}
                    placeholder={'Hi {{first_name}},\n\nMessage body...'}
                    className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm font-mono resize-y"
                  />
                </>
              )}
              {(channel === 'wa' || channel === 'both') && (
                <>
                  <label className="block text-xs font-medium text-neutral-600 mt-2">WhatsApp body (general_announcement template)</label>
                  <textarea
                    value={waBody}
                    onChange={(e) => setWaBody(e.target.value)}
                    rows={4}
                    placeholder={'Hi {{first_name}}, ...'}
                    className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm font-mono resize-y"
                  />
                </>
              )}
              <p className="text-xs text-neutral-400">
                Merge tags supported: first_name, business_name, stall_code. Em-dashes stripped before send.
              </p>
            </div>
          )}

          {result && (
            <div className={`text-sm rounded-md px-3 py-2 ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {result.msg}
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-sm text-neutral-600 hover:underline">Close</button>
          <button
            onClick={send}
            disabled={busy || recipients.length === 0}
            className="inline-flex items-center gap-1.5 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {busy ? 'Sending...' : `Send to ${recipients.length}`}
          </button>
        </footer>
      </div>
    </div>
  )
}
