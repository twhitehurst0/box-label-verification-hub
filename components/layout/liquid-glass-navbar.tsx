"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

const INFERENCE_ACCENT = "#a855f7"

interface LiquidGlassNavbarProps {
  scrolled?: boolean
  accentColor?: string
}

export function LiquidGlassNavbar({
  scrolled = false,
  accentColor = "#00d4ff"
}: LiquidGlassNavbarProps) {
  const [isProjectsHovered, setIsProjectsHovered] = useState(false)
  const [isInferenceOpen, setIsInferenceOpen] = useState(false)
  const [hoveredDropdownItem, setHoveredDropdownItem] = useState<string | null>(null)

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      {/* Navbar container */}
      <div className="relative mx-4 mt-4">
        {/* Animated ambient glow behind navbar */}
        <motion.div
          className="absolute -inset-4 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${accentColor}20 0%, transparent 70%)`,
            filter: "blur(30px)",
          }}
          animate={{
            opacity: scrolled ? 0.8 : 0.4,
            scale: scrolled ? 1.05 : 1,
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute -left-8 -top-4 w-32 h-32 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
            filter: "blur(25px)",
          }}
          animate={{
            x: [0, 10, 0],
            y: [0, -5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute -right-6 -top-2 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
          animate={{
            x: [0, -8, 0],
            y: [0, 8, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 7,
            ease: "easeInOut",
            repeat: Infinity,
            delay: 1,
          }}
        />

        {/* Main glass container */}
        <motion.nav
          className="relative overflow-visible rounded-2xl"
          style={{
            background: scrolled
              ? `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.6) 100%)`
              : `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%)`,
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: `1px solid rgba(255,255,255,${scrolled ? 0.08 : 0.12})`,
            boxShadow: scrolled
              ? `0 20px 60px rgba(0,0,0,0.5), 0 0 100px ${accentColor}08, inset 0 1px 1px rgba(255,255,255,0.1)`
              : `0 8px 32px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)`,
          }}
          animate={{
            y: scrolled ? 0 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Holographic top edge */}
          <motion.div
            className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg,
                transparent 0%,
                ${accentColor}40 20%,
                rgba(255,255,255,0.6) 35%,
                ${accentColor}60 50%,
                rgba(255,255,255,0.6) 65%,
                ${accentColor}40 80%,
                transparent 100%)`,
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />

          {/* Animated shine sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(105deg,
                transparent 0%,
                transparent 40%,
                rgba(255,255,255,0.03) 45%,
                rgba(255,255,255,0.08) 50%,
                rgba(255,255,255,0.03) 55%,
                transparent 60%,
                transparent 100%)`,
            }}
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 8,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />

          {/* Content container */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3">
            {/* Left side - Projects Button */}
            <Link
              href="/projects"
              className="relative group"
              onMouseEnter={() => setIsProjectsHovered(true)}
              onMouseLeave={() => setIsProjectsHovered(false)}
            >
              <motion.div
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl overflow-hidden"
                style={{
                  background: isProjectsHovered
                    ? `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)`
                    : `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
                  border: `1px solid rgba(255,255,255,${isProjectsHovered ? 0.25 : 0.1})`,
                  boxShadow: isProjectsHovered
                    ? `0 4px 20px rgba(0,0,0,0.2), 0 0 30px ${accentColor}15`
                    : "none",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", damping: 20, stiffness: 400 }}
              >
                {/* Glow effect on hover */}
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${accentColor}20 0%, transparent 70%)`,
                  }}
                  animate={{
                    opacity: isProjectsHovered ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                />

                {/* Arrow icon */}
                <motion.svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="relative z-10"
                  animate={{
                    x: isProjectsHovered ? -2 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    filter: isProjectsHovered ? `drop-shadow(0 0 4px ${accentColor})` : "none",
                  }}
                >
                  <path
                    d="M9 11L5 7L9 3"
                    stroke={isProjectsHovered ? accentColor : "rgba(255,255,255,0.7)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>

                {/* Text */}
                <span
                  className="relative z-10 text-sm font-medium tracking-wide"
                  style={{
                    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: isProjectsHovered ? "#fff" : "rgba(255,255,255,0.8)",
                    textShadow: isProjectsHovered ? `0 0 15px ${accentColor}` : "none",
                  }}
                >
                  Projects
                </span>

                {/* Shine sweep on hover */}
                <motion.div
                  className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                  initial={false}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(105deg,
                        transparent 0%,
                        rgba(255,255,255,0.4) 45%,
                        rgba(255,255,255,0.6) 50%,
                        rgba(255,255,255,0.4) 55%,
                        transparent 100%)`,
                    }}
                    initial={{ x: "-150%" }}
                    animate={{ x: isProjectsHovered ? "150%" : "-150%" }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  />
                </motion.div>
              </motion.div>
            </Link>

            {/* Center - Page Navigation */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {/* Dataset Uploader */}
              <Link href="/ocr">
                <motion.span
                  className="text-base font-semibold tracking-wide whitespace-nowrap cursor-pointer"
                  style={{
                    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 100%)`,
                    backgroundSize: "200% 200%",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", damping: 20, stiffness: 400 }}
                >
                  Dataset Uploader
                </motion.span>
              </Link>

              {/* Animated Divider */}
              <div className="relative h-6 w-px">
                {/* Base line */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                  }}
                />
                {/* Animated glow traveling up */}
                <motion.div
                  className="absolute w-full"
                  style={{
                    height: "12px",
                    background: `linear-gradient(180deg, transparent 0%, ${accentColor}80 50%, transparent 100%)`,
                    filter: `blur(1px)`,
                  }}
                  animate={{
                    top: ["100%", "-50%"],
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                />
                {/* Ambient glow */}
                <motion.div
                  className="absolute inset-0 w-4 -left-1.5"
                  style={{
                    background: `radial-gradient(ellipse at center, ${accentColor}30 0%, transparent 70%)`,
                    filter: "blur(4px)",
                  }}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                />
              </div>

              {/* Inference Testing Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsInferenceOpen(true)}
                onMouseLeave={() => setIsInferenceOpen(false)}
              >
                <Link href="/inference">
                  <motion.div
                    className="relative flex items-center gap-2 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", damping: 20, stiffness: 400 }}
                  >
                    {/* Text */}
                    <span
                      className="text-base font-semibold tracking-wide whitespace-nowrap"
                      style={{
                        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                        backgroundImage: isInferenceOpen
                          ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, ${INFERENCE_ACCENT} 50%, rgba(255,255,255,0.9) 100%)`
                          : `linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 100%)`,
                        backgroundSize: "200% 200%",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                        animation: isInferenceOpen ? "shimmer 4s ease-in-out infinite" : "none",
                      }}
                    >
                      Inference Testing
                    </span>

                    {/* Chevron */}
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      animate={{
                        rotate: isInferenceOpen ? 180 : 0,
                      }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke={isInferenceOpen ? INFERENCE_ACCENT : "rgba(255,255,255,0.5)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  </motion.div>
                </Link>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isInferenceOpen && (
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 z-50"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Dropdown glow */}
                      <div
                        className="absolute -inset-2 rounded-2xl pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${INFERENCE_ACCENT}15 0%, transparent 70%)`,
                          filter: "blur(20px)",
                        }}
                      />

                      {/* Dropdown container */}
                      <div
                        className="relative rounded-xl overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 100%)`,
                          backdropFilter: "blur(40px) saturate(180%)",
                          WebkitBackdropFilter: "blur(40px) saturate(180%)",
                          border: `1px solid ${INFERENCE_ACCENT}30`,
                          boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 60px ${INFERENCE_ACCENT}10, inset 0 1px 1px rgba(255,255,255,0.1)`,
                        }}
                      >
                        {/* Top holographic edge */}
                        <div
                          className="absolute inset-x-0 top-0 h-[1px]"
                          style={{
                            background: `linear-gradient(90deg, transparent 0%, ${INFERENCE_ACCENT}60 50%, transparent 100%)`,
                          }}
                        />

                        {/* Menu items */}
                        <div className="relative z-10 p-2">
                          {/* Model Testing */}
                          <Link href="/inference/model-testing">
                            <motion.div
                              className="relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer overflow-hidden"
                              onMouseEnter={() => setHoveredDropdownItem("model")}
                              onMouseLeave={() => setHoveredDropdownItem(null)}
                              style={{
                                background: hoveredDropdownItem === "model"
                                  ? `linear-gradient(135deg, ${INFERENCE_ACCENT}20 0%, ${INFERENCE_ACCENT}10 100%)`
                                  : "transparent",
                              }}
                              whileHover={{ x: 4 }}
                              transition={{ duration: 0.2 }}
                            >
                              {/* Icon glow */}
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                                style={{
                                  background: INFERENCE_ACCENT,
                                  boxShadow: `0 0 10px ${INFERENCE_ACCENT}`,
                                }}
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{
                                  opacity: hoveredDropdownItem === "model" ? 1 : 0,
                                  scaleY: hoveredDropdownItem === "model" ? 1 : 0,
                                }}
                                transition={{ duration: 0.2 }}
                              />

                              {/* Icon */}
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{
                                  background: `linear-gradient(135deg, ${INFERENCE_ACCENT}20 0%, ${INFERENCE_ACCENT}10 100%)`,
                                  border: `1px solid ${INFERENCE_ACCENT}30`,
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <rect x="2" y="2" width="5" height="5" rx="1" stroke={INFERENCE_ACCENT} strokeWidth="1.5" />
                                  <rect x="9" y="2" width="5" height="5" rx="1" stroke={INFERENCE_ACCENT} strokeWidth="1.5" />
                                  <rect x="2" y="9" width="5" height="5" rx="1" stroke={INFERENCE_ACCENT} strokeWidth="1.5" />
                                  <path d="M11.5 9V14M9 11.5H14" stroke={INFERENCE_ACCENT} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </div>

                              {/* Text */}
                              <div className="flex flex-col">
                                <span
                                  className="text-sm font-medium"
                                  style={{
                                    color: hoveredDropdownItem === "model" ? "#fff" : "rgba(255,255,255,0.9)",
                                    textShadow: hoveredDropdownItem === "model" ? `0 0 10px ${INFERENCE_ACCENT}` : "none",
                                  }}
                                >
                                  Model Testing
                                </span>
                                <span className="text-xs text-white/40">
                                  Run inference tests
                                </span>
                              </div>

                              {/* Arrow */}
                              <motion.svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                className="ml-auto"
                                animate={{
                                  x: hoveredDropdownItem === "model" ? 2 : 0,
                                  opacity: hoveredDropdownItem === "model" ? 1 : 0.4,
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                <path
                                  d="M5 3L9 7L5 11"
                                  stroke={INFERENCE_ACCENT}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </motion.svg>
                            </motion.div>
                          </Link>

                          {/* Divider */}
                          <div
                            className="mx-3 my-1 h-[1px]"
                            style={{
                              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
                            }}
                          />

                          {/* Reporting */}
                          <Link href="/inference/reporting">
                            <motion.div
                              className="relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer overflow-hidden"
                              onMouseEnter={() => setHoveredDropdownItem("reporting")}
                              onMouseLeave={() => setHoveredDropdownItem(null)}
                              style={{
                                background: hoveredDropdownItem === "reporting"
                                  ? `linear-gradient(135deg, ${INFERENCE_ACCENT}20 0%, ${INFERENCE_ACCENT}10 100%)`
                                  : "transparent",
                              }}
                              whileHover={{ x: 4 }}
                              transition={{ duration: 0.2 }}
                            >
                              {/* Icon glow */}
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                                style={{
                                  background: INFERENCE_ACCENT,
                                  boxShadow: `0 0 10px ${INFERENCE_ACCENT}`,
                                }}
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{
                                  opacity: hoveredDropdownItem === "reporting" ? 1 : 0,
                                  scaleY: hoveredDropdownItem === "reporting" ? 1 : 0,
                                }}
                                transition={{ duration: 0.2 }}
                              />

                              {/* Icon */}
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{
                                  background: `linear-gradient(135deg, ${INFERENCE_ACCENT}20 0%, ${INFERENCE_ACCENT}10 100%)`,
                                  border: `1px solid ${INFERENCE_ACCENT}30`,
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <path d="M3 13V5M7 13V3M11 13V7M15 13V9" stroke={INFERENCE_ACCENT} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </div>

                              {/* Text */}
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-sm font-medium"
                                    style={{
                                      color: hoveredDropdownItem === "reporting" ? "#fff" : "rgba(255,255,255,0.9)",
                                      textShadow: hoveredDropdownItem === "reporting" ? `0 0 10px ${INFERENCE_ACCENT}` : "none",
                                    }}
                                  >
                                    Reporting
                                  </span>
                                  {/* Coming Soon Badge */}
                                  <span
                                    className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded"
                                    style={{
                                      background: `linear-gradient(135deg, ${INFERENCE_ACCENT}30 0%, ${INFERENCE_ACCENT}15 100%)`,
                                      border: `1px solid ${INFERENCE_ACCENT}40`,
                                      color: INFERENCE_ACCENT,
                                    }}
                                  >
                                    Soon
                                  </span>
                                </div>
                                <span className="text-xs text-white/40">
                                  View test results
                                </span>
                              </div>

                              {/* Arrow */}
                              <motion.svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                className="ml-auto"
                                animate={{
                                  x: hoveredDropdownItem === "reporting" ? 2 : 0,
                                  opacity: hoveredDropdownItem === "reporting" ? 1 : 0.4,
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                <path
                                  d="M5 3L9 7L5 11"
                                  stroke={INFERENCE_ACCENT}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </motion.svg>
                            </motion.div>
                          </Link>
                        </div>

                        {/* Bottom edge */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-[1px]"
                          style={{
                            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Right side - Empty spacer for balance */}
            <div className="w-24" />
          </div>

          {/* Bottom edge highlight */}
          <div
            className="absolute inset-x-0 bottom-0 h-[1px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
            }}
          />
        </motion.nav>
      </div>

      {/* Shimmer animation keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </motion.header>
  )
}
