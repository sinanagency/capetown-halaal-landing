'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Play, X, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoId?: string
}

function VideoModal({ isOpen, onClose, videoId = 'dQw4w9WgXcQ' }: VideoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>

          {/* Video container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function VideoSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <>
      <section id="video" className="py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-950" />

        <div ref={containerRef} className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6">
              Watch The Experience
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              See It In{' '}
              <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
                Action
              </span>
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Experience the energy, excitement, and opportunities that await you at Cape Town Halaal Expo.
            </p>
          </motion.div>

          {/* Video thumbnail */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-5xl mx-auto"
          >
            <div
              className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              {/* Thumbnail image */}
              <Image
                src="https://images.unsplash.com/photo-1560439514-4e9645039924?w=1920&q=80"
                alt="Expo highlights"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:via-black/50 transition-colors duration-500" />

              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />

                  {/* Button */}
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                    <Play className="w-10 h-10 md:w-12 md:h-12 text-white ml-1" />
                  </div>
                </motion.div>
              </div>

              {/* Video info */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-white/60 text-sm uppercase tracking-wider mb-2">
                    Expo Highlights 2025
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white">
                    The Cape Town Halaal Experience
                  </h3>
                </motion.div>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-white/20 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-white/20 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-white/20 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-white/20 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>

          {/* Video stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mt-12"
          >
            {[
              { value: '2:34', label: 'Video Length' },
              { value: '50K+', label: 'Views' },
              { value: '2025', label: 'Highlights' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
