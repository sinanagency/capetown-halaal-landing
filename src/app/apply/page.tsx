'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Upload, Building2, User, ShoppingBag, Zap, FileText } from 'lucide-react'
import { Logo } from '@/components/logo'

const ITEM_CATEGORIES = [
  'Food & Beverage',
  'Fashion & Modest Wear',
  'Beauty & Wellness',
  'Health & Pharmacy',
  'Travel & Tourism',
  'Home & Living',
  'Finance & Services',
  'Business & Trade',
  'Other',
]

const STALL_OPTIONS = [
  { value: 'marquee-table-2x2', label: 'MARQUEE Table Space — 2m x 2m', price: 3700, bands: 2 },
  { value: 'marquee-full-3x3', label: 'MARQUEE Full Space — 3m x 3m', price: 6500, bands: 3 },
  { value: 'marquee-table-double-4x2', label: 'MARQUEE Table Space Double — 4m x 2m', price: 6500, bands: 4 },
  { value: 'marquee-full-double-6x3', label: 'MARQUEE Full Space Double — 6m x 3m', price: 12000, bands: 6 },
  { value: 'outdoor-bedouin-2x3', label: 'OUTDOOR Bedouin Tent Space — 2m x 3m', price: 3750, bands: 2 },
  { value: 'food-gazebo-3x3', label: 'Food Stall (GAZEBO ONLY) — 3m x 3m', price: 4800, bands: 3 },
  { value: 'mini-dessert-truck-3.5m', label: 'Mini Dessert Truck (MAX 3.5m)', price: 5000, bands: 3 },
  { value: 'food-truck-4.5m', label: 'Food Truck/Space (MAX 4.5m)', price: 6500, bands: 4 },
  { value: 'food-truck-6m', label: 'Food Truck/Space (MAX 6m)', price: 7500, bands: 5 },
  { value: 'food-truck-8m', label: 'Food Truck/Space (MAX 8m)', price: 8500, bands: 6 },
  { value: 'advertising', label: 'Advertising (Price depends on proposal)', price: 0, bands: 0 },
]

const ELECTRICAL_OPTIONS = [
  { value: 'none', label: 'None', price: 0 },
  { value: 'charger-lighting', label: 'Charger/Lighting', price: 400 },
  { value: 'microwave', label: 'Microwave', price: 400 },
  { value: 'urn', label: 'Urn', price: 500 },
  { value: 'single-fryer', label: 'Single Fryer', price: 500 },
  { value: 'double-fryer', label: 'Double Fryer', price: 800 },
  { value: 'waffle-pancake-maker', label: 'Waffle/Pancake Maker', price: 500 },
  { value: 'blender', label: 'Blender', price: 400 },
  { value: 'coffee-machine', label: 'Coffee Machine', price: 750 },
  { value: 'electric-stove', label: 'Electric Stove', price: 750 },
  { value: 'small-display-fridge', label: 'Small Display Fridge', price: 400 },
  { value: 'large-display-fridge-freezer', label: 'Large Display Fridge/Freezer', price: 600 },
]

const STEPS = [
  { id: 1, title: 'Business Info', icon: Building2 },
  { id: 2, title: 'Stall Selection', icon: ShoppingBag },
  { id: 3, title: 'Requirements', icon: Zap },
  { id: 4, title: 'Documents & Terms', icon: FileText },
]

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ApplyPage() {
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState<FormState>('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    // Step 1: Business Info
    email: '',
    item_category: '',
    stall_brand_name: '',
    business_description: '',
    traded_before: '',
    contact_person: '',
    whatsapp_number: '',
    social_media_links: '',
    // Step 2: Stall Selection
    stall_type: '',
    // Step 3: Requirements
    hired_chairs: '0',
    hired_tables: '0',
    electrical_appliances: [] as string[],
    appliance_details: '',
    uses_gas: '',
    // Step 4: Documents & Terms
    accepts_cancellation: false,
    accepts_terms: false,
  })

  const set = (field: string, value: string | boolean | string[]) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const toggleElectrical = (val: string) => {
    if (val === 'none') {
      set('electrical_appliances', ['none'])
      return
    }
    const current = form.electrical_appliances.filter(v => v !== 'none')
    if (current.includes(val)) {
      set('electrical_appliances', current.filter(v => v !== val))
    } else {
      set('electrical_appliances', [...current, val])
    }
  }

  const selectedStall = STALL_OPTIONS.find(s => s.value === form.stall_type)
  const chairsCost = Number(form.hired_chairs) * 50
  const tablesCost = Number(form.hired_tables) * 100
  const electricalCost = form.electrical_appliances.reduce((sum, v) => {
    const opt = ELECTRICAL_OPTIONS.find(e => e.value === v)
    return sum + (opt?.price || 0)
  }, 0)
  const totalEstimate = (selectedStall?.price || 0) + chairsCost + tablesCost + electricalCost

  const canProceed = () => {
    if (step === 1) return form.email && form.item_category && form.stall_brand_name && form.business_description && form.traded_before && form.contact_person && form.whatsapp_number && form.social_media_links
    if (step === 2) return form.stall_type
    if (step === 3) return form.electrical_appliances.length > 0 && form.appliance_details && form.uses_gas
    if (step === 4) return form.accepts_cancellation && form.accepts_terms
    return false
  }

  const handleSubmit = async () => {
    setFormState('submitting')
    setError('')

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.stall_brand_name,
          business_description: form.business_description,
          product_categories: [form.item_category],
          contact_name: form.contact_person,
          email: form.email,
          phone: form.whatsapp_number,
          preferred_booth_tier: form.stall_type,
          special_requirements: JSON.stringify({
            traded_before: form.traded_before,
            social_media: form.social_media_links,
            stall_type: selectedStall?.label,
            stall_price: selectedStall?.price,
            hired_chairs: form.hired_chairs,
            hired_tables: form.hired_tables,
            electrical_appliances: form.electrical_appliances,
            appliance_details: form.appliance_details,
            uses_gas: form.uses_gas,
            total_estimate: totalEstimate,
          }),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setFormState('success')
    } catch (err) {
      setFormState('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (formState === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Application Submitted</h1>
          <p className="text-neutral-600 mb-2">Thank you for applying to trade at Young at Heart Festival 2026.</p>
          <p className="text-neutral-500 text-sm mb-6">Your application will be assessed by the selection committee. Only shortlisted candidates will be contacted. If successful, you will receive an invoice to secure your spot.</p>
          <p className="text-sm font-medium text-neutral-700 mb-6">Estimated Total: R{totalEstimate.toLocaleString()}</p>
          <a href="/" className="inline-block px-6 py-3 bg-[#cd2653] text-white font-medium rounded-lg hover:bg-[#b82049] transition-colors">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/"><Logo size="md" showText={true} /></a>
          <span className="text-sm text-neutral-500">Step {step} of 4</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">Vendor Application</h1>
            <p className="text-neutral-500 text-sm">Young at Heart Festival 2026 · Dec 11-13 · Youngsfield Military Base</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between mb-8 px-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                  step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-[#cd2653] text-white' : 'bg-neutral-200 text-neutral-500'
                }`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.id ? 'text-neutral-900' : 'text-neutral-400'}`}>{s.title}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-green-500' : 'bg-neutral-200'}`} />}
              </div>
            ))}
          </div>

          {formState === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#cd2653]" /> Business Information
                </h2>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="you@business.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Item Category *</label>
                  <select required value={form.item_category} onChange={e => set('item_category', e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent bg-white">
                    <option value="">Select category</option>
                    {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Stall / Brand Name *</label>
                  <input type="text" required value={form.stall_brand_name} onChange={e => set('stall_brand_name', e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="Your stall or brand name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Detailed description of Business/Goods or menu items *</label>
                  <p className="text-xs text-neutral-500 mb-2">Please list all items being sold</p>
                  <textarea required value={form.business_description} onChange={e => set('business_description', e.target.value)} rows={4}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none" placeholder="List all products/menu items you will be selling..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Have you traded with Cape Town Halaal before? *</label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => set('traded_before', opt)}
                        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                          form.traded_before === opt ? 'bg-[#cd2653] text-white border-[#cd2653]' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#cd2653]" /> Contact Details
                </h2>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Person (owner) *</label>
                  <input type="text" required value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="Full name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">WhatsApp Number *</label>
                  <input type="tel" required value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" placeholder="+27 XX XXX XXXX" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Social Media Links *</label>
                  <textarea required value={form.social_media_links} onChange={e => set('social_media_links', e.target.value)} rows={2}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none" placeholder="Instagram, Facebook, TikTok links..." />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Stall Selection */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-1 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#cd2653]" /> Stall Type & Pricing
              </h2>
              <p className="text-xs text-neutral-500 mb-4">Excludes power. Entry bands are included per stall type.</p>

              <div className="space-y-2">
                {STALL_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => set('stall_type', opt.value)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      form.stall_type === opt.value
                        ? 'border-[#cd2653] bg-[#cd2653]/5 ring-1 ring-[#cd2653]/20'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 text-sm">{opt.label}</p>
                        {opt.bands > 0 && <p className="text-xs text-neutral-500">{opt.bands} entry bands included</p>}
                      </div>
                      {opt.price > 0 ? (
                        <span className="text-lg font-bold text-[#cd2653] ml-4">R{opt.price.toLocaleString()}</span>
                      ) : (
                        <span className="text-sm text-neutral-500 ml-4">TBC</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Requirements */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#cd2653]" /> Furniture & Equipment
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Hired Chairs (R50 each) *</label>
                    <input type="number" min="0" value={form.hired_chairs} onChange={e => set('hired_chairs', e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Hired Tables (R100 each) *</label>
                    <input type="number" min="0" value={form.hired_tables} onChange={e => set('hired_tables', e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Electrical Appliances *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ELECTRICAL_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => toggleElectrical(opt.value)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          form.electrical_appliances.includes(opt.value)
                            ? 'bg-[#cd2653] text-white border-[#cd2653]'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                        }`}>
                        <span className="font-medium">{opt.label}</span>
                        {opt.price > 0 && <span className="text-xs opacity-80 ml-1">R{opt.price}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full detailed list of appliances *</label>
                  <p className="text-xs text-neutral-500 mb-2">E.g. 2 Double Fryers, 3 fridges, 2 Microwaves — MUST BE ACCURATE, WILL BE AUDITED</p>
                  <textarea required value={form.appliance_details} onChange={e => set('appliance_details', e.target.value)} rows={3}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none" placeholder="List exact quantities of each appliance..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Do you make use of Gas? (Gas certification required) *</label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => set('uses_gas', opt)}
                        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                          form.uses_gas === opt ? 'bg-[#cd2653] text-white border-[#cd2653]' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cost estimate */}
              {selectedStall && (
                <div className="bg-neutral-900 rounded-xl p-6 text-white">
                  <h3 className="font-semibold mb-3">Estimated Total</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-neutral-400">Stall</span><span>R{selectedStall.price.toLocaleString()}</span></div>
                    {chairsCost > 0 && <div className="flex justify-between"><span className="text-neutral-400">Chairs ({form.hired_chairs})</span><span>R{chairsCost.toLocaleString()}</span></div>}
                    {tablesCost > 0 && <div className="flex justify-between"><span className="text-neutral-400">Tables ({form.hired_tables})</span><span>R{tablesCost.toLocaleString()}</span></div>}
                    {electricalCost > 0 && <div className="flex justify-between"><span className="text-neutral-400">Electrical</span><span>R{electricalCost.toLocaleString()}</span></div>}
                    <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span><span className="text-[#f59e0b]">R{totalEstimate.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Documents & Terms */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#cd2653]" /> Documents
                </h2>
                <p className="text-sm text-neutral-600">
                  You are required to submit a <strong>COA</strong> if you sell any food products. If you sell warm meals, you also need a <strong>Hawkers License</strong>. Gas certification is required if applicable.
                </p>
                <p className="text-sm text-neutral-500">
                  Documents can be emailed to <a href="mailto:capetownhalaal@gmail.com" className="text-[#cd2653] font-medium hover:underline">capetownhalaal@gmail.com</a> after submission.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#cd2653]" /> Terms & Conditions
                </h2>

                <div className="bg-neutral-50 rounded-lg p-4 max-h-60 overflow-y-auto text-xs text-neutral-600 leading-relaxed space-y-2">
                  <p><strong>Cancellation Policy:</strong> 8+ weeks before = full refund. 6 weeks = 50% charge. 4 weeks = 100% charge.</p>
                  <p><strong>Payment:</strong> Your space is only confirmed once paid. Failure to pay will rescind your acceptance.</p>
                  <p><strong>Setup:</strong> Thursday afternoon before the event. Mandatory for all vendors. Friday morning dry run is compulsory for vendors using electricity.</p>
                  <p><strong>Trading:</strong> You must be ready to trade by opening time. Be courteous to customers. Keep pricing affordable.</p>
                  <p><strong>Food Vendors:</strong> Valid COA and Hawkers License required. Non-compliance during inspection = removal without refund.</p>
                  <p><strong>Gas:</strong> Open flame vendors must have fire extinguisher and fire blanket.</p>
                  <p><strong>Parking:</strong> One space per stall. Additional spaces charged separately. Illegal parking = R200 fine.</p>
                  <p><strong>No exclusivity:</strong> No vendor is promised monopoly. Limit of 1-2 duplicates is the aim.</p>
                  <p><strong>Layout:</strong> Organisers reserve the right to reposition stalls. Layouts are not final.</p>
                  <p><strong>General:</strong> No personal generators. No flyers. No allowing unpaid entry. Violations = removal and blacklisting.</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.accepts_cancellation} onChange={e => set('accepts_cancellation', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-[#cd2653] focus:ring-[#cd2653]" />
                  <span className="text-sm text-neutral-700">I understand the cancellation policy (8 weeks = full refund, 6 weeks = 50%, 4 weeks = 100% charge) *</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.accepts_terms} onChange={e => set('accepts_terms', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-[#cd2653] focus:ring-[#cd2653]" />
                  <span className="text-sm text-neutral-700">I understand and accept the terms and conditions *</span>
                </label>
              </div>

              {/* Final cost summary */}
              {selectedStall && (
                <div className="bg-neutral-900 rounded-xl p-6 text-white">
                  <h3 className="font-semibold mb-3">Application Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-neutral-400">Brand</span><span>{form.stall_brand_name}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-400">Stall</span><span>{selectedStall.label.split('—')[0].trim()}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-400">Category</span><span>{form.item_category}</span></div>
                    <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-lg">
                      <span>Estimated Total</span><span className="text-[#f59e0b]">R{totalEstimate.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 mb-12">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <a href="/" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Home
              </a>
            )}

            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#cd2653] rounded-lg hover:bg-[#b82049] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canProceed() || formState === 'submitting'}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#cd2653] rounded-lg hover:bg-[#b82049] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {formState === 'submitting' ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit Application <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
