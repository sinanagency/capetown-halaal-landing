'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Megaphone, Users, Ticket, Globe, Sparkles, Loader2, Send, CheckCircle2 } from 'lucide-react'

type Audience = 'vendors' | 'attendees' | 'all'

const AUDIENCES: { key: Audience; label: string; desc: string; icon: typeof Users }[] = [
  { key: 'vendors', label: 'Vendors', desc: 'Everyone who applied for a stall', icon: Users },
  { key: 'attendees', label: 'Attendees', desc: 'Ticket buyers', icon: Ticket },
  { key: 'all', label: 'Everyone', desc: 'Vendors + attendees', icon: Globe },
]

interface SendResult {
  total: number; sent: number; skipped: number; failed: number
  skipReasons?: Record<string, number>
}

export default function BroadcastPage() {
  const [audience, setAudience] = useState<Audience>('vendors')
  const [message, setMessage] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [polishing, setPolishing] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    fetch('/api/admin/whatsapp-broadcast?counts=1')
      .then((r) => r.json())
      .then((d) => setCounts(d.counts || {}))
      .catch(() => {})
  }, [])

  async function polish() {
    if (!message.trim()) return
    setPolishing(true)
    try {
      const res = await fetch('/api/admin/polish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
      const d = await res.json()
      if (d.text) setMessage(d.text)
      else throw new Error(d.error || 'no text')
    } catch (e) {
      toast.error(`Polish failed: ${e instanceof Error ? e.message : 'error'}`)
    } finally { setPolishing(false) }
  }

  async function send(test?: boolean) {
    if (!message.trim()) { toast.error('Write a message first'); return }
    if (test && !testPhone.trim()) { toast.error('Enter a phone number for the test'); return }
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/admin/whatsapp-broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test ? { test: testPhone, message } : { audience, message }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Send failed')
      if (test) {
        toast.success(d.sent ? 'Test sent — check your WhatsApp' : `Not sent: ${Object.keys(d.skipReasons || {})[0] || 'blocked'}`)
      } else {
        setResult(d)
        setConfirm(false)
        toast.success(`Broadcast done — ${d.sent} sent`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed')
    } finally { setSending(false) }
  }

  const reach = counts[audience] ?? null
  const total = counts[`${audience}_total`] ?? null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2.5 mb-1">
        <Megaphone className="w-5 h-5 text-[#cd2653]" />
        <h1 className="text-2xl font-bold text-neutral-900">WhatsApp Broadcast</h1>
      </div>
      <p className="text-sm text-neutral-500 mb-7">
        Send a WhatsApp update to vendors, attendees, or everyone. Only people who opted in receive it; anyone who replied STOP is skipped automatically.
      </p>

      {/* Audience */}
      <p className="text-sm font-semibold text-neutral-900 mb-2">1. Who gets it?</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {AUDIENCES.map((a) => {
          const active = audience === a.key
          const c = counts[a.key]
          return (
            <button key={a.key} onClick={() => setAudience(a.key)}
              className={`text-left rounded-xl border p-4 transition-colors ${active ? 'border-[#cd2653] bg-[#cd2653]/5' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
              <a.icon className={`w-5 h-5 mb-2 ${active ? 'text-[#cd2653]' : 'text-neutral-400'}`} />
              <p className="font-semibold text-sm text-neutral-900">{a.label}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{a.desc}</p>
              <p className="text-xs font-semibold text-[#cd2653] mt-2">
                {c === undefined ? '…' : `${c} reachable`}
              </p>
            </button>
          )
        })}
      </div>

      {/* Message */}
      <p className="text-sm font-semibold text-neutral-900 mb-2">2. Your message</p>
      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={600}
          rows={5}
          placeholder="e.g. Early-bird weekend passes are now on sale — R60 for all 3 days! Grab yours before they're gone."
          className="w-full rounded-xl border border-neutral-200 p-4 pr-28 text-sm text-neutral-800 focus:outline-none focus:border-[#cd2653] resize-none"
        />
        <button onClick={polish} disabled={polishing || !message.trim()}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-[#cd2653] to-[#7c1d3a] text-white rounded-lg px-2.5 py-1.5 hover:opacity-90 disabled:opacity-50">
          {polishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {polishing ? 'Polishing…' : 'Polish'}
        </button>
      </div>
      <p className="text-xs text-neutral-400 mt-1 mb-5">{message.length}/600</p>

      {/* Preview */}
      <p className="text-sm font-semibold text-neutral-900 mb-2">3. Preview (how it lands)</p>
      <div className="rounded-xl bg-[#e7f3e8] border border-[#cde6cf] p-4 mb-6">
        <div className="bg-white rounded-lg rounded-tl-none p-3 text-sm text-neutral-800 shadow-sm whitespace-pre-wrap leading-relaxed">
          {`Hi there! 🎉 An update from the Young at Heart Festival:\n\n${message || '[your message]'}\n\nGet your tickets at tickets.youngatheart.co.za\n\nReply STOP to opt out of these updates.`}
        </div>
      </div>

      {/* Test send */}
      <div className="flex items-center gap-2 mb-6">
        <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
          placeholder="Test to my number e.g. +2768…"
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-[#cd2653]" />
        <button onClick={() => send(true)} disabled={sending}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50">
          Send test
        </button>
      </div>

      {/* Send */}
      {!confirm ? (
        <button onClick={() => setConfirm(true)} disabled={!message.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-xl py-3.5 text-sm disabled:opacity-50">
          <Send className="w-4 h-4" /> Send to {AUDIENCES.find((a) => a.key === audience)?.label}
          {reach !== null && ` (${reach})`}
        </button>
      ) : (
        <div className="rounded-xl border border-[#cd2653] bg-[#cd2653]/5 p-4">
          <p className="text-sm font-semibold text-neutral-900 mb-1">
            Send to {reach ?? '…'} {audience === 'all' ? 'people' : audience}?
          </p>
          <p className="text-xs text-neutral-500 mb-3">
            {total !== null && reach !== null && total > reach
              ? `${total - reach} more are in this group but haven't opted in / replied STOP — they'll be skipped.`
              : 'This sends a real WhatsApp message now.'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => send(false)} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Yes, send now'}
            </button>
            <button onClick={() => setConfirm(false)} disabled={sending}
              className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-neutral-900">Broadcast complete</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-2xl font-bold text-green-600">{result.sent}</p><p className="text-xs text-neutral-500">Sent</p></div>
            <div><p className="text-2xl font-bold text-neutral-400">{result.skipped}</p><p className="text-xs text-neutral-500">Skipped</p></div>
            <div><p className="text-2xl font-bold text-red-500">{result.failed}</p><p className="text-xs text-neutral-500">Failed</p></div>
          </div>
          {result.skipReasons && Object.keys(result.skipReasons).length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 space-y-1">
              {Object.entries(result.skipReasons).map(([r, n]) => <p key={r}>{n} skipped: {r}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
