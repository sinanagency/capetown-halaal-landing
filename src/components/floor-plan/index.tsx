'use client'

import { Suspense, useState, useEffect, Component, ReactNode } from 'react'
import { useBoothStore } from '@/lib/store'
import { FloorPlan2D } from './floor-plan-2d'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Box, Grid2X2, AlertTriangle } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import 3D component with SSR disabled (WebGL only works client-side)
const FloorPlan3D = dynamic(() => import('./floor-plan-3d').then((mod) => ({ default: mod.FloorPlan3D })), {
  ssr: false,
  loading: () => <LoadingFallback />,
})

// Check if WebGL is supported
function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return gl !== null
  } catch (e) {
    return false
  }
}

// Error boundary for 3D rendering failures
interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('3D rendering failed, falling back to 2D:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function LoadingFallback() {
  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#cd2653] rounded-full animate-spin" />
        <p className="text-gray-400">Loading floor plan...</p>
      </div>
    </div>
  )
}

function WebGLNotSupported() {
  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <p className="text-gray-300 font-medium">3D view not supported on this device</p>
        <p className="text-gray-500 text-sm">Please use the 2D view to browse booths</p>
      </div>
    </div>
  )
}

export function FloorPlan() {
  const { viewMode, setViewMode, loadBooths } = useBoothStore()
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWebglSupported(isWebGLSupported())
    loadBooths()
  }, [loadBooths])

  // Auto-switch to 2D if WebGL not supported
  useEffect(() => {
    if (mounted && webglSupported === false && viewMode === '3d') {
      setViewMode('2d')
    }
  }, [mounted, webglSupported, viewMode, setViewMode])

  // Show loading while checking WebGL support
  if (!mounted) {
    return <LoadingFallback />
  }

  const show3D = viewMode === '3d' && webglSupported

  return (
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Venue Floor Plan</h2>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as '3d' | '2d')}>
          <TabsList className="bg-white/5">
            <TabsTrigger
              value="3d"
              className="gap-2 data-[state=active]:bg-white/10"
              disabled={webglSupported === false}
              title={webglSupported === false ? '3D not supported on this device' : ''}
            >
              <Box className="w-4 h-4" />
              3D
            </TabsTrigger>
            <TabsTrigger value="2d" className="gap-2 data-[state=active]:bg-white/10">
              <Grid2X2 className="w-4 h-4" />
              2D
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Floor plan */}
      <div className="flex-1">
        {show3D ? (
          <WebGLErrorBoundary fallback={<FloorPlan2D />}>
            <Suspense fallback={<LoadingFallback />}>
              <FloorPlan3D />
            </Suspense>
          </WebGLErrorBoundary>
        ) : viewMode === '3d' && webglSupported === false ? (
          <WebGLNotSupported />
        ) : (
          <FloorPlan2D />
        )}
      </div>
    </div>
  )
}

export { FloorPlan2D } from './floor-plan-2d'
