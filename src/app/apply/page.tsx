'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User,
  Globe,
  Instagram,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BOOTH_TIERS = [
  { value: 'standard', label: 'Standard Booth (3x3m)', price: 'R15,000' },
  { value: 'premium', label: 'Premium Booth (3x6m)', price: 'R25,000' },
  { value: 'corner', label: 'Corner Booth (6x6m)', price: 'R45,000' },
  { value: 'island', label: 'Island Booth (9x9m)', price: 'R85,000' },
]

const CATEGORIES = [
  'Food & Beverages',
  'Fashion & Modest Wear',
  'Cosmetics & Beauty',
  'Health & Wellness',
  'Home & Lifestyle',
  'Islamic Finance',
  'Travel & Tourism',
  'Education & Books',
  'Technology',
  'Other',
]

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ApplyPage() {
  const [formState, setFormState] = useState<FormState>('idle')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    business_name: '',
    business_description: '',
    product_categories: [] as string[],
    website: '',
    instagram: '',
    facebook: '',
    contact_name: '',
    email: '',
    phone: '',
    preferred_booth_tier: '',
    special_requirements: '',
  })

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      product_categories: prev.product_categories.includes(category)
        ? prev.product_categories.filter((c) => c !== category)
        : [...prev.product_categories, category],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('submitting')
    setError('')

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setFormState('success')
    } catch (err) {
      setFormState('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (formState === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">
            Application Submitted!
          </h1>
          <p className="text-neutral-600 mb-8">
            Thank you for your interest in Cape Town Halaal Expo 2026. We'll review your
            application and get back to you within 3-5 business days.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#cd2653] text-white font-medium rounded-lg hover:bg-[#b82049] transition-colors"
          >
            Return to Home
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Intro */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Exhibitor Application
            </h1>
            <p className="text-neutral-600 text-lg">
              Apply for a booth at Young at Heart Festival 2026. Fill out the form below and
              we'll review your application.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error Message */}
            {formState === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Submission Failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Business Information */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#cd2653]" />
                Business Information
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                    placeholder="Your Business Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Business Description
                  </label>
                  <textarea
                    value={formData.business_description}
                    onChange={(e) => handleChange('business_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none"
                    placeholder="Tell us about your business and what products/services you offer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Product Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-full border transition-colors',
                          formData.product_categories.includes(category)
                            ? 'bg-[#cd2653] text-white border-[#cd2653]'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Online Presence */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#cd2653]" />
                Online Presence
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                      placeholder="https://yourbusiness.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Instagram Handle
                    </label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => handleChange('instagram', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                        placeholder="@yourbusiness"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Facebook Page
                    </label>
                    <input
                      type="text"
                      value={formData.facebook}
                      onChange={(e) => handleChange('facebook', e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                      placeholder="Facebook page URL or name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#cd2653]" />
                Contact Information
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Contact Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={formData.contact_name}
                      onChange={(e) => handleChange('contact_name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent"
                        placeholder="+27 12 345 6789"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booth Preference */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#cd2653]" />
                Booth Preference
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Preferred Booth Size
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {BOOTH_TIERS.map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => handleChange('preferred_booth_tier', tier.value)}
                        className={cn(
                          'p-4 rounded-lg border text-left transition-all',
                          formData.preferred_booth_tier === tier.value
                            ? 'border-[#cd2653] bg-[#cd2653]/5 ring-2 ring-[#cd2653]/20'
                            : 'border-neutral-200 hover:border-neutral-300'
                        )}
                      >
                        <p className="font-medium text-neutral-900">{tier.label}</p>
                        <p className="text-sm text-[#cd2653]">{tier.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Special Requirements
                  </label>
                  <textarea
                    value={formData.special_requirements}
                    onChange={(e) => handleChange('special_requirements', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none"
                    placeholder="Any special requirements for your booth (power needs, location preference, etc.)"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={formState === 'submitting'}
                className="w-full md:w-auto px-8 py-4 bg-[#cd2653] text-white font-semibold rounded-lg hover:bg-[#b82049] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {formState === 'submitting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
              <p className="text-sm text-neutral-500 text-center">
                By submitting, you agree to our terms and conditions.
                We'll contact you within 3-5 business days.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
