'use client'

import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  glareEnabled?: boolean
  tiltAmount?: number
}

export function TiltCard({
  children,
  className = '',
  glareEnabled = true,
  tiltAmount = 15
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 300, damping: 30 }
  const xSpring = useSpring(x, springConfig)
  const ySpring = useSpring(y, springConfig)

  const rotateX = useTransform(ySpring, [-0.5, 0.5], [tiltAmount, -tiltAmount])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-tiltAmount, tiltAmount])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const normalizedX = (e.clientX - rect.left) / rect.width - 0.5
    const normalizedY = (e.clientY - rect.top) / rect.height - 0.5
    x.set(normalizedX)
    y.set(normalizedY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={cn('relative', className)}
    >
      {children}

      {/* Glare effect */}
      {glareEnabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-inherit"
          style={{
            background: useTransform(
              [xSpring, ySpring],
              ([latestX, latestY]) =>
                `radial-gradient(circle at ${(latestX as number + 0.5) * 100}% ${(latestY as number + 0.5) * 100}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
            ),
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </motion.div>
  )
}

export function ParallaxCard({
  children,
  className = '',
  depth = 50
}: {
  children: React.ReactNode
  className?: string
  depth?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 20 }
  const xSpring = useSpring(x, springConfig)
  const ySpring = useSpring(y, springConfig)

  const translateX = useTransform(xSpring, [-0.5, 0.5], [-depth, depth])
  const translateY = useTransform(ySpring, [-0.5, 0.5], [-depth, depth])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      <motion.div
        style={{ x: translateX, y: translateY }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  )
}
