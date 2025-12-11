"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { OCREngine, OCREngineOption } from "@/types/model-testing"

interface EngineSelectorProps {
  engines: OCREngineOption[]
  selectedEngine: OCREngine | null
  onSelect: (engine: OCREngine) => void
  disabled?: boolean
  accentColor: string
}

export function EngineSelector({
  engines,
  selectedEngine,
  onSelect,
  disabled = false,
  accentColor,
}: EngineSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-mono uppercase tracking-[0.2em] text-white/70 mb-4">
        OCR Engine
      </label>

      <div className="grid grid-cols-2 gap-3">
        {engines.map((engine, index) => {
          const isSelected = selectedEngine === engine.id

          return (
            <motion.button
              key={engine.id}
              onClick={() => !disabled && onSelect(engine.id)}
              disabled={disabled}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              className={`
                relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}15 100%)`
                  : "linear-gradient(135deg, rgba(50,50,65,0.8) 0%, rgba(40,40,55,0.8) 100%)",
                border: isSelected
                  ? `1px solid ${accentColor}70`
                  : "1px solid rgba(255,255,255,0.15)",
                boxShadow: isSelected
                  ? `0 0 30px ${accentColor}25, inset 0 1px 1px rgba(255,255,255,0.15)`
                  : "0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
              {/* Selection indicator line */}
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[2px]"
                initial={false}
                animate={{
                  opacity: isSelected ? 1 : 0,
                  scaleY: isSelected ? 1 : 0,
                }}
                style={{ background: accentColor, transformOrigin: "top" }}
                transition={{ duration: 0.3 }}
              />

              {/* Scan line effect on hover */}
              <motion.div
                className="absolute inset-0 opacity-0 pointer-events-none"
                whileHover={{ opacity: 1 }}
                style={{
                  background: `linear-gradient(180deg, transparent 0%, ${accentColor}08 50%, transparent 100%)`,
                }}
              />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{engine.icon}</span>
                  <span
                    className="font-semibold text-sm tracking-wide"
                    style={{
                      color: isSelected ? accentColor : "rgba(255,255,255,0.9)",
                      textShadow: isSelected ? `0 0 20px ${accentColor}60` : "none",
                    }}
                  >
                    {engine.name}
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed pl-9">
                  {engine.description}
                </p>
              </div>

              {/* Corner accent */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: accentColor,
                      boxShadow: `0 0 10px ${accentColor}`,
                    }}
                  />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
