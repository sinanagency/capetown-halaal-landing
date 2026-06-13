'use client'

/**
 * TemplatePicker — single composer drop-in.
 *
 * Renders a dropdown of Meta WA templates + mail templates, scoped by the
 * active channel. When the operator picks one, the picker shows the schema'd
 * param inputs and a live preview. Two actions:
 *   - "Insert" fills the parent composer's textarea (text mode).
 *   - "Send as template" stages a structured template send (template mode).
 *
 * The parent owns the textarea state + send action; this component only emits
 * intents through props. Keeps the composer flexible for bulk-mode reuse.
 */

import { useMemo, useState } from 'react'
import { ChevronDown, FileText, MessageSquare, Send, Sparkles, X } from 'lucide-react'
import {
  WA_META_TEMPLATES,
  buildWaTemplateParams,
  findWaTemplate,
  renderWaTemplatePreview,
  type WaTemplateSpec,
} from '@/lib/templates/wa-meta'
import {
  MAIL_TEMPLATES,
  findMailTemplate,
  renderMailTemplate,
  validateMailTemplate,
  type MailTemplateSpec,
} from '@/lib/mail/templates'

export type TemplateChannel = 'wa' | 'mail'

export interface StagedTemplate {
  channel: TemplateChannel
  template_key: string
  params: Record<string, string>
  // The rendered text the operator saw; for audit + optimistic UI.
  preview: string
  // Mail only: subject.
  subject?: string
}

interface Props {
  channel: TemplateChannel
  // When the operator hits "Insert", we drop the rendered text into the parent
  // composer textarea. Subject (mail only) is passed separately.
  onInsert: (args: { body: string; subject?: string }) => void
  // When the operator hits "Send as template", we hand the structured payload
  // to the parent. The parent fires the reply endpoint.
  onSendAsTemplate: (staged: StagedTemplate) => void
  // Compact mode: render as a chip-trigger only, popover overlay. Used inside
  // a tight composer footer.
  compact?: boolean
}

export function TemplatePicker({ channel, onInsert, onSendAsTemplate, compact = true }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [params, setParams] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const templates = useMemo<Array<WaTemplateSpec | MailTemplateSpec>>(
    () => (channel === 'wa' ? WA_META_TEMPLATES : MAIL_TEMPLATES),
    [channel]
  )

  const selected = useMemo(() => {
    if (!selectedKey) return null
    return channel === 'wa' ? findWaTemplate(selectedKey) : findMailTemplate(selectedKey)
  }, [channel, selectedKey])

  const rendered = useMemo(() => {
    if (!selected) return null
    if (channel === 'wa') {
      return {
        body: renderWaTemplatePreview(selected as WaTemplateSpec, params),
        subject: undefined as string | undefined,
      }
    }
    const out = renderMailTemplate(selected as MailTemplateSpec, params)
    return { body: out.body, subject: out.subject }
  }, [selected, params, channel])

  function pick(k: string) {
    setSelectedKey(k)
    setParams({})
    setError(null)
  }

  function close() {
    setOpen(false)
    setSelectedKey(null)
    setParams({})
    setError(null)
  }

  function handleInsert() {
    if (!selected || !rendered) return
    if (channel === 'mail') {
      const v = validateMailTemplate(selected as MailTemplateSpec, params)
      if (!v.ok) {
        setError(v.error)
        return
      }
    } else {
      const v = buildWaTemplateParams(selected as WaTemplateSpec, params)
      if (!v.ok) {
        setError(v.error)
        return
      }
    }
    onInsert({ body: rendered.body, subject: rendered.subject })
    close()
  }

  function handleSendAsTemplate() {
    if (!selected || !rendered) return
    if (channel === 'wa') {
      const v = buildWaTemplateParams(selected as WaTemplateSpec, params)
      if (!v.ok) {
        setError(v.error)
        return
      }
    } else {
      const v = validateMailTemplate(selected as MailTemplateSpec, params)
      if (!v.ok) {
        setError(v.error)
        return
      }
    }
    onSendAsTemplate({
      channel,
      template_key: selected.key,
      params: { ...params },
      preview: rendered.body,
      subject: rendered.subject,
    })
    close()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors'
            : 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50'
        }
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Templates
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 z-30 w-[420px] bg-white border border-neutral-200 rounded-lg shadow-xl"
          role="menu"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
            <span className="text-xs font-semibold text-neutral-700">
              {channel === 'wa' ? 'WhatsApp templates' : 'Mail templates'}
            </span>
            <button
              type="button"
              onClick={close}
              className="text-neutral-400 hover:text-neutral-700"
              aria-label="Close template picker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {!selected ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {templates.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => pick(t.key)}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-start gap-2"
                  >
                    {channel === 'wa' ? (
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900">{t.label}</div>
                      <div className="text-[11px] text-neutral-500">{t.description}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 space-y-3">
              <div>
                <div className="text-xs font-semibold text-neutral-900">{selected.label}</div>
                <div className="text-[11px] text-neutral-500">{selected.description}</div>
              </div>

              {selected.params.length > 0 && (
                <div className="space-y-2">
                  {selected.params.map((p) => (
                    <label key={p.key} className="block">
                      <span className="text-[11px] font-medium text-neutral-700">
                        {p.label}
                        {p.required && <span className="text-[#cd2653]">*</span>}
                      </span>
                      <input
                        type="text"
                        value={params[p.key] ?? ''}
                        onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                        placeholder={p.placeholder}
                        className="mt-0.5 w-full px-2 py-1.5 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-[#cd2653]/40"
                      />
                    </label>
                  ))}
                </div>
              )}

              {rendered && (
                <div className="bg-neutral-50 border border-neutral-100 rounded p-2">
                  {channel === 'mail' && rendered.subject && (
                    <div className="text-[10px] text-neutral-500 mb-1">
                      <span className="font-semibold">Subject:</span> {rendered.subject}
                    </div>
                  )}
                  <pre className="text-[11px] text-neutral-700 whitespace-pre-wrap font-sans">
                    {rendered.body}
                  </pre>
                </div>
              )}

              {error && <p className="text-[11px] text-red-600">{error}</p>}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 border border-neutral-200 rounded hover:bg-neutral-50"
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={handleSendAsTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-[#cd2653] rounded hover:bg-[#b71f48]"
                  >
                    <Send className="w-3 h-3" />
                    Send as template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
