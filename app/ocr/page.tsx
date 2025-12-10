"use client"

import { useState, useEffect } from "react"
import { CvatUploader } from "@/components/ocr/cvat-uploader"
import { LiquidGlassNavbar } from "@/components/layout/liquid-glass-navbar"
import { InferenceParticlesBackground } from "@/components/inference/inference-particles"

const ACCENT_COLOR = "#00d4ff"

export default function OcrPage() {
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

      {/* Main content with padding for header - scrolls over particles */}
      <main className="relative z-10 pt-24">
        <CvatUploader />
      </main>
    </div>
  )
}
