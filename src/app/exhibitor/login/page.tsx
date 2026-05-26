'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react'

export default function ExhibitorLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authError) { setError(authError.message); setLoading(false); return }
    // Forced password change on first login
    if (data.user?.user_metadata?.must_change_password) {
      router.push('/exhibitor/set-password'); router.refresh(); return
    }
    router.push('/exhibitor/portal'); router.refresh()
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* editorial left rail */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#1a1416] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15]" style={{ background: 'radial-gradient(60% 50% at 20% 0%, #cd2653 0%, transparent 60%), radial-gradient(50% 50% at 100% 100%, #cd2653 0%, transparent 55%)' }} />
        <Logo size="md" showText className="relative" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-[#cd2653] font-semibold mb-4">Exhibitor Portal</p>
          <h1 className="font-serif text-4xl leading-tight">Everything you need to run your stall, in one place.</h1>
          <p className="text-white/60 mt-4 max-w-sm text-sm leading-relaxed">Your stand, payments, documents, staff passes and festival updates. 11–13 December 2026, Youngsfield Military Base.</p>
        </div>
        <p className="relative text-white/40 text-xs">Young at Heart Festival · Cape Town Halaal</p>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo size="md" showText /></div>
          <h2 className="text-2xl font-bold text-neutral-900">Exhibitor sign in</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Use the email and temporary password from your approval email.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-600">Email</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-3 text-sm outline-none focus:border-[#cd2653] focus:ring-2 focus:ring-[#cd2653]/20"
                  placeholder="you@business.co.za" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600">Password</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-3 text-sm outline-none focus:border-[#cd2653] focus:ring-2 focus:ring-[#cd2653]/20"
                  placeholder="••••••••" />
              </div>
            </div>
            <button disabled={loading}
              className="w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}{loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4 text-sm">
            <a href="/exhibitor/forgot" className="text-neutral-500 hover:text-[#cd2653]">Forgot password?</a>
            <a href="/exhibitor" className="text-neutral-500 hover:text-[#cd2653]">Find my stall →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
