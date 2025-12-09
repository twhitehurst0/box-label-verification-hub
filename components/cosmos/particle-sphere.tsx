"use client"

/**
 * ParticleSphere Component
 *
 * A 3D animated particle sphere with orbiting video texture planes.
 * This component creates an immersive visual experience with:
 * - 1500 particles arranged in a spherical formation with organic randomness
 * - 24 floating video planes orbiting the sphere
 * - Continuous rotation animation
 * - Video textures loaded from /vid1.mp4 through /vid10.mp4
 *
 * @requires @react-three/fiber - React renderer for Three.js
 * @requires three - Core 3D library
 *
 * @example
 * // Use within a Canvas component
 * <Canvas>
 *   <ParticleSphere />
 * </Canvas>
 */

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export function ParticleSphere() {
  const PARTICLE_COUNT = 1500 // Reduced particle count to make videos more visible
  const PARTICLE_SIZE_MIN = 0.005
  const PARTICLE_SIZE_MAX = 0.010
  const SPHERE_RADIUS = 9
  const POSITION_RANDOMNESS = 4
  const ROTATION_SPEED_X = 0.0
  const ROTATION_SPEED_Y = 0.0005
  const PARTICLE_OPACITY = 1

  const IMAGE_COUNT = 24
  const IMAGE_SIZE = 1.5 // Increased video size to make them more visible

  const groupRef = useRef<THREE.Group>(null)
  const videoTexturesRef = useRef<THREE.VideoTexture[]>([])

  const videoTextures = useMemo(() => {
    const videoFiles = [
      "/videos/vid1.mp4",
      "/videos/vid2.mp4",
      "/videos/vid3.mp4",
      "/videos/vid4.mp4",
      "/videos/vid5.mp4",
      "/videos/vid6.mp4",
      "/videos/vid7.mp4",
      "/videos/vid8.mp4",
      "/videos/vid9.mp4",
      "/videos/vid10.mp4",
    ]

    const textures: THREE.VideoTexture[] = []

    videoFiles.forEach((videoFile) => {
      const video = document.createElement("video")
      video.src = videoFile
      video.autoplay = true
      video.muted = true
      video.loop = true
      video.crossOrigin = "anonymous"
      video.style.display = "none"
      document.body.appendChild(video)

      const texture = new THREE.VideoTexture(video)
      texture.flipY = false
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      textures.push(texture)
    })

    videoTexturesRef.current = textures
    return textures
  }, [])

  const particles = useMemo(() => {
    const particles = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Generate points on sphere surface with some random variation
      const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT)
      const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi

      // Add random variation to make it more organic
      const radiusVariation = SPHERE_RADIUS + (Math.random() - 0.5) * POSITION_RANDOMNESS

      const x = radiusVariation * Math.cos(theta) * Math.sin(phi)
      const y = radiusVariation * Math.cos(phi)
      const z = radiusVariation * Math.sin(theta) * Math.sin(phi)

      particles.push({
        position: [x, y, z] as [number, number, number],
        scale: Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN,
        color: new THREE.Color().setHSL(
          Math.random() * 0.1 + 0.05, // Yellow-orange hues
          0.8,
          0.6 + Math.random() * 0.3,
        ),
        rotationSpeed: (Math.random() - 0.5) * 0.01,
      })
    }

    return particles
  }, [PARTICLE_COUNT, SPHERE_RADIUS, POSITION_RANDOMNESS, PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX])

  const orbitingImages = useMemo(() => {
    const images = []

    for (let i = 0; i < IMAGE_COUNT; i++) {
      const angle = (i / IMAGE_COUNT) * Math.PI * 2
      const x = SPHERE_RADIUS * Math.cos(angle)
      const y = 0 // All videos aligned on X-axis
      const z = SPHERE_RADIUS * Math.sin(angle)

      const position = new THREE.Vector3(x, y, z)
      const center = new THREE.Vector3(0, 0, 0)
      const outwardDirection = position.clone().sub(center).normalize()

      // Create a rotation that makes the plane face outward
      const euler = new THREE.Euler()
      const matrix = new THREE.Matrix4()
      matrix.lookAt(position, position.clone().add(outwardDirection), new THREE.Vector3(0, 1, 0))
      euler.setFromRotationMatrix(matrix)

      euler.z += Math.PI

      images.push({
        position: [x, y, z] as [number, number, number],
        rotation: [euler.x, euler.y, euler.z] as [number, number, number],
        textureIndex: i % videoTextures.length,
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6), // Added random colors
      })
    }

    return images
  }, [IMAGE_COUNT, SPHERE_RADIUS, videoTextures.length])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED_Y
      groupRef.current.rotation.x += ROTATION_SPEED_X
    }
  })

  return (
    <group ref={groupRef}>
      {/* Existing particles */}
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position} scale={particle.scale}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={particle.color} transparent opacity={PARTICLE_OPACITY} />
        </mesh>
      ))}

      {orbitingImages.map((image, index) => {
        // Floating animation
        const floatTime = Date.now() * 0.001 + index * 0.3
        const floatX = Math.sin(floatTime * 1.2) * 0.15
        const floatY = Math.cos(floatTime * 0.8) * 0.12
        const floatZ = Math.sin(floatTime * 0.6) * 0.1

        const floatingPosition: [number, number, number] = [
          image.position[0] + floatX,
          image.position[1] + floatY,
          image.position[2] + floatZ,
        ]

        return (
          <mesh key={`image-${index}`} position={floatingPosition} rotation={image.rotation}>
            <planeGeometry args={[IMAGE_SIZE, IMAGE_SIZE]} />
            <meshBasicMaterial map={videoTextures[image.textureIndex]} opacity={1} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}
