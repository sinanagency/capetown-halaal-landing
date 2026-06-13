'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'

export default function InboxComposer() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/exhibitor/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(String(j.error || 'Could not send'))
        return
      }
      setText('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-[#E5DCC4] pt-3 flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply to the organisers..."
        rows={2}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653] resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="bg-[#cd2653] hover:bg-[#b01f45] text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>
    </form>
  )
}
