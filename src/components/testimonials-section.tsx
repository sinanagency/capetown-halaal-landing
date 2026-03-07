'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    id: 1,
    name: 'Fatima Hendricks',
    role: 'Food Business Owner',
    company: 'Cape Malay Delights',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    quote: 'The Cape Town Halaal Expo transformed our small family business. We connected with distributors and now supply to major retailers across South Africa.',
    rating: 5,
    stats: { leads: 150, sales: 'R450K' }
  },
  {
    id: 2,
    name: 'Yusuf Patel',
    role: 'CEO',
    company: 'Modest Fashion Co.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    quote: "The quality of visitors is exceptional. We've grown our customer base by 300% since exhibiting at the expo. It's now our main marketing channel.",
    rating: 5,
    stats: { leads: 280, sales: 'R1.2M' }
  },
  {
    id: 3,
    name: 'Aisha Khan',
    role: 'Founder',
    company: 'Halaal Cosmetics ZA',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    quote: 'From product sampling to brand awareness, the expo provides everything a growing halaal brand needs. The organization is world-class.',
    rating: 5,
    stats: { leads: 200, sales: 'R680K' }
  },
  {
    id: 4,
    name: 'Mohammed Essop',
    role: 'Director',
    company: 'Islamic Finance Solutions',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    quote: 'The B2B networking opportunities are unmatched. We signed three major corporate partnerships that have shaped our business.',
    rating: 5,
    stats: { leads: 95, sales: 'R2.5M' }
  }
]

function TestimonialCard({ testimonial, isActive }: { testimonial: typeof testimonials[0]; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isActive ? 1 : 0.3, scale: isActive ? 1 : 0.95 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative p-8 bg-white shadow-lg border rounded-3xl transition-all duration-500',
        isActive ? 'border-neutral-200' : 'border-neutral-100'
      )}
    >
      {/* Quote icon */}
      <div className="absolute top-8 right-8 text-[#cd2653]/20">
        <Quote className="w-16 h-16" />
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-lg md:text-xl text-neutral-700 leading-relaxed mb-8 relative z-10">
        "{testimonial.quote}"
      </p>

      {/* Stats */}
      <div className="flex gap-6 mb-8 pb-8 border-b border-neutral-200">
        <div>
          <p className="text-2xl font-bold text-neutral-900">{testimonial.stats.leads}</p>
          <p className="text-sm text-neutral-500">Leads Generated</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#cd2653]">{testimonial.stats.sales}</p>
          <p className="text-sm text-neutral-500">in Sales</p>
        </div>
      </div>

      {/* Author */}
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-200">
          <Image
            src={testimonial.image}
            alt={testimonial.name}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-semibold text-neutral-900">{testimonial.name}</p>
          <p className="text-sm text-neutral-500">
            {testimonial.role} at {testimonial.company}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-24 relative overflow-hidden bg-neutral-100">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-100" />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6">
            Success Stories
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
            Exhibitors{' '}
            <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
              Love Us
            </span>
          </h2>
          <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
            Join hundreds of successful exhibitors who have grown their business at Cape Town Halaal Expo.
          </p>
        </motion.div>

        {/* Testimonials slider */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <TestimonialCard
                testimonial={testimonials[activeIndex]}
                isActive={true}
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={prev}
              className="w-12 h-12 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-700" />
            </motion.button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    i === activeIndex
                      ? 'w-8 bg-[#cd2653]'
                      : 'bg-neutral-300 hover:bg-neutral-400'
                  )}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={next}
              className="w-12 h-12 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5 text-neutral-700" />
            </motion.button>
          </div>
        </div>

      </div>
    </section>
  )
}
