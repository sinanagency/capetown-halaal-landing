'use client'

import { motion, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  staggerChildren?: number
}

const letterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    rotateX: -90,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
  }
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { stagger: number; delay: number }) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.stagger,
      delayChildren: custom.delay,
    }
  })
}

export function AnimatedLetters({
  text,
  className = '',
  delay = 0,
  duration = 0.5,
  staggerChildren = 0.03
}: AnimatedTextProps) {
  const letters = text.split('')

  return (
    <motion.span
      className={cn('inline-flex overflow-hidden', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={{ stagger: staggerChildren, delay }}
    >
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          variants={letterVariants}
          transition={{
            duration,
            ease: [0.215, 0.61, 0.355, 1]
          }}
          style={{
            display: 'inline-block',
            whiteSpace: letter === ' ' ? 'pre' : 'normal'
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function AnimatedWords({
  text,
  className = '',
  delay = 0,
  staggerChildren = 0.08
}: AnimatedTextProps) {
  const words = text.split(' ')

  return (
    <motion.span
      className={cn('inline-flex flex-wrap', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={{ stagger: staggerChildren, delay }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="mr-[0.25em] inline-block"
          variants={{
            hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
            visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
          }}
          transition={{
            duration: 0.6,
            ease: [0.215, 0.61, 0.355, 1]
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={cn('relative inline-block', className)}>
      <span className="relative z-10">{text}</span>
      <span
        className="absolute top-0 left-0 -z-10 text-red-500 opacity-70"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
          transform: 'translate(-2px, -1px)',
          animation: 'glitch-1 2s infinite linear alternate-reverse'
        }}
      >
        {text}
      </span>
      <span
        className="absolute top-0 left-0 -z-10 text-cyan-400 opacity-70"
        style={{
          clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
          transform: 'translate(2px, 1px)',
          animation: 'glitch-2 2s infinite linear alternate-reverse'
        }}
      >
        {text}
      </span>
    </span>
  )
}

export function TypewriterText({
  text,
  className = '',
  delay = 0,
  speed = 0.05
}: AnimatedTextProps & { speed?: number }) {
  const letters = text.split('')

  return (
    <motion.span className={cn('inline-block', className)}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: delay + (i * speed),
            duration: 0
          }}
        >
          {letter}
        </motion.span>
      ))}
      <motion.span
        className="inline-block w-[2px] h-[1em] bg-current ml-1"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
      />
    </motion.span>
  )
}

export function RevealText({
  text,
  className = '',
  delay = 0
}: AnimatedTextProps) {
  return (
    <span className={cn('relative inline-block overflow-hidden', className)}>
      <motion.span
        className="inline-block"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{
          delay,
          duration: 0.8,
          ease: [0.215, 0.61, 0.355, 1]
        }}
      >
        {text}
      </motion.span>
    </span>
  )
}

export function GradientText({
  children,
  className = '',
  from = '#cd2653',
  to = '#f59e0b'
}: {
  children: React.ReactNode
  className?: string
  from?: string
  to?: string
}) {
  return (
    <span
      className={cn('bg-clip-text text-transparent', className)}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {children}
    </span>
  )
}
