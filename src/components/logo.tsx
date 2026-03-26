'use client'

import Image from 'next/image'
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
        whileHover={{ scale: 1.05 }}
        className={cn(s.icon, 'relative flex-shrink-0')}
      >
        <Image
          src="/logo.png"
          alt="Young at Heart"
          fill
          className="object-contain"
          priority
        />
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
      whileHover={{ scale: 1.05 }}
      className={cn(iconSizes[size], 'relative', className)}
    >
      <Image
        src="/logo.png"
        alt="Young at Heart"
        fill
        className="object-contain"
      />
    </motion.div>
  )
}
