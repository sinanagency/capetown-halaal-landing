'use client'

// Force runtime SSR — page imports @supabase/ssr; deploy unblock 2026-06-13.
// Also: createBrowserClient call below uses || '' fallback instead of ! to
// avoid throwing at prerender time when env vars aren't scoped to this branch.
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, CheckCircle, AlertCircle, Building2 } from 'lucide-react'
import { Logo } from '@/components/logo'

const SECTORS = [
  'Food & Beverage', 'Fashion & Modest Wear', 'Beauty & Wellness', 'Health & Pharmacy',
  'Travel & Tourism', 'Home & Living', 'Finance & Services', 'Business & Trade', 'Other',
]

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', password: '', confirm_password: '',
    business_name: '', contact_name: '', phone: '', sector: '',
  })
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      setState('error')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      setState('error')
      return
    }

    // Defer client creation until submit — @supabase/ssr throws on empty
    // URL/key during prerender when env vars aren't scoped to this preview.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setState('error')
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('vendor_profiles').insert({
        id: data.user.id,
        email: form.email,
        business_name: form.business_name,
        contact_name: form.contact_name,
        phone: form.phone,
        sector: form.sector,
      })

      if (profileError) {
        setError('Account created but profile setup failed. Please contact support.')
        setState('error')
        return
      }
    }

    setState('success')
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Account Created</h1>
          <p className="text-neutral-600 mb-6">Check your email to verify your account, then log in to access your exhibitor portal.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-[#cd2653] text-white font-medium rounded-lg hover:bg-[#b82049] transition-colors">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/"><Logo size="md" showText={true} /></Link>
          <Link href="/login" className="text-sm text-[#cd2653] font-medium hover:underline">Already have an account? Log in</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <Building2 className="w-12 h-12 text-[#cd2653] mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Exhibitor Registration</h1>
            <p className="text-neutral-600">Create your account to apply for a booth at Young at Heart Festival 2026</p>
          </div>

          {state === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
              <h2 className="font-semibold text-neutral-900">Business Details</h2>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Business Name *</label>
                <input type="text" required value={form.business_name} onChange={e => setForm(f => ({...f, business_name: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="Your Business Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Name *</label>
                <input type="text" required value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="Your Full Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="+27 12 345 6789" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Sector *</label>
                <select required value={form.sector} onChange={e => setForm(f => ({...f, sector: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent bg-white">
                  <option value="">Select your sector</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
              <h2 className="font-semibold text-neutral-900">Account Details</h2>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="you@business.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Password *</label>
                <input type="password" required value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm Password *</label>
                <input type="password" required value={form.confirm_password} onChange={e => setForm(f => ({...f, confirm_password: e.target.value}))}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="Repeat password" />
              </div>
            </div>

            <button type="submit" disabled={state === 'loading'}
              className="w-full py-4 bg-[#cd2653] text-white font-semibold rounded-lg hover:bg-[#b82049] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {state === 'loading' ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</> : 'Create Exhibitor Account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
