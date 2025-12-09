"use client"

/**
 * EnterButton3D Component
 *
 * A cosmic-themed 3D Enter button with color-shifting effects, orbital rings,
 * and floating particles. Built with React Three Fiber for WebGL rendering.
 *
 * Visual Features:
 * - Extruded capsule geometry with physical material
 * - Color-cycling glow effects (cyan -> teal -> purple -> magenta -> pink)
 * - Three orbital rings with different rotation speeds and tilts
 * - 40 floating cosmic particles
 * - 3D extruded "Enter" text with emissive glow
 *
 * Interactions:
 * - Hover: Scales up to 1.08x, increases glow intensity, speeds up ring rotation
 * - Press: Scales down to 0.94x, moves down slightly
 *
 * Technical Details:
 * - Uses useFrame for 60fps animation updates
 * - MeshPhysicalMaterial with clearcoat for glossy appearance
 * - AdditiveBlending for glow layers
 * - Requires /fonts/Inter_Bold.json for 3D text
 *
 * @example
 * // Self-contained with its own Canvas
 * <EnterButton3D />
 */

import { useRef, useState, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Text3D, Center, Environment } from "@react-three/drei"
import * as THREE from "three"

/**
 * Smoothly interpolates through a cosmic color palette based on time.
 * @param time - Elapsed time (usually from useFrame state.clock.elapsedTime)
 * @param offset - Phase offset for staggered color animations (0-1)
 * @returns THREE.Color interpolated between palette colors
 */
function getCosmicColor(time: number, offset: number = 0): THREE.Color {
  const t = (time * 0.3 + offset) % 1
  const colors = [
    new THREE.Color("#00ffff"), // Cyan
    new THREE.Color("#00ff88"), // Teal
    new THREE.Color("#8800ff"), // Purple
    new THREE.Color("#ff00ff"), // Magenta
    new THREE.Color("#ff0088"), // Pink
    new THREE.Color("#00ffff"), // Back to cyan
  ]

  const segmentCount = colors.length - 1
  const segment = Math.floor(t * segmentCount)
  const segmentT = (t * segmentCount) % 1

  const color = new THREE.Color()
  color.lerpColors(colors[segment], colors[segment + 1], segmentT)
  return color
}

// Glowing capsule button with color-shifting effects
function CosmicCapsuleButton({
  width = 2.4,
  height = 0.6,
  depth = 0.35,
  isHovered = false,
}: { width?: number; height?: number; depth?: number; isHovered?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const outerGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null)

  const geometry = useMemo(() => {
    const radius = height / 2
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2 + radius, -height / 2)
    shape.lineTo(width / 2 - radius, -height / 2)
    shape.absarc(width / 2 - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false)
    shape.lineTo(-width / 2 + radius, height / 2)
    shape.absarc(-width / 2 + radius, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, false)

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelOffset: 0,
      bevelSegments: 24,
      curveSegments: 32,
    }

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.computeVertexNormals()
    return geo
  }, [width, height, depth])

  // Inner glow geometry
  const glowGeometry = useMemo(() => {
    const radius = (height / 2) + 0.03
    const w = width + 0.06
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2 + radius, -(height + 0.06) / 2)
    shape.lineTo(w / 2 - radius, -(height + 0.06) / 2)
    shape.absarc(w / 2 - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false)
    shape.lineTo(-w / 2 + radius, (height + 0.06) / 2)
    shape.absarc(-w / 2 + radius, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, false)

    const extrudeSettings = {
      depth: depth + 0.04,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelOffset: 0,
      bevelSegments: 8,
      curveSegments: 32,
    }

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.computeVertexNormals()
    return geo
  }, [width, height, depth])

  // Outer glow geometry (larger, softer)
  const outerGlowGeometry = useMemo(() => {
    const radius = (height / 2) + 0.08
    const w = width + 0.16
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2 + radius, -(height + 0.16) / 2)
    shape.lineTo(w / 2 - radius, -(height + 0.16) / 2)
    shape.absarc(w / 2 - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false)
    shape.lineTo(-w / 2 + radius, (height + 0.16) / 2)
    shape.absarc(-w / 2 + radius, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, false)

    const extrudeSettings = {
      depth: depth + 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 8,
      curveSegments: 32,
    }

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.computeVertexNormals()
    return geo
  }, [width, height, depth])

  // Animate glow pulsing and color shifting
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const primaryColor = getCosmicColor(time, 0)
    const secondaryColor = getCosmicColor(time, 0.3)

    if (glowMaterialRef.current) {
      const pulse = Math.sin(time * 2.5) * 0.25 + 0.75
      const hoverBoost = isHovered ? 1.8 : 1
      glowMaterialRef.current.opacity = pulse * 0.5 * hoverBoost
      glowMaterialRef.current.color = primaryColor
    }

    if (outerGlowMaterialRef.current) {
      const pulse = Math.sin(time * 2) * 0.2 + 0.8
      const hoverBoost = isHovered ? 1.5 : 1
      outerGlowMaterialRef.current.opacity = pulse * 0.25 * hoverBoost
      outerGlowMaterialRef.current.color = secondaryColor
    }

    if (materialRef.current) {
      const hoverEmissive = isHovered ? 0.25 : 0.1
      materialRef.current.emissiveIntensity = hoverEmissive
      materialRef.current.emissive = primaryColor
    }
  })

  return (
    <group>
      {/* Outer soft glow layer */}
      <mesh geometry={outerGlowGeometry} position={[0, 0, -0.03]}>
        <meshBasicMaterial
          ref={outerGlowMaterialRef}
          color="#00ffff"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow layer */}
      <mesh geometry={glowGeometry} position={[0, 0, -0.015]}>
        <meshBasicMaterial
          ref={glowMaterialRef}
          color="#00ffff"
          transparent
          opacity={0.5}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Main button */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={materialRef}
          color="#0a0a14"
          roughness={0.08}
          metalness={0.4}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.5}
          emissive="#00ffff"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  )
}

// Animated orbital ring with color shifting
function OrbitalRing({
  radius,
  rotationAxis,
  speed,
  colorOffset,
  isHovered
}: {
  radius: number
  rotationAxis: [number, number, number]
  speed: number
  colorOffset: number
  isHovered: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    if (ringRef.current) {
      const hoverSpeed = isHovered ? 2.5 : 1
      ringRef.current.rotation.x += delta * speed * rotationAxis[0] * hoverSpeed
      ringRef.current.rotation.y += delta * speed * rotationAxis[1] * hoverSpeed
      ringRef.current.rotation.z += delta * speed * rotationAxis[2] * hoverSpeed
    }
    if (materialRef.current) {
      const pulse = Math.sin(time * 3 + colorOffset) * 0.25 + 0.75
      const hoverBoost = isHovered ? 1.5 : 1
      materialRef.current.opacity = pulse * 0.7 * hoverBoost
      materialRef.current.color = getCosmicColor(time, colorOffset)
    }
  })

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.012, 16, 100]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#00ffff"
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// Floating particles with color cycling
function CosmicParticles({ count = 30, isHovered }: { count?: number; isHovered: boolean }) {
  const particlesRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.PointsMaterial>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = 0.7 + Math.random() * 0.7
      pos[i * 3] = Math.cos(angle) * r + (Math.random() - 0.5) * 0.4
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      pos[i * 3 + 2] = Math.sin(angle) * r * 0.4 + (Math.random() - 0.5) * 0.3
    }

    return pos
  }, [count])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.15
      const hoverScale = isHovered ? 1.3 : 1
      particlesRef.current.scale.setScalar(hoverScale)
    }

    if (materialRef.current) {
      materialRef.current.color = getCosmicColor(time, 0.5)
      const pulse = Math.sin(time * 2) * 0.3 + 0.7
      materialRef.current.opacity = (isHovered ? 1 : 0.7) * pulse
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.04}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Glowing 3D text with color shift
function GlowingText({
  position,
  size,
  isHovered
}: {
  position: [number, number, number]
  size: number
  isHovered: boolean
}) {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (materialRef.current) {
      const pulse = Math.sin(time * 2.5) * 0.3 + 0.7
      const baseIntensity = isHovered ? 2 : 1
      materialRef.current.emissiveIntensity = baseIntensity * pulse
      materialRef.current.emissive = getCosmicColor(time, 0.1)
    }
  })

  return (
    <Center position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <Text3D
        font="/fonts/Inter_Bold.json"
        size={size}
        height={0.03}
        bevelEnabled
        bevelThickness={0.01}
        bevelSize={0.008}
        bevelSegments={5}
        curveSegments={12}
        castShadow
      >
        Enter
        <meshPhysicalMaterial
          ref={materialRef}
          color="#ffffff"
          roughness={0.05}
          metalness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
          emissive="#00ffff"
          emissiveIntensity={1}
        />
      </Text3D>
    </Center>
  )
}

// Color-shifting point light
function CosmicLight({
  position,
  colorOffset,
  baseIntensity,
  isHovered
}: {
  position: [number, number, number]
  colorOffset: number
  baseIntensity: number
  isHovered: boolean
}) {
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (lightRef.current) {
      lightRef.current.color = getCosmicColor(time, colorOffset)
      const pulse = Math.sin(time * 2 + colorOffset * 10) * 0.3 + 0.7
      lightRef.current.intensity = baseIntensity * pulse * (isHovered ? 1.8 : 1)
    }
  })

  return (
    <pointLight
      ref={lightRef}
      position={position}
      intensity={baseIntensity}
      distance={3}
      decay={2}
    />
  )
}

// Interactive button group with cosmic effects
function Button3D() {
  const groupRef = useRef<THREE.Group>(null)
  const [isPressed, setIsPressed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const targetY = useRef(0)
  const currentY = useRef(0)
  const targetPressScale = useRef(1)
  const currentPressScale = useRef(1)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    targetY.current = isPressed ? -0.06 : 0
    targetPressScale.current = isPressed ? 0.94 : isHovered ? 1.08 : 1

    const lerpSpeed = 12 * delta
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY.current, lerpSpeed)
    currentPressScale.current = THREE.MathUtils.lerp(currentPressScale.current, targetPressScale.current, lerpSpeed)

    groupRef.current.position.y = currentY.current
    groupRef.current.scale.set(currentPressScale.current, currentPressScale.current, currentPressScale.current)
  })

  return (
    <group
      ref={groupRef}
      rotation={[0, 0, 0]}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => {
        setIsPressed(false)
        setIsHovered(false)
      }}
      onPointerEnter={() => setIsHovered(true)}
    >
      {/* Cosmic particles */}
      <CosmicParticles count={40} isHovered={isHovered} />

      {/* Orbital rings with different color offsets */}
      <group position={[0, 0.175, 0]}>
        <OrbitalRing
          radius={0.95}
          rotationAxis={[0.3, 1, 0.2]}
          speed={0.9}
          colorOffset={0}
          isHovered={isHovered}
        />
        <OrbitalRing
          radius={1.1}
          rotationAxis={[0.6, 0.7, 0.4]}
          speed={-0.6}
          colorOffset={0.33}
          isHovered={isHovered}
        />
        <OrbitalRing
          radius={1.25}
          rotationAxis={[0.2, 0.9, 0.6]}
          speed={0.4}
          colorOffset={0.66}
          isHovered={isHovered}
        />
      </group>

      {/* Button capsule */}
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.175, 0]}>
        <CosmicCapsuleButton width={1.8} height={0.55} depth={0.35} isHovered={isHovered} />
      </group>

      {/* Glowing "Enter" text */}
      <GlowingText position={[0, 0.4, 0.01]} size={0.16} isHovered={isHovered} />

      {/* Color-shifting inner glow lights */}
      <CosmicLight position={[0, 0.2, 0.4]} colorOffset={0} baseIntensity={0.6} isHovered={isHovered} />
      <CosmicLight position={[0.4, 0.2, 0]} colorOffset={0.25} baseIntensity={0.4} isHovered={isHovered} />
      <CosmicLight position={[0, 0.2, -0.4]} colorOffset={0.5} baseIntensity={0.5} isHovered={isHovered} />
      <CosmicLight position={[-0.4, 0.2, 0]} colorOffset={0.75} baseIntensity={0.4} isHovered={isHovered} />
    </group>
  )
}

// Scene with cosmic button
function Scene() {
  return (
    <>
      {/* Ambient fill */}
      <ambientLight intensity={0.15} />

      {/* Main directional light */}
      <directionalLight
        position={[5, 15, -10]}
        intensity={4}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Night environment for dark reflections */}
      <Environment preset="night" />

      {/* The cosmic 3D button */}
      <Button3D />
    </>
  )
}

// Main component
export function EnterButton3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <Canvas
        camera={{
          position: [0, 3.2, 0.01],
          fov: 42,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.4,
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "transparent"
        }}
        shadows
      >
        <Scene />
      </Canvas>
    </div>
  )
}
