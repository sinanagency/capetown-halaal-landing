'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 32, text: 'text-sm', subtext: 'text-[8px]' },
  md: { icon: 40, text: 'text-base', subtext: 'text-[10px]' },
  lg: { icon: 48, text: 'text-lg', subtext: 'text-xs' },
  xl: { icon: 64, text: 'text-2xl', subtext: 'text-sm' },
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/logo.png"
        alt="Young at Heart"
        width={s.icon}
        height={s.icon}
        className="flex-shrink-0"
        priority
      />

      {showText && (
        <div className="leading-tight">
          <p className={cn('font-bold text-neutral-900', s.text)}>Young at Heart</p>
          <p className={cn('text-neutral-500', s.subtext)}>Festival 2026</p>
        </div>
      )}
    </div>
  )
}

export function LogoMark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) {
  const s = sizes[size]

  return (
    <Image
      src="/logo.png"
      alt="Young at Heart"
      width={s.icon}
      height={s.icon}
      className={cn('flex-shrink-0', className)}
    />
  )
}
