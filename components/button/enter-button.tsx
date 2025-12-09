"use client"

/**
 * EnterButton Component
 *
 * An industrial-style Enter button following the same design language as
 * AnimatedButton, but configured as a click action rather than a toggle.
 * Full-screen variant with background effects.
 *
 * Design Features:
 * - Same steel mechanism and glass tube aesthetic as AnimatedButton
 * - "ENTER" text instead of filament graphics
 * - Press-to-activate behavior (not a toggle)
 * - Dark (#0a0a0c) background with ambient orange glow
 * - Grid pattern overlay for depth
 *
 * Key Differences from AnimatedButton:
 * - Button element instead of checkbox label
 * - isPressed state instead of isChecked (auto-resets after 600ms)
 * - Case moves on press (-20px) instead of toggle
 * - Text glow effect on hover/press instead of filament animation
 *
 * Animations:
 * - Hover: Elevates slightly, shows glow effects
 * - Press: Scales to 0.96x, case slides left, text pulses
 * - SVG path border traces continuously on hover
 *
 * @example
 * // Renders as a full-screen page
 * <EnterButton />
 */

import { motion } from "framer-motion"
import type React from "react"
import { useState } from "react"

export default function EnterButton() {
  const [isPressed, setIsPressed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 600)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0c]">
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-black/20"
        style={{
          backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(75, 85, 99, 0.06) 5px, rgba(75, 85, 99, 0.06) 6px, transparent 6px, transparent 15px),
        repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(75, 85, 99, 0.06) 5px, rgba(75, 85, 99, 0.06) 6px, transparent 6px, transparent 15px),
        repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(107, 114, 128, 0.04) 10px, rgba(107, 114, 128, 0.04) 11px, transparent 11px, transparent 30px),
        repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(107, 114, 128, 0.04) 10px, rgba(107, 114, 128, 0.04) 11px, transparent 11px, transparent 30px)
      `,
        }}
      />
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute right-[-25%] top-[-25%] w-[50%] h-[50%] rounded-full bg-[#ff8800] border-b-[10px] border-l-[10px] border-white blur-[130px] z-[1]" />
        <div className="absolute right-[20%] top-[-35%] h-[70%] w-[8%] rounded-b-[50%] bg-white rotate-[65deg] blur-[90px]" />
        <div className="absolute right-[20%] top-[-25%] h-[90%] w-[2%] rounded-full bg-[#ff8800] rotate-[50deg] blur-[80px]" />
        <div className="absolute right-0 top-[-20%] h-[80%] w-[3%] rounded-b-[50%] bg-white rotate-[35deg] blur-[80px]" />
      </div>

      {/* Main Button Area */}
      <div
        className="relative flex items-center justify-center"
        style={
          {
            "--primary": "#ff8800",
            "--rounded-max": "100px",
            "--rounded-min": "10px",
            "--h": "78px",
          } as React.CSSProperties
        }
      >
        <button
          className="relative p-5 cursor-pointer group border-none bg-transparent"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className="block rounded-[100px] relative z-[2]"
              animate={{
                y: isHovered ? 0 : -10,
                scale: isPressed ? 0.96 : isHovered ? 1 : 1.02,
              }}
              transition={{
                duration: 0.6,
                ease: [0.5, 2, 0.3, 0.8],
              }}
            >
              <div className="bg-transparent flex border-none p-0 m-0 relative">
                {/* Button Glow Effects */}
                <motion.div
                  className="absolute top-0 bottom-0 left-[25%] w-[70%] h-full my-auto rounded-r-[50%] pointer-events-none z-[1] blur-[30px] mix-blend-color-dodge"
                  style={{
                    background: "linear-gradient(to right, #ff8800 0%, transparent 100%)",
                  }}
                  animate={{
                    opacity: isHovered || isPressed ? 1 : 0,
                  }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
                <motion.div
                  className="absolute w-[50px] h-[50px] top-0 bottom-0 left-[28%] my-auto rounded-full pointer-events-none bg-[#ff8800] z-[2] blur-[15px] mix-blend-color-dodge"
                  animate={{
                    opacity: isHovered || isPressed ? 1 : 0,
                  }}
                  transition={{ duration: 1, delay: 0.4 }}
                />

                {/* Part 1 - Switch Mechanism */}
                <div className="relative z-[1] h-[78px] w-[80px] rounded-l-[100px] rounded-r-[10px]">
                  {/* Line Animation */}
                  <div className="absolute top-0 bottom-0 -right-px">
                    <motion.div
                      className="absolute top-0 bottom-0 right-0 w-px rounded-full my-auto"
                      style={{
                        background: isPressed ? "#ff8800" : "white",
                        boxShadow: isPressed ? "1px 0 10px 3px #ff8800" : "1px 0 10px 3px #ffa600",
                      }}
                      animate={{
                        height: ["0%", "100%", "140%"],
                        opacity: isHovered ? 0 : [1, 1, 0],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </div>

                  {/* Screw SVG */}
                  <div className="absolute top-0 right-0 bottom-0 my-auto z-[-1] overflow-hidden py-[10px]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 115 126"
                      height={60}
                      className="w-auto overflow-visible"
                    >
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.g
                          key={i}
                          style={{ originX: "center", originY: "center" }}
                          animate={{
                            scaleY: isPressed ? [1, 0.8, 1] : isHovered ? [1, 0.95, 1] : 1,
                          }}
                          transition={{
                            duration: 0.8,
                            delay: (isPressed ? i : 5 - i) * 0.1,
                          }}
                        >
                          {i === 1 && (
                            <>
                              <path
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                strokeMiterlimit={10}
                                strokeWidth={2}
                                stroke="#262626"
                                fill="url(#paint_linear_steel_enter)"
                                d="M91.4371 119V7C91.4371 3.686 94.1231 1 97.4371 1H107.617C110.931 1 113.617 3.686 113.617 7V119C113.617 122.314 110.931 125 107.617 125H97.4371C94.1231 125 91.4371 122.314 91.4371 119Z"
                              />
                              <path
                                fillOpacity="0.4"
                                fill="#262626"
                                d="M94 6C94 3.79086 95.7909 2 98 2H109C111.209 2 113 3.79086 113 6V88.2727C113 89.2267 112.227 90 111.273 90C101.733 90 94 82.2667 94 72.7273V6Z"
                              />
                              <motion.path
                                fill="currentColor"
                                d="M98.0101 11.589C98.0101 9.57 99.6461 7.93402 101.665 7.93402H105.027C107.046 7.93402 108.682 9.57 108.682 11.589C108.682 13.608 107.046 15.244 105.027 15.244H101.665C99.6461 15.244 98.0101 13.607 98.0101 11.589Z"
                                className="text-[#8e8c8b]"
                                animate={{
                                  color: isPressed
                                    ? ["#8e8c8b", "#ff8800", "#8e8c8b"]
                                    : isHovered
                                      ? ["#8e8c8b", "#ffffff", "#8e8c8b"]
                                      : "#8e8c8b",
                                  filter: isPressed || isHovered
                                    ? ["blur(0px)", "blur(2px)", "blur(0px)"]
                                    : "blur(0px)",
                                }}
                                transition={{
                                  duration: 0.7,
                                  delay: (isPressed ? 1 : 3 - 1) * 0.15,
                                }}
                              />
                            </>
                          )}
                          {i === 2 && (
                            <>
                              <path
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                strokeMiterlimit={10}
                                strokeWidth={2}
                                stroke="#262626"
                                fill="url(#paint_linear_steel_enter)"
                                d="M69.256 119V7C69.256 3.686 71.942 1 75.256 1H85.436C88.75 1 91.436 3.686 91.436 7V119C91.436 122.314 88.75 125 85.436 125H75.256C71.943 125 69.256 122.314 69.256 119Z"
                              />
                              <path
                                fillOpacity="0.4"
                                fill="#262626"
                                d="M72 6C72 3.79086 73.7909 2 76 2H87C89.2091 2 91 3.79086 91 6V88.2727C91 89.2267 90.2267 90 89.2727 90C79.7333 90 72 82.2667 72 72.7273V6Z"
                              />
                              <motion.path
                                fill="currentColor"
                                d="M76.011 11.589C76.011 9.57 77.647 7.93402 79.666 7.93402H83.028C85.047 7.93402 86.683 9.57 86.683 11.589C86.683 13.608 85.047 15.244 83.028 15.244H79.666C77.647 15.244 76.011 13.607 76.011 11.589Z"
                                className="text-[#8e8c8b]"
                                animate={{
                                  color: isPressed
                                    ? ["#8e8c8b", "#ff8800", "#8e8c8b"]
                                    : isHovered
                                      ? ["#8e8c8b", "#ffffff", "#8e8c8b"]
                                      : "#8e8c8b",
                                  filter: isPressed || isHovered
                                    ? ["blur(0px)", "blur(2px)", "blur(0px)"]
                                    : "blur(0px)",
                                }}
                                transition={{
                                  duration: 0.7,
                                  delay: (isPressed ? 2 : 3 - 2) * 0.15,
                                }}
                              />
                            </>
                          )}
                          {i === 3 && (
                            <>
                              <path
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                strokeMiterlimit={10}
                                strokeWidth={2}
                                stroke="#262626"
                                fill="url(#paint_linear_steel_enter)"
                                d="M47.076 119V7C47.076 3.686 49.762 1 53.076 1H63.256C66.57 1 69.256 3.686 69.256 7V119C69.256 122.314 66.57 125 63.256 125H53.076C49.762 125 47.076 122.314 47.076 119Z"
                              />
                              <path
                                fillOpacity="0.4"
                                fill="#262626"
                                d="M50 6C50 3.79086 51.7909 2 54 2H65C67.2091 2 69 3.79086 69 6V86.9664C69 88.6418 67.6418 90 65.9664 90C57.1484 90 50 82.8516 50 74.0336V6Z"
                              />
                              <motion.path
                                fill="currentColor"
                                d="M54.012 11.589C54.012 9.57 55.648 7.93396 57.667 7.93396H61.029C63.048 7.93396 64.684 9.57 64.684 11.589C64.684 13.608 63.048 15.244 61.029 15.244H57.667C55.648 15.244 54.012 13.607 54.012 11.589Z"
                                className="text-[#8e8c8b]"
                                animate={{
                                  color: isPressed
                                    ? ["#8e8c8b", "#ff8800", "#8e8c8b"]
                                    : isHovered
                                      ? ["#8e8c8b", "#ffffff", "#8e8c8b"]
                                      : "#8e8c8b",
                                  filter: isPressed || isHovered
                                    ? ["blur(0px)", "blur(2px)", "blur(0px)"]
                                    : "blur(0px)",
                                }}
                                transition={{
                                  duration: 0.7,
                                  delay: (isPressed ? 3 : 3 - 3) * 0.15,
                                }}
                              />
                            </>
                          )}
                          {i === 4 && (
                            <path
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              strokeMiterlimit={10}
                              strokeWidth={2}
                              stroke="#262626"
                              fill="url(#paint_linear_steel_enter)"
                              d="M23.617 98.853V27.147C23.617 21.501 27.11 16.262 32.838 13.318L47.076 6V120L32.838 112.682C27.111 109.738 23.617 104.499 23.617 98.853Z"
                            />
                          )}
                          {i === 5 && (
                            <path
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              strokeMiterlimit={10}
                              strokeWidth={2}
                              stroke="#262626"
                              fill="url(#paint_linear_steel_enter)"
                              d="M1.00006 76.162V49.838C1.00006 43.314 4.91107 37.235 11.3891 33.691L23.6171 27V99L11.3881 92.309C4.91106 88.765 1.00006 82.686 1.00006 76.162Z"
                            />
                          )}
                        </motion.g>
                      ))}
                      <defs>
                        <linearGradient
                          gradientUnits="userSpaceOnUse"
                          y2={125}
                          x2="105.425"
                          y1={1}
                          x1="105.425"
                          id="paint_linear_steel_enter"
                        >
                          <stop stopColor="#7A7A7A" offset="0.100962" />
                          <stop stopColor="#EEEEEE" offset="0.3125" />
                          <stop stopColor="#787878" offset="0.596154" />
                          <stop stopColor="#666666" offset="0.798077" />
                          <stop stopColor="#9E9E9E" offset={1} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Case */}
                  <motion.div
                    className="h-[78px] w-[80px] rounded-l-[100px] rounded-r-[10px]"
                    animate={{
                      x: isPressed ? -20 : 0,
                    }}
                    transition={{
                      duration: isPressed ? 0.15 : 0.4,
                      ease: isPressed ? [0.5, 2, 0.3, 0.8] : [0.5, -0.5, 0.3, 1],
                    }}
                  >
                    <motion.div
                      className="absolute overflow-hidden inset-0 rounded-l-[100px] rounded-r-[10px]"
                      style={{
                        background: "linear-gradient(to bottom, #2c2e31 0%, #31343e 20%, #212329 100%)",
                      }}
                      animate={{
                        boxShadow: isHovered
                          ? "inset 8px -15px 15px -10px black, inset 10px -17px 12px -12px white, 0 20px 50px -5px #111"
                          : "inset 8px -15px 15px -10px black, inset 10px -17px 12px -12px white, 0 30px 70px -5px #111",
                      }}
                      transition={{ duration: 0.9, ease: [0.5, 2, 0.3, 0.8] }}
                    >
                      {/* Light Reflex */}
                      <div className="absolute rounded-l-[100px] rounded-r-[10px] left-[30%] top-[23%] w-full h-[30%] bg-white blur-md" />
                      {/* Side Accent */}
                      <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-white/20 mix-blend-overlay" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Part 2 - Glass Section with ENTER text */}
                <div className="relative h-[78px] w-[190px] rounded-l-[10px] rounded-r-[100px] flex items-center justify-center">
                  {/* Path Glass Animation */}
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 190 76"
                    height={76}
                    width={190}
                    className="absolute inset-0"
                    animate={{
                      opacity: isHovered || isPressed ? 1 : 0,
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <motion.path
                      stroke="currentColor"
                      d="M0 0.5C0 0.5 149 0.5 156.5 0.5C164 0.5 189 8.5 189 37.5C189 66.5 164 75.5 157.5 75.5C151 75.5 1 75.5 1 75.5"
                      strokeDasharray="430 430"
                      animate={{
                        strokeDashoffset: isHovered || isPressed ? [430, 0] : 430,
                        filter: isHovered || isPressed ? ["blur(2px)", "blur(4px)", "blur(2px)"] : "blur(0px)",
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: isHovered || isPressed ? Number.POSITIVE_INFINITY : 0,
                      }}
                      style={{ color: "#ff8800" }}
                    />
                  </motion.svg>

                  {/* Glass Container */}
                  <motion.div
                    className="relative overflow-hidden h-full w-full rounded-l-[10px] rounded-r-[100px] border-l border-black/30"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.5) 100%)",
                    }}
                    animate={{
                      boxShadow: isHovered
                        ? "inset 0 0 7px -4px white, inset 0 -10px 10px -8px rgba(255,255,255,0.4), inset 8px -15px 15px -10px black, inset 8px -10px 12px -12px white, 0 20px 50px -5px #111"
                        : "inset 0 0 7px -4px white, inset 0 -10px 10px -8px rgba(255,255,255,0.4), inset 8px -15px 15px -10px black, inset 8px -10px 12px -12px white, 0 30px 70px -5px #111",
                    }}
                    transition={{ duration: 0.9, ease: [0.5, 2, 0.3, 0.8] }}
                  >
                    {/* Glass shine before */}
                    <div
                      className="absolute left-0 top-[10%] right-[14%] h-[70%] rounded-tr-[25px]"
                      style={{
                        background: "linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%)",
                      }}
                    />
                    {/* Glass inner glow after */}
                    <div
                      className="absolute left-0 bottom-[15%] right-[5%] h-[75%] rounded-r-[30px] blur-[3px]"
                      style={{
                        boxShadow: "inset -2px -6px 5px -5px rgba(255,255,255,0.8)",
                      }}
                    />

                    {/* Glass Reflex */}
                    <motion.div
                      className="absolute inset-0 w-[70%] rounded-r-[50%]"
                      style={{
                        background: "linear-gradient(to right, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.2) 100%)",
                      }}
                      initial={{ x: "-115%", skewX: "30deg" }}
                      animate={{
                        x: isHovered ? ["-115%", "140%"] : "-115%",
                      }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />

                    {/* Glass Noise */}
                    <svg
                      viewBox="0 0 700 700"
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute inset-0 opacity-20"
                    >
                      <defs>
                        <filter
                          colorInterpolationFilters="linearRGB"
                          primitiveUnits="userSpaceOnUse"
                          filterUnits="objectBoundingBox"
                          height="140%"
                          width="140%"
                          y="-20%"
                          x="-20%"
                          id="noise-filter-glass-enter"
                        >
                          <feTurbulence
                            result="turbulence"
                            height="100%"
                            width="100%"
                            y="0%"
                            x="0%"
                            stitchTiles="stitch"
                            seed={15}
                            numOctaves={4}
                            baseFrequency="0.05"
                            type="fractalNoise"
                          />
                          <feSpecularLighting
                            result="specularLighting"
                            in="turbulence"
                            height="100%"
                            width="100%"
                            y="0%"
                            x="0%"
                            lightingColor="#ffffff"
                            specularExponent={20}
                            specularConstant={3}
                            surfaceScale={40}
                          >
                            <feDistantLight elevation={69} azimuth={3} />
                          </feSpecularLighting>
                        </filter>
                      </defs>
                      <rect fill="transparent" height={700} width={700} />
                      <rect filter="url(#noise-filter-glass-enter)" fill="#ffffff" height={700} width={700} />
                    </svg>

                    {/* ENTER Text - Off State (dim) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className="text-[22px] font-bold tracking-[0.2em] opacity-30"
                        style={{
                          fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#ffc4af",
                          textShadow: "0 0 10px rgba(255, 196, 175, 0.3)",
                        }}
                      >
                        ENTER
                      </span>
                    </div>

                    {/* ENTER Text - On State (glowing) */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      animate={{
                        opacity: isHovered || isPressed ? 1 : 0,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: isHovered ? 0.3 : 0,
                      }}
                    >
                      <motion.span
                        className="text-[22px] font-bold tracking-[0.2em]"
                        style={{
                          fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: "#ffffff",
                        }}
                        animate={{
                          textShadow: isPressed
                            ? [
                                "0 0 20px #ff8800, 0 0 40px #ff8800, 0 0 60px #ff8800",
                                "0 0 30px #ff8800, 0 0 60px #ff8800, 0 0 90px #ff8800",
                                "0 0 20px #ff8800, 0 0 40px #ff8800, 0 0 60px #ff8800",
                              ]
                            : isHovered
                              ? "0 0 20px #ff8800, 0 0 40px #ff8800, 0 0 60px #ff8800"
                              : "0 0 10px rgba(255, 136, 0, 0.5)",
                        }}
                        transition={{
                          duration: isPressed ? 0.3 : 0.6,
                          repeat: isPressed ? 2 : 0,
                        }}
                      >
                        ENTER
                      </motion.span>
                    </motion.div>

                    {/* Glow inside glass on hover */}
                    <motion.div
                      className="absolute inset-x-0 bottom-0 h-[60%] rounded-r-[100px]"
                      style={{
                        background:
                          "radial-gradient(ellipse 100% 100% at 50% 100%, rgba(255,136,0,0.4) 0%, transparent 70%)",
                      }}
                      animate={{
                        opacity: isHovered || isPressed ? 1 : 0,
                      }}
                      transition={{ duration: 0.9 }}
                    />

                    {/* Press flash effect */}
                    <motion.div
                      className="absolute inset-0 rounded-l-[10px] rounded-r-[100px]"
                      style={{
                        background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,136,0,0.6) 0%, transparent 70%)",
                      }}
                      animate={{
                        opacity: isPressed ? [0, 1, 0] : 0,
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </button>
      </div>
    </div>
  )
}
