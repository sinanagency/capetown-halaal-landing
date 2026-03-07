'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface ParticlesProps {
  className?: string
  quantity?: number
  color?: string
}

export function Particles({ className = '', quantity = 50, color = '#cd2653' }: ParticlesProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {[...Array(quantity)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: color,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// Floating orbs for hero
export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large red orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(205, 38, 83, 0.15) 0%, transparent 70%)',
          left: '-10%',
          top: '-20%',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Medium amber orb */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
          right: '-5%',
          top: '30%',
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small maroon orb */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(191, 48, 38, 0.1) 0%, transparent 70%)',
          left: '60%',
          bottom: '10%',
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

// Grid background
export function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      {/* Fade out at edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-transparent to-gray-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-transparent to-gray-950" />
    </div>
  )
}

// Animated beam of light
export function LightBeam() {
  return (
    <motion.div
      className="absolute w-[2px] h-[300px] pointer-events-none"
      style={{
        background: 'linear-gradient(to bottom, transparent, rgba(205, 38, 83, 0.5), transparent)',
        left: '50%',
        top: '-100px',
        transformOrigin: 'top',
      }}
      animate={{
        rotate: [-20, 20, -20],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// Cursor glow effect
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`
        glowRef.current.style.top = `${e.clientY}px`
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div
      ref={glowRef}
      className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-50 mix-blend-screen"
      style={{
        background: 'radial-gradient(circle, rgba(205, 38, 83, 0.08) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}
