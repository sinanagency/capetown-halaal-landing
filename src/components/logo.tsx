'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 'w-8 h-8', text: 'text-base', subtext: 'text-[8px]' },
  md: { icon: 'w-10 h-10', text: 'text-lg', subtext: 'text-[10px]' },
  lg: { icon: 'w-12 h-12', text: 'text-xl', subtext: 'text-xs' },
  xl: { icon: 'w-16 h-16', text: 'text-2xl', subtext: 'text-sm' },
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 3 }}
        className={cn(
          s.icon,
          'rounded-xl bg-gradient-to-br from-[#cd2653] to-[#bf3026] flex items-center justify-center shadow-lg shadow-red-500/20 relative overflow-hidden'
        )}
      >
        {/* Decorative crescent moon symbol */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-full h-full p-2">
            {/* Crescent moon symbol */}
            <path
              d="M20 4C11.2 4 4 11.2 4 20s7.2 16 16 16c2.4 0 4.6-.5 6.6-1.4-3.6-2.4-6-6.4-6-11.1 0-4.7 2.4-8.7 6-11.1C24.6 4.5 22.4 4 20 4z"
              fill="white"
              opacity="0.9"
            />
            {/* Star accent */}
            <path
              d="M30 14l1.2 2.4 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4L30 14z"
              fill="white"
              opacity="0.8"
            />
          </svg>
        </div>
      </motion.div>

      {showText && (
        <div>
          <p className={cn('font-bold text-neutral-900 leading-tight', s.text)}>Young at Heart</p>
          <p className={cn('text-neutral-500 leading-tight', s.subtext)}>Festival 2026</p>
        </div>
      )}
    </div>
  )
}

export function LogoMark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 3 }}
      className={cn(
        iconSizes[size],
        'rounded-xl bg-gradient-to-br from-[#cd2653] to-[#bf3026] flex items-center justify-center shadow-lg shadow-red-500/20 relative overflow-hidden',
        className
      )}
    >
      <svg viewBox="0 0 40 40" className="w-full h-full p-2">
        <path
          d="M20 4C11.2 4 4 11.2 4 20s7.2 16 16 16c2.4 0 4.6-.5 6.6-1.4-3.6-2.4-6-6.4-6-11.1 0-4.7 2.4-8.7 6-11.1C24.6 4.5 22.4 4 20 4z"
          fill="white"
          opacity="0.9"
        />
        <path
          d="M30 14l1.2 2.4 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4L30 14z"
          fill="white"
          opacity="0.8"
        />
      </svg>
    </motion.div>
  )
}
