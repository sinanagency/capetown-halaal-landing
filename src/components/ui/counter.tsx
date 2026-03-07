'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

interface CounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function Counter({
  value,
  duration = 2,
  className = '',
  prefix = '',
  suffix = '',
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  })

  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  )

  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, spring, value])

  useEffect(() => {
    return display.on('change', (latest) => {
      setDisplayValue(latest)
    })
  }, [display])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

// Animated stat card
interface StatCardProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
  icon?: React.ReactNode
  delay?: number
}

export function StatCard({ value, label, prefix, suffix, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#cd2653]/20 to-[#bf3026]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#cd2653]/20 to-[#bf3026]/20 flex items-center justify-center mb-4 text-[#cd2653]">
            {icon}
          </div>
        )}
        <div className="text-3xl md:text-4xl font-bold text-white mb-2">
          <Counter value={value} prefix={prefix} suffix={suffix} />
        </div>
        <p className="text-gray-400 text-sm">{label}</p>
      </div>
    </motion.div>
  )
}
