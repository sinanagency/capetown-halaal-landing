'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, PerspectiveCamera, Environment, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Booth, BOOTH_TIERS } from '@/lib/booth-data'
import { useBoothStore } from '@/lib/store'

interface BoothMeshProps {
  booth: Booth
  isSelected: boolean
  isHovered: boolean
  isInCart: boolean
  onClick: () => void
  onHover: (hovered: boolean) => void
}

function BoothMesh({ booth, isSelected, isHovered, isInCart, onClick, onHover }: BoothMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [localHover, setLocalHover] = useState(false)

  const tier = BOOTH_TIERS[booth.type]
  const boothHeight = tier.height3d

  const color = useMemo(() => {
    if (isInCart) return '#22c55e'
    if (booth.status === 'sold') return '#374151'
    if (booth.status === 'reserved') return '#6b7280'
    if (isSelected) return '#f59e0b'
    if (isHovered || localHover) return '#60a5fa'
    return tier.color
  }, [booth.status, isSelected, isHovered, localHover, isInCart, tier.color])

  const emissiveColor = useMemo(() => {
    if (isHovered || localHover) return tier.color
    if (isSelected) return '#f59e0b'
    return '#000000'
  }, [isHovered, localHover, isSelected, tier.color])

  useFrame(() => {
    if (!meshRef.current) return
    const targetY = boothHeight / 2 + ((isHovered || localHover || isSelected) ? 0.2 : 0)
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.12
  })

  const isClickable = booth.status === 'available'
  const scale = 0.85

  return (
    <group position={[booth.position.x, 0, booth.position.z]}>
      <mesh
        ref={meshRef}
        position={[0, boothHeight / 2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          if (isClickable) onClick()
        }}
        onPointerEnter={(e) => {
          e.stopPropagation()
          setLocalHover(true)
          onHover(true)
          document.body.style.cursor = isClickable ? 'pointer' : 'not-allowed'
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          setLocalHover(false)
          onHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry
          args={[
            (tier.gridCells.width * 0.6) * scale,
            boothHeight,
            (tier.gridCells.depth * 0.6) * scale,
          ]}
        />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={booth.status === 'available' ? 0.9 : 0.35}
          metalness={0.1}
          roughness={0.7}
          emissive={emissiveColor}
          emissiveIntensity={(isHovered || localHover) ? 0.4 : isSelected ? 0.25 : 0}
        />
      </mesh>

      {/* Booth ID on top */}
      <Text
        position={[0, boothHeight + 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color={booth.status === 'available' ? '#ffffff' : '#666666'}
        anchorX="center"
        anchorY="middle"
      >
        {booth.id}
      </Text>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[tier.gridCells.width * 0.35, tier.gridCells.width * 0.38, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Cart indicator */}
      {isInCart && (
        <mesh position={[0, boothHeight + 0.4, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {(isHovered || localHover) && (
        <Html position={[0, boothHeight + 0.6, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-neutral-900/95 border border-white/15 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: tier.color }} />
              <span className="font-semibold text-white">{booth.id}</span>
              <span className="text-gray-400">{tier.label}</span>
            </div>
            <div className="text-gray-400">
              {booth.dimensions.width}m x {booth.dimensions.depth}m | R{booth.price.toLocaleString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

function FloorPlanScene() {
  const { booths, selectedBooth, hoveredBooth, cart, selectBooth, hoverBooth, getFilteredBooths, loadBooths } =
    useBoothStore()

  useEffect(() => {
    loadBooths()
  }, [loadBooths])

  const filteredBooths = getFilteredBooths()
  const filteredIds = useMemo(() => new Set(filteredBooths.map((b) => b.id)), [filteredBooths])
  const cartIds = useMemo(() => new Set(cart.map((b) => b.id)), [cart])

  // Compute bounds for ground plane
  const bounds = useMemo(() => {
    if (booths.length === 0) return { minX: -30, maxX: 30, minZ: -25, maxZ: 25 }
    const xs = booths.map((b) => b.position.x)
    const zs = booths.map((b) => b.position.z)
    return {
      minX: Math.min(...xs) - 3,
      maxX: Math.max(...xs) + 3,
      minZ: Math.min(...zs) - 3,
      maxZ: Math.max(...zs) + 3,
    }
  }, [booths])

  const groundW = bounds.maxX - bounds.minX
  const groundD = bounds.maxZ - bounds.minZ
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 30, 15]} intensity={1.0} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.4} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 40, 40]} fov={50} />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
        minDistance={10}
        maxDistance={80}
        target={[centerX, 0, centerZ]}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.01, centerZ]} receiveShadow>
        <planeGeometry args={[groundW + 6, groundD + 6]} />
        <meshStandardMaterial color="#12121a" />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[Math.max(groundW, groundD) + 10, 40, '#1a1a2e', '#1a1a2e']}
        position={[centerX, 0, centerZ]}
      />

      {/* Zone labels on ground */}
      <Text
        position={[bounds.minX + 2, 0.05, centerZ - 8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color="#f97316"
        anchorX="center"
        fillOpacity={0.3}
      >
        FOOD COURT
      </Text>
      <Text
        position={[centerX, 0.05, bounds.minZ + 4]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color="#8b5cf6"
        anchorX="center"
        fillOpacity={0.3}
      >
        MAIN STAGE
      </Text>
      <Text
        position={[centerX, 0.05, bounds.maxZ - 4]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color="#22c55e"
        anchorX="center"
        fillOpacity={0.3}
      >
        TRADE MARKET
      </Text>

      {/* Booths */}
      {booths.map((booth) => {
        const isFiltered = !filteredIds.has(booth.id)
        if (isFiltered && booth.status === 'available') return null

        return (
          <BoothMesh
            key={booth.id}
            booth={booth}
            isSelected={selectedBooth?.id === booth.id}
            isHovered={hoveredBooth?.id === booth.id}
            isInCart={cartIds.has(booth.id)}
            onClick={() => selectBooth(booth)}
            onHover={(hovered) => hoverBooth(hovered ? booth : null)}
          />
        )
      })}

      {/* Environment */}
      <Environment preset="night" />
      <fog attach="fog" args={['#0a0a0f', 50, 120]} />
    </>
  )
}

export function FloorPlan3D() {
  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/10 touch-none relative">
      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5">
        {(['FT', 'FS', 'TS', 'BS'] as const).map((t) => {
          const tier = BOOTH_TIERS[t]
          return (
            <div key={t} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: tier.color }} />
              <span className="text-gray-300">{tier.label}</span>
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-400">
        Drag to rotate. Scroll to zoom. Click a booth to select.
      </div>

      <Canvas
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <FloorPlanScene />
      </Canvas>
    </div>
  )
}
