'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  MeshDistortMaterial,
  Sphere,
  Environment,
  PerspectiveCamera,
  OrbitControls,
  Text,
  RoundedBox,
  MeshReflectorMaterial,
  Sparkles,
  Stars,
  Cloud,
  useTexture
} from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// Brand colors
const BRAND_RED = '#cd2653'
const BRAND_DARK = '#bf3026'

// Booth tier colors matching the actual product
const TIER_COLORS = {
  standard: '#3b82f6',   // Blue
  premium: '#f59e0b',    // Amber
  deluxe: '#8b5cf6',     // Purple
  corner: '#cd2653',     // Brand red
}

interface BoothProps {
  position: [number, number, number]
  size: number
  color: string
  tier: string
  id: number
  isHovered: boolean
  onHover: (id: number | null) => void
}

function Booth({ position, size, color, tier, id, isHovered, onHover }: BoothProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hoverScale, setHoverScale] = useState(1)

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + id) * 0.02

      // Smooth scale transition
      const targetScale = isHovered ? 1.15 : 1
      setHoverScale(prev => THREE.MathUtils.lerp(prev, targetScale, 0.1))
      meshRef.current.scale.setScalar(hoverScale)
    }
  })

  return (
    <group position={position}>
      {/* Main booth body */}
      <RoundedBox
        ref={meshRef}
        args={[size, size * 0.8, size]}
        radius={0.05}
        smoothness={4}
        onPointerOver={() => onHover(id)}
        onPointerOut={() => onHover(null)}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={isHovered ? 0.4 : 0.15}
        />
      </RoundedBox>

      {/* Booth signage/banner on top */}
      <mesh position={[0, size * 0.5, 0]}>
        <boxGeometry args={[size * 0.8, 0.08, size * 0.8]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.6}
          roughness={0.2}
          emissive="#ffffff"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Glow effect when hovered */}
      {isHovered && (
        <pointLight
          position={[0, size * 0.5, 0]}
          color={color}
          intensity={2}
          distance={3}
        />
      )}

      {/* Booth number indicator */}
      <mesh position={[0, size * 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial
          color={isHovered ? '#ffffff' : color}
          emissive={isHovered ? '#ffffff' : color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

function VenueFloor() {
  return (
    <>
      {/* Main reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#111111"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>

      {/* Floor grid for depth perception */}
      <gridHelper
        args={[50, 50, '#222222', '#1a1a1a']}
        position={[0, 0.01, 0]}
      />
    </>
  )
}

function EntranceArch() {
  return (
    <group position={[0, 0, -12]}>
      {/* Arch pillars */}
      <mesh position={[-4, 2.5, 0]} castShadow>
        <boxGeometry args={[0.5, 5, 0.5]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[4, 2.5, 0]} castShadow>
        <boxGeometry args={[0.5, 5, 0.5]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Arch top */}
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[9, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Entrance sign with glow */}
      <mesh position={[0, 4, 0.3]}>
        <boxGeometry args={[7, 0.8, 0.1]} />
        <meshStandardMaterial
          color={BRAND_RED}
          emissive={BRAND_RED}
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Welcome lights */}
      <pointLight position={[0, 4, 1]} color={BRAND_RED} intensity={3} distance={8} />
      <pointLight position={[-3, 3, 1]} color="#ffffff" intensity={1} distance={5} />
      <pointLight position={[3, 3, 1]} color="#ffffff" intensity={1} distance={5} />

      {/* Ground markers */}
      <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.5]} />
        <meshStandardMaterial
          color={BRAND_RED}
          emissive={BRAND_RED}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

function FloatingLogo() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
      groupRef.current.position.y = 8 + Math.sin(state.clock.elapsedTime * 0.5) * 0.3
    }
  })

  return (
    <group ref={groupRef} position={[0, 8, 0]}>
      {/* Logo sphere */}
      <Sphere args={[1.5, 64, 64]}>
        <MeshDistortMaterial
          color={BRAND_RED}
          emissive={BRAND_RED}
          emissiveIntensity={0.5}
          distort={0.3}
          speed={2}
          roughness={0}
          metalness={0.9}
        />
      </Sphere>

      {/* Orbiting rings */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.5, 0.05, 16, 100]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, Math.PI / 3]}>
        <torusGeometry args={[2.8, 0.03, 16, 100]} />
        <meshStandardMaterial
          color={BRAND_RED}
          emissive={BRAND_RED}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Point light for glow */}
      <pointLight color={BRAND_RED} intensity={5} distance={15} />
    </group>
  )
}

function VenueStructure() {
  return (
    <group>
      {/* Corner pillars */}
      {[
        [-10, 0, -10], [10, 0, -10], [-10, 0, 10], [10, 0, 10]
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh position={[0, 4, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 8, 12]} />
            <meshStandardMaterial
              color="#1a1a1a"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          {/* Pillar light */}
          <pointLight
            position={[0, 7, 0]}
            color={i % 2 === 0 ? BRAND_RED : '#3b82f6'}
            intensity={2}
            distance={6}
          />
        </group>
      ))}

      {/* Overhead structure beams */}
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[22, 0.3, 22]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  )
}

function AmbientParticles() {
  return (
    <>
      <Sparkles
        count={200}
        scale={30}
        size={2}
        speed={0.5}
        opacity={0.5}
        color={BRAND_RED}
      />
      <Stars
        radius={50}
        depth={50}
        count={1000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
    </>
  )
}

function CameraController() {
  const { camera } = useThree()
  const angle = useRef(0)

  useFrame((state, delta) => {
    // Slow orbit around the venue
    angle.current += delta * 0.1
    const radius = 18
    const height = 10

    camera.position.x = Math.sin(angle.current) * radius
    camera.position.z = Math.cos(angle.current) * radius
    camera.position.y = height + Math.sin(angle.current * 2) * 2

    camera.lookAt(0, 2, 0)
  })

  return null
}

function Venue() {
  const [hoveredBooth, setHoveredBooth] = useState<number | null>(null)

  // Generate booth layout - representing 400+ booths in a structured pattern
  const booths = useMemo(() => {
    const items: {
      position: [number, number, number]
      size: number
      color: string
      tier: string
      id: number
    }[] = []

    let id = 0

    // Main floor booths - 8x8 grid in center
    const mainGridSize = 8
    const mainSpacing = 1.8

    for (let x = 0; x < mainGridSize; x++) {
      for (let z = 0; z < mainGridSize; z++) {
        const isCorner = (x === 0 || x === mainGridSize - 1) && (z === 0 || z === mainGridSize - 1)
        const isEdge = x === 0 || x === mainGridSize - 1 || z === 0 || z === mainGridSize - 1

        let tier: string
        let color: string
        let size: number

        if (isCorner) {
          tier = 'corner'
          color = TIER_COLORS.corner
          size = 1.2
        } else if (isEdge) {
          tier = 'premium'
          color = TIER_COLORS.premium
          size = 0.9
        } else if ((x + z) % 3 === 0) {
          tier = 'deluxe'
          color = TIER_COLORS.deluxe
          size = 0.8
        } else {
          tier = 'standard'
          color = TIER_COLORS.standard
          size = 0.7
        }

        items.push({
          position: [
            (x - mainGridSize / 2) * mainSpacing,
            size * 0.4,
            (z - mainGridSize / 2) * mainSpacing,
          ],
          size,
          color,
          tier,
          id: id++,
        })
      }
    }

    // Outer ring of premium booths
    const outerRadius = 9
    const outerCount = 16
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2
      const x = Math.cos(angle) * outerRadius
      const z = Math.sin(angle) * outerRadius
      const isCornerPosition = i % 4 === 0

      items.push({
        position: [x, isCornerPosition ? 0.6 : 0.45, z],
        size: isCornerPosition ? 1.2 : 0.9,
        color: isCornerPosition ? TIER_COLORS.corner : TIER_COLORS.premium,
        tier: isCornerPosition ? 'corner' : 'premium',
        id: id++,
      })
    }

    return items
  }, [])

  const handleBoothHover = useCallback((id: number | null) => {
    setHoveredBooth(id)
  }, [])

  return (
    <group>
      <VenueFloor />
      <EntranceArch />
      <VenueStructure />
      <FloatingLogo />
      <AmbientParticles />

      {/* All booths */}
      {booths.map((booth) => (
        <Booth
          key={booth.id}
          {...booth}
          isHovered={hoveredBooth === booth.id}
          onHover={handleBoothHover}
        />
      ))}
    </group>
  )
}

export function HeroVenuePreview() {
  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[400px] relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        camera={{ position: [15, 12, 15], fov: 45 }}
      >
        {/* Camera animation */}
        <CameraController />

        {/* Lighting setup */}
        <ambientLight intensity={0.2} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />

        {/* Accent lights */}
        <pointLight position={[0, 10, 0]} intensity={2} color={BRAND_RED} />
        <pointLight position={[-8, 5, -8]} intensity={1} color="#3b82f6" />
        <pointLight position={[8, 5, 8]} intensity={1} color="#f59e0b" />
        <pointLight position={[-8, 5, 8]} intensity={0.8} color="#8b5cf6" />

        {/* Venue scene */}
        <Venue />

        {/* Environment */}
        <Environment preset="night" />
        <fog attach="fog" args={['#050505', 15, 45]} />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette
            offset={0.3}
            darkness={0.6}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      </Canvas>

      {/* Interactive hint overlay */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-none">
        <p className="text-xs text-white/70 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          3D Interactive Preview
        </p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 pointer-events-none">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: TIER_COLORS.corner }} />
            Corner Premium
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: TIER_COLORS.premium }} />
            Premium
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: TIER_COLORS.deluxe }} />
            Deluxe
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: TIER_COLORS.standard }} />
            Standard
          </div>
        </div>
      </div>
    </div>
  )
}
