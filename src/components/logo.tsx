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
        {/* Spinning halo positioned to hug the visible heart only (not the PNG file bounds).
            Heart bbox confirmed via sharp.trim(): left 26%, right 30%, top 34%, bottom 34%
            of the rendered square, after the existing translate-y-11% on the image.
            Negative margin extends the glow ~3px beyond the heart's silhouette. */}
        <span
          aria-hidden
          className="absolute rounded-full opacity-70 blur-[5px] animate-spin [animation-duration:9s] pointer-events-none"
          style={{
            top: '32%',
            bottom: '32%',
            left: '24%',
            right: '28%',
            margin: '-3px',
            background:
              'conic-gradient(from 0deg, #cd2653 0%, #cd2653 25%, #f59e0b 45%, #cd2653 70%, #cd2653 100%)',
          }}
        />
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
