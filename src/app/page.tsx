'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import {
  Calendar, MapPin, Users, Building2, ArrowRight, ArrowUpRight,
  Utensils, ShoppingBag, Sparkles, Globe, Award, Clock,
  ChevronRight, Instagram, Facebook, Linkedin, Youtube,
  Mail, Phone, Star, Ticket, Store, Play, ChevronDown, Zap, X, Send
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/logo'
import { HeroSection } from '@/components/hero-section'
import { Spotlight, SpotlightCard } from '@/components/ui/spotlight'
import { TiltCard, ParallaxCard } from '@/components/ui/tilt-card'
import { Marquee, TextMarquee } from '@/components/ui/marquee'
import { AnimatedLetters, GradientText, RevealText } from '@/components/ui/animated-text'
import { SectorsSection } from '@/components/sectors-section'
import { TestimonialsSection } from '@/components/testimonials-section'
import { CountdownSection } from '@/components/countdown-section'
import { VideoSection } from '@/components/video-section'
import { SponsorsSection } from '@/components/sponsors-section'
import { GlowingLine } from '@/components/ui/floating-particles'
import { toast } from 'sonner'

// Images
const IMAGES = {
  food1: 'https://images.unsplash.com/photo-1639664342827-2d68822c55c9?w=800&q=80',
  food2: 'https://images.unsplash.com/photo-1694717459401-bf23c6f00980?w=800&q=80',
  food3: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&q=80',
  food4: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  expo1: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&q=80',
  expo2: 'https://images.unsplash.com/photo-1632383380175-812d44ec112b?w=800&q=80',
  capetown: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
  bokaap: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=800&q=80',
  crowd: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
  fashion: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 2000
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}

function SectionHeading({ badge, title, description }: { badge: string; title: string; description: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
      className="text-center mb-16"
    >
      <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6">
        {badge}
      </span>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">{title}</h2>
      <p className="text-neutral-600 text-lg max-w-2xl mx-auto">{description}</p>
    </motion.div>
  )
}

function GalleryCard({ image, title, delay = 0 }: { image: string; title: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <TiltCard className="group relative overflow-hidden rounded-2xl cursor-pointer">
        <ParallaxCard className="aspect-[4/3]" depth={30}>
          <Image src={image} alt={title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
        </ParallaxCard>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <p className="text-white font-semibold text-lg">{title}</p>
        </div>
      </TiltCard>
    </motion.div>
  )
}

function FeatureCard({ icon: Icon, title, description, delay = 0 }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      <SpotlightCard className="group relative p-8 bg-white border border-neutral-200 rounded-2xl hover:border-neutral-300 hover:shadow-lg transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-[#cd2653]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

        <div className="relative">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#cd2653] to-[#bf3026] flex items-center justify-center mb-6 shadow-lg shadow-[#cd2653]/20"
          >
            <Icon className="w-7 h-7 text-white" />
          </motion.div>

          <h3 className="text-xl font-bold text-neutral-900 mb-3">{title}</h3>
          <p className="text-neutral-600 leading-relaxed">{description}</p>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

// Contact Modal Component
function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast.success('Message sent successfully!', {
      description: "We'll get back to you within 24 hours."
    })

    setIsSubmitting(false)
    onClose()
    setFormData({ name: '', email: '', subject: '', message: '' })
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
              <h3 className="text-2xl font-bold text-white mb-2">Get In Touch</h3>
              <p className="text-neutral-400 text-sm">
                Have questions about Young at Heart Festival 2026? We'd love to hear from you.
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
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors"
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#cd2653]/50 transition-colors resize-none"
                  placeholder="Your message..."
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-6 text-sm text-neutral-400">
              <a href="mailto:info@capetownhalaal.co.za" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                info@capetownhalaal.co.za
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

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="mb-6"
        >
          <LogoMark size="xl" />
        </motion.div>
        <motion.div
          className="w-48 h-1 bg-neutral-200 rounded-full overflow-hidden"
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
  const router = useRouter()
  const [isLoaded, setIsLoaded] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (!isLoaded) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
      <Spotlight />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <Logo size="md" showText={true} />
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {[
                { label: 'About', href: '#about', action: null },
                { label: 'Vendors', href: '/vendors', action: null },
                { label: 'Sectors', href: '#sectors', action: null },
                { label: 'Sponsors', href: '#sponsors', action: null },
                { label: 'Contact', href: '#contact', action: 'openContact' },
              ].map((item) => (
                item.action === 'openContact' ? (
                  <button
                    key={item.label}
                    onClick={() => setContactModalOpen(true)}
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors relative group cursor-pointer"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cd2653] group-hover:w-full transition-all duration-300" />
                  </button>
                ) : item.href.startsWith('#') ? (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault()
                      document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors relative group cursor-pointer"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cd2653] group-hover:w-full transition-all duration-300" />
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors relative group"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#cd2653] group-hover:w-full transition-all duration-300" />
                  </Link>
                )
              ))}
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/register')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#cd2653] to-[#bf3026] rounded-xl shadow-lg shadow-[#cd2653]/20 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                Vendor Application
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Marquee */}
      <div className="border-y border-neutral-200 bg-neutral-50">
        <TextMarquee
          text="YOUNG AT HEART FESTIVAL 2026"
          textClassName="text-neutral-300"
          separator="✦"
        />
      </div>



      {/* About Section */}
      <section id="about" className="py-24 bg-gradient-to-b from-neutral-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6">
                About the Expo
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6 leading-tight">
                South Africa's Largest
                <span className="block">
                  <GradientText from="#cd2653" to="#f59e0b">Lifestyle</GradientText>
                </span>
                Exhibition
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                Cape Town Lifestyle Expo brings together the finest products, services,
                and experiences under one roof. From authentic cuisine to lifestyle brands, discover
                everything living has to offer.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-neutral-700 font-medium">Quality Certified</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-neutral-700 font-medium">International</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-neutral-700 font-medium">Premium Venue</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-neutral-700 font-medium">Family Friendly</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#cd2653]/20 to-[#f59e0b]/10 rounded-3xl blur-3xl" />
              <div className="relative grid grid-cols-2 gap-4">
                <TiltCard className="aspect-square rounded-2xl overflow-hidden">
                  <Image src={IMAGES.food2} alt="Food" fill className="object-cover" />
                </TiltCard>
                <TiltCard className="aspect-square rounded-2xl overflow-hidden mt-8">
                  <Image src={IMAGES.crowd} alt="Crowd" fill className="object-cover" />
                </TiltCard>
                <TiltCard className="col-span-2 aspect-video rounded-2xl overflow-hidden shadow-xl">
                  <Image src={IMAGES.capetown} alt="Cape Town" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                    <div>
                      <p className="text-white font-bold text-xl">Youngsfield Military Base</p>
                      <p className="text-neutral-200">Cape Town, South Africa</p>
                    </div>
                  </div>
                </TiltCard>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <SectorsSection />

      {/* Glowing divider */}
      <GlowingLine />

      {/* Features/Why Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <SectionHeading
            badge="Why Attend"
            title="An Unmissable Experience"
            description="Everything you need for an unforgettable lifestyle exhibition"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Utensils}
              title="Authentic Cuisine"
              description="Sample dishes from over 150 food exhibitors representing cuisines from around the world."
              delay={0}
            />
            <FeatureCard
              icon={ShoppingBag}
              title="Exclusive Deals"
              description="Access show-only promotions and discounts from participating brands."
              delay={0.1}
            />
            <FeatureCard
              icon={Users}
              title="Networking"
              description="Connect with industry leaders, entrepreneurs, and like-minded community members."
              delay={0.2}
            />
            <FeatureCard
              icon={Sparkles}
              title="Live Demos"
              description="Watch cooking demonstrations, fashion shows, and interactive workshops."
              delay={0.3}
            />
            <FeatureCard
              icon={Award}
              title="Premium Experience"
              description="World-class venue with excellent facilities, parking, and accessibility."
              delay={0.4}
            />
            <FeatureCard
              icon={Zap}
              title="Innovation Zone"
              description="Discover the latest in tech, fintech, and sustainable products."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Countdown Section */}
      <CountdownSection />

      {/* Video Section */}
      <VideoSection />

      {/* Sponsors Section */}
      <SponsorsSection />

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={IMAGES.food4} alt="Food" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/90 to-neutral-950/95" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Ready to
                <GradientText from="#cd2653" to="#f59e0b" className="ml-3">Join Us?</GradientText>
              </h2>
              <p className="text-neutral-400 text-xl mb-10">
                Secure your booth today and be part of South Africa's biggest lifestyle event.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/apply')}
                  className="group relative flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white overflow-hidden rounded-2xl bg-gradient-to-r from-[#cd2653] to-[#bf3026] shadow-2xl shadow-[#cd2653]/30 cursor-pointer"
                >
                  <Store className="w-5 h-5" />
                  Apply as Exhibitor
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/register')}
                  className="flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
                >
                  <Ticket className="w-5 h-5" />
                  Register as Visitor
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-neutral-200 py-16 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <Logo size="lg" showText={true} className="mb-6" />
              <p className="text-neutral-600 text-sm mb-6">
                South Africa's premier lifestyle exhibition. Experience the best of modern living.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: Instagram, href: 'https://www.instagram.com/globalcuisineco/' },
                  { icon: Facebook, href: 'https://www.facebook.com/globalcuisineco/' },
                  { icon: Linkedin, href: 'https://www.linkedin.com/company/85941152' },
                  { icon: Youtube, href: '#' },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-[#cd2653]/20 text-neutral-600 hover:text-[#cd2653] flex items-center justify-center transition-all"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-6">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { label: 'About', href: '#about' },
                  { label: 'Vendors', href: '/vendors' },
                  { label: 'Exhibitor Portal', href: '/exhibitor' },
                  { label: 'Register', href: '/register' },
                  { label: 'Floor Plan', href: '/exhibitor#floor-plan' },
                ].map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault()
                          document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-neutral-600 hover:text-neutral-900 transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-6">Event Info</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-neutral-600">
                  <Calendar className="w-4 h-4 text-[#cd2653]" />
                  December 11-13, 2026
                </li>
                <li className="flex items-center gap-2 text-neutral-600">
                  <MapPin className="w-4 h-4 text-[#cd2653]" />
                  Youngsfield Military Base
                </li>
                <li className="flex items-center gap-2 text-neutral-600">
                  <Clock className="w-4 h-4 text-[#cd2653]" />
                  3 Day Event
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-6">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="mailto:info@capetownhalaal.co.za" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
                    <Mail className="w-4 h-4" />
                    info@capetownhalaal.co.za
                  </a>
                </li>
                <li>
                  <a href="tel:+27215550000" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
                    <Phone className="w-4 h-4" />
                    +27 21 555 0000
                  </a>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <p className="text-neutral-500 text-xs mb-1">Organized by</p>
                <a href="https://globalcuisine.co.za" target="_blank" rel="noopener noreferrer" className="text-[#cd2653] hover:text-[#bf3026] font-medium">
                  Global Cuisine
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-neutral-500 text-sm">
              © 2026 Young at Heart Festival. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
