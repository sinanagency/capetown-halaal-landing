'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send, MessageSquare, Mail, Phone, Search, AlertCircle, ChevronLeft } from 'lucide-react'

interface SupportMessage {
  id: string
  from: 'vendor' | 'admin'
  body: string
  at: string
}

interface Thread {
  application_id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  wa_phone: string | null
  app_status: string | null
  messages: SupportMessage[]
  latest_at: string | null
  latest_preview: string
  last_inbound_at: string | null
  unread_count: number
}

function fmt(ts: string | null) {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setThreads(j.threads || [])
    } catch (e) {
      toast.error(`Could not load support inbox, ${e instanceof Error ? e.message : 'error'}`)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const active = useMemo(() => threads.find((t) => t.application_id === activeId) || null, [threads, activeId])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) =>
      t.business_name.toLowerCase().includes(q) ||
      (t.contact_name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      t.latest_preview.toLowerCase().includes(q)
    )
  }, [threads, search])

  async function send() {
    if (!active || !reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/${active.application_id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setReply('')
      toast.success('Reply sent')
      await load()
    } catch (e) {
      toast.error(`Send failed, ${e instanceof Error ? e.message : 'error'}`)
    } finally { setSending(false) }
  }

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0)

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Vendor Support</h1>
        {totalUnread > 0 && (
          <span className="text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
            {totalUnread} unread
          </span>
        )}
        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">live</span>
      </div>
      <p className="text-sm text-neutral-500 mb-5">Replies post into the vendor&apos;s portal Inbox.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Loading vendor messages.</div>
      ) : threads.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <MessageSquare className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-600 font-medium">No vendor messages yet.</p>
          <p className="text-sm text-neutral-400 mt-1">When a vendor uses the &quot;Ask the organisers anything&quot; inbox in their portal, the thread shows up here.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 bg-white border border-neutral-200 rounded-xl overflow-hidden min-h-[60vh]">
          {/* Thread list */}
          <div className={`border-r border-neutral-200 ${active ? 'hidden lg:flex' : 'flex'} flex-col`}>
            <div className="p-3 border-b border-neutral-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendors or messages."
                  className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#cd2653]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {filtered.map((t) => {
                const isActive = active?.application_id === t.application_id
                return (
                  <button
                    key={t.application_id}
                    onClick={() => setActiveId(t.application_id)}
                    className={`w-full text-left p-3.5 hover:bg-neutral-50 ${isActive ? 'bg-[#cd2653]/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{t.business_name}</p>
                      <span className="text-[11px] text-neutral-400 shrink-0">{fmt(t.latest_at)}</span>
                    </div>
                    <p className="text-xs text-neutral-500 line-clamp-2">{t.latest_preview || '(empty message)'}</p>
                    {t.unread_count > 0 && (
                      <span className="inline-block mt-2 text-[10px] font-bold bg-rose-500 text-white rounded-full px-1.5 py-0.5">
                        {t.unread_count} new
                      </span>
                    )}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="p-6 text-sm text-neutral-400 text-center">No threads match &quot;{search}&quot;.</p>
              )}
            </div>
          </div>

          {/* Thread view */}
          <div className={`${active ? 'flex' : 'hidden lg:flex'} flex-col min-h-[60vh]`}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
                Select a vendor to read the thread.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-neutral-200 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveId(null)} className="lg:hidden text-neutral-400 hover:text-neutral-700"><ChevronLeft className="w-4 h-4" /></button>
                      <p className="font-bold text-neutral-900 truncate">{active.business_name}</p>
                      {active.app_status && (
                        <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {active.app_status}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-500">
                      {active.contact_name && <span>{active.contact_name}</span>}
                      {active.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {active.email}</span>}
                      {active.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {active.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-neutral-50">
                  {active.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.from === 'admin' ? 'bg-[#cd2653] text-white' : 'bg-white text-neutral-900 border border-neutral-200'}`}>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${m.from === 'admin' ? 'text-white/70' : 'text-neutral-400'}`}>
                          {m.from === 'admin' ? 'You' : active.business_name} · {new Date(m.at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); send() }}
                  className="border-t border-neutral-200 p-3 flex items-end gap-2 bg-white"
                >
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() } }}
                    rows={2}
                    placeholder="Reply to the vendor. Cmd+Enter to send."
                    className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#cd2653] resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="bg-[#cd2653] hover:bg-[#b01f45] text-white rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </form>
                <p className="px-4 pb-3 text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Vendor sees this in their portal Inbox. WhatsApp/email notification not wired yet.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
