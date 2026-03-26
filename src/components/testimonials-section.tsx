'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    id: 1,
    name: 'Fatima H.',
    role: 'Food Business Owner',
    company: 'Cape Malay Delights',
    quote: 'The Young at Heart Festival transformed our small family business. We connected with distributors and now supply to major retailers across South Africa.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Yusuf P.',
    role: 'CEO',
    company: 'Modest Fashion Co.',
    quote: "The quality of visitors is exceptional. We've grown our customer base significantly since exhibiting at the festival. It's now our main marketing channel.",
    rating: 5,
  },
  {
    id: 3,
    name: 'Aisha K.',
    role: 'Founder',
    company: 'Cosmetics ZA',
    quote: 'From product sampling to brand awareness, the festival provides everything a growing lifestyle brand needs. The organization is world-class.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Mohammed E.',
    role: 'Director',
    company: 'Islamic Finance Solutions',
    quote: 'The B2B networking opportunities are unmatched. We signed three major corporate partnerships that have shaped our business.',
    rating: 5,
  }
]

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="relative p-6 md:p-8 bg-white shadow-lg border border-neutral-200 rounded-2xl md:rounded-3xl">
      {/* Quote icon */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 text-[#cd2653]/20">
        <Quote className="w-10 h-10 md:w-16 md:h-16" />
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-4 md:mb-6">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-base md:text-xl text-neutral-700 leading-relaxed mb-6 md:mb-8 relative z-10 pr-8">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {/* Author — no photo, just name and role */}
      <div className="pt-6 border-t border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#cd2653] to-[#f59e0b] flex items-center justify-center text-white font-bold text-sm">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{testimonial.name}</p>
            <p className="text-sm text-neutral-500">
              {testimonial.role}, {testimonial.company}
            </p>
          </div>
        </div>
      </div>
    </div>
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
    <section className="py-16 md:py-24 relative overflow-hidden bg-neutral-100">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-100" />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-4 md:mb-6">
            Success Stories
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4 md:mb-6">
            Exhibitors{' '}
            <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
              Love Us
            </span>
          </h2>
          <p className="text-neutral-600 text-sm md:text-lg max-w-2xl mx-auto px-2">
            Join hundreds of successful exhibitors who have grown their business at Young at Heart Festival.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <TestimonialCard testimonial={testimonials[activeIndex]} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6 md:mt-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={prev}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-700" />
            </motion.button>

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
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5 text-neutral-700" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  )
}
