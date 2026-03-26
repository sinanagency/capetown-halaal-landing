'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIDEOS = [
  { src: '/videos/video1.mp4', title: 'Festival Highlights' },
  { src: '/videos/video2.mp4', title: 'Vendors & Exhibitors' },
  { src: '/videos/video3.mp4', title: 'Food & Cuisine' },
  { src: '/videos/reel3.mp4', title: 'Live Entertainment' },
  { src: '/videos/reel4.mp4', title: 'Community Spirit' },
  { src: '/videos/reel5.mp4', title: 'The Experience' },
]

function VideoCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = (index: number) => {
    setActiveIndex(index)
    setProgress(0)
    setIsPlaying(true)
  }

  const next = () => goTo((activeIndex + 1) % VIDEOS.length)
  const prev = () => goTo((activeIndex - 1 + VIDEOS.length) % VIDEOS.length)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.load()
    if (isPlaying) {
      video.play().catch(() => {})
    }
  }, [activeIndex])

  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current)

    progressInterval.current = setInterval(() => {
      const video = videoRef.current
      if (video && video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }, 100)

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [activeIndex])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <div className="relative">
      {/* Main video display */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl md:rounded-3xl overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <video
              ref={videoRef}
              autoPlay
              muted={isMuted}
              playsInline
              onEnded={next}
              className="w-full h-full object-cover"
            >
              <source src={VIDEOS[activeIndex].src} type="video/mp4" />
            </video>
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Controls overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-3 md:px-6">
          {/* Prev */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prev}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>

          {/* Center play/pause */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 md:w-8 md:h-8" />
            ) : (
              <Play className="w-6 h-6 md:w-8 md:h-8 ml-1" />
            )}
          </motion.button>

          {/* Next */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={next}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
        </div>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">
                {activeIndex + 1} / {VIDEOS.length}
              </p>
              <h3 className="text-lg md:text-2xl font-bold text-white">
                {VIDEOS[activeIndex].title}
              </h3>
            </div>

            {/* Mute toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-colors flex-shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </motion.button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#cd2653] to-[#f59e0b] rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {VIDEOS.map((video, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => goTo(i)}
            className={cn(
              "relative aspect-video rounded-lg md:rounded-xl overflow-hidden border-2 transition-all duration-300",
              i === activeIndex
                ? "border-[#cd2653] shadow-lg shadow-[#cd2653]/20"
                : "border-transparent opacity-50 hover:opacity-80"
            )}
          >
            <video
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            >
              <source src={`${video.src}#t=1`} type="video/mp4" />
            </video>

            {/* Active indicator */}
            {i === activeIndex && (
              <motion.div
                layoutId="activeThumb"
                className="absolute inset-0 border-2 border-[#cd2653] rounded-lg md:rounded-xl"
              />
            )}

            {/* Title on hover */}
            <div className="absolute inset-0 bg-black/40 flex items-end p-1.5 md:p-2">
              <p className="text-white text-[10px] md:text-xs font-medium leading-tight">{video.title}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export function VideoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="video" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-neutral-950" />

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 md:mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-6">
            Watch The Experience
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            See It In{' '}
            <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
              Action
            </span>
          </h2>
          <p className="text-neutral-400 text-base md:text-lg max-w-2xl mx-auto">
            Experience the energy, excitement, and opportunities that await you at Young at Heart Festival.
          </p>
        </motion.div>

        {/* Video Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <VideoCarousel />
        </motion.div>
      </div>
    </section>
  )
}
