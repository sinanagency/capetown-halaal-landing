'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import { ArrowRight, Calendar, MapPin, Users, Sparkles, Play, ChevronDown } from 'lucide-react'
import { AnimatedLetters, GradientText } from '@/components/ui/animated-text'
import { SpotlightCard } from '@/components/ui/spotlight'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=80'

function FloatingElement({ delay = 0, duration = 20, children }: { delay?: number; duration?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{
        y: [-20, 20, -20],
        rotate: [-5, 5, -5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'easeInOut'
      }}
    >
      {children}
    </motion.div>
  )
}

function MagneticButton({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 15 }
  const xSpring = useSpring(x, springConfig)
  const ySpring = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * 0.3)
    y.set((e.clientY - centerY) * 0.3)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: xSpring, y: ySpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function GlowingOrb({ className = '', color = '#cd2653' }: { className?: string; color?: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-30 ${className}`} style={{ background: color }} />
  )
}

export function HeroSection() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 200])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9])

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden bg-white">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-100 via-white to-neutral-50" />

        {/* Animated mesh gradient */}
        <motion.div
          className="absolute inset-0 opacity-50"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, rgba(205, 38, 83, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)
            `,
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
          }}
        />

        {/* Floating orbs */}
        <FloatingElement delay={0} duration={15}>
          <GlowingOrb className="w-96 h-96 -top-48 -left-48" color="#cd2653" />
        </FloatingElement>
        <FloatingElement delay={5} duration={20}>
          <GlowingOrb className="w-80 h-80 top-1/4 right-0" color="#f59e0b" />
        </FloatingElement>
        <FloatingElement delay={10} duration={18}>
          <GlowingOrb className="w-64 h-64 bottom-0 left-1/4" color="#8b5cf6" />
        </FloatingElement>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px'
          }}
        />

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Hero image with parallax */}
        <motion.div
          className="absolute inset-0"
          style={{ y, scale }}
        >
          <Image
            src={HERO_IMAGE}
            alt="Halaal cuisine"
            fill
            className="object-cover opacity-10"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/40" />
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-4 pt-32 pb-20 min-h-screen flex flex-col justify-center"
        style={{ opacity }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <SpotlightCard className="inline-flex items-center gap-3 px-5 py-2.5 bg-neutral-900 backdrop-blur-xl border border-neutral-800 rounded-full">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
              </motion.span>
              <span className="text-sm font-medium text-white">Early Bird Pricing Available</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </SpotlightCard>
          </motion.div>

          {/* Main heading */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4">
              <AnimatedLetters
                text="Young at Heart"
                className="text-neutral-900 block mb-2"
                delay={0.2}
              />
              <span className="block">
                <AnimatedLetters
                  text="Festival"
                  className="text-neutral-900"
                  delay={0.5}
                />
                <motion.span
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 1, duration: 0.6, type: 'spring' }}
                  className="inline-block ml-4"
                >
                  <GradientText from="#cd2653" to="#f59e0b" className="text-5xl md:text-7xl lg:text-8xl font-bold">
                    2026
                  </GradientText>
                </motion.span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-xl md:text-2xl text-neutral-600 max-w-2xl mx-auto leading-relaxed"
            >
              Cape Town's premier lifestyle festival.
              <span className="text-neutral-900 font-semibold"> 350+ vendors</span>,
              <span className="text-neutral-900 font-semibold"> 25,000+ visitors</span>,
              <span className="text-neutral-900 font-semibold"> 3 unforgettable days</span>.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <MagneticButton>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/apply')}
                className="group relative flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white overflow-hidden rounded-2xl cursor-pointer"
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#cd2653] to-[#bf3026]" />

                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                  animate={{ translateX: ['100%', '-100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />

                {/* Glow */}
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_40px_rgba(205,38,83,0.4)]" />

                <span className="relative z-10 flex items-center gap-3">
                  Apply as Exhibitor
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            </MagneticButton>

            <MagneticButton>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('video')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex items-center gap-3 px-8 py-4 text-lg font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-2xl border border-neutral-200 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center group-hover:bg-neutral-300 transition-colors">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                Watch Highlights
              </motion.button>
            </MagneticButton>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-8"
          >
            {[
              { icon: MapPin, label: 'Youngsfield Military Base', color: 'text-red-400' },
              { icon: Calendar, label: 'December 11-13, 2026', color: 'text-amber-400' },
              { icon: Users, label: '25,000+ Visitors', color: 'text-blue-400' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 + i * 0.1 }}
                className="flex items-center gap-2 text-neutral-600"
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-sm md:text-base">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-neutral-400"
          >
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  )
}
