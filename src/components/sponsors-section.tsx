'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Crown, Star, Award, Sparkles, BadgeCheck, Trophy, ExternalLink, X, Mail, Phone, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Official/Title Sponsor - The main event sponsor
const officialSponsor = {
  name: 'Your Company Here',
  tagline: 'Official Sponsor',
  logo: null, // Will show placeholder
  website: '#',
  description: 'Become the Official Sponsor of Young at Heart Festival 2026 and get exclusive naming rights, premium positioning, and maximum brand exposure.',
  benefits: [
    'Event naming rights (Young at Heart Festival presented by [Your Brand])',
    'Largest 10x10m premium booth at main entrance',
    'Logo on ALL marketing materials, signage & tickets',
    'Exclusive main stage branding & MC mentions',
    'VIP hospitality lounge for 50 guests',
    'Full media partnership & press coverage',
    'Social media takeover opportunities',
    'Custom activation space'
  ],
  price: 'R1,000,000+',
  available: true
}

const sponsorTiers = [
  {
    name: 'Platinum Sponsor',
    price: 'R500,000+',
    icon: Crown,
    color: 'from-slate-300 to-slate-500',
    glow: 'rgba(203, 213, 225, 0.3)',
    benefits: [
      'Premium 8x8m booth in main entrance',
      'Main stage naming rights',
      'Logo on all marketing materials',
      'VIP lounge access for 20 guests',
      'Exclusive interview opportunities',
      'Full social media campaign'
    ],
    available: 2
  },
  {
    name: 'Gold Sponsor',
    price: 'R250,000+',
    icon: Award,
    color: 'from-amber-400 to-yellow-600',
    glow: 'rgba(251, 191, 36, 0.3)',
    benefits: [
      'Premium 6x6m corner booth',
      'Logo on event signage',
      'VIP lounge access for 10 guests',
      'Speaking opportunity',
      'Social media mentions',
      'Event program advertisement'
    ],
    available: 4
  },
  {
    name: 'Silver Sponsor',
    price: 'R100,000+',
    icon: Star,
    color: 'from-gray-400 to-gray-600',
    glow: 'rgba(156, 163, 175, 0.3)',
    benefits: [
      'Premium 4x4m booth',
      'Logo on event website',
      'VIP passes for 5 guests',
      'Digital marketing inclusion',
      'Event program listing'
    ],
    available: 8
  },
  {
    name: 'Bronze Sponsor',
    price: 'R50,000+',
    icon: BadgeCheck,
    color: 'from-orange-400 to-orange-700',
    glow: 'rgba(251, 146, 60, 0.3)',
    benefits: [
      'Standard 3x3m booth',
      'Website logo placement',
      'VIP passes for 2 guests',
      'Social media mention'
    ],
    available: 12
  }
]

// Enquiry Modal Component
function EnquiryModal({
  isOpen,
  onClose,
  sponsorTier
}: {
  isOpen: boolean
  onClose: () => void
  sponsorTier: string
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast.success('Enquiry submitted successfully!', {
      description: `We'll contact you about the ${sponsorTier} package within 24 hours.`
    })

    setIsSubmitting(false)
    onClose()
    setFormData({ name: '', email: '', company: '', phone: '', message: '' })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                Enquire About {sponsorTier}
              </h3>
              <p className="text-neutral-400 text-sm">
                Fill out the form below and our team will contact you within 24 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Company</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors"
                    placeholder="Your Company"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors"
                    placeholder="+27 12 345 6789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Message (Optional)</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors resize-none"
                  placeholder="Any specific requirements or questions..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-[#cd2653] to-[#bf3026] rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Enquiry
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-6 text-sm text-neutral-400">
              <a href="mailto:sponsors@capetownhalaal.co.za" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                sponsors@capetownhalaal.co.za
              </a>
              <a href="tel:+27215550000" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                +27 21 555 0000
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function OfficialSponsorCard({ onEnquire }: { onEnquire: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
      className="relative mb-12"
    >
      {/* Animated border gradient */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-3xl opacity-75 blur-sm animate-pulse" />

      <div className="relative p-8 md:p-12 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20 border border-amber-500/30 rounded-3xl overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNCAyNnYtMkgxNnYyaDE4ek0zMCAyMnYtMkgxOHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        {/* Badge */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-sm font-bold rounded-full shadow-lg shadow-amber-500/30">
            <Trophy className="w-4 h-4" />
            OFFICIAL SPONSOR
          </span>
        </div>

        <div className="relative grid md:grid-cols-2 gap-8 items-center">
          {/* Left: Logo & Info */}
          <div>
            {/* Logo placeholder */}
            <div className="w-48 h-24 bg-white/10 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center mb-6">
              <div className="text-center">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <span className="text-xs text-neutral-400">Your Logo Here</span>
              </div>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Official Sponsor
            </h3>
            <p className="text-lg text-amber-400 font-semibold mb-4">
              {officialSponsor.price}
            </p>
            <p className="text-neutral-400 mb-6">
              {officialSponsor.description}
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnquire}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-shadow"
            >
              Become Official Sponsor
              <ExternalLink className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Right: Benefits */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">
              Exclusive Benefits
            </h4>
            {officialSponsor.benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-sm text-neutral-300">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SponsorCard({ tier, index, onEnquire }: { tier: typeof sponsorTiers[0]; index: number; onEnquire: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const Icon = tier.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, rotateY: -10 }}
      animate={isInView ? { opacity: 1, y: 0, rotateY: 0 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.215, 0.61, 0.355, 1]
      }}
      className="group relative"
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: tier.glow }}
      />

      <div className="relative h-full p-8 bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-3xl hover:border-white/20 transition-all duration-500">
        {/* Available badge */}
        <div className="absolute top-4 right-4">
          <span className="text-xs font-medium text-neutral-500 bg-neutral-800 px-2 py-1 rounded-full">
            {tier.available} spots left
          </span>
        </div>

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center mb-6',
            'bg-gradient-to-br shadow-xl',
            tier.color
          )}
        >
          <Icon className="w-8 h-8 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
        <p className={cn(
          'text-3xl font-bold mb-6 bg-gradient-to-r bg-clip-text text-transparent',
          tier.color
        )}>
          {tier.price}
        </p>

        {/* Benefits */}
        <ul className="space-y-3 mb-8">
          {tier.benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#cd2653] mt-1 flex-shrink-0" />
              <span className="text-sm text-neutral-400">{benefit}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onEnquire}
          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-white transition-all"
        >
          Enquire Now
        </motion.button>
      </div>
    </motion.div>
  )
}

export function SponsorsSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState('')

  const handleEnquire = (tierName: string) => {
    setSelectedTier(tierName)
    setModalOpen(true)
  }

  return (
    <>
    <EnquiryModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      sponsorTier={selectedTier}
    />
    <section id="sponsors" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900/30 to-neutral-950" />

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-gradient-to-br from-amber-500 to-orange-600" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full blur-[100px] opacity-10 bg-gradient-to-br from-slate-400 to-slate-600" />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6">
            Limited Opportunities
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Become a{' '}
            <span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Sponsor
            </span>
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Partner with South Africa's premier lifestyle expo. Exclusive sponsorship packages designed for maximum brand visibility.
          </p>
        </motion.div>

        {/* Official Sponsor - Premium Placement */}
        <OfficialSponsorCard onEnquire={() => handleEnquire('Official Sponsor')} />

        {/* Sponsor Tiers Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <h3 className="text-xl font-semibold text-white mb-2">Additional Sponsorship Packages</h3>
          <p className="text-neutral-500">Choose from our tiered sponsorship options</p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sponsorTiers.map((tier, i) => (
            <SponsorCard key={tier.name} tier={tier} index={i} onEnquire={() => handleEnquire(tier.name)} />
          ))}
        </div>

        {/* Custom sponsorship CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-neutral-900/80 border border-white/10 rounded-2xl">
            <span className="text-neutral-400">Looking for a custom package?</span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleEnquire('Custom Package')}
              className="px-6 py-2 bg-gradient-to-r from-[#cd2653] to-[#bf3026] rounded-xl font-medium text-white"
            >
              Contact Us
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
    </>
  )
}
