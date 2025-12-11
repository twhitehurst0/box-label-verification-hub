"use client"

import { useState, useEffect } from "react"
import { LiquidGlassNavbar } from "@/components/layout/liquid-glass-navbar"
import { InferenceParticlesBackground } from "@/components/inference/inference-particles"
import { ModelTestingConsole } from "@/components/model-testing/model-testing-console"

const ACCENT_COLOR = "#a855f7"

export default function ModelTestingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen w-full bg-black">
      {/* Fixed Animated Particle Background */}
      <div className="fixed inset-0 z-0">
        <InferenceParticlesBackground />
      </div>

      {/* Liquid Glass Navbar */}
      <LiquidGlassNavbar scrolled={scrolled} accentColor={ACCENT_COLOR} />

      {/* Main content with padding for header */}
      <main className="relative z-10 pt-24">
        <ModelTestingConsole />
      </main>
    </div>
  )
}
