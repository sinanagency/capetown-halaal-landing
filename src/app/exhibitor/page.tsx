'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight, MapPin, Users, Calendar, CheckCircle,
  Utensils, ShoppingBag, Sparkles, Heart, Plane, Home, Briefcase, Building
} from 'lucide-react'
import { Logo } from '@/components/logo'

const BOOTH_TIERS = [
  {
    name: 'Standard',
    size: '3×3m',
    price: 'R15,000',
    features: ['Table & 2 chairs', 'Power outlet', 'Festival signage', 'Wi-Fi access'],
  },
  {
    name: 'Premium',
    size: '3×6m',
    price: 'R25,000',
    popular: true,
    features: ['2 Tables & 4 chairs', 'Dual power outlets', 'Corner positioning', 'Priority setup', 'Wi-Fi access'],
  },
  {
    name: 'Corner',
    size: '6×6m',
    price: 'R45,000',
    features: ['4 Tables & 8 chairs', 'Premium power setup', 'High foot traffic', 'Early access setup', 'Wi-Fi access'],
  },
  {
    name: 'Island',
    size: '9×9m',
    price: 'R85,000',
    features: ['Full infrastructure', '360° visibility', 'Central location', 'Dedicated setup time', 'Premium branding', 'Wi-Fi access'],
  },
]

const SECTORS = [
  { icon: Utensils, name: 'Food & Beverage', count: '120+' },
  { icon: ShoppingBag, name: 'Fashion & Modest Wear', count: '80+' },
  { icon: Sparkles, name: 'Beauty & Wellness', count: '60+' },
  { icon: Heart, name: 'Health & Pharmacy', count: '40+' },
  { icon: Plane, name: 'Travel & Tourism', count: '35+' },
  { icon: Home, name: 'Home & Living', count: '45+' },
  { icon: Briefcase, name: 'Finance & Services', count: '25+' },
  { icon: Building, name: 'Business & Trade', count: '30+' },
]

export default function ExhibitorPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" showText={true} />
          </Link>
          <Link
            href="/apply"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#cd2653] rounded-xl hover:bg-[#b82049] transition-colors"
          >
            Apply Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #cd2653 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6">
              Exhibitor Information
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">
              Exhibit at Young at Heart
              <span className="block text-[#cd2653]">Festival 2026</span>
            </h1>
            <p className="text-neutral-600 text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Join 350+ vendors at South Africa's largest lifestyle exhibition.
              December 11-13, 2026 at Youngsfield Military Base, Cape Town.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-[#cd2653] rounded-2xl hover:bg-[#b82049] transition-colors shadow-lg shadow-[#cd2653]/20"
              >
                Apply as Exhibitor
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://tickets.youngatheart.co.za/vendor-checkout/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-neutral-700 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-colors"
              >
                Already Approved? Pay Here
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Event stats */}
      <section className="bg-neutral-50 border-y border-neutral-200 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Calendar, label: 'Dec 11-13, 2026', sub: '3 Day Event' },
              { icon: MapPin, label: 'Youngsfield Military Base', sub: 'Cape Town' },
              { icon: Users, label: '25,000+ Visitors', sub: 'Expected attendance' },
              { icon: Building, label: '350+ Vendors', sub: 'Across 8 sectors' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2">
                <stat.icon className="w-6 h-6 text-[#cd2653]" />
                <p className="font-bold text-neutral-900">{stat.label}</p>
                <p className="text-sm text-neutral-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booth Pricing */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Booth Pricing</h2>
            <p className="text-neutral-600 text-lg">All booths include furniture, power, signage, and Wi-Fi</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {BOOTH_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 ${
                  tier.popular
                    ? 'border-[#cd2653] bg-[#cd2653]/5 shadow-lg shadow-[#cd2653]/10'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#cd2653] text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <p className="text-sm text-neutral-500 mb-4">{tier.size}</p>
                <p className="text-3xl font-bold text-[#cd2653] mb-6">{tier.price}</p>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-700">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/apply"
                  className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                    tier.popular
                      ? 'bg-[#cd2653] text-white hover:bg-[#b82049]'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="py-16 md:py-24 bg-neutral-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">8 Industry Sectors</h2>
            <p className="text-neutral-400 text-lg">Find your place among 350+ exhibitors</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {SECTORS.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <s.icon className="w-5 h-5 text-[#cd2653] flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-neutral-500">{s.count} vendors</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Apply', desc: 'Fill out the application form with your business details and preferred sector.' },
              { step: '2', title: 'Approval', desc: 'Our team reviews your application within 3-5 business days.' },
              { step: '3', title: 'Payment', desc: 'Once approved, select your booth tier and complete payment online.' },
              { step: '4', title: 'Exhibit', desc: 'Set up your booth and connect with 25,000+ visitors over 3 days.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#cd2653] text-white flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#cd2653] text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Exhibit?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Applications are open. Secure your booth at South Africa's biggest lifestyle exhibition.
          </p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-[#cd2653] bg-white rounded-2xl hover:bg-neutral-100 transition-colors"
          >
            Apply Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 text-center">
        <p className="text-sm text-neutral-500">
          © 2026 Young at Heart Festival. All rights reserved. ·{' '}
          <Link href="/" className="text-[#cd2653] hover:underline">Back to Home</Link>
        </p>
      </footer>
    </div>
  )
}
