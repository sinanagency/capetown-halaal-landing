'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload, Plus, Trash2, Check, Globe, Instagram, Facebook } from 'lucide-react'

interface Menu { name: string; price?: string; desc?: string }
interface Profile {
  business_name: string; tagline: string; description: string
  website: string; instagram: string; facebook: string
  menu: Menu[]; logo_url: string | null
}

export default function ProfileEditor({ initial }: { initial: Profile }) {
  const [p, setP] = useState<Profile>(initial)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  function set<K extends keyof Profile>(k: K, v: Profile[K]) { setP((prev) => ({ ...prev, [k]: v })) }
  function setMenu(i: number, k: keyof Menu, v: string) {
    setP((prev) => ({ ...prev, menu: prev.menu.map((m, j) => j === i ? { ...m, [k]: v } : m) }))
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/exhibitor/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagline: p.tagline, description: p.description, website: p.website, instagram: p.instagram, facebook: p.facebook, menu: p.menu }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setSavedAt(Date.now())
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') } finally { setSaving(false) }
  }

  async function uploadLogo(file: File) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData(); fd.append('logo', file)
      const res = await fetch('/api/exhibitor/profile', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Upload failed')
      set('logo_url', j.logo_url)
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') } finally { setUploading(false) }
  }

  const field = 'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#cd2653]'

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* logo + identity */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <p className="font-semibold text-neutral-900 mb-4">Your listing</p>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
            {p.logo_url ? <img src={p.logo_url} alt="logo" className="w-full h-full object-cover" /> : <span className="text-neutral-400 text-xs text-center px-2">No logo</span>}
          </div>
          <div>
            <input ref={logoInput} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
            <button onClick={() => logoInput.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border border-neutral-200 hover:border-[#cd2653] hover:text-[#cd2653] disabled:opacity-60">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload logo
            </button>
            <p className="text-xs text-neutral-400 mt-1.5">Shown in the public vendor directory. PNG/JPG, square works best.</p>
          </div>
        </div>
        <label className="text-xs font-semibold text-neutral-600">Tagline</label>
        <input value={p.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Authentic Cape Malay street food" className={`${field} mt-1 mb-3`} maxLength={120} />
        <label className="text-xs font-semibold text-neutral-600">About your business</label>
        <textarea value={p.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="A short description shown to festival-goers" className={`${field} mt-1`} maxLength={1000} />
      </div>

      {/* socials */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 grid sm:grid-cols-3 gap-3">
        <div><label className="text-xs font-semibold text-neutral-600 flex items-center gap-1"><Globe className="w-3 h-3" /> Website</label><input value={p.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" className={`${field} mt-1`} /></div>
        <div><label className="text-xs font-semibold text-neutral-600 flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</label><input value={p.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@handle" className={`${field} mt-1`} /></div>
        <div><label className="text-xs font-semibold text-neutral-600 flex items-center gap-1"><Facebook className="w-3 h-3" /> Facebook</label><input value={p.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="facebook.com/…" className={`${field} mt-1`} /></div>
      </div>

      {/* menu */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-neutral-900">Menu / products</p>
          <button onClick={() => set('menu', [...p.menu, { name: '', price: '', desc: '' }])} className="flex items-center gap-1 text-sm font-medium text-[#cd2653]"><Plus className="w-4 h-4" /> Add item</button>
        </div>
        {p.menu.length === 0 ? <p className="text-sm text-neutral-500">No items yet. Add what you'll be selling.</p> : (
          <div className="space-y-2">
            {p.menu.map((m, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_0.6fr_1.6fr_auto] gap-2 items-center">
                <input value={m.name} onChange={(e) => setMenu(i, 'name', e.target.value)} placeholder="Item" className={field} />
                <input value={m.price || ''} onChange={(e) => setMenu(i, 'price', e.target.value)} placeholder="R50" className={field} />
                <input value={m.desc || ''} onChange={(e) => setMenu(i, 'desc', e.target.value)} placeholder="Short description" className={field} />
                <button onClick={() => set('menu', p.menu.filter((_, j) => j !== i))} className="text-neutral-400 hover:text-red-600 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save profile
        </button>
        {savedAt && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  )
}
