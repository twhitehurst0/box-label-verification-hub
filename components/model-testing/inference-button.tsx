"use client"

import { motion } from "framer-motion"

interface InferenceButtonProps {
  onClick: () => void
  disabled: boolean
  loading: boolean
  progress?: number
  accentColor: string
}

export function InferenceButton({
  onClick,
  disabled,
  loading,
  progress = 0,
  accentColor,
}: InferenceButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className="relative w-full overflow-hidden rounded-xl transition-all duration-300"
      style={{
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {/* Background layers */}
      <div
        className="absolute inset-0"
        style={{
          background: loading
            ? `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}10 100%)`
            : disabled
              ? "linear-gradient(135deg, rgba(60,60,80,0.5) 0%, rgba(50,50,70,0.5) 100%)"
              : `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}25 100%)`,
          border: loading
            ? `1px solid ${accentColor}50`
            : disabled
              ? "1px solid rgba(255,255,255,0.15)"
              : `1px solid ${accentColor}70`,
        }}
      />

      {/* Progress bar (when loading) */}
      {loading && (
        <motion.div
          className="absolute bottom-0 left-0 h-[2px]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          style={{ background: accentColor }}
        />
      )}

      {/* Animated scan line effect */}
      {!disabled && !loading && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-x-0 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 50%, transparent 100%)`,
            }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      )}

      {/* Glow effect on hover */}
      {!disabled && !loading && (
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          style={{
            boxShadow: `inset 0 0 30px ${accentColor}20, 0 0 40px ${accentColor}20`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 px-8 py-5 flex items-center justify-center gap-3">
        {loading ? (
          <>
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${accentColor}60`, borderTopColor: "transparent" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: accentColor }}
            >
              Processing... {progress > 0 ? `${Math.round(progress)}%` : ""}
            </span>
          </>
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={disabled ? "rgba(255,255,255,0.5)" : accentColor}
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span
              className="text-sm font-semibold tracking-wide uppercase"
              style={{
                color: disabled ? "rgba(255,255,255,0.5)" : accentColor,
                textShadow: disabled ? "none" : `0 0 20px ${accentColor}80`,
              }}
            >
              Run Inference
            </span>
          </>
        )}
      </div>

      {/* Corner decorations */}
      <div
        className="absolute top-0 left-0 w-3 h-3 border-l border-t"
        style={{
          borderColor: disabled ? "rgba(255,255,255,0.1)" : `${accentColor}40`,
        }}
      />
      <div
        className="absolute top-0 right-0 w-3 h-3 border-r border-t"
        style={{
          borderColor: disabled ? "rgba(255,255,255,0.1)" : `${accentColor}40`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 border-l border-b"
        style={{
          borderColor: disabled ? "rgba(255,255,255,0.1)" : `${accentColor}40`,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 border-r border-b"
        style={{
          borderColor: disabled ? "rgba(255,255,255,0.1)" : `${accentColor}40`,
        }}
      />
    </motion.button>
  )
}
