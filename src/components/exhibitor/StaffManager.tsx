'use client'

import { useState } from 'react'
import { UserPlus, Loader2, Trash2, IdCard, Car, Users, Ticket, Printer, AlertTriangle } from 'lucide-react'
import type { StaffMember } from '@/lib/portal-state'

export default function StaffManager({
  initial, allowance, businessName, stall,
}: { initial: StaffMember[]; allowance: number; businessName: string; stall: string | null }) {
  const [staff, setStaff] = useState<StaffMember[]>(initial)
  const [form, setForm] = useState({ name: '', id_number: '', vehicle_reg: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const used = staff.length
  const over = used > allowance

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
    const html = `<!doctype html><html><head><title>Gate list — ${esc(businessName)}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1416;padding:40px;max-width:760px;margin:auto}
        h1{font-size:22px;margin:0 0 2px} .sub{color:#6b7280;font-size:13px;margin:0 0 20px}
        .meta{display:flex;gap:28px;margin:0 0 22px;font-size:13px}
        .meta b{display:block;color:#6b7280;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
        table{width:100%;border-collapse:collapse;font-size:13px} th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #eee}
        th{background:#faf7f8;color:#6b7280;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
        .note{margin-top:18px;font-size:11px;color:#9ca3af}
      </style></head><body>
      <h1>Gate access list</h1>
      <p class="sub">Young at Heart Festival 2026 · Youngsfield Military Base · 11–13 December 2026</p>
      <div class="meta">
        <div><b>Business</b>${esc(businessName)}</div>
        <div><b>Stall</b>${esc(stall || 'TBC')}</div>
        <div><b>Pass allowance</b>${allowance}</div>
        <div><b>Registered</b>${used}</div>
      </div>
      <table><thead><tr><th>#</th><th>Name</th><th>ID number</th><th>Vehicle reg</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="color:#9ca3af">No team members added yet</td></tr>'}</tbody></table>
      <p class="note">Present this list at the gate. Final gate passes are confirmed by the organisers based on your stall allowance.</p>
      </body></html>`
    const w = window.open('', '_blank', 'width=820,height=900')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 350)
  }

  return (
    <div className="space-y-6">
      {/* pass allowance banner */}
      <div className={`rounded-2xl p-5 border flex items-center justify-between gap-4 flex-wrap ${over ? 'bg-amber-50 border-amber-200' : 'bg-[#1a1416] border-[#1a1416] text-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${over ? 'bg-amber-100 text-amber-600' : 'bg-white/10 text-[#ff7a9c]'}`}><Ticket className="w-5 h-5" /></div>
          <div>
            <p className={`text-sm ${over ? 'text-amber-800' : 'text-white/60'}`}>Gate passes for this stall</p>
            <p className={`text-xl font-bold ${over ? 'text-amber-900' : 'text-white'}`}>{used} of {allowance} used</p>
          </div>
        </div>
        <button onClick={printList} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${over ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-white text-[#1a1416] hover:bg-white/90'}`}>
          <Printer className="w-4 h-4" /> Print gate list
        </button>
      </div>
      {over && (
        <div className="flex items-start gap-2 text-sm text-amber-700 -mt-2 px-1">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          You've registered more people than your {allowance}-pass allowance. The organisers confirm final passes based on your stall.
        </div>
      )}

      {/* add form */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <p className="font-semibold text-neutral-900 mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#cd2653]" /> Add a team member</p>
        <p className="text-xs text-neutral-500 mb-4">These names go on the Youngsfield gate manifest. ID number and vehicle registration speed up entry.</p>
        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <form onSubmit={add} className="grid sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]" />
          <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder="ID number"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]" />
          <input value={form.vehicle_reg} onChange={(e) => setForm({ ...form, vehicle_reg: e.target.value })} placeholder="Vehicle reg"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]" />
          <button disabled={busy} className="bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add
          </button>
        </form>
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

      <p className="text-xs text-neutral-400 px-1">Gate passes (QR) are issued through the ticketing system closer to the festival. Your allowance is set by the organisers based on your stall.</p>
    </div>
  )
}

function esc(s: string) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
