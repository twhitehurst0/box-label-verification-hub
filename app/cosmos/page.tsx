/**
 * Cosmos Gallery Page
 *
 * Immersive 3D experience featuring:
 * - Particle sphere with 1500+ animated particles
 * - 24 orbiting video texture planes
 * - Holographic text with chromatic aberration
 * - Industrial Enter button with glow effects
 * - Orbiting rockets with thruster flames
 *
 * @route /cosmos
 */

"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { ParticleSphere } from "@/components/cosmos/particle-sphere"
import { HolographicText } from "@/components/cosmos/holographic-text"
import { EnterButtonIndustrial } from "@/components/cosmos/enter-button-industrial"
import { RocketOrbit3D } from "@/components/cosmos/rocket-orbit-3d"

export default function CosmosPage() {
  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* Holographic Title */}
      <div className="fixed top-16 left-0 right-0 z-20 p-6">
        <HolographicText>
          Flovision | Box Label Verification
        </HolographicText>
      </div>

      {/* 3D Rockets orbiting around the title */}
      <Suspense fallback={null}>
        <div
          className="fixed z-30 pointer-events-none"
          style={{
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100vw",
            height: "180px",
          }}
        >
          <RocketOrbit3D />
        </div>
      </Suspense>

      {/* 3D Enter Button - floating in space */}
      <Suspense fallback={null}>
        <div
          className="fixed z-20 pointer-events-auto"
          style={{
            top: "140px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            height: "300px"
          }}
        >
          <EnterButtonIndustrial />
        </div>
      </Suspense>

      {/* Main 3D Scene with Particle Sphere */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [-10, 1.5, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <ParticleSphere />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </div>
    </div>
  )
}
