"use client"

import { motion } from "framer-motion"
import type { PreprocessingType } from "@/types/model-testing"
import { SUPER_RESOLUTION_OPTIONS } from "@/types/model-testing"

interface SuperResSelectorProps {
  selectedOption: PreprocessingType | null
  onSelect: (option: PreprocessingType | null) => void
  disabled?: boolean
  accentColor: string
}

export function SuperResSelector({
  selectedOption,
  onSelect,
  disabled = false,
  accentColor,
}: SuperResSelectorProps) {
  const toggleOption = (id: PreprocessingType) => {
    if (selectedOption === id) {
      onSelect(null) // Deselect
    } else {
      onSelect(id)
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs font-mono uppercase tracking-[0.2em] text-white/70 mb-4">
        Super-Resolution
      </label>

      <div
        className="relative overflow-hidden rounded-xl p-4 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, rgba(50,50,65,0.8) 0%, rgba(40,40,55,0.8) 100%)`,
          border: selectedOption
            ? `1px solid ${accentColor}50`
            : "1px solid rgba(255,255,255,0.15)",
          boxShadow: selectedOption
            ? `0 4px 30px rgba(0,0,0,0.4), 0 0 20px ${accentColor}15`
            : "0 4px 15px rgba(0,0,0,0.3)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Circuit pattern decoration */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(90deg, ${accentColor}40 1px, transparent 1px),
              linear-gradient(${accentColor}40 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative space-y-2">
          {/* Header with icon */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: selectedOption
                  ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${selectedOption ? `${accentColor}40` : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={selectedOption ? accentColor : "rgba(255,255,255,0.4)"}
                strokeWidth="1.5"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              {selectedOption ? "Enabled" : "Optional"}
            </span>
            {selectedOption && (
              <div
                className="ml-auto px-2 py-0.5 rounded text-[9px] font-mono uppercase"
                style={{
                  background: `${accentColor}20`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                GPU Recommended
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-2">
            {SUPER_RESOLUTION_OPTIONS.map((option) => {
              const isSelected = selectedOption === option.id
              return (
                <motion.button
                  key={option.id}
                  onClick={() => !disabled && toggleOption(option.id)}
                  disabled={disabled}
                  whileHover={{ scale: disabled ? 1 : 1.02 }}
                  whileTap={{ scale: disabled ? 1 : 0.98 }}
                  className="relative p-3 rounded-lg text-left transition-all"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`
                      : "rgba(255,255,255,0.03)",
                    border: isSelected
                      ? `1px solid ${accentColor}50`
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isSelected ? `0 0 15px ${accentColor}20` : "none",
                  }}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-3 h-3 rounded-full flex items-center justify-center"
                      style={{ background: accentColor }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}

                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: isSelected ? "white" : "rgba(255,255,255,0.7)" }}
                  >
                    {option.name}
                  </div>
                  <div className="text-[9px] text-white/40 leading-tight">
                    {option.description}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Info note */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[9px] text-white/30 font-mono">
              Super-resolution upscales crop regions before OCR. Best for low-resolution labels.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

