'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import type { SupportMessage } from '@/lib/portal-state'

export default function SupportThread({ initial }: { initial: SupportMessage[] }) {
  const [messages, setMessages] = useState<SupportMessage[]>(initial)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [alsoEmail, setAlsoEmail] = useState(true)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/exhibitor/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, also_email: alsoEmail }),
      })
      const j = await res.json()
      if (res.ok) { setMessages(j.messages); setText('') }
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">No messages yet. Ask us anything about your booking, payments, load-in or the festival.</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'vendor' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${m.from === 'vendor' ? 'bg-[#cd2653] text-white' : 'bg-neutral-100 text-neutral-900'}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`text-[10px] mt-1 ${m.from === 'vendor' ? 'text-white/60' : 'text-neutral-400'}`}>
                {m.from === 'vendor' ? 'You' : 'Organisers'} · {new Date(m.at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="border-t border-neutral-200">
        <label className="flex items-center gap-2 px-3 pt-3 pb-1 text-[12px] text-neutral-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={alsoEmail}
            onChange={(e) => setAlsoEmail(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-[#cd2653] focus:ring-[#cd2653]"
          />
          <span>Also send a copy by email to support@youngatheart.co.za (recommended).</span>
        </label>
        <div className="p-3 flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]" />
          <button disabled={busy} className="bg-[#cd2653] hover:bg-[#b01f45] text-white rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  )
}
