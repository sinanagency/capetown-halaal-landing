'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { gsap } from 'gsap'
import { ArrowRight, Store, Instagram, Facebook, MapPin, Calendar, Users, Utensils } from 'lucide-react'

// Video files
const VIDEOS = [
  '/videos/video1.mp4',
  '/videos/video2.mp4',
  '/videos/video3.mp4',
  '/videos/reel3.mp4',
  '/videos/reel4.mp4',
  '/videos/reel5.mp4',
]

// Stats data
const STATS = [
  { value: 350, suffix: '+', label: 'Vendors Expected', color: 'from-[#cd2653] to-[#ff6b6b]' },
  { value: 25000, suffix: '+', label: 'Expected Visitors', color: 'from-[#f59e0b] to-[#fbbf24]' },
  { value: 300, suffix: '+', label: 'Vendors Last Year', color: 'from-[#cd2653] to-[#f59e0b]' },
  { value: 20000, suffix: '+', label: 'Visitors Last Year', color: 'from-[#8b5cf6] to-[#a78bfa]' },
]

// Countdown hook
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculate = () => {
      const diff = targetDate.getTime() - Date.now()
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        })
      }
    }
    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}

// Animated counter with GSAP
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!ref.current || hasAnimated) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          gsap.fromTo(
            ref.current,
            { innerText: 0 },
            {
              innerText: value,
              duration: 2,
              ease: 'power2.out',
              snap: { innerText: 1 },
              onUpdate: function() {
                if (ref.current) {
                  ref.current.innerText = Math.floor(Number(ref.current.innerText)).toLocaleString() + suffix
                }
              }
            }
          )
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, suffix, hasAnimated])

  return <span ref={ref}>0{suffix}</span>
}

// Floating particles
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          animate={{
            y: [null, -20, 20],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )
}

// Ken Burns video cell with movement
function VideoCell({ src, index }: { src: string; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return

    // Random Ken Burns effect
    const directions = [
      { scale: [1, 1.15], x: [0, 20], y: [0, 10] },
      { scale: [1.1, 1], x: [20, 0], y: [10, 0] },
      { scale: [1, 1.12], x: [0, -15], y: [0, 15] },
      { scale: [1.08, 1], x: [-10, 0], y: [15, 0] },
      { scale: [1, 1.1], x: [10, -10], y: [-5, 5] },
      { scale: [1.12, 1.02], x: [-5, 5], y: [0, -10] },
    ]

    const dir = directions[index % directions.length]

    gsap.fromTo(
      videoRef.current,
      { scale: dir.scale[0], x: dir.x[0], y: dir.y[0] },
      {
        scale: dir.scale[1],
        x: dir.x[1],
        y: dir.y[1],
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: 'none'
      }
    )
  }, [index])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

// Video Collage Component
function VideoCollage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isMobile) return
    const timer = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % VIDEOS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [isMobile])

  // Mobile: Single rotating video with Ken Burns
  if (isMobile) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVideoIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <VideoCell src={VIDEOS[currentVideoIndex]} index={currentVideoIndex} />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        {/* Video indicator */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {VIDEOS.map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full bg-white/30"
              animate={{
                width: i === currentVideoIndex ? 24 : 8,
                backgroundColor: i === currentVideoIndex ? '#cd2653' : 'rgba(255,255,255,0.3)'
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Desktop: 6 videos in 3x2 grid with Ken Burns
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="grid grid-cols-3 grid-rows-2 h-full w-full">
        {VIDEOS.map((video, i) => (
          <div key={i} className="relative overflow-hidden">
            <VideoCell src={video} index={i} />

            {/* Cell overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Subtle grid lines */}
            {i % 3 !== 2 && (
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            )}
            {i < 3 && (
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
          </div>
        ))}
      </div>

      {/* Multi-layer gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      {/* Center vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 100%)' }}
      />

      {/* Animated gradient accent */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(205,38,83,0.3) 0%, transparent 50%)' }}
        animate={{
          background: [
            'radial-gradient(ellipse at 30% 50%, rgba(205,38,83,0.3) 0%, transparent 50%)',
            'radial-gradient(ellipse at 70% 50%, rgba(245,158,11,0.3) 0%, transparent 50%)',
            'radial-gradient(ellipse at 30% 50%, rgba(205,38,83,0.3) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

// Glassmorphism card
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// Countdown Unit with flip animation
function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="relative">
        <motion.div
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tabular-nums"
        >
          <span className="bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent drop-shadow-lg">
            {value.toString().padStart(2, '0')}
          </span>
        </motion.div>
      </div>
      <p className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-[0.2em] mt-2 font-medium">
        {label}
      </p>
    </div>
  )
}

// Magnetic button
function MagneticButton({ children, href }: { children: React.ReactNode; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * 0.2)
    y.set((e.clientY - centerY) * 0.2)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 text-sm md:text-base font-semibold text-white overflow-hidden rounded-2xl"
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#cd2653] via-[#e03a5f] to-[#bf3026]"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ backgroundSize: '200% 200%' }}
      />

      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>

      {/* Shadow */}
      <div className="absolute inset-0 rounded-2xl shadow-lg shadow-[#cd2653]/40 group-hover:shadow-[#cd2653]/60 transition-shadow" />

      <span className="relative z-10 flex items-center gap-2">
        <Store className="w-4 h-4 md:w-5 md:h-5" />
        {children}
        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
      </span>
    </motion.a>
  )
}

// Stat card
function StatCard({ value, suffix, label, color, delay }: {
  value: number; suffix: string; label: string; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className={`text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
      <p className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-wider mt-1">{label}</p>
    </motion.div>
  )
}

export default function HomePage() {
  const targetDate = new Date('2026-12-11T09:00:00')
  const timeLeft = useCountdown(targetDate)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="h-screen bg-neutral-950 text-white overflow-hidden">
      <Particles />

      <section className="relative h-full flex flex-col items-center justify-center">
        <VideoCollage />

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center justify-center h-full">

          {/* Glass card container */}
          <GlassCard className="w-full max-w-4xl p-6 md:p-10 lg:p-12">
            <div className="text-center">
              {/* Date Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-4 md:mb-6"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#cd2653]/20 border border-[#cd2653]/30 rounded-full text-[#cd2653] text-sm font-medium backdrop-blur-sm">
                  <Calendar className="w-4 h-4" />
                  December 11 - 13, 2026
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-2 md:mb-3 tracking-tight"
              >
                <span className="block text-white drop-shadow-lg">Cape Town</span>
                <span className="bg-gradient-to-r from-[#cd2653] via-[#e84c6f] to-[#f59e0b] bg-clip-text text-transparent">
                  Halaal
                </span>
              </motion.h1>

              {/* Subtitle with location */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-6 md:mb-8"
              >
                <p className="text-base md:text-lg text-neutral-300 mb-2">
                  South Africa's Biggest Halaal Lifestyle Expo
                </p>
                <p className="text-sm text-neutral-500 flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Green Point A Track, Cape Town
                </p>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-8 md:mb-10 flex justify-center"
              >
                <MagneticButton href="mailto:info@capetownhalaal.co.za?subject=Vendor%20Application%20-%20Cape%20Town%20Halaal%202026">
                  Become a Vendor
                </MagneticButton>
              </motion.div>

              {/* Countdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mb-8 md:mb-10"
              >
                <div className="grid grid-cols-4 gap-4 md:gap-8 max-w-lg mx-auto">
                  <CountdownUnit value={timeLeft.days} label="Days" />
                  <CountdownUnit value={timeLeft.hours} label="Hours" />
                  <CountdownUnit value={timeLeft.minutes} label="Minutes" />
                  <CountdownUnit value={timeLeft.seconds} label="Seconds" />
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="pt-6 md:pt-8 border-t border-white/10"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {STATS.map((stat, i) => (
                    <StatCard key={stat.label} {...stat} delay={0.7 + i * 0.1} />
                  ))}
                </div>
              </motion.div>
            </div>
          </GlassCard>

          {/* Bottom Social Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4"
          >
            <a
              href="https://www.instagram.com/capetownhalaal/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-[#cd2653]/30 hover:border-[#cd2653]/50 flex items-center justify-center transition-all duration-300"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://www.facebook.com/capetownhalaal/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-[#cd2653]/30 hover:border-[#cd2653]/50 flex items-center justify-center transition-all duration-300"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
