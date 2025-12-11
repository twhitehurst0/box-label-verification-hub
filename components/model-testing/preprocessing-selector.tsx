"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { PreprocessingType, PreprocessingCategory } from "@/types/model-testing"
import { PREPROCESSING_OPTIONS, PREPROCESSING_CATEGORIES } from "@/types/model-testing"

interface PreprocessingSelectorProps {
  selectedOptions: PreprocessingType[]
  onSelect: (options: PreprocessingType[]) => void
  disabled?: boolean
  accentColor: string
}

export function PreprocessingSelector({
  selectedOptions,
  onSelect,
  disabled = false,
  accentColor,
}: PreprocessingSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Group options by category
  const groupedOptions = PREPROCESSING_OPTIONS.reduce((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = []
    acc[opt.category].push(opt)
    return acc
  }, {} as Record<PreprocessingCategory, typeof PREPROCESSING_OPTIONS>)

  const toggleOption = (id: PreprocessingType) => {
    if (selectedOptions.includes(id)) {
      onSelect(selectedOptions.filter((o) => o !== id))
    } else {
      onSelect([...selectedOptions, id])
    }
  }

  const selectAll = () => onSelect(PREPROCESSING_OPTIONS.map((o) => o.id))
  const clearAll = () => onSelect(["none"])

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return "Select preprocessing"
    if (selectedOptions.length === 1) {
      const option = PREPROCESSING_OPTIONS.find((o) => o.id === selectedOptions[0])
      return option?.name || selectedOptions[0]
    }
    return `${selectedOptions.length} options selected`
  }

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-xs font-mono uppercase tracking-[0.2em] text-white/70 mb-4">
        Image Preprocessing
      </label>

      {/* Trigger button */}
      <motion.button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="relative w-full text-left group"
        whileTap={{ scale: 0.995 }}
      >
        <div
          className="relative overflow-hidden rounded-xl p-4 transition-all duration-300"
          style={{
            background: isOpen
              ? `linear-gradient(135deg, rgba(60,60,80,0.9) 0%, rgba(50,50,70,0.9) 100%)`
              : `linear-gradient(135deg, rgba(50,50,65,0.8) 0%, rgba(40,40,55,0.8) 100%)`,
            border: isOpen
              ? `1px solid ${accentColor}50`
              : "1px solid rgba(255,255,255,0.15)",
            boxShadow: isOpen
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

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    selectedOptions.length > 0
                      ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`
                      : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selectedOptions.length > 0 ? `${accentColor}40` : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={selectedOptions.length > 0 ? accentColor : "rgba(255,255,255,0.4)"}
                  strokeWidth="1.5"
                >
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <div>
                <div
                  className="text-sm font-medium"
                  style={{
                    color: selectedOptions.length > 0 ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.6)",
                    textShadow: selectedOptions.length > 0 ? `0 0 20px ${accentColor}30` : "none",
                  }}
                >
                  {getDisplayText()}
                </div>
                {selectedOptions.length > 1 && (
                  <div className="text-xs text-white/50 font-mono mt-0.5">
                    Multi-run comparison enabled
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedOptions.length > 1 && (
                <div
                  className="px-2 py-0.5 rounded text-[10px] font-mono"
                  style={{
                    background: `${accentColor}20`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  BATCH
                </div>
              )}
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.5"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 w-full mt-2 overflow-hidden rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(15,15,20,0.98) 0%, rgba(10,10,15,0.98) 100%)",
              backdropFilter: "blur(30px) saturate(200%)",
              border: `1px solid ${accentColor}20`,
              boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 40px ${accentColor}10`,
            }}
          >
            {/* Header decoration */}
            <div
              className="h-[1px] w-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${accentColor}50 50%, transparent 100%)`,
              }}
            />

            {/* Quick actions */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                {selectedOptions.length} of {PREPROCESSING_OPTIONS.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Options grouped by category */}
            <div className="py-2 max-h-80 overflow-y-auto">
              {(Object.keys(PREPROCESSING_CATEGORIES) as PreprocessingCategory[]).map((category, categoryIdx) => {
                const options = groupedOptions[category]
                if (!options || options.length === 0) return null

                return (
                  <div key={category}>
                    {/* Category header */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: categoryIdx * 0.05 }}
                      className="px-4 py-2 sticky top-0"
                      style={{
                        background: "rgba(10,10,15,0.95)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <span
                        className="text-[9px] font-mono uppercase tracking-[0.15em]"
                        style={{ color: `${accentColor}90` }}
                      >
                        {PREPROCESSING_CATEGORIES[category]}
                      </span>
                    </motion.div>

                    {/* Category options */}
                    {options.map((option, optIdx) => {
                      const isSelected = selectedOptions.includes(option.id)
                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => toggleOption(option.id)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: categoryIdx * 0.05 + optIdx * 0.02 }}
                          className="w-full px-4 py-2.5 text-left relative group"
                          style={{
                            background: isSelected
                              ? `linear-gradient(90deg, ${accentColor}15 0%, transparent 100%)`
                              : "transparent",
                          }}
                        >
                          {/* Selection indicator */}
                          {isSelected && (
                            <motion.div
                              layoutId={`preprocess-${option.id}`}
                              className="absolute left-0 top-0 bottom-0 w-[2px]"
                              style={{ background: accentColor }}
                            />
                          )}

                          {/* Hover effect */}
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              background: `linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 100%)`,
                            }}
                          />

                          <div className="relative flex items-center gap-3">
                            {/* Checkbox */}
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center transition-all"
                              style={{
                                background: isSelected ? accentColor : "rgba(255,255,255,0.05)",
                                border: `1px solid ${isSelected ? accentColor : "rgba(255,255,255,0.2)"}`,
                              }}
                            >
                              {isSelected && (
                                <motion.svg
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                >
                                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                                </motion.svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm font-medium truncate"
                                style={{
                                  color: isSelected ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.7)",
                                }}
                              >
                                {option.name}
                              </div>
                              <div className="text-[10px] text-white/40 truncate mt-0.5">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Footer hint */}
            <div
              className="px-4 py-2 border-t border-white/5 text-center"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <span className="text-[9px] font-mono text-white/30">
                Select multiple options to compare preprocessing results
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
