'use client'

import { useState } from 'react'
import { UserPlus, Loader2, Trash2, IdCard, Car, Users } from 'lucide-react'
import type { StaffMember } from '@/lib/portal-state'

export default function StaffManager({ initial }: { initial: StaffMember[] }) {
  const [staff, setStaff] = useState<StaffMember[]>(initial)
  const [form, setForm] = useState({ name: '', id_number: '', vehicle_reg: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
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

      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-neutral-900 flex items-center gap-2"><Users className="w-4 h-4 text-[#cd2653]" /> Your team</p>
          <span className="text-sm text-neutral-500">{staff.length} registered</span>
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

      <p className="text-xs text-neutral-400 px-1">Gate passes (QR) are issued through the ticketing system closer to the festival. Your number of passes is confirmed by the organisers based on your stall.</p>
    </div>
  )
}
