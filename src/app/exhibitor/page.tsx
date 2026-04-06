'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Logo } from '@/components/logo'
import {
  Building2, MapPin, CreditCard, Calendar, Settings, LogOut,
  ExternalLink, AlertCircle, Loader2, CheckCircle, Clock, User, Phone, Globe, Mail
} from 'lucide-react'

interface VendorProfile {
  id: string
  email: string
  business_name: string
  contact_name: string
  phone: string | null
  sector: string | null
  business_description: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
}

interface BoothBooking {
  id: string
  booth_tier: string
  booth_size: string | null
  booth_number: string | null
  price_paid: number | null
  payment_status: string
  created_at: string
}

export default function ExhibitorPortal() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<BoothBooking[]>([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<VendorProfile>>({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'booking'>('overview')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profileData } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setEditForm(profileData)
    }

    const { data: bookingData } = await supabase
      .from('booth_bookings')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })

    if (bookingData) setBookings(bookingData)
    setLoading(false)
  }

  async function handleSaveProfile() {
    if (!profile) return
    setSaving(true)
    await supabase
      .from('vendor_profiles')
      .update({
        business_name: editForm.business_name,
        contact_name: editForm.contact_name,
        phone: editForm.phone,
        business_description: editForm.business_description,
        website: editForm.website,
        instagram: editForm.instagram,
        facebook: editForm.facebook,
      })
      .eq('id', profile.id)

    setProfile({ ...profile, ...editForm } as VendorProfile)
    setEditing(false)
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#cd2653]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-neutral-600 mb-4">Please complete your registration first.</p>
          <a href="/register" className="inline-block px-6 py-3 bg-[#cd2653] text-white rounded-lg">Register</a>
        </div>
      </div>
    )
  }

  const statusColor = (s: string) => {
    if (s === 'paid') return 'bg-green-100 text-green-700'
    if (s === 'pending') return 'bg-amber-100 text-amber-700'
    if (s === 'cancelled' || s === 'refunded') return 'bg-red-100 text-red-700'
    return 'bg-neutral-100 text-neutral-700'
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/"><Logo size="md" showText={true} /></a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 hidden sm:block">{profile.email}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Welcome, {profile.contact_name}</h1>
            <p className="text-neutral-600">{profile.business_name} — Exhibitor Portal</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-neutral-100 rounded-lg p-1 w-fit">
            {[
              { key: 'overview', label: 'Overview', icon: Building2 },
              { key: 'booking', label: 'My Booth', icon: MapPin },
              { key: 'profile', label: 'Profile', icon: Settings },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#cd2653]/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#cd2653]" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Booth Status</p>
                      <p className="font-bold text-neutral-900">{bookings.length > 0 ? 'Booked' : 'No Booth Yet'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Payment</p>
                      <p className="font-bold text-neutral-900">
                        {bookings.length > 0 ? bookings[0].payment_status.charAt(0).toUpperCase() + bookings[0].payment_status.slice(1) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Event</p>
                      <p className="font-bold text-neutral-900">Dec 11-13, 2026</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="font-semibold text-neutral-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bookings.length === 0 && (
                    <a href="https://tickets.youngatheart.co.za/vendor-checkout/" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 border border-[#cd2653] bg-[#cd2653]/5 rounded-lg hover:bg-[#cd2653]/10 transition-colors">
                      <MapPin className="w-5 h-5 text-[#cd2653]" />
                      <div>
                        <p className="font-medium text-neutral-900">Select & Pay for Booth</p>
                        <p className="text-xs text-neutral-500">Choose your booth tier and complete payment</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-neutral-400 ml-auto" />
                    </a>
                  )}
                  <button onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-left">
                    <Settings className="w-5 h-5 text-neutral-600" />
                    <div>
                      <p className="font-medium text-neutral-900">Update Profile</p>
                      <p className="text-xs text-neutral-500">Edit your business details</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Event Info */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="font-semibold text-neutral-900 mb-4">Event Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#cd2653] mt-0.5" />
                    <div>
                      <p className="font-medium">December 11-13, 2026</p>
                      <p className="text-neutral-500">3-day event</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#cd2653] mt-0.5" />
                    <div>
                      <p className="font-medium">Youngsfield Military Base</p>
                      <p className="text-neutral-500">Cape Town, South Africa</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#cd2653] mt-0.5" />
                    <div>
                      <p className="font-medium">Setup: 6:00 AM Day 1</p>
                      <p className="text-neutral-500">Premium/Corner/Island get early access</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#cd2653] mt-0.5" />
                    <div>
                      <p className="font-medium">support@youngatheart.co.za</p>
                      <p className="text-neutral-500">For any questions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Tab */}
          {activeTab === 'booking' && (
            <div className="space-y-6">
              {bookings.length === 0 ? (
                <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
                  <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-neutral-900 mb-2">No Booth Booked Yet</h2>
                  <p className="text-neutral-600 mb-6">Select your booth tier and complete payment to secure your spot.</p>
                  <a href="https://tickets.youngatheart.co.za/vendor-checkout/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#cd2653] text-white font-medium rounded-lg hover:bg-[#b82049] transition-colors">
                    Select & Pay for Booth <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                bookings.map(booking => (
                  <div key={booking.id} className="bg-white rounded-xl border border-neutral-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-neutral-900">{booking.booth_tier} Booth</h2>
                        <p className="text-sm text-neutral-500">{booking.booth_size || 'Size TBC'} {booking.booth_number ? `— Booth ${booking.booth_number}` : ''}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(booking.payment_status)}`}>
                        {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                      </span>
                    </div>
                    {booking.price_paid && (
                      <p className="text-2xl font-bold text-[#cd2653] mb-4">R{Number(booking.price_paid).toLocaleString()}</p>
                    )}
                    <div className="text-sm text-neutral-500">
                      Booked: {new Date(booking.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-neutral-900">Business Profile</h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="text-sm text-[#cd2653] font-medium hover:underline">Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(false); setEditForm(profile) }} className="text-sm text-neutral-500 hover:underline">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving}
                      className="text-sm bg-[#cd2653] text-white px-4 py-1.5 rounded-lg hover:bg-[#b82049] disabled:opacity-50 flex items-center gap-1">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Save
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Business Name', key: 'business_name', icon: Building2 },
                  { label: 'Contact Name', key: 'contact_name', icon: User },
                  { label: 'Email', key: 'email', icon: Mail, disabled: true },
                  { label: 'Phone', key: 'phone', icon: Phone },
                  { label: 'Sector', key: 'sector', icon: Building2, disabled: true },
                  { label: 'Website', key: 'website', icon: Globe },
                  { label: 'Instagram', key: 'instagram', icon: Globe },
                ].map(field => (
                  <div key={field.key} className="flex items-center gap-4">
                    <field.icon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500">{field.label}</label>
                      {editing && !field.disabled ? (
                        <input
                          value={(editForm as Record<string, string>)[field.key] || ''}
                          onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                        />
                      ) : (
                        <p className="text-sm font-medium text-neutral-900">{String((profile as unknown as Record<string, string | null>)[field.key] || '—')}</p>
                      )}
                    </div>
                  </div>
                ))}

                {editing && (
                  <div className="pt-2">
                    <label className="text-xs text-neutral-500">Business Description</label>
                    <textarea
                      value={editForm.business_description || ''}
                      onChange={e => setEditForm(f => ({ ...f, business_description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none mt-1"
                      placeholder="Describe your business"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
