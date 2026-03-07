'use client'

import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { FloorPlan } from '@/components/floor-plan'
import { BoothFilters } from '@/components/booth-filters'
import { BoothDetail } from '@/components/booth-detail'
import { Cart } from '@/components/cart'
import { useBoothStore } from '@/lib/store'
import { getBoothStats, formatPrice, BOOTH_TIERS } from '@/lib/booth-data'
import { MapPin, Users, Calendar, Sparkles, ArrowDown, Zap, Shield, Star } from 'lucide-react'
import { Logo, LogoMark } from '@/components/logo'
import { TextReveal, GradientText } from '@/components/ui/text-reveal'
import { FloatingOrbs, GridBackground, Particles, CursorGlow } from '@/components/ui/particles'
import { AnimatedButton, GlowButton } from '@/components/ui/animated-button'
import { Counter, StatCard } from '@/components/ui/counter'
import { ScrollReveal, StaggerContainer, StaggerItem, BlurIn } from '@/components/ui/scroll-reveal'
import { Magnetic } from '@/components/ui/magnetic'

// Dynamic import for 3D preview (heavy component)
const HeroVenuePreview = dynamic(
  () => import('@/components/hero-venue-preview').then(mod => ({ default: mod.HeroVenuePreview })),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-900/50 rounded-2xl animate-pulse" /> }
)

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          className="mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <LogoMark size="xl" />
        </motion.div>
        <motion.div
          className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#cd2653] to-[#f59e0b]"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function HomePage() {
  const { booths } = useBoothStore()
  const stats = getBoothStats(booths)
  const [showCursor, setShowCursor] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowCursor(window.innerWidth > 1024)
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      {/* Cursor glow effect (desktop only) */}
      {showCursor && <CursorGlow />}

      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          {/* Background effects */}
          <GridBackground />
          <FloatingOrbs />
          <Particles quantity={30} color="#cd2653" />

          {/* Hero content */}
          <div className="container mx-auto px-4 pt-24 pb-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text content */}
              <div className="space-y-8">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#cd2653]/10 border border-[#cd2653]/30 rounded-full text-[#cd2653] text-sm font-medium">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.span>
                    Early Bird Pricing Available
                  </span>
                </motion.div>

                {/* Main heading */}
                <div className="space-y-4">
                  <TextReveal
                    text="Cape Town"
                    className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
                    delay={0.2}
                  />
                  <div className="flex items-baseline gap-4">
                    <TextReveal
                      text="Halaal"
                      className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
                      delay={0.4}
                    />
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, type: 'spring' }}
                      className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-[#cd2653] to-[#bf3026] bg-clip-text text-transparent"
                    >
                      2026
                    </motion.span>
                  </div>
                </div>

                {/* Subheading */}
                <BlurIn delay={0.6}>
                  <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                    South Africa's premier halaal lifestyle exhibition. Secure your booth at{' '}
                    <span className="text-white font-medium">Green Point A Track</span>, Cape Town.
                  </p>
                </BlurIn>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="flex flex-wrap gap-4"
                >
                  <AnimatedButton
                    variant="primary"
                    size="lg"
                    onClick={() => document.getElementById('floor-plan')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Zap className="w-5 h-5" />
                    Browse Booths
                  </AnimatedButton>
                  <GlowButton>
                    View Pricing
                  </GlowButton>
                </motion.div>

                {/* Quick stats inline */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="flex flex-wrap gap-6 pt-4"
                >
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-5 h-5 text-[#cd2653]" />
                    <span><Counter value={stats.available} /> booths available</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="w-5 h-5 text-[#cd2653]" />
                    <span>400+ exhibitor spaces</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-5 h-5 text-[#cd2653]" />
                    <span>Coming 2026</span>
                  </div>
                </motion.div>
              </div>

              {/* Right: 3D Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#cd2653]/20 to-[#bf3026]/20 rounded-3xl blur-3xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden h-[400px] md:h-[500px]">
                  <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-800/50" />}>
                    <HeroVenuePreview />
                  </Suspense>

                  {/* Overlay info */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2">
                      <p className="text-xs text-gray-400">Interactive Preview</p>
                      <p className="text-sm text-white font-medium">400 Booth Layout</p>
                    </div>
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-[#cd2653]/20 backdrop-blur-md rounded-full p-2"
                    >
                      <ArrowDown className="w-5 h-5 text-[#cd2653]" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-gray-500"
            >
              <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
              <ArrowDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </section>

        {/* PRICING TIERS */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16">
                <span className="text-[#cd2653] text-sm font-medium uppercase tracking-wider">Pricing</span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Choose Your Space</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  From compact starter booths to premium corner locations. All packages include tables, chairs, signage, and power.
                </p>
              </div>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
              {Object.entries(BOOTH_TIERS).map(([key, tier], index) => (
                <StaggerItem key={key}>
                  <Magnetic strength={0.1}>
                    <motion.div
                      whileHover={{ y: -8, scale: 1.02 }}
                      className={`relative group rounded-2xl p-6 border transition-all duration-300 ${
                        index === 3
                          ? 'bg-gradient-to-br from-[#cd2653]/20 to-[#bf3026]/10 border-[#cd2653]/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {index === 3 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-gradient-to-r from-[#cd2653] to-[#bf3026] text-white text-xs font-bold px-3 py-1 rounded-full">
                            POPULAR
                          </span>
                        </div>
                      )}

                      <div
                        className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                        style={{ backgroundColor: `${tier.color}20` }}
                      >
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: tier.color }}
                        />
                      </div>

                      <h3 className="text-xl font-bold text-white mb-1">{tier.label}</h3>
                      <p className="text-gray-400 text-sm mb-4">{tier.size} • {tier.sqm}m²</p>

                      <div className="mb-6">
                        <span className="text-3xl font-bold text-white">{formatPrice(tier.price)}</span>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {tier.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                            <Star className="w-4 h-4 text-[#cd2653] flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <AnimatedButton
                        variant={index === 3 ? 'primary' : 'secondary'}
                        className="w-full"
                        magnetic={false}
                        onClick={() => document.getElementById('floor-plan')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Select Booth
                      </AnimatedButton>
                    </motion.div>
                  </Magnetic>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#cd2653]/5 to-transparent" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard
                value={400}
                suffix="+"
                label="Exhibitor Spaces"
                icon={<MapPin className="w-6 h-6" />}
                delay={0}
              />
              <StatCard
                value={50000}
                suffix="+"
                label="Expected Visitors"
                icon={<Users className="w-6 h-6" />}
                delay={0.1}
              />
              <StatCard
                value={20000}
                suffix="m²"
                label="Exhibition Space"
                icon={<Zap className="w-6 h-6" />}
                delay={0.2}
              />
              <StatCard
                value={3}
                label="Days of Exhibition"
                icon={<Calendar className="w-6 h-6" />}
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* FLOOR PLAN SECTION */}
        <section id="floor-plan" className="py-24 relative">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="text-[#cd2653] text-sm font-medium uppercase tracking-wider">Interactive</span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Explore the Venue</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Click on any booth to see details and add to your cart. Switch between 2D and 3D views for the best experience.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Floor plan - shows first on mobile */}
              <ScrollReveal direction="up" delay={0.1} className="lg:col-span-6 lg:order-2 order-1">
                <FloorPlan />
              </ScrollReveal>

              {/* Left sidebar - Filters */}
              <ScrollReveal direction="left" delay={0.2} className="lg:col-span-3 lg:order-1 order-3 space-y-6">
                <BoothFilters />
              </ScrollReveal>

              {/* Right sidebar - Details & Cart */}
              <ScrollReveal direction="right" delay={0.3} className="lg:col-span-3 lg:order-3 order-2 space-y-6">
                <BoothDetail />
                <Cart />
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16">
                <span className="text-[#cd2653] text-sm font-medium uppercase tracking-wider">Why Choose Us</span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Premium Experience</h2>
              </div>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.15}>
              <StaggerItem>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="relative group p-8 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10 hover:border-[#cd2653]/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#cd2653]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-[#cd2653]/10 flex items-center justify-center mb-6">
                      <MapPin className="w-7 h-7 text-[#cd2653]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Prime Location</h3>
                    <p className="text-gray-400">
                      Green Point A Track - Over 20,000m² of exhibition space with excellent accessibility and parking.
                    </p>
                  </div>
                </motion.div>
              </StaggerItem>

              <StaggerItem>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="relative group p-8 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                      <Users className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">50,000+ Visitors</h3>
                    <p className="text-gray-400">
                      Connect with thousands of potential customers over the 3-day event. Maximum exposure guaranteed.
                    </p>
                  </div>
                </motion.div>
              </StaggerItem>

              <StaggerItem>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="relative group p-8 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
                      <Shield className="w-7 h-7 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">All-Inclusive</h3>
                    <p className="text-gray-400">
                      Tables, chairs, signage, power, and lighting included with every booth. Just bring your products.
                    </p>
                  </div>
                </motion.div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>
      </main>

      {/* Demo Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-y border-amber-500/20 py-4"
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-amber-400 text-sm">
            <span className="font-bold">DEMO VERSION</span> — This is a demonstration portal. Booth selections and payments are not processed.
          </p>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#cd2653]/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Logo size="md" showText={true} />

            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <span>Green Point A Track, Cape Town</span>
              <span className="hidden md:inline">•</span>
              <span>Coming 2026</span>
            </div>

            <p className="text-sm text-neutral-500">
              © 2026 Cape Town Halaal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
