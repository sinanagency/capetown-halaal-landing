'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Magnetic } from './magnetic'

interface AnimatedButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  magnetic?: boolean
  glow?: boolean
}

export function AnimatedButton({
  children,
  className = '',
  onClick,
  variant = 'primary',
  size = 'md',
  magnetic = true,
  glow = true,
}: AnimatedButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-xl transition-all overflow-hidden'

  const variants = {
    primary: 'bg-gradient-to-r from-[#cd2653] to-[#bf3026] text-white',
    secondary: 'bg-white/10 text-white border border-white/20 backdrop-blur-sm',
    ghost: 'bg-transparent text-white hover:bg-white/5',
  }

  const sizes = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  }

  const button = (
    <motion.button
      onClick={onClick}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Shimmer effect */}
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Glow effect */}
      {glow && variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#cd2653] to-[#bf3026] blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10" />
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )

  if (magnetic) {
    return <Magnetic strength={0.2}>{button}</Magnetic>
  }

  return button
}

// Glowing border button
export function GlowButton({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <Magnetic strength={0.15}>
      <motion.button
        onClick={onClick}
        className={cn(
          'relative inline-flex items-center justify-center h-12 px-6 font-medium rounded-xl bg-gray-900 text-white overflow-hidden group',
          className
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Animated border */}
        <span className="absolute inset-0 rounded-xl">
          <span className="absolute inset-[-2px] rounded-xl bg-gradient-to-r from-[#cd2653] via-[#f59e0b] to-[#cd2653] opacity-75 group-hover:opacity-100 transition-opacity animate-border-spin" />
          <span className="absolute inset-[1px] rounded-xl bg-gray-900" />
        </span>

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    </Magnetic>
  )
}
