"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useSpring } from "framer-motion"
import { InferenceCard } from "./inference-card"
import { NavigationDots } from "../project-selector/navigation-dots"
import { inferenceOptions } from "@/data/inference-options"
import { useSliderNavigation } from "@/hooks/use-slider-navigation"
import { useSliderDrag } from "@/hooks/use-slider-drag"
import { useSliderWheel } from "@/hooks/use-slider-wheel"

interface InferenceSelectionSliderProps {
  onCardHover?: (hovering: boolean) => void
}

export function InferenceSelectionSlider({
  onCardHover,
}: InferenceSelectionSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [windowWidth, setWindowWidth] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWindowWidth(window.innerWidth)
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const { currentIndex, goToNext, goToPrev, goToSlide } = useSliderNavigation({
    totalSlides: inferenceOptions.length,
    enableKeyboard: true,
  })

  const {
    isDragging,
    dragX,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useSliderDrag({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  })

  useSliderWheel({
    sliderRef,
    onScrollLeft: goToNext,
    onScrollRight: goToPrev,
  })

  const currentOption = inferenceOptions[currentIndex]
  const accentColor = currentOption?.accentColor || "#a855f7"

  // Compute slide offset - card width + gap
  const slideWidth = windowWidth > 768 ? 564 : 432

  // Smooth spring animation for the slider position
  const springConfig = { damping: 30, stiffness: 200, mass: 0.8 }
  const targetX = -currentIndex * slideWidth + dragX
  const smoothX = useSpring(
    targetX,
    isDragging ? { damping: 100, stiffness: 1000 } : springConfig
  )

  // Update spring target when index or drag changes
  useEffect(() => {
    smoothX.set(targetX)
  }, [targetX, smoothX])

  // Handle card click to navigate
  const handleCardClick = (index: number) => {
    if (!isDragging && Math.abs(dragX) < 5) {
      goToSlide(index)
    }
  }

  // Handle card hover
  const handleCardHoverChange = (hovering: boolean) => {
    setIsHovered(hovering)
    onCardHover?.(hovering)
  }

  if (!mounted) {
    return <div className="h-full w-full" />
  }

  return (
    <div className="pointer-events-auto relative z-10 h-full w-full pt-20">
      {/* Slide Counter - positioned below navbar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-8 top-24 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
      >
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tabular-nums text-sm text-white/60"
        >
          {String(currentIndex + 1).padStart(2, "0")}
        </motion.span>
        <span className="text-white/30">/</span>
        <span className="tabular-nums text-sm text-white/40">
          {String(inferenceOptions.length).padStart(2, "0")}
        </span>
      </motion.div>

      {/* Slider */}
      <div
        ref={sliderRef}
        className="relative flex h-full w-full cursor-grab items-center active:cursor-grabbing"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <motion.div
          className="flex items-center gap-8 px-[calc(50vw-200px)] md:gap-16 md:px-[calc(50vw-250px)]"
          style={{ x: smoothX }}
        >
          {inferenceOptions.map((option, index) => (
            <InferenceCard
              key={option.id}
              option={option}
              isActive={index === currentIndex}
              dragOffset={dragX}
              index={index}
              currentIndex={currentIndex}
              onClick={() => handleCardClick(index)}
              onHoverChange={handleCardHoverChange}
            />
          ))}
        </motion.div>
      </div>

      {/* Navigation dots */}
      <NavigationDots
        total={inferenceOptions.length}
        current={currentIndex}
        onSelect={goToSlide}
        accentColor={accentColor}
      />

      {/* Keyboard hint with fade animation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-8 hidden items-center gap-3 text-white/30 md:flex"
      >
        <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs backdrop-blur-sm">
          ←
        </kbd>
        <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs backdrop-blur-sm">
          →
        </kbd>
        <span className="text-xs tracking-wide">navigate</span>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 right-8 hidden items-center gap-2 text-white/20 md:flex"
      >
        <span className="text-xs tracking-wide">scroll or drag to navigate</span>
      </motion.div>

      {/* Shimmer animation keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  )
}
