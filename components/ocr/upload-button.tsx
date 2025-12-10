"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { UploadProgress } from "@/types/ocr"

interface UploadButtonProps {
  onClick: () => void
  disabled: boolean
  progress: UploadProgress
  accentColor: string
}

export function UploadButton({
  onClick,
  disabled,
  progress,
  accentColor,
}: UploadButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const isUploading = progress.status === "uploading"
  const isSuccess = progress.status === "success"
  const isError = progress.status === "error"

  const getButtonText = () => {
    if (isUploading) return "Uploading..."
    if (isSuccess) return `Uploaded ${progress.uploaded} images`
    if (isError) return "Upload Failed"
    return "Upload to Roboflow"
  }

  const getButtonColor = () => {
    if (isSuccess) return "#22c55e"
    if (isError) return "#ef4444"
    return accentColor
  }

  const buttonColor = getButtonColor()

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onClick={onClick}
        disabled={disabled || isUploading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsPressed(false)
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className="relative cursor-pointer group"
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
      >
        {/* Ambient glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse 150% 100% at 50% 50%, ${buttonColor}30 0%, transparent 70%)`,
            filter: "blur(30px)",
            transform: "scale(1.5)",
          }}
          animate={{
            opacity: disabled ? 0.1 : isHovered ? 0.8 : 0.4,
            scale: isHovered ? 1.8 : 1.5,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Main button container */}
        <motion.div
          className="relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-4 min-w-[280px]"
          style={{
            background: disabled
              ? `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`
              : isHovered
              ? `linear-gradient(135deg, ${buttonColor}30 0%, ${buttonColor}15 50%, ${buttonColor}20 100%)`
              : `linear-gradient(135deg, ${buttonColor}20 0%, ${buttonColor}10 50%, ${buttonColor}15 100%)`,
            backdropFilter: "blur(24px) saturate(200%)",
            WebkitBackdropFilter: "blur(24px) saturate(200%)",
            border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : isHovered ? `${buttonColor}50` : `${buttonColor}30`}`,
            boxShadow: disabled
              ? "none"
              : isPressed
              ? `inset 0 3px 12px rgba(0,0,0,0.2), 0 0 30px ${buttonColor}15`
              : isHovered
              ? `0 8px 40px rgba(0,0,0,0.3), 0 0 60px ${buttonColor}20, inset 0 1px 1px rgba(255,255,255,0.2)`
              : `0 4px 20px rgba(0,0,0,0.2), 0 0 40px ${buttonColor}10, inset 0 1px 1px rgba(255,255,255,0.15)`,
            opacity: disabled ? 0.5 : 1,
          }}
          animate={{
            y: isPressed ? 2 : isHovered ? -3 : 0,
          }}
          transition={{ type: "spring", damping: 25, stiffness: 500 }}
        >
          {/* Top highlight */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%)",
              opacity: disabled ? 0.3 : 0.6,
            }}
          />

          {/* Icon */}
          <motion.div
            className="relative z-10"
            animate={{
              rotate: isUploading ? 360 : 0,
            }}
            transition={{
              duration: 1,
              repeat: isUploading ? Infinity : 0,
              ease: "linear",
            }}
          >
            {isUploading ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                />
                <path
                  d="M10 3C13.866 3 17 6.13401 17 10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : isSuccess ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10L8 14L16 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : isError ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 6L14 14M14 6L6 14"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3V13M10 3L6 7M10 3L14 7"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 17H17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </motion.div>

          {/* Text */}
          <motion.span
            className="relative z-10 font-semibold text-base tracking-wide"
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              color: disabled ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.95)",
              textShadow: disabled ? "none" : `0 0 30px ${buttonColor}60`,
            }}
          >
            {getButtonText()}
          </motion.span>

          {/* Shine sweep */}
          {!disabled && (
            <motion.div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.3) 42%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 58%, transparent 75%)",
                }}
                initial={{ x: "-150%" }}
                animate={{
                  x: isHovered ? "150%" : "-150%",
                }}
                transition={{
                  duration: 0.7,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.button>

      {/* Progress/status message */}
      {(isSuccess || isError) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {isSuccess && progress.failed > 0 && (
            <p className="text-amber-400 text-sm">
              {progress.failed} image(s) failed to upload
            </p>
          )}
          {isError && progress.error && (
            <p className="text-red-400 text-sm max-w-md">{progress.error}</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
