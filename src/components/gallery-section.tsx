'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, useInView, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const GALLERY_IMAGES = [
  { src: '/gallery/gallery-3214.jpg', alt: 'Festival vendors and visitors' },
  { src: '/gallery/gallery-3280.jpg', alt: 'Exhibition stalls' },
  { src: '/gallery/gallery-3367.jpg', alt: 'Festival atmosphere' },
  { src: '/gallery/gallery-3379.jpg', alt: 'Vendor displays' },
  { src: '/gallery/gallery-3350.jpg', alt: 'Festival crowd' },
  { src: '/gallery/gallery-3412.jpg', alt: 'Event highlights' },
  { src: '/gallery/gallery-3389.jpg', alt: 'Exhibition booths' },
  { src: '/gallery/gallery-3396.jpg', alt: 'Festival activities' },
  { src: '/gallery/gallery-3358.jpg', alt: 'Vendor showcase' },
  { src: '/gallery/gallery-3230.jpg', alt: 'Festival grounds' },
  { src: '/gallery/gallery-wa1.jpg', alt: 'Event moments' },
  { src: '/gallery/gallery-3450.jpg', alt: 'Festival experience' },
]

function Lightbox({ images, currentIndex, onClose, onPrev, onNext }: {
  images: typeof GALLERY_IMAGES
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPrev() }}
        className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext() }}
        className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-[90vw] h-[80vh] max-w-5xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={images[currentIndex].src}
            alt={images[currentIndex].alt}
            fill
            className="object-contain"
            sizes="90vw"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </motion.div>
  )
}

function Card3D({ image, index, onClick }: { image: typeof GALLERY_IMAGES[0]; index: number; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 })

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className="relative cursor-pointer group"
    >
      <motion.div
        initial={{ opacity: 0, y: 50, rotateX: 15 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, delay: index * 0.06, ease: [0.215, 0.61, 0.355, 1] }}
        className="relative overflow-hidden rounded-xl shadow-lg group-hover:shadow-2xl group-hover:shadow-[#cd2653]/10 transition-shadow duration-500"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className={`relative ${index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
        </div>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)',
            transform: 'translateZ(1px)',
          }}
        />

        {/* Bottom gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.div>
    </motion.div>
  )
}

// Auto-scrolling row for mobile
function ScrollingRow({ images, direction, speed, onImageClick }: {
  images: typeof GALLERY_IMAGES
  direction: 'left' | 'right'
  speed: number
  onImageClick: (index: number) => void
}) {
  const doubled = [...images, ...images]

  return (
    <div className="overflow-hidden" style={{
      maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
    }}>
      <motion.div
        className="flex gap-3"
        animate={{ x: direction === 'left' ? [0, -50 * images.length] : [-50 * images.length, 0] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        style={{ width: 'max-content' }}
      >
        {doubled.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            className="flex-shrink-0 w-[200px] h-[260px] relative rounded-xl overflow-hidden cursor-pointer"
            onClick={() => onImageClick(i % images.length)}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export function GallerySection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () => setLightboxIndex((prev) => prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : 0)
  const nextImage = () => setLightboxIndex((prev) => prev !== null ? (prev + 1) % GALLERY_IMAGES.length : 0)

  const row1 = GALLERY_IMAGES.slice(0, 6)
  const row2 = GALLERY_IMAGES.slice(6)

  return (
    <>
      <section id="gallery" className="py-16 md:py-24 bg-white overflow-hidden" style={{ perspective: '1200px' }}>
        <div ref={sectionRef} className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-10 md:mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-[#cd2653]/10 border border-[#cd2653]/20 rounded-full text-[#cd2653] text-sm font-medium mb-4 md:mb-6">
              Previous Events
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-3 md:mb-4">
              Festival{' '}
              <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
                Gallery
              </span>
            </h2>
            <p className="text-neutral-600 text-sm md:text-lg max-w-2xl mx-auto px-2">
              Relive the energy and excitement from previous Young at Heart festivals.
            </p>
          </motion.div>

          {/* Desktop: 3D tilt grid */}
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-4" style={{ perspective: '1000px' }}>
            {GALLERY_IMAGES.map((image, i) => (
              <Card3D
                key={image.src}
                image={image}
                index={i}
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>

          {/* Mobile: auto-scrolling dual rows */}
          <div className="md:hidden space-y-3">
            <ScrollingRow images={row1} direction="left" speed={30} onImageClick={openLightbox} />
            <ScrollingRow images={row2} direction="right" speed={35} onImageClick={(i) => openLightbox(i + 6)} />
          </div>
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={GALLERY_IMAGES}
            currentIndex={lightboxIndex}
            onClose={closeLightbox}
            onPrev={prevImage}
            onNext={nextImage}
          />
        )}
      </AnimatePresence>
    </>
  )
}
