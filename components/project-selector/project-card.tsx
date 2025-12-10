"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Project } from "@/types/project"

interface ProjectCardProps {
  project: Project
  isActive: boolean
  dragOffset: number
  index: number
  currentIndex: number
  onClick?: () => void
}

export function ProjectCard({ project, isActive, dragOffset, index, currentIndex, onClick }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isEnterHovered, setIsEnterHovered] = useState(false)
  const [isEnterPressed, setIsEnterPressed] = useState(false)
  const router = useRouter()

  const distance = index - currentIndex
  const parallaxOffset = dragOffset * (0.1 * (distance + 1))

  // Smooth spring config for card animations
  const springTransition = {
    type: "spring" as const,
    damping: 25,
    stiffness: 200,
  }

  const handleEnterClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEnterPressed(true)
    // Navigate to the project route (e.g., /ocr or /detection)
    setTimeout(() => {
      router.push(`/${project.title.toLowerCase()}`)
    }, 400)
  }

  return (
    <motion.div
      className="relative flex-shrink-0"
      animate={{
        scale: isActive ? 1 : 0.82,
        opacity: isActive ? 1 : 0.4,
        rotateY: distance * 8,
        z: isActive ? 50 : 0,
      }}
      transition={springTransition}
      style={{
        x: parallaxOffset,
        perspective: 1200,
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => !isEnterHovered && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
    >
      <motion.div
        className={`group relative overflow-hidden rounded-2xl ${!isActive ? 'cursor-pointer' : ''}`}
        animate={{
          y: isPressed ? 2 : isHovered && isActive && !isEnterHovered ? -12 : 0,
          scale: isPressed ? 0.98 : 1,
          boxShadow: isHovered && isActive
            ? `0 50px 100px -30px rgba(0,0,0,0.9), 0 0 60px -15px ${project.accentColor}40`
            : isHovered && !isActive
            ? "0 30px 60px -20px rgba(0,0,0,0.7)"
            : "0 25px 50px -15px rgba(0,0,0,0.5)",
        }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300,
        }}
        whileHover={!isActive ? { scale: 1.02 } : {}}
      >
        {/* Glassmorphism frame with accent glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-white/10 backdrop-blur-sm"
          animate={{
            backgroundColor: isHovered && !isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
            borderColor: isHovered && !isActive ? `${project.accentColor}40` : "rgba(255,255,255,0.1)",
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Video container */}
        <div className="relative h-[400px] w-[400px] overflow-hidden rounded-2xl p-3 md:h-[500px] md:w-[500px]">
          <motion.video
            src={project.video}
            className="h-full w-full rounded-xl object-cover"
            animate={{
              scale: isHovered && isActive ? 1.08 : isHovered ? 1.02 : 1,
              filter: isActive ? "brightness(1)" : "brightness(0.7)",
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 150,
            }}
            autoPlay
            loop
            muted
            playsInline
            draggable={false}
          />

          {/* Accent color overlay on inactive cards when hovered */}
          <motion.div
            className="absolute inset-3 rounded-xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${project.accentColor}20 0%, transparent 50%)`,
            }}
            animate={{
              opacity: isHovered && !isActive ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          />

          {/* ENTER Button - Centered on active card */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  className="pointer-events-auto relative cursor-pointer"
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                    delay: 0.1
                  }}
                  onMouseEnter={() => setIsEnterHovered(true)}
                  onMouseLeave={() => {
                    setIsEnterHovered(false)
                    setIsEnterPressed(false)
                  }}
                  onMouseDown={() => setIsEnterPressed(true)}
                  onMouseUp={() => setIsEnterPressed(false)}
                  onClick={handleEnterClick}
                >
                  {/* Liquid glass outer glow */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(ellipse 120% 80% at 50% 50%, ${project.accentColor}30 0%, transparent 60%)`,
                      filter: "blur(25px)",
                      transform: "scale(2)",
                    }}
                    animate={{
                      opacity: isEnterHovered ? [0.4, 0.7, 0.4] : 0.2,
                      scale: isEnterHovered ? [2, 2.3, 2] : 2,
                    }}
                    transition={{
                      opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    }}
                  />

                  {/* Liquid glass button container */}
                  <motion.div
                    className="relative flex items-center overflow-hidden rounded-full"
                    style={{
                      background: isEnterHovered
                        ? `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.12) 100%)`
                        : `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.08) 100%)`,
                      backdropFilter: "blur(20px) saturate(180%)",
                      WebkitBackdropFilter: "blur(20px) saturate(180%)",
                      border: `1px solid rgba(255,255,255,${isEnterHovered ? 0.35 : 0.2})`,
                      boxShadow: isEnterPressed
                        ? `inset 0 2px 15px rgba(255,255,255,0.1), 0 0 40px ${project.accentColor}20`
                        : isEnterHovered
                        ? `0 8px 32px rgba(0,0,0,0.3), 0 0 60px ${project.accentColor}15, inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(255,255,255,0.1)`
                        : `0 4px 24px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(255,255,255,0.05)`,
                    }}
                    animate={{
                      scale: isEnterPressed ? 0.96 : isEnterHovered ? 1.03 : 1,
                      y: isEnterPressed ? 1 : isEnterHovered ? -2 : 0,
                    }}
                    transition={{ type: "spring", damping: 20, stiffness: 400 }}
                  >
                    {/* Liquid refraction layer - top highlight */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 20%, transparent 50%)",
                        opacity: 0.6,
                      }}
                    />

                    {/* Chromatic aberration effect - subtle color split */}
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, rgba(255,100,100,0.05) 0%, transparent 30%, transparent 70%, rgba(100,100,255,0.05) 100%)`,
                      }}
                      animate={{
                        opacity: isEnterHovered ? 1 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                    />

                    {/* Liquid bubble highlight */}
                    <motion.div
                      className="absolute rounded-full"
                      style={{
                        width: "60%",
                        height: "40%",
                        top: "8%",
                        left: "20%",
                        background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
                        filter: "blur(2px)",
                      }}
                      animate={{
                        opacity: isEnterHovered ? 0.8 : 0.5,
                        scale: isEnterHovered ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.4 }}
                    />

                    {/* Bottom caustic reflection */}
                    <motion.div
                      className="absolute rounded-full"
                      style={{
                        width: "80%",
                        height: "20%",
                        bottom: "10%",
                        left: "10%",
                        background: `linear-gradient(90deg, transparent 0%, ${project.accentColor}15 50%, transparent 100%)`,
                        filter: "blur(4px)",
                      }}
                      animate={{
                        opacity: isEnterHovered ? [0.3, 0.6, 0.3] : 0.2,
                        x: isEnterHovered ? ["-5%", "5%", "-5%"] : "0%",
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Animated liquid border glow */}
                    <motion.div
                      className="absolute inset-[-1px] rounded-full pointer-events-none"
                      style={{
                        background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,0.4), transparent, ${project.accentColor}30, transparent)`,
                        opacity: 0,
                      }}
                      animate={{
                        opacity: isEnterHovered ? 0.6 : 0,
                        rotate: isEnterHovered ? 360 : 0,
                      }}
                      transition={{
                        opacity: { duration: 0.3 },
                        rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      }}
                    />

                    {/* Inner content */}
                    <div className="relative px-8 py-4 flex items-center gap-3">
                      {/* Liquid pulsing orb */}
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full relative"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${project.accentColor} 60%, ${project.accentColor}80)`,
                          boxShadow: `0 0 10px ${project.accentColor}60, inset 0 -1px 2px rgba(0,0,0,0.2)`,
                        }}
                        animate={{
                          scale: [1, 1.2, 1],
                          boxShadow: [
                            `0 0 10px ${project.accentColor}60, inset 0 -1px 2px rgba(0,0,0,0.2)`,
                            `0 0 20px ${project.accentColor}80, inset 0 -1px 2px rgba(0,0,0,0.2)`,
                            `0 0 10px ${project.accentColor}60, inset 0 -1px 2px rgba(0,0,0,0.2)`,
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />

                      {/* ENTER text with glass effect */}
                      <motion.span
                        className="text-sm font-semibold tracking-[0.2em] uppercase"
                        style={{
                          fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: isEnterHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
                          textShadow: isEnterHovered
                            ? `0 0 20px ${project.accentColor}80, 0 1px 2px rgba(0,0,0,0.3)`
                            : "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                        animate={{
                          letterSpacing: isEnterHovered ? "0.25em" : "0.2em",
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        ENTER
                      </motion.span>

                      {/* Glass arrow icon */}
                      <motion.svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="ml-1"
                        animate={{
                          x: isEnterHovered ? 3 : 0,
                          opacity: isEnterHovered ? 1 : 0.7,
                        }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      >
                        <path
                          d="M3 8H13M13 8L9 4M13 8L9 12"
                          stroke={isEnterHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            filter: isEnterHovered ? `drop-shadow(0 0 4px ${project.accentColor})` : "none",
                          }}
                        />
                      </motion.svg>
                    </div>

                    {/* Liquid shine sweep effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-full overflow-hidden"
                    >
                      <motion.div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 70%)",
                        }}
                        initial={{ x: "-150%" }}
                        animate={{
                          x: isEnterHovered ? "150%" : "-150%",
                        }}
                        transition={{
                          duration: 0.8,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      />
                    </motion.div>
                  </motion.div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gradient overlay for text */}
          <motion.div
            className="absolute inset-x-3 bottom-3 rounded-b-xl bg-gradient-to-t from-black/90 via-black/50 to-transparent"
            animate={{
              opacity: isActive ? 1 : 0.5,
              height: isHovered ? "60%" : "35%",
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
            }}
          />

          {/* Project info */}
          <motion.div
            className="absolute inset-x-3 bottom-3 select-none p-6"
            animate={{
              opacity: isActive ? 1 : 0.7,
              y: isActive ? 0 : 10,
            }}
            transition={springTransition}
          >
            <motion.p
              className="mb-1 font-mono text-xs uppercase tracking-widest"
              animate={{
                y: isHovered ? -6 : 0,
                color: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)",
              }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            >
              Project
            </motion.p>
            <motion.h2
              className="font-serif text-2xl font-bold text-white md:text-3xl"
              animate={{
                y: isHovered ? -6 : 0,
                textShadow: isHovered && isActive ? `0 0 30px ${project.accentColor}60` : "none",
              }}
              transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.02 }}
            >
              {project.title}
            </motion.h2>
            <motion.p
              className="mt-2 text-sm text-white/70"
              animate={{
                opacity: isHovered && isActive ? 1 : 0,
                y: isHovered && isActive ? 0 : 15,
              }}
              transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.05 }}
            >
              {project.description}
            </motion.p>

            {/* Click to select hint on inactive cards */}
            <motion.p
              className="mt-3 text-xs font-mono uppercase tracking-widest"
              style={{ color: project.accentColor }}
              animate={{
                opacity: isHovered && !isActive ? 1 : 0,
                y: isHovered && !isActive ? 0 : 10,
              }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              Click to select →
            </motion.p>
          </motion.div>

          {/* Shine effect on hover */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)",
            }}
            animate={{
              x: isHovered && !isEnterHovered ? ["0%", "200%"] : "-100%",
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>

      {/* Reflection effect */}
      <motion.div
        className="absolute -bottom-20 left-3 right-3 h-20 overflow-hidden rounded-2xl blur-sm pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${project.accentColor}15, transparent)`,
          transform: "scaleY(-1)",
        }}
        animate={{
          opacity: isActive ? 0.2 : 0.05,
        }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  )
}
