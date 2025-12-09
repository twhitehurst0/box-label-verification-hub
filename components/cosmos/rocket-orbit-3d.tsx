"use client"

/**
 * RocketOrbit3D Component
 *
 * An animated 3D scene featuring 6 rockets orbiting on different elliptical paths
 * with glowing thrust effects and exhaust particles. Creates a dynamic orbital
 * animation overlay for the main content.
 *
 * Visual Features:
 * - 6 rockets with unique orbit configurations (radius, tilt, speed, direction)
 * - Sleek rocket bodies with lathe geometry and purple/red color scheme
 * - Animated thruster flames with pulsing glow
 * - Exhaust particle trails following rocket paths
 * - Semi-transparent orbit path rings
 *
 * Rocket Components:
 * - RocketBody: Tapered lathe geometry with metallic materials
 * - RocketFins: 3 extruded fins around the base
 * - ThrusterFlame: Multi-layer cone geometry with pulsing animation
 * - ExhaustParticles: Point cloud particles trailing behind
 *
 * Orbit Configuration:
 * - Wide horizontal orbits (radiusX: 4.8 - 6.5)
 * - Various tilt angles for visual variety
 * - Mix of clockwise and counter-clockwise rotation
 * - Different speeds (0.45 - 0.65) for depth perception
 *
 * @example
 * <RocketOrbit3D />
 */

import { useRef, useMemo, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

/**
 * Rocket body using lathe geometry for smooth tapered shape.
 * Includes glowing purple stripe accents and a circular porthole.
 */
function RocketBody() {
  const bodyRef = useRef<THREE.Group>(null)

  // Create rocket body shape
  const bodyGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    // Tapered body profile (half cross-section for lathe)
    shape.moveTo(0, -0.5)
    shape.lineTo(0.12, -0.5)
    shape.quadraticCurveTo(0.15, -0.3, 0.14, 0)
    shape.quadraticCurveTo(0.12, 0.3, 0.08, 0.45)
    shape.lineTo(0, 0.6) // nose tip
    shape.lineTo(0, -0.5)

    const points = shape.getPoints(20)
    return new THREE.LatheGeometry(points, 16)
  }, [])

  return (
    <group ref={bodyRef}>
      {/* Main body - glowing red/purple */}
      <mesh geometry={bodyGeometry} castShadow>
        <meshPhysicalMaterial
          color="#ff1a1a"
          emissive="#ff0066"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
          clearcoat={0.5}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Purple stripe accent */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.135, 0.015, 8, 24]} />
        <meshBasicMaterial color="#aa00ff" />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <torusGeometry args={[0.14, 0.012, 8, 24]} />
        <meshBasicMaterial color="#ff00aa" />
      </mesh>

      {/* Window/porthole - purple glow */}
      <mesh position={[0, 0.25, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#cc00ff" transparent opacity={0.9} />
      </mesh>

      {/* Body glow light */}
      <pointLight color="#ff0066" intensity={3} distance={4} decay={2} />
    </group>
  )
}

// Rocket fins - 3 fins around the base
function RocketFins() {
  const finGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(0.2, -0.15)
    shape.lineTo(0.08, -0.35)
    shape.lineTo(0, -0.25)
    shape.lineTo(0, 0)

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    })
  }, [])

  const fins = useMemo(() => {
    return [0, 120, 240].map((angle) => ({
      rotation: [0, (angle * Math.PI) / 180, 0] as [number, number, number],
    }))
  }, [])

  return (
    <group position={[0, -0.35, 0]}>
      {fins.map((fin, i) => (
        <mesh
          key={i}
          geometry={finGeometry}
          rotation={fin.rotation}
          position={[0.08, 0, 0]}
          castShadow
        >
          <meshPhysicalMaterial
            color="#9900ff"
            emissive="#ff00ff"
            emissiveIntensity={0.8}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

// Animated thruster flame
function ThrusterFlame() {
  const flameRef = useRef<THREE.Group>(null)
  const innerFlameRef = useRef<THREE.Mesh>(null)
  const outerFlameRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Pulsing flame effect
    const pulse = 0.9 + Math.sin(time * 15) * 0.15 + Math.sin(time * 23) * 0.1

    if (innerFlameRef.current) {
      innerFlameRef.current.scale.setScalar(pulse)
    }
    if (outerFlameRef.current) {
      outerFlameRef.current.scale.set(pulse * 0.9, pulse * 1.1, pulse * 0.9)
    }
  })

  return (
    <group ref={flameRef} position={[0, -0.55, 0]}>
      {/* Outer flame - purple */}
      <mesh ref={outerFlameRef}>
        <coneGeometry args={[0.1, 0.35, 8]} />
        <meshBasicMaterial
          color="#ff00ff"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Inner flame - red/pink core */}
      <mesh ref={innerFlameRef} position={[0, 0.05, 0]}>
        <coneGeometry args={[0.06, 0.25, 8]} />
        <meshBasicMaterial
          color="#ff3366"
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* White hot center */}
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.03, 0.12, 8]} />
        <meshBasicMaterial color="#ffaaff" />
      </mesh>

      {/* Glow point light - red/purple */}
      <pointLight color="#ff00aa" intensity={10} distance={8} decay={2} />
    </group>
  )
}

// Exhaust particle trail
function ExhaustParticles() {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = 30

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const vel = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      // Start at thruster position
      pos[i * 3] = (Math.random() - 0.5) * 0.1
      pos[i * 3 + 1] = -0.6 - Math.random() * 0.8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1

      // Random velocities
      vel[i * 3] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 1] = -Math.random() * 0.05 - 0.02
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }

    return [pos, vel]
  }, [])

  useFrame(() => {
    if (!particlesRef.current) return

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      // Move particles
      posArray[i * 3] += velocities[i * 3]
      posArray[i * 3 + 1] += velocities[i * 3 + 1]
      posArray[i * 3 + 2] += velocities[i * 3 + 2]

      // Reset particles that have traveled too far
      if (posArray[i * 3 + 1] < -1.5) {
        posArray[i * 3] = (Math.random() - 0.5) * 0.1
        posArray[i * 3 + 1] = -0.6
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.1
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ff00ff"
        size={0.04}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

// Single rocket with configurable orbit
function SingleOrbitingRocket({
  radiusX = 4.2,
  radiusY = 0.8,
  speed = 0.7,
  tiltX = 0.3,
  tiltY = 0,
  tiltZ = 0,
  startAngle = 0,
  scale = 0.8,
  clockwise = true,
  showPath = true,
  pathColor = "#ff00ff"
}: {
  radiusX?: number
  radiusY?: number
  speed?: number
  tiltX?: number
  tiltY?: number
  tiltZ?: number
  startAngle?: number
  scale?: number
  clockwise?: boolean
  showPath?: boolean
  pathColor?: string
}) {
  const orbitRef = useRef<THREE.Group>(null)
  const rocketRef = useRef<THREE.Group>(null)

  const direction = clockwise ? 1 : -1

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const angle = startAngle + time * speed * direction

    if (orbitRef.current) {
      const x = Math.cos(angle) * radiusX
      const y = Math.sin(angle) * radiusY
      const bob = Math.sin(time * 2 + startAngle) * 0.03

      orbitRef.current.position.set(x, y + bob, 0)
    }

    if (rocketRef.current) {
      const tangentAngle = Math.atan2(
        Math.cos(angle) * radiusY * direction,
        -Math.sin(angle) * radiusX * direction
      )

      rocketRef.current.rotation.z = tangentAngle + Math.PI / 2
      rocketRef.current.rotation.x = Math.sin(time * 3 + startAngle) * 0.1
    }
  })

  return (
    <group rotation={[tiltX, tiltY, tiltZ]}>
      {/* Orbit path visualization */}
      {showPath && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radiusX - 0.015, radiusX + 0.015, 64]} />
          <meshBasicMaterial
            color={pathColor}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Orbiting rocket */}
      <group ref={orbitRef}>
        <group ref={rocketRef} scale={scale}>
          <RocketBody />
          <RocketFins />
          <ThrusterFlame />
          <ExhaustParticles />
        </group>
      </group>
    </group>
  )
}

// Multiple rockets orbiting on different paths
function OrbitingRockets() {
  // Define 6 different orbit configurations - WIDER to reach both ends of text
  const orbits = [
    // Wide horizontal orbit - spans full text width
    { radiusX: 6.0, radiusY: 0.6, speed: 0.6, tiltX: 0.15, tiltY: 0, tiltZ: 0, startAngle: 0, scale: 0.6, clockwise: true, pathColor: "#ff00ff" },
    // Tilted orbit going the other way - wide
    { radiusX: 5.5, radiusY: 0.8, speed: 0.5, tiltX: 0.4, tiltY: 0.2, tiltZ: 0.1, startAngle: Math.PI * 0.6, scale: 0.55, clockwise: false, pathColor: "#ff0066" },
    // More vertical tilt - medium width
    { radiusX: 5.0, radiusY: 1.0, speed: 0.55, tiltX: 0.7, tiltY: -0.15, tiltZ: 0, startAngle: Math.PI * 1.2, scale: 0.5, clockwise: true, pathColor: "#aa00ff" },
    // Opposite vertical tilt - widest
    { radiusX: 6.5, radiusY: 0.5, speed: 0.45, tiltX: -0.3, tiltY: 0.3, tiltZ: 0.15, startAngle: Math.PI * 0.3, scale: 0.55, clockwise: false, pathColor: "#ff3399" },
    // Steep diagonal - medium
    { radiusX: 4.8, radiusY: 1.1, speed: 0.65, tiltX: 0.9, tiltY: 0, tiltZ: 0.25, startAngle: Math.PI * 1.7, scale: 0.45, clockwise: true, pathColor: "#cc00ff" },
    // Counter diagonal - wide
    { radiusX: 5.8, radiusY: 0.7, speed: 0.52, tiltX: -0.5, tiltY: -0.25, tiltZ: -0.15, startAngle: Math.PI * 0.9, scale: 0.5, clockwise: false, pathColor: "#ff0099" },
  ]

  return (
    <>
      {orbits.map((orbit, index) => (
        <SingleOrbitingRocket
          key={index}
          radiusX={orbit.radiusX}
          radiusY={orbit.radiusY}
          speed={orbit.speed}
          tiltX={orbit.tiltX}
          tiltY={orbit.tiltY}
          tiltZ={orbit.tiltZ}
          startAngle={orbit.startAngle}
          scale={orbit.scale}
          clockwise={orbit.clockwise}
          showPath={true}
          pathColor={orbit.pathColor}
        />
      ))}
    </>
  )
}

// Main scene
function Scene() {
  return (
    <>
      {/* Ambient light for visibility */}
      <ambientLight intensity={0.5} />

      {/* Key light from top-right */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        color="#ffffff"
      />

      {/* Accent light - red rim */}
      <pointLight position={[-3, 2, 2]} intensity={1.5} color="#ff0066" distance={10} />

      {/* Accent light - purple fill */}
      <pointLight position={[3, -2, 2]} intensity={1.5} color="#aa00ff" distance={10} />

      <OrbitingRockets />
    </>
  )
}

// Main export component
export function RocketOrbit3D() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 50,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{
          background: "transparent",
        }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
