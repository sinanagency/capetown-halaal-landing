'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { Instagram, Facebook, MapPin, Calendar } from 'lucide-react'

// All 6 videos for the rotating panels
const VIDEOS = [
  '/videos/video1.mp4',  // 40MB
  '/videos/video2.mp4',  // 22MB
  '/videos/video3.mp4',  // 21MB
  '/videos/reel3.mp4',   // 20MB
  '/videos/reel4.mp4',   // 17MB
  '/videos/reel5.mp4',   // 19MB
]

// Mobile uses same videos
const MOBILE_VIDEOS = VIDEOS

const STATS = [
  { value: 350, suffix: '+', label: 'VENDORS' },
  { value: 25000, suffix: '+', label: 'VISITORS' },
]

// Animated text reveal - letter by letter
function AnimatedText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 50, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.03,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="inline-block"
          style={{ transformOrigin: 'bottom' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  )
}

// Glitch text effect
function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">
        <AnimatedText text={text} delay={0.3} />
      </span>
      <motion.span
        className="absolute inset-0 text-[#cd2653] z-0"
        animate={{
          x: [0, -2, 2, -1, 1, 0],
          opacity: [0, 1, 0, 1, 0, 0],
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 4,
        }}
        aria-hidden
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute inset-0 text-[#f59e0b] z-0"
        animate={{
          x: [0, 2, -2, 1, -1, 0],
          opacity: [0, 1, 0, 1, 0, 0],
        }}
        transition={{
          duration: 0.3,
          delay: 0.05,
          repeat: Infinity,
          repeatDelay: 4,
        }}
        aria-hidden
      >
        {text}
      </motion.span>
    </span>
  )
}

// Shimmer effect component
function ShimmerBorder({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -inset-[1px] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #cd2653, #f59e0b, transparent)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div className="relative bg-[#0e0e11] rounded-full">
        {children}
      </div>
    </div>
  )
}

// Floating particles with more variety
function Particles() {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    size: number
    duration: number
    delay: number
  }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 0.15,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Glowing accent particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`glow-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${Math.random() * 100}%`,
            width: 8,
            height: 8,
            background: i % 2 === 0 ? '#cd2653' : '#f59e0b',
            boxShadow: i % 2 === 0
              ? '0 0 20px #cd2653, 0 0 40px #cd2653, 0 0 60px #cd2653'
              : '0 0 20px #f59e0b, 0 0 40px #f59e0b, 0 0 60px #f59e0b',
          }}
          animate={{
            y: [0, -200, 0],
            opacity: [0, 0.9, 0],
            scale: [0.3, 1.2, 0.3],
          }}
          transition={{
            duration: 10 + i * 1.5,
            delay: i * 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// Panel position definitions (CSS positions for each of the 6 slots)
const PANEL_POSITIONS = [
  { left: '0%', top: '0%', width: '30%', height: '33.33%' },       // Left top
  { left: '0%', top: '33.33%', width: '30%', height: '33.33%' },   // Left mid
  { left: '0%', top: '66.66%', width: '30%', height: '33.34%' },   // Left bottom
  { right: '0%', top: '0%', width: '30%', height: '33.33%' },      // Right top
  { right: '0%', top: '33.33%', width: '30%', height: '33.33%' },  // Right mid
  { right: '0%', top: '66.66%', width: '30%', height: '33.34%' },  // Right bottom
]

// Rotating Video Panels - 6 videos across 6 panels, rotating every 5 seconds
function RotatingVideoPanels() {
  // Which panel each video is currently in (videoIndex -> panelIndex)
  // Initially: video 0 in panel 0, video 1 in panel 1, etc.
  const [videoPositions, setVideoPositions] = useState([0, 1, 2, 3, 4, 5])

  // Refs for all 6 video elements (one per video, persistent)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null, null, null, null])

  // Track which videos have completed
  const completedVideos = useRef<Set<number>>(new Set())

  // Rotate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Pause all videos briefly during transition
      videoRefs.current.forEach((video) => {
        if (video) video.pause()
      })

      // Rotate positions: each video moves to the next panel
      setVideoPositions(prev => {
        return prev.map(panelIdx => (panelIdx + 1) % 6)
      })

      // Resume all videos after a short delay for the transition
      setTimeout(() => {
        videoRefs.current.forEach((video) => {
          if (video) video.play().catch(() => {})
        })
      }, 100)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Track video completions and reset when all done
  const handleVideoEnded = (videoIndex: number) => {
    completedVideos.current.add(videoIndex)

    // Check if all 6 videos have completed
    if (completedVideos.current.size === 6) {
      // Reset all videos to beginning
      completedVideos.current.clear()
      videoRefs.current.forEach((video) => {
        if (video) {
          video.currentTime = 0
          video.play().catch(() => {})
        }
      })
    } else {
      // Just restart this video from beginning
      const video = videoRefs.current[videoIndex]
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})
      }
    }
  }

  // Ken Burns animation for each video - run once on mount
  useEffect(() => {
    const setupAnimation = () => {
      videoRefs.current.forEach((video, idx) => {
        if (!video) return
        gsap.killTweensOf(video)
        gsap.fromTo(
          video,
          { scale: 1, x: 0, y: 0 },
          {
            scale: 1.1,
            x: Math.random() > 0.5 ? 15 : -15,
            y: 10,
            duration: 12,
            repeat: -1,
            yoyo: true,
            ease: 'none',
          }
        )
      })
    }

    // Wait for videos to mount
    const timer = setTimeout(setupAnimation, 100)
    return () => clearTimeout(timer)
  }, [])

  // Get gradient direction based on which side a panel is on
  const getGradientClass = (panelIndex: number) => {
    const isLeft = panelIndex < 3
    return isLeft
      ? 'bg-gradient-to-l from-[#0e0e11] via-transparent to-transparent'
      : 'bg-gradient-to-r from-[#0e0e11] via-transparent to-transparent'
  }

  return (
    <>
      {/* Render all 6 videos - they move between panels */}
      {VIDEOS.map((videoSrc, videoIndex) => {
        const panelIndex = videoPositions[videoIndex]
        const position = PANEL_POSITIONS[panelIndex]
        const isLeftSide = panelIndex < 3

        return (
          <motion.div
            key={videoIndex}
            className="absolute overflow-hidden"
            initial={false}
            animate={{
              left: position.left || 'auto',
              right: position.right || 'auto',
              top: position.top,
              width: position.width,
              height: position.height,
            }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <video
              ref={el => { videoRefs.current[videoIndex] = el }}
              autoPlay
              muted
              playsInline
              onEnded={() => handleVideoEnded(videoIndex)}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>

            {/* Gradient overlay toward center */}
            <div
              className={`absolute inset-0 pointer-events-none ${getGradientClass(panelIndex)}`}
              style={{ opacity: 0.9 }}
            />

            {/* Corner accent */}
            <div className={`absolute top-2 ${isLeftSide ? 'right-2' : 'left-2'} w-6 h-6`}>
              <motion.div
                className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#cd2653] to-transparent"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: videoIndex * 0.2 }}
              />
              <motion.div
                className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-[#cd2653] to-transparent"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: videoIndex * 0.2 + 0.5 }}
              />
            </div>
          </motion.div>
        )
      })}

      {/* Left edge glow */}
      <div className="absolute top-0 bottom-0 left-[30%] w-1 z-20 -translate-x-1/2">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent, #cd2653, #f59e0b, #cd2653, transparent)`,
            boxShadow: '0 0 20px #cd2653, 0 0 40px #cd2653',
          }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-full h-20 bg-gradient-to-b from-transparent via-white/50 to-transparent"
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
        />
      </div>

      {/* Right edge glow */}
      <div className="absolute top-0 bottom-0 right-[30%] w-1 z-20 translate-x-1/2">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent, #cd2653, #f59e0b, #cd2653, transparent)`,
            boxShadow: '0 0 20px #cd2653, 0 0 40px #cd2653',
          }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-full h-20 bg-gradient-to-b from-transparent via-white/50 to-transparent"
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
        />
      </div>

      {/* Center content area */}
      <div className="absolute left-[30%] right-[30%] top-0 bottom-0 bg-[#0e0e11] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e11] via-[#0e0e11]/90 to-[#0e0e11]" />
      </div>
    </>
  )
}

// Mobile panel positions (3 stacked panels, full width)
const MOBILE_PANEL_POSITIONS = [
  { top: '0%', height: '33.33%' },      // Top
  { top: '33.33%', height: '33.33%' },  // Middle
  { top: '66.66%', height: '33.34%' },  // Bottom
]

// Mobile video background - 3 stacked panels with 6 rotating videos
function MobileVideoBackground() {
  // Which panel position each video is in (0-2 visible, 3-5 off-screen)
  // videoPositions[videoIndex] = panelIndex (0, 1, 2 = visible panels, 3, 4, 5 = off-screen)
  const [videoPositions, setVideoPositions] = useState([0, 1, 2, 3, 4, 5])

  // Refs for all 6 video elements
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null, null, null, null])

  // Track completed videos
  const completedVideos = useRef<Set<number>>(new Set())

  // Rotate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Pause all videos briefly
      videoRefs.current.forEach((video) => {
        if (video) video.pause()
      })

      // Rotate: each video moves to next position (circular through 6 positions)
      setVideoPositions(prev => prev.map(pos => (pos + 1) % 6))

      // Resume after transition
      setTimeout(() => {
        videoRefs.current.forEach((video) => {
          if (video) video.play().catch(() => {})
        })
      }, 100)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Handle video ended
  const handleVideoEnded = (videoIndex: number) => {
    completedVideos.current.add(videoIndex)

    if (completedVideos.current.size === 6) {
      completedVideos.current.clear()
      videoRefs.current.forEach((video) => {
        if (video) {
          video.currentTime = 0
          video.play().catch(() => {})
        }
      })
    } else {
      const video = videoRefs.current[videoIndex]
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})
      }
    }
  }

  // Ken Burns animation
  useEffect(() => {
    const timer = setTimeout(() => {
      videoRefs.current.forEach((video) => {
        if (!video) return
        gsap.killTweensOf(video)
        gsap.fromTo(
          video,
          { scale: 1, y: 0 },
          { scale: 1.15, y: 10, duration: 10, repeat: -1, yoyo: true, ease: 'none' }
        )
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Render all 6 videos - only 3 visible at a time */}
      {VIDEOS.map((videoSrc, videoIndex) => {
        const panelIndex = videoPositions[videoIndex]
        const isVisible = panelIndex < 3
        const position = MOBILE_PANEL_POSITIONS[panelIndex] || MOBILE_PANEL_POSITIONS[0]

        return (
          <motion.div
            key={videoIndex}
            className="absolute left-0 right-0 overflow-hidden"
            initial={false}
            animate={{
              top: isVisible ? position.top : '-100%',
              height: position.height,
              opacity: isVisible ? 1 : 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <video
              ref={el => { videoRefs.current[videoIndex] = el }}
              autoPlay
              muted
              playsInline
              onEnded={() => handleVideoEnded(videoIndex)}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </motion.div>
        )
      })}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-[#0e0e11]/50 to-transparent pointer-events-none z-10" />

      {/* Middle panel darker overlay for text readability */}
      <div
        className="absolute left-0 right-0 top-[33.33%] h-[33.33%] pointer-events-none z-10"
        style={{ background: 'rgba(14, 14, 17, 0.65)' }}
      />

      {/* Panel divider lines */}
      <div className="absolute left-0 right-0 top-[33.33%] h-[2px] z-20">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#cd2653] to-transparent"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <div className="absolute left-0 right-0 top-[66.66%] h-[2px] z-20">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Animated border frame */}
      <div className="absolute inset-2 pointer-events-none z-20">
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#cd2653] to-transparent"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        />
      </div>
    </div>
  )
}

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const targetTime = useRef(targetDate.getTime())

  useEffect(() => {
    const calculate = () => {
      const diff = targetTime.current - Date.now()
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        })
      }
    }
    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [])

  return timeLeft
}

// Animated countdown digit with flip effect
function CountdownDigit({ value, label }: { value: number; label: string }) {
  const displayValue = value.toString().padStart(2, '0')

  return (
    <div className="text-center">
      <div className="relative">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-4xl md:text-6xl font-black tabular-nums relative"
            style={{
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 30px rgba(205, 38, 83, 0.5)',
            }}
          >
            {displayValue}
          </motion.div>
        </AnimatePresence>
        {/* Glow underline */}
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#cd2653] to-transparent"
          animate={{ width: ['30%', '80%', '30%'], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <motion.div
        className="text-[10px] md:text-xs text-white/40 tracking-[0.15em] md:tracking-[0.2em] mt-2"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {label}
      </motion.div>
    </div>
  )
}

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!ref.current || hasAnimated) return
    setHasAnimated(true)
    gsap.fromTo(
      ref.current,
      { innerText: 0 },
      {
        innerText: value,
        duration: 2,
        ease: 'power2.out',
        delay: 0.8,
        snap: { innerText: 1 },
        onUpdate: function () {
          if (ref.current) {
            ref.current.innerText = Math.floor(Number(ref.current.innerText)).toLocaleString() + suffix
          }
        },
      }
    )
  }, [value, suffix, hasAnimated])

  return <span ref={ref}>0{suffix}</span>
}

// Noise overlay for texture
function NoiseOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-50 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}

// Scan lines effect
function ScanLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-40 opacity-[0.03]"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
      }}
    />
  )
}

export default function HomePage() {
  const targetDate = new Date('2026-12-11T09:00:00')
  const timeLeft = useCountdown(targetDate)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 1024)
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!mounted) return null

  return (
    <div className="h-screen bg-[#0e0e11] text-white overflow-hidden relative">
      {isMobile ? (
        <>
          <MobileVideoBackground />
        </>
      ) : (
        <>
          {/* 6-panel rotating video system */}
          <RotatingVideoPanels />
        </>
      )}

      {/* Scan lines effect */}
      <ScanLines />

      {/* Noise texture overlay */}
      <NoiseOverlay />

      {/* Particles - everywhere on screen */}
      <Particles />

      {/* Logo - top center on DESKTOP only (mobile has logo in panel 1) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-30 hidden lg:block"
      >
        <div className="relative">
          <motion.img
            src="/logo.png"
            alt="Cape Town Halaal"
            className="w-48 lg:w-72 h-48 lg:h-72 object-contain relative z-10"
            animate={{
              filter: ['drop-shadow(0 0 6px rgba(205, 38, 83, 0.2))', 'drop-shadow(0 0 12px rgba(205, 38, 83, 0.35))', 'drop-shadow(0 0 6px rgba(205, 38, 83, 0.2))']
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Content - Different layout for mobile vs desktop */}
      {isMobile ? (
        /* MOBILE LAYOUT - All content in panel 2, logo at bottom */
        <div className="relative z-20 h-full">
          {/* PANEL 1 (0-33%): Just video, no content */}

          {/* PANEL 2 (33%-66%): All content + logo - Apple HIG spacing */}
          <div className="absolute top-[33.33%] left-0 right-0 h-[33.33%] flex flex-col items-center justify-center px-6">

            {/* Event Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-3" /* 12px gap to title */
            >
              <ShimmerBorder>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full">
                  <Calendar className="w-3 h-3 text-[#cd2653]" />
                  <span className="text-[11px] font-semibold tracking-wider text-[#cd2653]">
                    DECEMBER 11-13, 2026
                  </span>
                </div>
              </ShimmerBorder>
            </motion.div>

            {/* HERO: Title Block - tight leading within, space after */}
            <div className="mb-4"> {/* 16px gap to info group */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[26px] font-black text-center leading-[1] tracking-tight"
              >
                <GlitchText text="YOUNG AT HEART" />
              </motion.h1>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[26px] font-black text-center leading-[1] tracking-tight -mt-0.5"
              >
                <motion.span
                  className="bg-gradient-to-r from-[#cd2653] via-[#e84c6f] to-[#f59e0b] bg-clip-text text-transparent bg-[length:200%_auto]"
                  animate={{ backgroundPosition: ['0% center', '200% center'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <AnimatedText text="FESTIVAL" delay={0.6} />
                </motion.span>
              </motion.h1>
            </div>

            {/* Info Group: Tagline + Location - tight spacing within */}
            <div className="mb-4 flex flex-col items-center"> {/* 16px gap to data group */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-[11px] text-white/60 text-center"
              >
                South Africa's Biggest Halaal Lifestyle Expo
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-[10px] text-white/40 flex items-center gap-1 mt-1" /* 4px gap within group */
              >
                <MapPin className="w-3 h-3" />
                Green Point A Track, Cape Town
              </motion.div>
            </div>

            {/* Data Group: Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="flex gap-4 mb-3" /* 12px gap to stats */
            >
              {[
                { value: timeLeft.days, label: 'DAYS' },
                { value: timeLeft.hours, label: 'HRS' },
                { value: timeLeft.minutes, label: 'MIN' },
                { value: timeLeft.seconds, label: 'SEC' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl font-black tabular-nums leading-none">{item.value.toString().padStart(2, '0')}</div>
                  <div className="text-[8px] text-white/40 tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Data Group: Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex gap-8 mb-4" /* 16px gap to logo */
            >
              {STATS.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-lg font-black text-[#cd2653] leading-none">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[8px] text-white/40 tracking-wider mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Brand Anchor: Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <motion.img
                src="/logo.png"
                alt="Cape Town Halaal"
                className="w-14 h-14 object-contain"
                animate={{
                  filter: ['drop-shadow(0 0 6px rgba(205, 38, 83, 0.3))', 'drop-shadow(0 0 12px rgba(205, 38, 83, 0.5))', 'drop-shadow(0 0 6px rgba(205, 38, 83, 0.3))']
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* PANEL 3 (66%-100%): Just video, no content */}
        </div>
      ) : (
        /* DESKTOP LAYOUT - Centered content */
        <div className="relative z-20 h-full flex flex-col items-center justify-center px-6">
          {/* Date badge with shimmer */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <ShimmerBorder className="mb-6 md:mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Calendar className="w-4 h-4 text-[#cd2653]" />
                </motion.div>
                <span className="text-sm font-semibold tracking-wider text-[#cd2653]">
                  DECEMBER 11-13, 2026
                </span>
              </div>
            </ShimmerBorder>
          </motion.div>

          {/* Main title with letter animation */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-5xl lg:text-6xl font-black text-center leading-[0.9] tracking-tight mb-1"
          >
            <GlitchText text="YOUNG AT HEART" />
          </motion.h1>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-5xl lg:text-6xl font-black text-center leading-[0.9] tracking-tight mb-6"
          >
            <motion.span
              className="bg-gradient-to-r from-[#cd2653] via-[#e84c6f] to-[#f59e0b] bg-clip-text text-transparent bg-[length:200%_auto]"
              animate={{ backgroundPosition: ['0% center', '200% center'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <AnimatedText text="FESTIVAL" delay={0.6} />
            </motion.span>
          </motion.h1>

          {/* Tagline with fade */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-lg text-white/60 text-center mb-2 font-medium px-4"
          >
            South Africa's Biggest Halaal Lifestyle Expo
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="text-sm text-white/40 flex items-center gap-2 mb-8"
          >
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <MapPin className="w-4 h-4" />
            </motion.span>
            Green Point A Track, Cape Town
          </motion.div>

          {/* Countdown with flip effect */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex gap-10 mb-10"
          >
            <CountdownDigit value={timeLeft.days} label="DAYS" />
            <CountdownDigit value={timeLeft.hours} label="HRS" />
            <CountdownDigit value={timeLeft.minutes} label="MIN" />
            <CountdownDigit value={timeLeft.seconds} label="SEC" />
          </motion.div>

          {/* Stats with glow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="flex gap-12"
          >
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              className="text-center"
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <motion.div
                className="text-3xl font-black text-[#cd2653]"
                animate={{
                  textShadow: [
                    '0 0 10px rgba(205, 38, 83, 0.3)',
                    '0 0 20px rgba(205, 38, 83, 0.6)',
                    '0 0 10px rgba(205, 38, 83, 0.3)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              >
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </motion.div>
              <div className="text-[10px] text-white/40 tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
          </motion.div>
        </div>
      )}

      {/* Social links - center bottom on all devices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30"
      >
        <motion.a
          href="https://www.instagram.com/capetownhalaal/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/20 hover:border-[#cd2653] hover:bg-[#cd2653]/10 flex items-center justify-center transition-all"
          whileHover={{ scale: 1.2, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
        >
          <Instagram className="w-4 h-4" />
        </motion.a>
        <motion.a
          href="https://www.facebook.com/capetownhalaal/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/20 hover:border-[#cd2653] hover:bg-[#cd2653]/10 flex items-center justify-center transition-all"
          whileHover={{ scale: 1.2, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
        >
          <Facebook className="w-4 h-4" />
        </motion.a>
      </motion.div>

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(14, 14, 17, 0.4) 100%)',
        }}
      />
    </div>
  )
}
