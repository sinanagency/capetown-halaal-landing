'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Text,
  PerspectiveCamera,
  Environment,
  PointerLockControls,
  useKeyboardControls,
  KeyboardControls
} from '@react-three/drei'
import * as THREE from 'three'
import { Booth, BOOTH_TIERS } from '@/lib/booth-data'
import { useBoothStore } from '@/lib/store'

// Keyboard controls map
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
]

interface BoothMeshProps {
  booth: Booth
  isSelected: boolean
  isHovered: boolean
  isInCart: boolean
  onClick: () => void
  onHover: (hovered: boolean) => void
  isStreetView: boolean
}

function BoothMesh({ booth, isSelected, isHovered, isInCart, onClick, onHover, isStreetView }: BoothMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [localHover, setLocalHover] = useState(false)

  const tier = BOOTH_TIERS[booth.size]
  const boothHeight = isStreetView ? 2.5 : 0.2 // Taller in street view

  const color = useMemo(() => {
    if (isInCart) return '#22c55e'
    if (booth.status === 'sold') return '#374151'
    if (booth.status === 'reserved') return '#6b7280'
    if (isSelected) return '#f59e0b'
    if (isHovered || localHover) return '#60a5fa'
    return tier.color
  }, [booth.status, isSelected, isHovered, localHover, isInCart, tier.color])

  useFrame(() => {
    if (meshRef.current && !isStreetView) {
      const targetY = (isHovered || localHover || isSelected) ? 0.3 : 0.1
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1
    }
  })

  const isClickable = booth.status === 'available'

  return (
    <group position={[booth.position.x, 0, booth.position.z]}>
      {/* Booth structure */}
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
        <boxGeometry args={[booth.dimensions.width * 0.85, boothHeight, booth.dimensions.depth * 0.85]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={booth.status === 'available' ? 0.9 : 0.4}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Booth number - on top for bird view, on front for street view */}
      {isStreetView ? (
        <>
          {/* Front sign */}
          <Text
            position={[0, 2, booth.dimensions.depth * 0.43]}
            fontSize={0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {booth.row}{booth.column}
          </Text>
          {/* Top banner */}
          <mesh position={[0, boothHeight + 0.3, 0]}>
            <boxGeometry args={[booth.dimensions.width * 0.8, 0.5, 0.1]} />
            <meshStandardMaterial color={tier.color} />
          </mesh>
          <Text
            position={[0, boothHeight + 0.3, 0.1]}
            fontSize={0.25}
            color="#ffffff"
          >
            {tier.label}
          </Text>
        </>
      ) : (
        <Text
          position={[0, 0.35, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color={booth.status === 'available' ? '#ffffff' : '#666666'}
          anchorX="center"
          anchorY="middle"
        >
          {booth.row}{booth.column}
        </Text>
      )}

      {/* Selection ring */}
      {isSelected && !isStreetView && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[booth.dimensions.width * 0.5, booth.dimensions.width * 0.55, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Cart indicator */}
      {isInCart && (
        <mesh position={[0, isStreetView ? boothHeight + 0.8 : 0.5, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}

// Walkway/Aisle component
function Walkway({ start, end, width = 3 }: { start: [number, number, number]; end: [number, number, number]; width?: number }) {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[2] - start[2], 2)
  )
  const angle = Math.atan2(end[2] - start[2], end[0] - start[0])
  const midX = (start[0] + end[0]) / 2
  const midZ = (start[2] + end[2]) / 2

  return (
    <mesh position={[midX, 0.02, midZ]} rotation={[-Math.PI / 2, 0, angle]}>
      <planeGeometry args={[length, width]} />
      <meshStandardMaterial color="#2a2a3e" transparent opacity={0.8} />
    </mesh>
  )
}

// Exit/Entrance Sign
function ExitSign({ position, rotation = [0, 0, 0], label, type }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  label: string
  type: 'entrance' | 'exit' | 'emergency'
}) {
  const colors = {
    entrance: '#22c55e',
    exit: '#3b82f6',
    emergency: '#ef4444'
  }
  const color = colors[type]

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      {/* Sign post */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* Sign board */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[4, 1.2, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Sign text */}
      <Text
        position={[0, 3.2, 0.15]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {label}
      </Text>

      {/* Arrow indicator on ground */}
      <mesh position={[0, 0.03, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Glowing effect */}
      <pointLight position={[0, 3.2, 0.5]} color={color} intensity={2} distance={8} />
    </group>
  )
}

// First-person controller for street view
function FirstPersonControls({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const moveSpeed = 0.3
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!enabled) return

    // Get keyboard state from window
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    }

    // Simple WASD check
    const handleKeyState = (e: KeyboardEvent, pressed: boolean) => {
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': keys.forward = pressed; break
        case 'KeyS': case 'ArrowDown': keys.backward = pressed; break
        case 'KeyA': case 'ArrowLeft': keys.left = pressed; break
        case 'KeyD': case 'ArrowRight': keys.right = pressed; break
      }
    }

    direction.current.z = Number(keys.forward) - Number(keys.backward)
    direction.current.x = Number(keys.right) - Number(keys.left)
    direction.current.normalize()

    if (keys.forward || keys.backward) {
      velocity.current.z -= direction.current.z * moveSpeed
    }
    if (keys.left || keys.right) {
      velocity.current.x -= direction.current.x * moveSpeed
    }

    // Apply movement
    camera.position.x += velocity.current.x
    camera.position.z += velocity.current.z

    // Damping
    velocity.current.multiplyScalar(0.9)

    // Keep within bounds
    camera.position.x = Math.max(-45, Math.min(45, camera.position.x))
    camera.position.z = Math.max(-45, Math.min(45, camera.position.z))
  })

  return null
}

interface FloorPlanSceneProps {
  isStreetView: boolean
  onToggleView: () => void
}

function FloorPlanScene({ isStreetView }: FloorPlanSceneProps) {
  const { booths, selectedBooth, hoveredBooth, cart, selectBooth, hoverBooth, getFilteredBooths } = useBoothStore()
  const filteredBooths = getFilteredBooths()
  const cartIds = cart.map(b => b.id)
  const controlsRef = useRef<any>(null)

  // Camera positions
  const birdViewPos = useMemo(() => new THREE.Vector3(0, 60, 60), [])
  const streetViewPos = useMemo(() => new THREE.Vector3(0, 1.7, 40), [])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 20]} intensity={1.2} castShadow />
      <directionalLight position={[-20, 30, -20]} intensity={0.5} />

      {/* Colored accent lights */}
      <pointLight position={[0, 10, -45]} intensity={3} color="#22c55e" distance={30} />
      <pointLight position={[0, 10, 45]} intensity={3} color="#f59e0b" distance={30} />
      <pointLight position={[-45, 10, 0]} intensity={2} color="#3b82f6" distance={25} />
      <pointLight position={[45, 10, 0]} intensity={2} color="#3b82f6" distance={25} />

      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={isStreetView ? [0, 1.7, 40] : [0, 60, 60]}
        fov={isStreetView ? 75 : 50}
      />

      {isStreetView ? (
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 1.7, 0]}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0.1}
          minDistance={1}
          maxDistance={80}
          panSpeed={1}
          rotateSpeed={0.5}
        />
      ) : (
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={20}
          maxDistance={120}
          target={[0, 0, 0]}
        />
      )}

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#12121a" />
      </mesh>

      {/* Main walkways/aisles */}
      {/* Central horizontal aisle */}
      <Walkway start={[-50, 0, 0]} end={[50, 0, 0]} width={4} />
      {/* Central vertical aisle */}
      <Walkway start={[0, 0, -50]} end={[0, 0, 50]} width={4} />
      {/* Perimeter walkway */}
      <Walkway start={[-48, 0, -48]} end={[48, 0, -48]} width={3} />
      <Walkway start={[-48, 0, 48]} end={[48, 0, 48]} width={3} />
      <Walkway start={[-48, 0, -48]} end={[-48, 0, 48]} width={3} />
      <Walkway start={[48, 0, -48]} end={[48, 0, 48]} width={3} />
      {/* Secondary aisles */}
      <Walkway start={[-25, 0, -48]} end={[-25, 0, 48]} width={2.5} />
      <Walkway start={[25, 0, -48]} end={[25, 0, 48]} width={2.5} />
      <Walkway start={[-48, 0, -25]} end={[48, 0, -25]} width={2.5} />
      <Walkway start={[-48, 0, 25]} end={[48, 0, 25]} width={2.5} />

      {/* ENTRANCES AND EXITS */}
      {/* Main Entrance - North */}
      <ExitSign
        position={[0, 0, -48]}
        rotation={[0, 0, 0]}
        label="⬆ MAIN ENTRANCE ⬆"
        type="entrance"
      />

      {/* Stage Area - South */}
      <ExitSign
        position={[0, 0, 48]}
        rotation={[0, Math.PI, 0]}
        label="🎤 STAGE AREA"
        type="entrance"
      />

      {/* Side Entrance West */}
      <ExitSign
        position={[-48, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        label="← ENTRANCE / EXIT →"
        type="exit"
      />

      {/* Side Entrance East */}
      <ExitSign
        position={[48, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        label="← ENTRANCE / EXIT →"
        type="exit"
      />

      {/* Emergency Exits */}
      <ExitSign
        position={[-48, 0, -35]}
        rotation={[0, Math.PI / 2, 0]}
        label="🚨 EMERGENCY EXIT"
        type="emergency"
      />
      <ExitSign
        position={[-48, 0, 35]}
        rotation={[0, Math.PI / 2, 0]}
        label="🚨 EMERGENCY EXIT"
        type="emergency"
      />
      <ExitSign
        position={[48, 0, -35]}
        rotation={[0, -Math.PI / 2, 0]}
        label="🚨 EMERGENCY EXIT"
        type="emergency"
      />
      <ExitSign
        position={[48, 0, 35]}
        rotation={[0, -Math.PI / 2, 0]}
        label="🚨 EMERGENCY EXIT"
        type="emergency"
      />

      {/* Corner Info Points */}
      <Text position={[-40, 0.1, -40]} rotation={[-Math.PI/2, 0, Math.PI/4]} fontSize={1} color="#666">
        ZONE A
      </Text>
      <Text position={[40, 0.1, -40]} rotation={[-Math.PI/2, 0, -Math.PI/4]} fontSize={1} color="#666">
        ZONE B
      </Text>
      <Text position={[-40, 0.1, 40]} rotation={[-Math.PI/2, 0, -Math.PI/4]} fontSize={1} color="#666">
        ZONE C
      </Text>
      <Text position={[40, 0.1, 40]} rotation={[-Math.PI/2, 0, Math.PI/4]} fontSize={1} color="#666">
        ZONE D
      </Text>

      {/* Venue boundary walls (in street view) */}
      {isStreetView && (
        <>
          {/* North wall */}
          <mesh position={[0, 2, -52]}>
            <boxGeometry args={[110, 4, 0.5]} />
            <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
          </mesh>
          {/* South wall */}
          <mesh position={[0, 2, 52]}>
            <boxGeometry args={[110, 4, 0.5]} />
            <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
          </mesh>
          {/* East wall */}
          <mesh position={[52, 2, 0]}>
            <boxGeometry args={[0.5, 4, 110]} />
            <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
          </mesh>
          {/* West wall */}
          <mesh position={[-52, 2, 0]}>
            <boxGeometry args={[0.5, 4, 110]} />
            <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
          </mesh>
        </>
      )}

      {/* Booths */}
      {booths.map((booth) => {
        const isFiltered = !filteredBooths.find(b => b.id === booth.id)
        if (isFiltered && booth.status === 'available') return null

        return (
          <BoothMesh
            key={booth.id}
            booth={booth}
            isSelected={selectedBooth?.id === booth.id}
            isHovered={hoveredBooth?.id === booth.id}
            isInCart={cartIds.includes(booth.id)}
            onClick={() => selectBooth(booth)}
            onHover={(hovered) => hoverBooth(hovered ? booth : null)}
            isStreetView={isStreetView}
          />
        )
      })}

      {/* Environment */}
      <Environment preset="night" />

      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0a0f', 60, 150]} />
    </>
  )
}

export function FloorPlan3D() {
  const [isStreetView, setIsStreetView] = useState(false)

  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/10 touch-none relative">
      {/* View toggle button */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setIsStreetView(false)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            !isStreetView
              ? 'bg-blue-600 text-white'
              : 'bg-black/50 text-gray-300 hover:bg-black/70'
          }`}
        >
          🦅 Bird View
        </button>
        <button
          onClick={() => setIsStreetView(true)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isStreetView
              ? 'bg-blue-600 text-white'
              : 'bg-black/50 text-gray-300 hover:bg-black/70'
          }`}
        >
          🚶 Street View
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-400">
        {isStreetView ? (
          <>🖱️ Drag to look around • Scroll to zoom • Click booth to select</>
        ) : (
          <>🖱️ Drag to rotate • Scroll to zoom • Click booth to select</>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-300">Main Entrance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-gray-300">Exit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-300">Emergency Exit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-gray-300">Stage</span>
        </div>
      </div>

      <Canvas
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <FloorPlanScene isStreetView={isStreetView} onToggleView={() => setIsStreetView(!isStreetView)} />
      </Canvas>
    </div>
  )
}
