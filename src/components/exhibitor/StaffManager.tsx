'use client'

import { useState } from 'react'
import { UserPlus, Loader2, Trash2, Phone, Car, Users, Ticket, Printer, QrCode, AlertTriangle, ExternalLink } from 'lucide-react'
import type { StaffMember } from '@/lib/portal-state'

const TICKETS_URL = 'https://tickets.youngatheart.co.za'

export default function StaffManager({
  initial, allowance, businessName, stall,
}: { initial: StaffMember[]; allowance: number; businessName: string; stall: string | null }) {
  const [staff, setStaff] = useState<StaffMember[]>(initial)
  const [form, setForm] = useState({ name: '', phone: '', vehicle_reg: '' })
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
      setStaff(j.staff); setForm({ name: '', phone: '', vehicle_reg: '' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  async function remove(id: string) {
    const prev = staff
    setStaff((s) => s.filter((m) => m.id !== id))
    const res = await fetch(`/api/exhibitor/staff?id=${id}`, { method: 'DELETE' })
    if (!res.ok) setStaff(prev)
  }

  function printList() {
    const rows = staff.map((m, i) => `<tr><td class="n">${i + 1}</td><td class="nm">${esc(m.name)}</td><td>${esc(m.phone || m.id_number) || ','}</td><td>${esc(m.vehicle_reg) || ','}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Gate list, ${esc(cleanBiz)}</title>${PRINT_HEAD}
<style>
@page{size:A4;margin:18mm 16mm}
body{font-family:'Inter',-apple-system,sans-serif;color:#1a1416;margin:0}
.sheet{max-width:720px;margin:0 auto}
.lh{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:2px solid #cd2653}
.lh img{width:46px;height:46px;object-fit:contain}
.lh .ttl{font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;letter-spacing:-.01em;line-height:1.05;color:#1a1416}
.lh .eb{font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#cd2653;margin-bottom:3px}
.sub{color:#8a8a8a;font-size:12px;margin:14px 0 18px}
.meta{display:flex;gap:34px;margin:0 0 20px}
.meta b{display:block;color:#9ca3af;font-weight:600;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
.meta span{font-size:15px;font-weight:600;color:#1a1416}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:#cd2653;color:#fff;text-align:left;padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
thead th:first-child{border-radius:8px 0 0 8px}thead th:last-child{border-radius:0 8px 8px 0}
tbody td{padding:11px 12px;border-bottom:1px solid #efe7ea}
tbody tr:nth-child(even){background:#faf6f7}
td.n{color:#b9b9b9;width:28px}td.nm{font-weight:600}
.note{margin-top:20px;font-size:10.5px;color:#9ca3af;line-height:1.6}
</style></head><body><div class="sheet">
  <div class="lh"><img src="${LOGO}" alt=""><div><div class="eb">Exhibitor Gate Access</div><div class="ttl">Young at Heart Festival 2026</div></div></div>
  <p class="sub">Youngsfield Military Base, Cape Town · 11–13 December 2026</p>
  <div class="meta"><div><b>Business</b><span>${esc(cleanBiz)}</span></div><div><b>Stall</b><span>${esc(stall || 'TBC')}</span></div><div><b>Pass allowance</b><span>${allowance}</span></div><div><b>Registered</b><span>${used}</span></div></div>
  <table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Vehicle registration</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="color:#9ca3af;padding:16px 12px">No team members added yet</td></tr>'}</tbody></table>
  <p class="note">Present this list at the gate. Final gate passes are confirmed by the organisers based on your stall package.</p>
</div>${PRINT_TRIGGER}</body></html>`
    openPrint(html)
  }

  async function printBadges() {
    if (!staff.length) return
    setBadging(true)
    try {
      const QR = (await import('qrcode')).default
      const cards = await Promise.all(staff.map(async (m) => {
        const payload = `YHF2026|${stall || 'NA'}|${m.id}|${m.name}`
        const qr = await QR.toDataURL(payload, { margin: 0, width: 320 })
        return `<div class="badge">
          <div class="bh"><img src="${LOGO}" alt=""><div><div class="bh-t">Young at Heart Festival</div><div class="bh-y">2026 · Exhibitor Pass</div></div></div>
          <div class="bname">${esc(m.name)}</div>
          <div class="bbiz">${esc(cleanBiz)} · Stall ${esc(stall || 'TBC')}</div>
          <img src="${qr}" class="qr" alt="gate QR"/>
          <div class="bmeta">${m.phone ? esc(m.phone) : (m.id_number ? 'ID ' + esc(m.id_number) : '&nbsp;')}${m.vehicle_reg ? ' &nbsp;·&nbsp; ' + esc(m.vehicle_reg) : ''}</div>
          <div class="bfoot">Scan at the gate · 11–13 Dec 2026 · Youngsfield</div>
        </div>`
      }))
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Staff badges, ${esc(cleanBiz)}</title>${PRINT_HEAD}
<style>
@page{size:A4;margin:12mm}
body{font-family:'Inter',-apple-system,sans-serif;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:12mm;align-content:start}
.badge{border:1.5px solid #cd2653;border-radius:16px;padding:22px 18px 16px;text-align:center;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center}
.bh{display:flex;align-items:center;gap:9px;width:100%;justify-content:center;border-bottom:1px solid #f0e3e7;padding-bottom:12px;margin-bottom:14px}
.bh img{width:34px;height:34px;object-fit:contain}
.bh-t{font-family:'Fraunces',Georgia,serif;font-size:14px;font-weight:600;color:#1a1416;line-height:1}
.bh-y{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#cd2653;margin-top:3px}
.bname{font-family:'Fraunces',Georgia,serif;font-size:23px;font-weight:600;color:#1a1416;line-height:1.1;letter-spacing:-.01em}
.bbiz{font-size:11.5px;color:#8a8a8a;margin:4px 0 14px}
.qr{width:150px;height:150px;border:1px solid #f0e3e7;border-radius:10px;padding:6px}
.bmeta{font-size:11px;color:#555;margin-top:12px;font-weight:500}
.bfoot{font-size:9px;color:#b3b3b3;margin-top:10px;letter-spacing:.02em}
</style></head><body>${cards.join('')}${PRINT_TRIGGER}</body></html>`
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
            You&apos;ve used all {allowance} of your included gate passes. Need more people on site?
          </p>
          <a href={TICKETS_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-4 py-2 text-sm whitespace-nowrap">
            Buy extra passes <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* add form */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <p className="font-semibold text-neutral-900 mb-1 flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#cd2653]" /> Add a team member</p>
        <p className="text-xs text-neutral-500 mb-4">These names go on the Youngsfield gate manifest. A contact phone number and vehicle registration speed up entry.</p>
        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <form onSubmit={add} className="grid sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
          <input required disabled={atLimit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50 disabled:text-neutral-400" />
          <input type="tel" disabled={atLimit} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number"
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
                    {(m.phone || m.id_number) && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone || m.id_number}</span>}
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

const LOGO = 'https://cthalaal.co.za/logo.png'
const PRINT_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`
// Self-print once fonts + the logo image have loaded (data-URL QR codes are instant).
const PRINT_TRIGGER = `<script>(function(){function go(){setTimeout(function(){window.focus();window.print();},400)}if(document.readyState==='complete'){go()}else{window.addEventListener('load',go)}})();</script>`

function openPrint(html: string) {
  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus()
  // the document self-triggers print on load (PRINT_TRIGGER) so fonts/logo are ready
}

function esc(s: string) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
