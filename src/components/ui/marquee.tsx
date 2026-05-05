'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MarqueeProps {
  children: React.ReactNode
  className?: string
  duration?: number
  reverse?: boolean
  pauseOnHover?: boolean
}

export function Marquee({
  children,
  className = '',
  duration = 30,
  reverse = false,
  pauseOnHover = true
}: MarqueeProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <motion.div
        className={cn('flex gap-8 w-max', pauseOnHover && 'hover:[animation-play-state:paused]')}
        animate={{
          x: reverse ? ['0%', '-50%'] : ['-50%', '0%']
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}

export function TextMarquee({
  text,
  className = '',
  textClassName = '',
  separatorClassName = '',
  duration = 20,
  separator = '•'
}: {
  text: string
  className?: string
  textClassName?: string
  separatorClassName?: string
  duration?: number
  separator?: string
}) {
  const items = Array(10).fill(text)

  return (
    <div className={cn('relative overflow-hidden py-4', className)}>
      <motion.div
        className="flex items-center gap-8 w-max"
        animate={{ x: ['-50%', '0%'] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-8">
            <span className={cn('text-4xl md:text-6xl font-bold whitespace-nowrap', textClassName)}>
              {item}
            </span>
            <span className={cn('text-4xl md:text-6xl text-neutral-700', separatorClassName)}>{separator}</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export function LogoMarquee({
  logos,
  className = '',
  duration = 40
}: {
  logos: { name: string; icon?: React.ReactNode }[]
  className?: string
  duration?: number
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neutral-950 to-transparent z-10" />

      <Marquee duration={duration}>
        {logos.map((logo, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-8 py-4 bg-white/5 rounded-xl border border-white/10"
          >
            {logo.icon}
            <span className="text-neutral-400 font-medium whitespace-nowrap">{logo.name}</span>
          </div>
        ))}
      </Marquee>
    </div>
  )
}
