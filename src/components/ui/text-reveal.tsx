'use client'

import { motion, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TextRevealProps {
  text: string
  className?: string
  delay?: number
  staggerChildren?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { delay: number; stagger: number }) => ({
    opacity: 1,
    transition: {
      delayChildren: custom.delay,
      staggerChildren: custom.stagger,
    },
  }),
}

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    rotateX: -90,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: 'spring',
      damping: 12,
      stiffness: 100,
    },
  },
}

export function TextReveal({
  text,
  className = '',
  delay = 0,
  staggerChildren = 0.05,
  as: Component = 'h1',
}: TextRevealProps) {
  const words = text.split(' ')

  return (
    <motion.div
      className={cn('flex flex-wrap', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={{ delay, stagger: staggerChildren }}
      style={{ perspective: 1000 }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={wordVariants}
          className="mr-[0.25em] inline-block"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Character by character reveal
interface CharRevealProps {
  text: string
  className?: string
  delay?: number
}

const charVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 12,
      stiffness: 200,
    },
  },
}

export function CharReveal({ text, className = '', delay = 0 }: CharRevealProps) {
  const chars = text.split('')

  return (
    <motion.span
      className={cn('inline-block', className)}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: 0.02,
          },
        },
      }}
    >
      {chars.map((char, index) => (
        <motion.span
          key={index}
          variants={charVariants}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
}

// Gradient text with animation
interface GradientTextProps {
  text: string
  className?: string
  from?: string
  to?: string
}

export function GradientText({
  text,
  className = '',
  from = '#22c55e',
  to = '#10b981',
}: GradientTextProps) {
  return (
    <motion.span
      className={cn('inline-block bg-clip-text text-transparent', className)}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {text}
    </motion.span>
  )
}
