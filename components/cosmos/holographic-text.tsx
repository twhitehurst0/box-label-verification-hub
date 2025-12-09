"use client"

/**
 * HolographicText Component
 *
 * Creates a futuristic holographic text effect with chromatic aberration,
 * mouse-tracking parallax, and random glitch animations.
 *
 * Visual Effects:
 * - Layered text with cyan and magenta color offsets (chromatic aberration)
 * - Mouse-responsive parallax movement for 3D depth illusion
 * - Random glitch animation triggered at ~5% probability every 3 seconds
 * - Orange glow layer matching the particle color theme
 * - Screen blend mode for additive color mixing
 *
 * @param children - The text content to display
 * @param className - Optional additional CSS classes
 *
 * @example
 * <HolographicText className="text-6xl">
 *   Welcome to Cosmos
 * </HolographicText>
 */

import { useEffect, useRef, useState } from "react"

interface HolographicTextProps {
  /** The text content to render with holographic effect */
  children: string
  /** Optional CSS classes to apply to the container */
  className?: string
}

export function HolographicText({ children, className = "" }: HolographicTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate parallax offset (max 10px)
      const x = ((e.clientX - centerX) / window.innerWidth) * 10
      const y = ((e.clientY - centerY) / window.innerHeight) * 10

      setMousePosition({ x, y })
    }

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setIsGlitching(true)
        setTimeout(() => setIsGlitching(false), 150)
      }
    }, 3000)

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      clearInterval(glitchInterval)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ perspective: "1000px" }}
    >
      {/* Scan lines overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="scan-lines" />
      </div>

      {/* Base layer (invisible, for layout) */}
      <h1 className="invisible max-w-[750px] mx-auto text-center font-instrument-serif px-6 md:text-6xl text-4xl tracking-tight font-normal">
        {children}
      </h1>

      {/* Layer 1: Cyan (left/top offset) */}
      <h1
        className={`absolute inset-0 max-w-[750px] mx-auto text-center font-instrument-serif px-6 md:text-6xl text-4xl tracking-tight font-normal text-cyan-400 transition-transform duration-100 ${isGlitching ? "holographic-glitch" : ""}`}
        style={{
          transform: `translate(${-3 + mousePosition.x * 0.5}px, ${-3 + mousePosition.y * 0.5}px)`,
          textShadow: "0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)",
          mixBlendMode: "screen",
        }}
      >
        {children}
      </h1>

      {/* Layer 2: Magenta (right/bottom offset) */}
      <h1
        className={`absolute inset-0 max-w-[750px] mx-auto text-center font-instrument-serif px-6 md:text-6xl text-4xl tracking-tight font-normal text-magenta-500 transition-transform duration-100 ${isGlitching ? "holographic-glitch" : ""}`}
        style={{
          transform: `translate(${3 + mousePosition.x * -0.5}px, ${3 + mousePosition.y * -0.5}px)`,
          textShadow: "0 0 20px rgba(255, 0, 255, 0.8), 0 0 40px rgba(255, 0, 255, 0.4)",
          mixBlendMode: "screen",
        }}
      >
        {children}
      </h1>

      {/* Layer 3: White center (main text) */}
      <h1
        className={`absolute inset-0 max-w-[750px] mx-auto text-center font-instrument-serif px-6 md:text-6xl text-4xl tracking-tight font-normal text-white transition-transform duration-100 ${isGlitching ? "holographic-glitch" : ""}`}
        style={{
          transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
          textShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
        }}
      >
        {children}
      </h1>

      {/* Layer 4: Orange glow (matching particles) */}
      <h1
        className="absolute inset-0 max-w-[750px] mx-auto text-center font-instrument-serif px-6 md:text-6xl text-4xl tracking-tight font-normal text-orange-300 opacity-30"
        style={{
          transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`,
          textShadow: "0 0 30px rgba(255, 165, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.4)",
          mixBlendMode: "screen",
        }}
      >
        {children}
      </h1>
    </div>
  )
}
