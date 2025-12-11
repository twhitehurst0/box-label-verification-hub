"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import Image from "next/image"
import type { InferenceOption } from "@/types/inference"

interface InferenceCardProps {
  option: InferenceOption
  isActive: boolean
  dragOffset: number
  index: number
  currentIndex: number
  onClick?: () => void
  onHoverChange?: (hovering: boolean) => void
}

export function InferenceCard({
  option,
  isActive,
  dragOffset,
  index,
  currentIndex,
  onClick,
  onHoverChange,
}: InferenceCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isEnterHovered, setIsEnterHovered] = useState(false)
  const [isEnterPressed, setIsEnterPressed] = useState(false)

  const distance = index - currentIndex
  const parallaxOffset = dragOffset * (0.1 * (distance + 1))

  // Smooth spring config for card animations
  const springTransition = {
    type: "spring" as const,
    damping: 25,
    stiffness: 200,
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHoverChange?.(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsPressed(false)
    onHoverChange?.(false)
  }

  return (
    <motion.div
      className="relative flex-shrink-0"
      animate={{
        scale: isActive ? 1 : 0.85,
        opacity: isActive ? 1 : 0.5,
        rotateY: distance * 8,
        z: isActive ? 50 : 0,
      }}
      transition={springTransition}
      style={{
        x: parallaxOffset,
        perspective: 1200,
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => !isEnterHovered && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
    >
      <motion.div
        className={`group relative overflow-hidden rounded-2xl ${!isActive ? "cursor-pointer" : ""}`}
        animate={{
          y: isPressed ? 2 : isHovered && isActive && !isEnterHovered ? -12 : 0,
          scale: isPressed ? 0.98 : 1,
          boxShadow:
            isHovered && isActive
              ? `0 50px 100px -30px rgba(0,0,0,0.9), 0 0 80px -15px ${option.accentColor}50`
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
          className="absolute inset-0 rounded-2xl backdrop-blur-sm"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          animate={{
            backgroundColor:
              isHovered && !isActive
                ? "rgba(255,255,255,0.1)"
                : "rgba(255,255,255,0.05)",
            borderColor:
              isHovered && !isActive
                ? `${option.accentColor}50`
                : "rgba(255,255,255,0.15)",
          }}
          transition={{ duration: 0.3 }}
        />

        {/* GIF container */}
        <div className="relative h-[400px] w-[400px] overflow-hidden rounded-2xl p-3 md:h-[500px] md:w-[500px]">
          <motion.div
            className="relative h-full w-full rounded-xl overflow-hidden"
            animate={{
              scale: isHovered && isActive ? 1.08 : isHovered ? 1.02 : 1,
              filter: isActive ? "brightness(1)" : "brightness(0.7)",
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 150,
            }}
          >
            <Image
              src={option.image}
              alt={option.title}
              fill
              className="object-cover"
              style={{
                objectPosition: option.imagePosition || "center center",
                transform: `scale(${option.imageScale || 1})`,
              }}
              unoptimized // Required for GIFs
              draggable={false}
            />
          </motion.div>

          {/* Accent color overlay on inactive cards when hovered */}
          <motion.div
            className="pointer-events-none absolute inset-3 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${option.accentColor}25 0%, transparent 50%)`,
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
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ pointerEvents: "none" }}
              >
                {/* Outer glow - decorative only */}
                <motion.div
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    width: "200px",
                    height: "80px",
                    background: `radial-gradient(ellipse 120% 80% at 50% 50%, ${option.accentColor}40 0%, transparent 60%)`,
                    filter: "blur(25px)",
                  }}
                  animate={{
                    opacity: isEnterHovered ? [0.5, 0.8, 0.5] : 0.3,
                    scale: isEnterHovered ? [1, 1.15, 1] : 1,
                  }}
                  transition={{
                    opacity: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                />

                {/* Actual clickable link */}
                <a
                  href={option.route}
                  className="relative z-10 flex cursor-pointer items-center gap-3 rounded-full px-8 py-4"
                  style={{
                    pointerEvents: "auto",
                    background: isEnterHovered
                      ? `linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(40,40,50,0.9) 50%, rgba(30,30,40,0.95) 100%)`
                      : `linear-gradient(135deg, rgba(20,20,30,0.9) 0%, rgba(30,30,40,0.85) 50%, rgba(20,20,30,0.9) 100%)`,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: `1px solid ${isEnterHovered ? option.accentColor + '60' : 'rgba(255,255,255,0.25)'}`,
                    boxShadow: isEnterPressed
                      ? `inset 0 2px 15px rgba(0,0,0,0.3), 0 0 40px ${option.accentColor}30`
                      : isEnterHovered
                        ? `0 8px 32px rgba(0,0,0,0.5), 0 0 60px ${option.accentColor}35, inset 0 1px 1px rgba(255,255,255,0.1)`
                        : `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)`,
                    transform: isEnterPressed
                      ? "scale(0.96)"
                      : isEnterHovered
                        ? "scale(1.03) translateY(-2px)"
                        : "scale(1)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={() => setIsEnterHovered(true)}
                  onMouseLeave={() => {
                    setIsEnterHovered(false)
                    setIsEnterPressed(false)
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setIsEnterPressed(true)
                  }}
                  onMouseUp={() => setIsEnterPressed(false)}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {/* Pulsing orb */}
                  <motion.div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${option.accentColor} 60%, ${option.accentColor}80)`,
                      boxShadow: `0 0 12px ${option.accentColor}70`,
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  {/* ENTER text or Coming Soon */}
                  {option.comingSoon ? (
                    <span
                      className="text-sm font-semibold uppercase tracking-[0.2em]"
                      style={{
                        fontFamily:
                          "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: isEnterHovered
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.85)",
                        textShadow: isEnterHovered
                          ? `0 0 20px ${option.accentColor}80, 0 1px 2px rgba(0,0,0,0.3)`
                          : "0 1px 2px rgba(0,0,0,0.2)",
                      }}
                    >
                      Coming Soon
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-sm font-semibold uppercase tracking-[0.2em]"
                        style={{
                          fontFamily:
                            "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: isEnterHovered
                            ? "rgba(255,255,255,0.95)"
                            : "rgba(255,255,255,0.85)",
                          textShadow: isEnterHovered
                            ? `0 0 20px ${option.accentColor}80, 0 1px 2px rgba(0,0,0,0.3)`
                            : "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      >
                        ENTER
                      </span>

                      {/* Arrow icon */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="ml-1"
                        style={{
                          transform: isEnterHovered
                            ? "translateX(3px)"
                            : "translateX(0)",
                          opacity: isEnterHovered ? 1 : 0.7,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <path
                          d="M3 8H13M13 8L9 4M13 8L9 12"
                          stroke={
                            isEnterHovered
                              ? "rgba(255,255,255,0.95)"
                              : "rgba(255,255,255,0.7)"
                          }
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}
                </a>
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

          {/* Option info */}
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
                color: isActive
                  ? "rgba(255,255,255,0.5)"
                  : "rgba(255,255,255,0.3)",
              }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            >
              Inference
            </motion.p>
            <motion.h2
              className="font-serif text-2xl font-bold text-white md:text-3xl"
              animate={{
                y: isHovered ? -6 : 0,
                textShadow:
                  isHovered && isActive
                    ? `0 0 30px ${option.accentColor}70`
                    : "none",
              }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 200,
                delay: 0.02,
              }}
            >
              {option.title}
            </motion.h2>
            <motion.p
              className="mt-2 text-sm text-white/70"
              animate={{
                opacity: isHovered && isActive ? 1 : 0,
                y: isHovered && isActive ? 0 : 15,
              }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
                delay: 0.05,
              }}
            >
              {option.description}
            </motion.p>

            {/* Click to select hint on inactive cards */}
            <motion.p
              className="mt-3 font-mono text-xs uppercase tracking-widest"
              style={{ color: option.accentColor }}
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
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)",
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
        className="pointer-events-none absolute -bottom-20 left-3 right-3 h-20 overflow-hidden rounded-2xl blur-sm"
        style={{
          background: `linear-gradient(to bottom, ${option.accentColor}20, transparent)`,
          transform: "scaleY(-1)",
        }}
        animate={{
          opacity: isActive ? 0.25 : 0.08,
        }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  )
}
