"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { CvatUploader } from "@/components/ocr/cvat-uploader"

const ACCENT_COLOR = "#00d4ff"

export default function OcrPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen w-full bg-black">
      {/* Header with back navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between max-w-4xl mx-auto"
        >
          <BackButton onClick={() => router.push("/projects")} accentColor={ACCENT_COLOR} />
        </motion.div>
      </header>

      {/* Main content with padding for header */}
      <main className="pt-20">
        <CvatUploader />
      </main>
    </div>
  )
}

function BackButton({ onClick, accentColor }: { onClick: () => void; accentColor: string }) {
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
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(ellipse 150% 100% at 50% 50%, ${accentColor}25 0%, transparent 70%)`,
          filter: "blur(20px)",
          transform: "scale(1.8)",
        }}
        animate={{
          opacity: isHovered ? 0.6 : 0.2,
          scale: isHovered ? 2 : 1.8,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Main container */}
      <motion.div
        className="relative flex items-center gap-2.5 overflow-hidden rounded-full"
        style={{
          background: isHovered
            ? `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)`,
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: `1px solid rgba(255,255,255,${isHovered ? 0.35 : 0.2})`,
          boxShadow: isPressed
            ? `inset 0 3px 12px rgba(255,255,255,0.08)`
            : isHovered
            ? `0 8px 40px rgba(0,0,0,0.25), 0 0 50px ${accentColor}12, inset 0 1px 1px rgba(255,255,255,0.3)`
            : `0 4px 20px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.25)`,
          padding: "10px 18px",
        }}
        animate={{
          y: isPressed ? 1 : isHovered ? -2 : 0,
          x: isHovered ? -3 : 0,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 500 }}
      >
        {/* Top highlight */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)",
            opacity: 0.6,
          }}
        />

        {/* Arrow icon */}
        <motion.div
          className="relative z-10"
          animate={{
            x: isHovered ? -2 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              filter: isHovered ? `drop-shadow(0 0 6px ${accentColor}80)` : "none",
            }}
          >
            <path
              d="M10 12L6 8L10 4"
              stroke={isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)"}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Text */}
        <motion.span
          className="relative z-10 font-medium text-sm tracking-wide"
          style={{
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            color: isHovered ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)",
            textShadow: isHovered ? `0 0 20px ${accentColor}60` : "none",
          }}
        >
          Projects
        </motion.span>

        {/* Shine effect */}
        <motion.div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.4) 42%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 58%, transparent 75%)",
            }}
            initial={{ x: "-150%" }}
            animate={{
              x: isHovered ? "150%" : "-150%",
            }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      </motion.div>
    </motion.button>
  )
}
