'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Share2, Maximize2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SiteMap } from '@/components/site-map'

export default function SiteMapPage() {
  const handleDownloadPDF = () => {
    // Open the official PDF in a new tab
    window.open('https://cthalaal.co.za/wp-content/uploads/2025/12/Cape-Town-Halaal-Site-Map-2025-v2.pdf', '_blank')
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Young at Heart Festival 2026 - Site Map',
        text: 'Check out the site map for Young at Heart Festival 2026!',
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handleFullscreen = () => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Logo size="sm" showText={true} />
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <h1 className="text-lg font-semibold">Interactive Site Map</h1>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFullscreen}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </motion.button>

              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#cd2653] hover:bg-[#bf3026] rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Young at Heart{' '}
              <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
                2026
              </span>
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Explore our interactive site map featuring 350+ vendors across food, fashion, beauty, home decor, and more.
              Click on any booth to see vendor details.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { value: '200+', label: 'Vendors' },
              { value: '50+', label: 'Food Stalls' },
              { value: '9', label: 'Categories' },
              { value: '20,000m²', label: 'Venue Size' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-neutral-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Site Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SiteMap />
          </motion.div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10"
          >
            <h3 className="font-semibold text-white mb-2">How to use</h3>
            <ul className="text-sm text-neutral-400 space-y-1">
              <li>• <strong>Zoom:</strong> Use scroll wheel or +/- buttons</li>
              <li>• <strong>Pan:</strong> Click and drag to move around</li>
              <li>• <strong>Search:</strong> Type vendor name to find specific booths</li>
              <li>• <strong>Filter:</strong> Click category buttons to show specific types</li>
              <li>• <strong>Details:</strong> Click any booth to see vendor information</li>
            </ul>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-neutral-500">
            © 2026 Young at Heart Festival. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
