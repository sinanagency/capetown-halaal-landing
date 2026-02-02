'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Store, Send, CheckCircle, Instagram, Facebook, Globe, Mail, Phone, Building2, User } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Convert FormData to object
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      if (key !== 'form-name' && key !== 'bot-field') {
        data[key] = value.toString()
      }
    })

    try {
      const response = await fetch('/.netlify/functions/submit-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        throw new Error('Submission failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-4">Application Received!</h1>
          <p className="text-white/60 mb-8">
            Thank you for your interest in Cape Town Halaal 2026. Our team will review your application and get back to you soon.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#cd2653] rounded-full font-semibold hover:bg-[#e03a5f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e11]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>

          <div className="text-sm font-semibold text-[#cd2653]">
            CAPE TOWN HALAAL 2026
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#cd2653]/20 flex items-center justify-center mx-auto mb-6">
              <Store className="w-8 h-8 text-[#cd2653]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Become a Vendor</h1>
            <p className="text-white/60 max-w-md mx-auto">
              Join 350+ vendors at South Africa's biggest Halaal lifestyle expo. Fill out the form below and we'll get back to you.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            name="vendor-application"
            method="POST"
            data-netlify="true"
            netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <input type="hidden" name="form-name" value="vendor-application" />
            <input type="hidden" name="bot-field" />

            {/* Business Info */}
            <div className="bg-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-[#cd2653]" />
                Business Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="business_name"
                  required
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  What do you sell? *
                </label>
                <textarea
                  name="business_description"
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors resize-none"
                  placeholder="Briefly describe your products or services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Instagram className="w-5 h-5 text-[#cd2653]" />
                Social Media
              </h2>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Instagram Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                  <input
                    type="text"
                    name="instagram"
                    className="w-full h-12 pl-8 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                    placeholder="yourhandle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  <Facebook className="w-4 h-4 inline mr-1" />
                  Facebook Page
                </label>
                <input
                  type="text"
                  name="facebook"
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                  placeholder="facebook.com/yourbusiness"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-[#cd2653]" />
                Contact Information
              </h2>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    required
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                    placeholder="+27 XX XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#cd2653] transition-colors resize-none"
                  placeholder="Anything else you'd like us to know?"
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-14 bg-gradient-to-r from-[#cd2653] to-[#e03a5f] rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#cd2653]/25 hover:shadow-[#cd2653]/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Application
                </>
              )}
            </motion.button>

            <p className="text-center text-white/40 text-sm">
              By submitting, you agree to be contacted about Cape Town Halaal 2026.
            </p>
          </motion.form>
        </div>
      </main>
    </div>
  )
}
