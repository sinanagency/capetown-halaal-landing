'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'

const VIDEOS = [
  '/videos/video1.mp4',
  '/videos/video2.mp4',
  '/videos/video3.mp4',
  '/videos/reel3.mp4',
  '/videos/reel4.mp4',
  '/videos/reel5.mp4',
]

const CLIP_DURATION = 3000 // 3 seconds per clip

function VideoReel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % VIDEOS.length)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.src = VIDEOS[currentIndex]
    video.currentTime = 0
    video.play().catch(() => {})

    timerRef.current = setTimeout(advance, CLIP_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIndex, advance])

  return (
    <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl md:rounded-3xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Progress dots only — no titles */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <div className="flex gap-1.5">
          {VIDEOS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 overflow-hidden bg-white/20"
            >
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: i === currentIndex ? '100%' : i < currentIndex ? '100%' : '0%'
                }}
                transition={i === currentIndex ? { duration: CLIP_DURATION / 1000, ease: 'linear' } : { duration: 0.2 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function VideoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="video" className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-950" />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 md:mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-4 md:mb-6">
            Watch The Experience
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4">
            See It In{' '}
            <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
              Action
            </span>
          </h2>
          <p className="text-neutral-400 text-sm md:text-lg max-w-2xl mx-auto px-2">
            Experience the energy, excitement, and opportunities that await you at Young at Heart Festival.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <VideoReel />
        </motion.div>
      </div>
    </section>
  )
}
