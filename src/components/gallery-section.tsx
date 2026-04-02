'use client'

import { useState, useRef, useEffect } from 'react'
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
      <button onClick={(e) => { e.stopPropagation(); onClose() }} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onPrev() }} className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onNext() }} className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
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
          <Image src={images[currentIndex].src} alt={images[currentIndex].alt} fill className="object-contain" sizes="90vw" />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// Each puzzle piece has its own slow drift animation
const PUZZLE_CELLS = [
  // Row 1
  { img: 0, className: 'col-span-2 row-span-2', drift: { x: [0, 6, -4, 0], y: [0, -5, 3, 0] } },
  { img: 1, className: 'col-span-1 row-span-1', drift: { x: [0, -5, 3, 0], y: [0, 4, -6, 0] } },
  { img: 2, className: 'col-span-1 row-span-2', drift: { x: [0, 4, -3, 0], y: [0, -3, 5, 0] } },
  { img: 3, className: 'col-span-1 row-span-1', drift: { x: [0, -6, 2, 0], y: [0, 5, -4, 0] } },
  // Row 2 (fills gaps)
  { img: 4, className: 'col-span-1 row-span-1', drift: { x: [0, 3, -5, 0], y: [0, -4, 6, 0] } },
  { img: 5, className: 'col-span-1 row-span-1', drift: { x: [0, -4, 6, 0], y: [0, 3, -5, 0] } },
  // Row 3
  { img: 6, className: 'col-span-1 row-span-1', drift: { x: [0, 5, -3, 0], y: [0, -6, 4, 0] } },
  { img: 7, className: 'col-span-1 row-span-2', drift: { x: [0, -3, 5, 0], y: [0, 4, -3, 0] } },
  { img: 8, className: 'col-span-2 row-span-1', drift: { x: [0, 4, -6, 0], y: [0, -5, 3, 0] } },
  { img: 9, className: 'col-span-1 row-span-1', drift: { x: [0, -5, 4, 0], y: [0, 6, -5, 0] } },
  // Row 4 (fills gaps)
  { img: 10, className: 'col-span-1 row-span-1', drift: { x: [0, 6, -4, 0], y: [0, -3, 5, 0] } },
  { img: 11, className: 'col-span-2 row-span-1', drift: { x: [0, -4, 3, 0], y: [0, 5, -6, 0] } },
]

function PuzzlePiece({ cell, image, index, onClick, isInView }: {
  cell: typeof PUZZLE_CELLS[0]
  image: typeof GALLERY_IMAGES[0]
  index: number
  onClick: () => void
  isInView: boolean
}) {
  return (
    <motion.div
      className={`${cell.className} relative cursor-pointer group`}
      initial={{ opacity: 0, scale: 0.8, rotate: (index % 2 === 0 ? -3 : 3) }}
      animate={isInView ? {
        opacity: 1,
        scale: 1,
        rotate: 0,
      } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      onClick={onClick}
    >
      {/* The drifting inner piece */}
      <motion.div
        className="absolute inset-[2px] rounded-lg overflow-hidden"
        animate={{
          x: cell.drift.x,
          y: cell.drift.y,
        }}
        transition={{
          duration: 8 + index * 0.7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        {/* Subtle border glow on hover */}
        <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-white/30 transition-all duration-300" />
      </motion.div>
    </motion.div>
  )
}

// Mobile: sliding puzzle rows
function PuzzleRow({ images, direction, speed, onImageClick }: {
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
        className="flex gap-2"
        animate={{ x: direction === 'left' ? [0, -50 * images.length] : [-50 * images.length, 0] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        style={{ width: 'max-content' }}
      >
        {doubled.map((img, i) => (
          <motion.div
            key={`${img.src}-${i}`}
            className="flex-shrink-0 w-[180px] h-[240px] relative rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onImageClick(i % images.length)}
            animate={{
              y: [0, i % 2 === 0 ? -4 : 4, 0],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="180px" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export function GallerySection() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () => setLightboxIndex((prev) => prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : 0)
  const nextImage = () => setLightboxIndex((prev) => prev !== null ? (prev + 1) % GALLERY_IMAGES.length : 0)

  const row1 = GALLERY_IMAGES.slice(0, 6)
  const row2 = GALLERY_IMAGES.slice(6)

  return (
    <>
      <section id="gallery" className="py-16 md:py-24 bg-neutral-950 overflow-hidden">
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
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4">
              Festival{' '}
              <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
                Gallery
              </span>
            </h2>
            <p className="text-neutral-400 text-sm md:text-lg max-w-2xl mx-auto px-2">
              Relive the energy and excitement from previous Young at Heart festivals.
            </p>
          </motion.div>

          {/* Desktop: puzzle grid with drifting pieces */}
          <div className="hidden md:grid grid-cols-5 auto-rows-[140px] gap-1 max-w-5xl mx-auto">
            {PUZZLE_CELLS.map((cell, i) => (
              <PuzzlePiece
                key={GALLERY_IMAGES[cell.img].src}
                cell={cell}
                image={GALLERY_IMAGES[cell.img]}
                index={i}
                onClick={() => openLightbox(cell.img)}
                isInView={isInView}
              />
            ))}
          </div>

          {/* Mobile: drifting scroll rows */}
          <div className="md:hidden space-y-2">
            <PuzzleRow images={row1} direction="left" speed={25} onImageClick={openLightbox} />
            <PuzzleRow images={row2} direction="right" speed={30} onImageClick={(i) => openLightbox(i + 6)} />
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
