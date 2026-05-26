'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileCheck, Upload, Loader2, ExternalLink, CheckCircle2, Clock, XCircle } from 'lucide-react'

export interface DocView {
  type: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  uploaded_at: string
  url: string | null
  note?: string
}

const REQUIRED = [
  { type: 'halaal_cert', label: 'Halaal certificate', required: true, hint: 'Mandatory for all food & ingestible vendors' },
  { type: 'public_liability', label: 'Public liability insurance', required: true, hint: 'Cover for your stall during the festival' },
  { type: 'health_permit', label: 'Health / food permit', required: true, hint: 'City of Cape Town food trading permit' },
  { type: 'electrical_coc', label: 'Electrical CoC', required: false, hint: 'If you bring your own electrical equipment' },
]

const STATUS: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle2 },
  pending: { label: 'In review', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
}

export default function DocumentsManager({ docs }: { docs: DocView[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const byType = Object.fromEntries(docs.map((d) => [d.type, d]))

  async function upload(docType: string, file: File) {
    setError(null); setBusy(docType)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('doc_type', docType)
      const res = await fetch('/api/exhibitor/documents', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Upload failed')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {REQUIRED.map((r) => {
        const doc = byType[r.type]
        const st = doc ? STATUS[doc.status] : null
        return (
          <div key={r.type} className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center shrink-0"><FileCheck className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-neutral-900">{r.label}</p>
                {r.required && <span className="text-[10px] uppercase tracking-wide font-semibold text-[#cd2653]">required</span>}
                {st && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>
                    <st.Icon className="w-3 h-3" />{st.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{r.hint}</p>
              {doc && (
                <p className="text-xs text-neutral-600 mt-2 flex items-center gap-2">
                  <span className="truncate">{doc.name}</span>
                  {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#cd2653] font-medium shrink-0">view <ExternalLink className="w-3 h-3" /></a>}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <input ref={(el) => { inputs.current[r.type] = el }} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(r.type, f) }} />
              <button onClick={() => inputs.current[r.type]?.click()} disabled={busy === r.type}
                className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-neutral-200 hover:border-[#cd2653] hover:text-[#cd2653] disabled:opacity-60 transition-colors">
                {busy === r.type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {doc ? 'Replace' : 'Upload'}
              </button>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-neutral-400 px-1">PDF, JPG or PNG, up to 10MB. Documents are reviewed by the organisers before show day.</p>
    </div>
  )
}
