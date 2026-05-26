'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function SetPassword() {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [accept, setAccept] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setError('Passwords do not match.'); return }
    if (!accept) { setError('Please accept the exhibitor terms to continue.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: e1 } = await supabase.auth.updateUser({
      password: pw,
      data: { must_change_password: false, terms_accepted_at: new Date().toISOString() },
    })
    if (e1) { setError(e1.message); setLoading(false); return }
    router.push('/exhibitor/portal'); router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="md" showText /></div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-7">
          <div className="w-11 h-11 rounded-xl bg-[#cd2653]/10 text-[#cd2653] flex items-center justify-center mb-4"><Lock className="w-5 h-5" /></div>
          <h2 className="text-xl font-bold text-neutral-900">Set your password</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-5">Choose a password you will use to sign in from now on.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password"
              className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-[#cd2653] focus:ring-2 focus:ring-[#cd2653]/20" />
            <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm password"
              className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-[#cd2653] focus:ring-2 focus:ring-[#cd2653]/20" />
            <label className="flex items-start gap-2 text-xs text-neutral-600 py-1">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 accent-[#cd2653]" />
              I accept the exhibitor terms and the festival rules for Young at Heart 2026.
            </label>
            <button disabled={loading}
              className="w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{loading ? 'Saving…' : 'Save & enter portal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
