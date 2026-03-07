'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Utensils, ShoppingBag, Heart, Sparkles,
  Building, Plane, Home, Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sectors = [
  {
    icon: Utensils,
    title: 'Food & Beverage',
    description: 'Restaurants, catering, food products & ingredients',
    color: 'from-red-500 to-orange-500',
    bgGlow: 'rgba(239, 68, 68, 0.2)',
    count: '120+'
  },
  {
    icon: ShoppingBag,
    title: 'Fashion & Modest Wear',
    description: 'Clothing, accessories, hijabs & modest fashion',
    color: 'from-purple-500 to-pink-500',
    bgGlow: 'rgba(168, 85, 247, 0.2)',
    count: '80+'
  },
  {
    icon: Sparkles,
    title: 'Beauty & Wellness',
    description: 'Halaal cosmetics, skincare & wellness products',
    color: 'from-pink-500 to-rose-500',
    bgGlow: 'rgba(236, 72, 153, 0.2)',
    count: '60+'
  },
  {
    icon: Heart,
    title: 'Health & Pharmacy',
    description: 'Halaal supplements, medicine & health products',
    color: 'from-emerald-500 to-teal-500',
    bgGlow: 'rgba(16, 185, 129, 0.2)',
    count: '40+'
  },
  {
    icon: Plane,
    title: 'Travel & Tourism',
    description: 'Halaal travel agencies, destinations & experiences',
    color: 'from-blue-500 to-cyan-500',
    bgGlow: 'rgba(59, 130, 246, 0.2)',
    count: '35+'
  },
  {
    icon: Home,
    title: 'Home & Living',
    description: 'Furniture, decor & home essentials',
    color: 'from-amber-500 to-yellow-500',
    bgGlow: 'rgba(245, 158, 11, 0.2)',
    count: '45+'
  },
  {
    icon: Briefcase,
    title: 'Finance & Services',
    description: 'Islamic banking, takaful & financial services',
    color: 'from-slate-500 to-zinc-500',
    bgGlow: 'rgba(100, 116, 139, 0.2)',
    count: '25+'
  },
  {
    icon: Building,
    title: 'Business & Trade',
    description: 'B2B services, suppliers & trade opportunities',
    color: 'from-indigo-500 to-violet-500',
    bgGlow: 'rgba(99, 102, 241, 0.2)',
    count: '30+'
  }
]

function SectorCard({ sector, index }: { sector: typeof sectors[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, rotateX: -10 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.215, 0.61, 0.355, 1]
      }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: sector.bgGlow }}
      />

      <div className="relative p-6 bg-neutral-900/80 backdrop-blur-sm border border-white/5 rounded-2xl hover:border-white/10 transition-all duration-500 h-full">
        {/* Count badge */}
        <div className="absolute top-4 right-4">
          <span className="text-xs font-bold text-neutral-500">
            {sector.count}
          </span>
        </div>

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-5',
            'bg-gradient-to-br shadow-lg',
            sector.color
          )}
          style={{
            boxShadow: `0 10px 40px ${sector.bgGlow}`
          }}
        >
          <sector.icon className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-neutral-50 transition-colors">
          {sector.title}
        </h3>
        <p className="text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors leading-relaxed">
          {sector.description}
        </p>

        {/* Hover indicator */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
          style={{
            background: `linear-gradient(to right, ${sector.bgGlow}, transparent)`
          }}
          initial={{ scaleX: 0, originX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

export function SectorsSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="sectors" className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950" />

      {/* Animated orbs */}
      <motion.div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: 'linear-gradient(135deg, #cd2653, #f59e0b)' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6"
          >
            8 Industry Sectors
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Every Corner of{' '}
            <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
              Halaal Living
            </span>
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            From food and fashion to finance and travel, discover exhibitors across all aspects of the halaal lifestyle.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sectors.map((sector, i) => (
            <SectorCard key={sector.title} sector={sector} index={i} />
          ))}
        </div>

        {/* Total count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-neutral-500">
            <span className="text-2xl font-bold text-white">400+</span>{' '}
            exhibitors confirmed across all sectors
          </p>
        </motion.div>
      </div>
    </section>
  )
}
