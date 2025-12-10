"use client"

import * as THREE from "three"
import { useMemo, useState, useRef, useEffect } from "react"
import { createPortal, useFrame } from "@react-three/fiber"
import { useFBO, Effects } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import * as easing from "maath/easing"

import { DofPointsMaterial } from "./shaders/point-material"
import { SimulationMaterial } from "./shaders/simulation-material"
import { VignetteShader } from "./shaders/vignette-shader"

// Particle system configuration - optimized values
const PARTICLE_CONFIG = {
  speed: 1.0,
  noiseScale: 0.6,
  noiseIntensity: 0.52,
  timeScale: 1,
  focus: 3.8,
  aperture: 1.79,
  pointSize: 10.0,
  opacity: 0.8,
  planeScale: 10.0,
  size: 512,
  vignetteDarkness: 1.5,
  vignetteOffset: 0.4,
}

interface ParticlesProps {
  introspect?: boolean
}

function Particles({ introspect = false }: ParticlesProps) {
  const {
    speed,
    aperture,
    focus,
    size,
    noiseScale,
    noiseIntensity,
    timeScale,
    pointSize,
    opacity,
    planeScale,
  } = PARTICLE_CONFIG

  // Reveal animation state
  const revealStartTime = useRef<number | null>(null)
  const [isRevealing, setIsRevealing] = useState(true)
  const revealDuration = 3.5 // seconds

  // Create simulation material with scale parameter
  const simulationMaterial = useMemo(() => {
    return new SimulationMaterial(planeScale)
  }, [planeScale])

  const target = useFBO(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  })

  const dofPointsMaterial = useMemo(() => {
    const m = new DofPointsMaterial()
    m.uniforms.positions.value = target.texture
    m.uniforms.initialPositions.value =
      simulationMaterial.uniforms.positions.value
    return m
  }, [simulationMaterial, target.texture])

  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1)
  )
  const [positions] = useState(
    () =>
      new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
      ])
  )
  const [uvs] = useState(
    () => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0])
  )

  const particles = useMemo(() => {
    const length = size * size
    const particlePositions = new Float32Array(length * 3)
    for (let i = 0; i < length; i++) {
      const i3 = i * 3
      particlePositions[i3 + 0] = (i % size) / size
      particlePositions[i3 + 1] = i / size / size
    }
    return particlePositions
  }, [size])

  useFrame((state, delta) => {
    if (!dofPointsMaterial || !simulationMaterial) return

    state.gl.setRenderTarget(target)
    state.gl.clear()
    state.gl.render(scene, camera)
    state.gl.setRenderTarget(null)

    const currentTime = state.clock.elapsedTime

    // Initialize reveal start time on first frame
    if (revealStartTime.current === null) {
      revealStartTime.current = currentTime
    }

    // Calculate reveal progress
    const revealElapsed = currentTime - revealStartTime.current
    const revealProgress = Math.min(revealElapsed / revealDuration, 1.0)

    // Ease out the reveal animation
    const easedProgress = 1 - Math.pow(1 - revealProgress, 3)

    // Map progress to reveal factor
    const revealFactor = easedProgress * 4.0

    if (revealProgress >= 1.0 && isRevealing) {
      setIsRevealing(false)
    }

    dofPointsMaterial.uniforms.uTime.value = currentTime
    dofPointsMaterial.uniforms.uFocus.value = focus
    dofPointsMaterial.uniforms.uBlur.value = aperture

    easing.damp(
      dofPointsMaterial.uniforms.uTransition,
      "value",
      introspect ? 1.0 : 0.0,
      introspect ? 0.35 : 0.2,
      delta
    )

    simulationMaterial.uniforms.uTime.value = currentTime
    simulationMaterial.uniforms.uNoiseScale.value = noiseScale
    simulationMaterial.uniforms.uNoiseIntensity.value = noiseIntensity
    simulationMaterial.uniforms.uTimeScale.value = timeScale * speed

    // Update point material uniforms
    dofPointsMaterial.uniforms.uPointSize.value = pointSize
    dofPointsMaterial.uniforms.uOpacity.value = opacity
    dofPointsMaterial.uniforms.uRevealFactor.value = revealFactor
    dofPointsMaterial.uniforms.uRevealProgress.value = easedProgress
  })

  return (
    <>
      {createPortal(
        <mesh material={simulationMaterial}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          </bufferGeometry>
        </mesh>,
        scene
      )}
      <points material={dofPointsMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
      </points>
    </>
  )
}

interface InferenceParticlesBackgroundProps {
  hovering?: boolean
}

export function InferenceParticlesBackground({
  hovering = false,
}: InferenceParticlesBackgroundProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{
          position: [1.26, 2.66, -1.82],
          fov: 50,
          near: 0.01,
          far: 300,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#000"]} />
        <Particles introspect={hovering} />
        <Effects multisamping={0} disableGamma>
          <shaderPass
            args={[VignetteShader]}
            uniforms-darkness-value={PARTICLE_CONFIG.vignetteDarkness}
            uniforms-offset-value={PARTICLE_CONFIG.vignetteOffset}
          />
        </Effects>
      </Canvas>
    </div>
  )
}
