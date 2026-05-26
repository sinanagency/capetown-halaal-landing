'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/exhibitor/set-password`,
    })
    // Always show success (don't leak which emails exist)
    setSent(true); setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="md" showText /></div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-7">
          {sent ? (
            <div className="text-center">
              <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-5 h-5" /></div>
              <h2 className="text-xl font-bold text-neutral-900">Check your inbox</h2>
              <p className="text-neutral-500 text-sm mt-2">If an exhibitor account exists for <b>{email}</b>, a reset link is on its way. It expires in 1 hour.</p>
              <a href="/exhibitor/login" className="inline-block mt-5 text-sm font-semibold text-[#cd2653]">← Back to sign in</a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-neutral-900">Reset password</h2>
              <p className="text-neutral-500 text-sm mt-1 mb-5">Enter your email and we will send a reset link.</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.za"
                    className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-3 text-sm outline-none focus:border-[#cd2653] focus:ring-2 focus:ring-[#cd2653]/20" />
                </div>
                <button disabled={loading}
                  className="w-full bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-lg py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}{loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <a href="/exhibitor/login" className="inline-block mt-4 text-sm text-neutral-500 hover:text-[#cd2653]">← Back to sign in</a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
