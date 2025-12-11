"use client"

import { motion } from "framer-motion"

interface RunAllButtonProps {
  onClick: () => void
  disabled: boolean
  loading: boolean
  selectedCount: number
  accentColor: string
}

export function RunAllButton({
  onClick,
  disabled,
  loading,
  selectedCount,
  accentColor,
}: RunAllButtonProps) {
  return (
    <div className="relative mt-4">
      <label className="block text-xs font-mono uppercase tracking-[0.2em] text-white/70 mb-4">
        Batch Comparison
      </label>

      <motion.button
        onClick={onClick}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02, y: -2 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        className="relative w-full overflow-hidden rounded-xl group"
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {/* Main button background with gradient */}
        <div
          className="relative p-4 transition-all duration-300"
          style={{
            background: loading
              ? `linear-gradient(135deg, rgba(40,40,55,0.9) 0%, rgba(30,30,45,0.9) 100%)`
              : `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
            border: `1px solid ${loading ? "rgba(255,255,255,0.1)" : `${accentColor}40`}`,
            boxShadow: loading
              ? "0 4px 15px rgba(0,0,0,0.3)"
              : `0 4px 30px rgba(0,0,0,0.4), 0 0 30px ${accentColor}20`,
          }}
        >
          {/* Animated gradient overlay */}
          {!loading && !disabled && (
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${accentColor}20 0%, transparent 50%, ${accentColor}10 100%)`,
              }}
            />
          )}

          {/* Grid pattern decoration */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(90deg, ${accentColor} 1px, transparent 1px),
                linear-gradient(${accentColor} 1px, transparent 1px)
              `,
              backgroundSize: "16px 16px",
            }}
          />

          {/* Scan line animation */}
          {loading && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 50%, transparent 100%)`,
                width: "50%",
              }}
            />
          )}

          <div className="relative flex items-center justify-center gap-3">
            {loading ? (
              <>
                <motion.div
                  className="w-5 h-5 rounded border-2 border-t-transparent"
                  style={{
                    borderColor: `${accentColor}60`,
                    borderTopColor: "transparent",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-white/80 text-sm font-mono tracking-wide">
                  Running {selectedCount} Comparisons...
                </span>
              </>
            ) : (
              <>
                {/* Batch icon */}
                <div
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${accentColor}20`,
                    border: `1px solid ${accentColor}40`,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                  >
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" strokeLinejoin="round" />
                  </svg>
                  {/* Pulse effect */}
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{ border: `1px solid ${accentColor}` }}
                    animate={{
                      scale: [1, 1.5],
                      opacity: [0.5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                </div>

                <div className="text-left">
                  <div
                    className="text-sm font-medium tracking-wide"
                    style={{
                      color: "rgba(255,255,255,0.95)",
                      textShadow: `0 0 20px ${accentColor}40`,
                    }}
                  >
                    Run All Preprocessing Options
                  </div>
                  <div className="text-[10px] font-mono text-white/50 mt-0.5">
                    Compare {selectedCount} methods side-by-side
                  </div>
                </div>

                {/* Count badge */}
                <div
                  className="ml-auto px-3 py-1 rounded-lg text-xs font-mono font-bold"
                  style={{
                    background: accentColor,
                    color: "rgba(0,0,0,0.9)",
                    boxShadow: `0 0 15px ${accentColor}50`,
                  }}
                >
                  {selectedCount}
                </div>
              </>
            )}
          </div>

          {/* Corner decorations */}
          <div
            className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 rounded-tl-lg"
            style={{ borderColor: `${accentColor}60` }}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 rounded-tr-lg"
            style={{ borderColor: `${accentColor}60` }}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 rounded-bl-lg"
            style={{ borderColor: `${accentColor}60` }}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 rounded-br-lg"
            style={{ borderColor: `${accentColor}60` }}
          />
        </div>

        {/* Bottom glow line */}
        <motion.div
          className="h-[2px] w-full"
          style={{
            background: loading
              ? `linear-gradient(90deg, transparent 0%, ${accentColor}30 50%, transparent 100%)`
              : `linear-gradient(90deg, transparent 0%, ${accentColor}80 50%, transparent 100%)`,
          }}
          animate={
            loading
              ? {
                  opacity: [0.3, 0.8, 0.3],
                }
              : {}
          }
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.button>

      {/* Helper text */}
      <div className="mt-2 text-center">
        <span className="text-[9px] font-mono text-white/30">
          Results will be ranked by accuracy for easy comparison
        </span>
      </div>
    </div>
  )
}
