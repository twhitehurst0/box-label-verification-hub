/**
 * Projects Page
 *
 * Full-screen project selector gallery with video cards for OCR and Detection projects.
 * Features drag, swipe, scroll wheel, and keyboard navigation.
 */

"use client"

import { useState } from "react"
import { ProjectGallerySlider } from "@/components/project-selector/project-gallery-slider"
import { InferenceParticlesBackground } from "@/components/inference/inference-particles"

export default function ProjectsPage() {
  const [isCardHovered, setIsCardHovered] = useState(false)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Animated Particle Background */}
      <InferenceParticlesBackground hovering={isCardHovered} />

      {/* Project Gallery Slider */}
      <div className="relative z-10 h-full w-full">
        <ProjectGallerySlider onCardHover={setIsCardHovered} />
      </div>
    </div>
  )
}
