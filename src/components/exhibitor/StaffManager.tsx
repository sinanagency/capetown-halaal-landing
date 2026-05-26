'use client'

import { useState } from 'react'
import { UserPlus, Loader2, Trash2, IdCard, Car, Users, Ticket, Printer, QrCode, AlertTriangle, ExternalLink } from 'lucide-react'
import type { StaffMember } from '@/lib/portal-state'

const TICKETS_URL = 'https://tickets.youngatheart.co.za'

export default function StaffManager({
  initial, allowance, businessName, stall,
}: { initial: StaffMember[]; allowance: number; businessName: string; stall: string | null }) {
  const [staff, setStaff] = useState<StaffMember[]>(initial)
  const [form, setForm] = useState({ name: '', id_number: '', vehicle_reg: '' })
  const [busy, setBusy] = useState(false)
  const [badging, setBadging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const used = staff.length
  const atLimit = used >= allowance
  const over = used > allowance
  const cleanBiz = businessName.replace(/^DEMO\s*·?\s*/i, '')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/exhibitor/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not add')
      setStaff(j.staff); setForm({ name: '', id_number: '', vehicle_reg: '' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  async function remove(id: string) {
    const prev = staff
    setStaff((s) => s.filter((m) => m.id !== id))
    const res = await fetch(`/api/exhibitor/staff?id=${id}`, { method: 'DELETE' })
    if (!res.ok) setStaff(prev)
  }

  function printList() {
    const rows = staff.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.name)}</td><td>${esc(m.id_number) || '—'}</td><td>${esc(m.vehicle_reg) || '—'}</td></tr>`).join('')
    const html = `<!doctype html><html><head><title>Gate list — ${esc(cleanBiz)}</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1416;padding:40px;max-width:760px;margin:auto}
      h1{font-size:22px;margin:0 0 2px}.sub{color:#6b7280;font-size:13px;margin:0 0 20px}
      .meta{display:flex;gap:28px;margin:0 0 22px;font-size:13px}.meta b{display:block;color:#6b7280;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
      table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #eee}
      th{background:#faf7f8;color:#6b7280;text-transform:uppercase;font-size:10px;letter-spacing:.05em}.note{margin-top:18px;font-size:11px;color:#9ca3af}</style></head><body>
      <h1>Gate access list</h1><p class="sub">Young at Heart Festival 2026 · Youngsfield Military Base · 11–13 December 2026</p>
      <div class="meta"><div><b>Business</b>${esc(cleanBiz)}</div><div><b>Stall</b>${esc(stall || 'TBC')}</div><div><b>Pass allowance</b>${allowance}</div><div><b>Registered</b>${used}</div></div>
      <table><thead><tr><th>#</th><th>Name</th><th>ID number</th><th>Vehicle reg</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="color:#9ca3af">No team members yet</td></tr>'}</tbody></table>
      <p class="note">Present this list at the gate. Final gate passes are confirmed by the organisers based on your stall allowance.</p></body></html>`
    openPrint(html)
  }

  async function printBadges() {
    if (!staff.length) return
    setBadging(true)
    try {
      const QR = (await import('qrcode')).default
      const cards = await Promise.all(staff.map(async (m) => {
        const payload = `YHF2026|${stall || 'NA'}|${m.id}|${m.name}`
        const qr = await QR.toDataURL(payload, { margin: 1, width: 240 })
        return `<div class="badge">
          <div class="bhead">YOUNG AT HEART 2026 · EXHIBITOR PASS</div>
          <div class="bname">${esc(m.name)}</div>
          <div class="bbiz">${esc(cleanBiz)}</div>
          <img src="${qr}" class="qr" alt="QR"/>
          <div class="bmeta">Stall ${esc(stall || 'TBC')}${m.id_number ? ' · ID ' + esc(m.id_number) : ''}</div>
          ${m.vehicle_reg ? `<div class="bveh">Vehicle ${esc(m.vehicle_reg)}</div>` : ''}
        </div>`
      }))
      const html = `<!doctype html><html><head><title>Staff badges — ${esc(cleanBiz)}</title><style>
        @page{margin:10mm} body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:14px;display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .badge{border:2px solid #cd2653;border-radius:16px;padding:20px;text-align:center;break-inside:avoid}
        .bhead{font-size:9px;letter-spacing:.14em;color:#cd2653;font-weight:800}
        .bname{font-size:19px;font-weight:800;margin-top:12px;color:#1a1416}
        .bbiz{font-size:12px;color:#6b7280;margin-bottom:10px}
        .qr{width:160px;height:160px}
        .bmeta{font-size:11px;color:#6b7280;margin-top:8px}.bveh{font-size:11px;color:#9ca3af;margin-top:2px}</style></head><body>${cards.join('')}</body></html>`
      openPrint(html)
    } finally { setBadging(false) }
  }

  return (
    <div className="space-y-6">
      {/* pass allowance banner */}
      <div className={`rounded-2xl p-5 border ${over ? 'bg-amber-50 border-amber-200' : 'bg-[#1a1416] border-[#1a1416] text-white'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${over ? 'bg-amber-100 text-amber-600' : 'bg-white/10 text-[#ff7a9c]'}`}><Ticket className="w-5 h-5" /></div>
            <div>
              <p className={`text-sm ${over ? 'text-amber-800' : 'text-white/60'}`}>Gate passes for this stall</p>
              <p className={`text-xl font-bold ${over ? 'text-amber-900' : 'text-white'}`}>{used} of {allowance} used</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printBadges} disabled={badging || !staff.length}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50 ${over ? 'bg-white text-amber-700 border border-amber-300' : 'bg-white/10 text-white hover:bg-white/15'}`}>
              {badging ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />} Print badges
            </button>
            <button onClick={printList} className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold ${over ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-white text-[#1a1416] hover:bg-white/90'}`}>
              <Printer className="w-4 h-4" /> Gate list
            </button>
          </div>
        </div>
      </div>

      {atLimit && (
        <div className={`rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap ${over ? 'bg-amber-50 border-amber-200' : 'bg-[#cd2653]/5 border-[#cd2653]/20'}`}>
          <p className={`text-sm flex items-start gap-2 ${over ? 'text-amber-800' : 'text-neutral-700'}`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#cd2653]" />
            You've used all {allowance} of your included gate passes. Need more people on site?
          </p>
          <a href={TICKETS_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-4 py-2 text-sm whitespace-nowrap">
            Buy extra passes <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* add form */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <p className="font-semibold text-neutral-900 mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#cd2653]" /> Add a team member</p>
        <p className="text-xs text-neutral-500 mb-4">These names go on the Youngsfield gate manifest. ID number and vehicle registration speed up entry.</p>
        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <form onSubmit={add} className="grid sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
          <input required disabled={atLimit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50 disabled:text-neutral-400" />
          <input disabled={atLimit} value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder="ID number"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50" />
          <input disabled={atLimit} value={form.vehicle_reg} onChange={(e) => setForm({ ...form, vehicle_reg: e.target.value })} placeholder="Vehicle reg"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50" />
          <button disabled={busy || atLimit} className="bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add
          </button>
        </form>
        {atLimit && <p className="text-xs text-neutral-400 mt-2">Remove a member to swap, or buy extra passes above to add more.</p>}
      </div>

      {/* team list */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-neutral-900 flex items-center gap-2"><Users className="w-4 h-4 text-[#cd2653]" /> Your team</p>
          <span className="text-sm text-neutral-500">{used} registered</span>
        </div>
        {staff.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center">No team members yet. Add the people who will run your stall.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {staff.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{m.name}</p>
                  <p className="text-xs text-neutral-500 flex items-center gap-3 mt-0.5">
                    {m.id_number && <span className="flex items-center gap-1"><IdCard className="w-3 h-3" />{m.id_number}</span>}
                    {m.vehicle_reg && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{m.vehicle_reg}</span>}
                  </p>
                </div>
                <button onClick={() => remove(m.id)} className="text-neutral-400 hover:text-red-600 p-1.5" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-neutral-400 px-1">Badges carry a scannable QR for the gate. Your pass allowance is set by the organisers based on your stall package; extra passes can be bought on the tickets page.</p>
    </div>
  )
}

function openPrint(html: string) {
  const w = window.open('', '_blank', 'width=860,height=920')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus()
  setTimeout(() => w.print(), 400)
}

function esc(s: string) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
