'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  light?: boolean
}

const sizes = {
  sm: { icon: 40, text: 'text-sm', subtext: 'text-[8px]' },
  md: { icon: 65, text: 'text-base', subtext: 'text-[10px]' },
  lg: { icon: 64, text: 'text-lg', subtext: 'text-xs' },
  xl: { icon: 80, text: 'text-2xl', subtext: 'text-sm' },
}

export function Logo({ size = 'md', showText = true, className, light = false }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex-shrink-0" style={{ width: s.icon, height: s.icon }}>
        {/* Spinning halo behind the logo. Conic-gradient ring rotates slowly with a soft blur. */}
        <span
          aria-hidden
          className="absolute inset-0 -m-1.5 rounded-full opacity-60 blur-[6px] animate-spin [animation-duration:9s] pointer-events-none"
          style={{
            background:
              'conic-gradient(from 0deg, #cd2653 0%, #f59e0b 25%, #cd2653 50%, #f59e0b 75%, #cd2653 100%)',
          }}
        />
        {/* Faint inner glow sitting under the logo for depth */}
        <span aria-hidden className="absolute inset-0 rounded-full bg-white" />
        <Image
          src="/logo.png"
          alt="Young at Heart"
          width={s.icon}
          height={s.icon}
          className="relative translate-y-[11%]"
          priority
        />
      </div>

      {showText && (
        <div className="leading-tight">
          <p className={cn('font-bold', light ? 'text-white' : 'text-neutral-900', s.text)}>Young at Heart</p>
          <p className={cn(light ? 'text-white/70' : 'text-neutral-500', s.subtext)}>Festival 2026</p>
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
