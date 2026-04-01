'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
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

// Masonry-like pattern for grid
const SPAN_PATTERN = [
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-2', // tall
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-2', // tall
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
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

export function GallerySection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () => setLightboxIndex((prev) => prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : 0)
  const nextImage = () => setLightboxIndex((prev) => prev !== null ? (prev + 1) % GALLERY_IMAGES.length : 0)

  return (
    <>
      <section id="gallery" className="py-16 md:py-24 bg-white">
        <div ref={ref} className="container mx-auto px-4">
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

          {/* Desktop: masonry grid */}
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]">
            {GALLERY_IMAGES.map((image, i) => (
              <motion.div
                key={image.src}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className={`${SPAN_PATTERN[i]} relative group cursor-pointer overflow-hidden rounded-xl`}
                onClick={() => openLightbox(i)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(min-width: 1024px) 25vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
              </motion.div>
            ))}
          </div>

          {/* Mobile: 2-column grid */}
          <div className="grid md:hidden grid-cols-2 gap-2">
            {GALLERY_IMAGES.slice(0, 8).map((image, i) => (
              <motion.div
                key={image.src}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`relative cursor-pointer overflow-hidden rounded-lg ${i === 0 || i === 5 ? 'aspect-[3/4]' : 'aspect-square'}`}
                onClick={() => openLightbox(i)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              </motion.div>
            ))}
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
