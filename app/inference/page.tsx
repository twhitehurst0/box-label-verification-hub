"use client"

import { useState } from "react"
import { InferenceParticlesBackground } from "@/components/inference/inference-particles"
import { InferenceSelectionSlider } from "@/components/inference/inference-selection-slider"
import { LiquidGlassNavbar } from "@/components/layout/liquid-glass-navbar"

const ACCENT_COLOR = "#a855f7" // Purple accent for inference

export default function InferencePage() {
  const [isCardHovered, setIsCardHovered] = useState(false)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Liquid Glass Navbar */}
      <LiquidGlassNavbar accentColor={ACCENT_COLOR} />

      {/* Particle Background */}
      <InferenceParticlesBackground hovering={isCardHovered} />

      {/* Selection Slider Overlay */}
      <InferenceSelectionSlider onCardHover={setIsCardHovered} />
    </div>
  )
}
