"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion"
import { useRouter } from "next/navigation"
import { ProjectCard } from "./project-card"
import { NavigationDots } from "./navigation-dots"
import { projects } from "@/data/projects"
import { useSliderNavigation } from "@/hooks/use-slider-navigation"
import { useSliderDrag } from "@/hooks/use-slider-drag"
import { useSliderWheel } from "@/hooks/use-slider-wheel"

export function ProjectGallerySlider() {
  const router = useRouter()
  const sliderRef = useRef<HTMLDivElement>(null)
  const [windowWidth, setWindowWidth] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWindowWidth(window.innerWidth)
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const { currentIndex, goToNext, goToPrev, goToSlide } = useSliderNavigation({
    totalSlides: projects.length,
    enableKeyboard: true,
  })

  const { isDragging, dragX, handleDragStart, handleDragMove, handleDragEnd } = useSliderDrag({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  })

  useSliderWheel({
    sliderRef,
    onScrollLeft: goToNext,
    onScrollRight: goToPrev,
  })

  const currentProject = projects[currentIndex]
  const accentColor = currentProject?.accentColor || "#00d4ff"

  // Compute slide offset - card width + gap
  const slideWidth = windowWidth > 768 ? 564 : 432

  // Smooth spring animation for the slider position
  const springConfig = { damping: 30, stiffness: 200, mass: 0.8 }
  const targetX = -currentIndex * slideWidth + dragX
  const smoothX = useSpring(targetX, isDragging ? { damping: 100, stiffness: 1000 } : springConfig)

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

  if (!mounted) {
    return <div className="h-full w-full bg-black" />
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Animated ambient background with smoother color transitions */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 30% 20%, ${accentColor}55 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 70% 80%, ${accentColor}44 0%, transparent 50%),
              radial-gradient(ellipse 100% 80% at 50% 50%, ${accentColor}22 0%, transparent 60%),
              linear-gradient(180deg, #050505 0%, #0a0a0a 50%, #080808 100%)
            `,
          }}
        />
      </AnimatePresence>

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Soft blur overlay for depth */}
      <div className="absolute inset-0 backdrop-blur-3xl" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
        animate={{
          x: ["-20%", "10%", "-20%"],
          y: ["-10%", "20%", "-10%"],
        }}
        transition={{
          duration: 20,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <HomepageButton onClick={() => router.push("/")} accentColor={accentColor} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
        >
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-white/60 tabular-nums"
          >
            {String(currentIndex + 1).padStart(2, "0")}
          </motion.span>
          <span className="text-white/30">/</span>
          <span className="text-sm text-white/40 tabular-nums">{String(projects.length).padStart(2, "0")}</span>
        </motion.div>
      </header>

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
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={index === currentIndex}
              dragOffset={dragX}
              index={index}
              currentIndex={currentIndex}
              onClick={() => handleCardClick(index)}
            />
          ))}
        </motion.div>
      </div>

      {/* Navigation dots */}
      <NavigationDots
        total={projects.length}
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
        <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs backdrop-blur-sm">←</kbd>
        <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs backdrop-blur-sm">→</kbd>
        <span className="text-xs tracking-wide">navigate</span>
      </motion.div>

      {/* Click hint on inactive cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 right-8 hidden items-center gap-2 text-white/20 md:flex"
      >
        <span className="text-xs tracking-wide">click card to select</span>
      </motion.div>
    </div>
  )
}

// Liquid Glass Homepage Button Component
function HomepageButton({ onClick, accentColor }: { onClick: () => void; accentColor: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  return (
    <motion.button
      className="relative cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      {/* Ambient glow behind button */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(ellipse 150% 100% at 50% 50%, ${accentColor}25 0%, transparent 70%)`,
          filter: "blur(20px)",
          transform: "scale(1.8)",
        }}
        animate={{
          opacity: isHovered ? [0.5, 0.8, 0.5] : 0.3,
          scale: isHovered ? [1.8, 2.1, 1.8] : 1.8,
        }}
        transition={{
          opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Main liquid glass container */}
      <motion.div
        className="relative flex items-center gap-2.5 overflow-hidden rounded-full"
        style={{
          background: isHovered
            ? `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.15) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.1) 100%)`,
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: `1px solid rgba(255,255,255,${isHovered ? 0.4 : 0.25})`,
          boxShadow: isPressed
            ? `inset 0 3px 12px rgba(255,255,255,0.08), 0 0 30px ${accentColor}15`
            : isHovered
            ? `0 8px 40px rgba(0,0,0,0.25), 0 0 50px ${accentColor}12, inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(255,255,255,0.1)`
            : `0 4px 20px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(255,255,255,0.08)`,
          padding: "10px 20px",
        }}
        animate={{
          y: isPressed ? 1 : isHovered ? -2 : 0,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 500 }}
      >
        {/* Top refraction highlight */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 25%, transparent 55%)",
            opacity: 0.7,
          }}
        />

        {/* Liquid bubble effect */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "50%",
            height: "35%",
            top: "12%",
            left: "25%",
            background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 50%, transparent 75%)",
            filter: "blur(1px)",
          }}
          animate={{
            opacity: isHovered ? 0.9 : 0.6,
            scale: isHovered ? [1, 1.08, 1] : 1,
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Chromatic edge effect */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(90deg, rgba(255,120,120,0.06) 0%, transparent 25%, transparent 75%, rgba(120,120,255,0.06) 100%)`,
          }}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Bottom caustic shimmer */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "70%",
            height: "15%",
            bottom: "15%",
            left: "15%",
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}12 50%, transparent 100%)`,
            filter: "blur(3px)",
          }}
          animate={{
            opacity: isHovered ? [0.4, 0.7, 0.4] : 0.25,
            x: isHovered ? ["-8%", "8%", "-8%"] : "0%",
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Rotating border glow */}
        <motion.div
          className="absolute inset-[-1px] rounded-full pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,0.5), transparent, ${accentColor}25, transparent)`,
          }}
          animate={{
            opacity: isHovered ? 0.7 : 0,
            rotate: isHovered ? 360 : 0,
          }}
          transition={{
            opacity: { duration: 0.35 },
            rotate: { duration: 5, repeat: Infinity, ease: "linear" },
          }}
        />

        {/* Home icon */}
        <motion.div
          className="relative z-10"
          animate={{
            scale: isHovered ? [1, 1.1, 1] : 1,
          }}
          transition={{
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="relative"
            style={{
              filter: isHovered ? `drop-shadow(0 0 6px ${accentColor}80)` : "none",
            }}
          >
            <path
              d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
              stroke={isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.8)"}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Text with glass reflection */}
        <motion.span
          className="relative z-10 font-semibold text-sm tracking-wide"
          style={{
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            color: isHovered ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.88)",
            textShadow: isHovered
              ? `0 0 20px ${accentColor}70, 0 1px 2px rgba(0,0,0,0.25)`
              : "0 1px 2px rgba(0,0,0,0.15)",
          }}
          animate={{
            letterSpacing: isHovered ? "0.05em" : "0.02em",
          }}
          transition={{ duration: 0.3 }}
        >
          Homepage
        </motion.span>

        {/* Liquid shine sweep */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        >
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.45) 42%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.45) 58%, transparent 75%)",
            }}
            initial={{ x: "-150%" }}
            animate={{
              x: isHovered ? "150%" : "-150%",
            }}
            transition={{
              duration: 0.9,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      </motion.div>
    </motion.button>
  )
}
