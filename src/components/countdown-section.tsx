'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function useCountdown(targetDate: Date): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}

function CountdownUnit({ value, label, delay = 0 }: { value: number; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, rotateX: -30 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[#cd2653]/10 rounded-xl md:rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative bg-white shadow-lg border border-neutral-200 rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-8">
        {/* Number display */}
        <div className="relative">
          <motion.span
            key={value}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="block text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tabular-nums"
          >
            <span className="bg-gradient-to-b from-neutral-900 to-neutral-600 bg-clip-text text-transparent">
              {value.toString().padStart(2, '0')}
            </span>
          </motion.span>
        </div>

        {/* Label */}
        <p className="text-neutral-500 text-xs sm:text-sm md:text-base uppercase tracking-widest mt-1 md:mt-4">
          {label}
        </p>

        {/* Separator colon — inline, no overflow */}
        <div className="absolute -right-2 md:-right-3.5 top-1/3 -translate-y-1/2 hidden md:flex flex-col gap-1.5 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#cd2653]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#cd2653]" />
        </div>
      </div>
    </motion.div>
  )
}

export function CountdownSection() {
  const targetDate = new Date('2026-12-11T09:00:00')
  const timeLeft = useCountdown(targetDate)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section className="py-16 md:py-24 relative overflow-x-clip">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-neutral-50" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full blur-[100px] opacity-20"
        style={{ background: 'linear-gradient(135deg, #cd2653, #f59e0b)' }}
        animate={{
          scale: [1, 1.2, 1],
          x: [-50, 50, -50],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-4 md:mb-6">
            Mark Your Calendar
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-3 md:mb-4">
            The Wait is Almost Over
          </h2>
          <p className="text-neutral-600 text-sm md:text-lg">
            December 11-13, 2026 &bull; Youngsfield Military Base &bull; Cape Town
          </p>
        </motion.div>

        {/* Countdown grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
          <CountdownUnit value={timeLeft.days} label="Days" delay={0} />
          <CountdownUnit value={timeLeft.hours} label="Hours" delay={0.1} />
          <CountdownUnit value={timeLeft.minutes} label="Minutes" delay={0.2} />
          <CountdownUnit value={timeLeft.seconds} label="Seconds" delay={0.3} />
        </div>

        {/* Early bird notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-8 md:mt-12"
        >
          <a href="https://tickets.youngatheart.co.za" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-4 md:px-6 py-3 bg-amber-50 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors cursor-pointer">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-700 font-medium text-sm md:text-base">
              Tickets On Sale Now — Secure Your Spot
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
