'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  UserPlus, Loader2, Trash2, Phone, Car, Users, Ticket, Printer, AlertTriangle,
  ExternalLink, FileDown, MessageSquare, BadgeCheck,
} from 'lucide-react'
import type { StaffMember } from '@/lib/portal-state'
import { STAFF_ROLES } from '@/lib/portal-state'

const TICKETS_URL = 'https://tickets.youngatheart.co.za'

export default function StaffManager({
  initial, allowance, businessName, stall,
}: { initial: StaffMember[]; allowance: number; businessName: string; stall: string | null }) {
  const [staff, setStaff] = useState<StaffMember[]>(initial)
  const [form, setForm] = useState<{ name: string; phone: string; vehicle_reg: string; role: string }>(
    { name: '', phone: '', vehicle_reg: '', role: 'staff' },
  )
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState<string | null>(null)
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
      setStaff(j.staff); setForm({ name: '', phone: '', vehicle_reg: '', role: 'staff' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Revoke this badge? The ticket will be cancelled at the gate.')) return
    const prev = staff
    setStaff((s) => s.filter((m) => m.id !== id))
    const res = await fetch(`/api/exhibitor/staff?id=${id}`, { method: 'DELETE' })
    if (!res.ok) setStaff(prev)
  }

  async function resend(member: StaffMember) {
    if (!member.wc_order_id) return
    setResending(member.id)
    try {
      const res = await fetch('/api/exhibitor/staff/resend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: member.id }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Could not resend right now. Try again in a moment.')
      } else {
        alert('Badge resent. Check WhatsApp.')
      }
    } finally { setResending(null) }
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
            <Link
              href="/exhibitor/portal/staff/print"
              prefetch={false}
              target="_blank"
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
                staff.length === 0
                  ? 'pointer-events-none opacity-50 bg-white/10 text-white'
                  : over ? 'bg-white text-amber-700 border border-amber-300'
                  : 'bg-white text-[#1a1416] hover:bg-white/90'
              }`}
              aria-disabled={staff.length === 0}
            >
              <Printer className="w-4 h-4" /> Print all badges
            </Link>
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
        <p className="text-xs text-neutral-500 mb-4">A badge ticket is generated for each person. We send the PDF to your WhatsApp once the badge is ready.</p>
        {error && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <form onSubmit={add} className="grid sm:grid-cols-[1.4fr_1fr_1fr_auto_auto] gap-2">
          <input required disabled={atLimit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50 disabled:text-neutral-400" />
          <input type="tel" disabled={atLimit} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (+27..)"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50" />
          <input disabled={atLimit} value={form.vehicle_reg} onChange={(e) => setForm({ ...form, vehicle_reg: e.target.value })} placeholder="Vehicle reg"
            className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50" />
          <select disabled={atLimit} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border border-neutral-200 px-2 py-2.5 text-sm outline-none focus:border-[#cd2653] disabled:bg-neutral-50 capitalize">
            {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
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
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-neutral-900">{m.name}</p>
                    <RolePill role={m.role} />
                    {m.fooevents_ticket_id ? (
                      <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <BadgeCheck className="w-3 h-3" /> Badge ready
                      </span>
                    ) : m.wc_order_id ? (
                      <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                        Generating
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-neutral-500 flex items-center gap-3 mt-0.5 flex-wrap">
                    {(m.phone || m.id_number) && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone || m.id_number}</span>}
                    {m.vehicle_reg && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{m.vehicle_reg}</span>}
                    {stall && <span className="text-neutral-400">Stall {stall}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.ticket_pdf_url && (
                    <a
                      href={m.ticket_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:border-[#cd2653] hover:text-[#cd2653]"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Badge PDF
                    </a>
                  )}
                  {m.wc_order_id && (
                    <button
                      onClick={() => resend(m)}
                      disabled={resending === m.id}
                      className="text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50"
                    >
                      {resending === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />} Resend WA
                    </button>
                  )}
                  <button onClick={() => remove(m.id)} className="text-neutral-400 hover:text-red-600 p-1.5" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-neutral-400 px-1">
        Badges are FooEvents tickets generated by the festival. Each one carries a signed QR for the gate. We never mint QR codes in the browser.
      </p>
    </div>
  )
}

function RolePill({ role }: { role?: string }) {
  if (!role) return null
  const tone = role === 'owner' ? 'bg-[#cd2653]/10 text-[#cd2653] border-[#cd2653]/30'
    : role === 'manager' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : role === 'driver' ? 'bg-sky-50 text-sky-700 border-sky-200'
    : 'bg-neutral-100 text-neutral-700 border-neutral-200'
  return <span className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full border capitalize ${tone}`}>{role}</span>
}
