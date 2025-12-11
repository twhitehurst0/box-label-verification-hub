"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { TestDataset } from "@/types/model-testing"

interface DatasetSelectorProps {
  datasets: TestDataset[]
  selectedDataset: string | null
  onSelect: (version: string) => void
  loading: boolean
  disabled?: boolean
  accentColor: string
}

export function DatasetSelector({
  datasets,
  selectedDataset,
  onSelect,
  loading,
  disabled = false,
  accentColor,
}: DatasetSelectorProps) {
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

  const selectedData = datasets.find((d) => d.version === selectedDataset)

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-xs font-mono uppercase tracking-[0.2em] text-white/70 mb-4">
        Test Dataset
      </label>

      {/* Trigger button */}
      <motion.button
        onClick={() => !loading && !disabled && setIsOpen(!isOpen)}
        disabled={loading || disabled}
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
          {/* Scanline decoration */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.5) 2px,
                rgba(255,255,255,0.5) 4px
              )`,
            }}
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {loading ? (
                <>
                  <motion.div
                    className="w-5 h-5 rounded border-2 border-t-transparent"
                    style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="text-white/60 text-sm font-mono">Scanning datasets...</span>
                </>
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: selectedData
                        ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${selectedData ? `${accentColor}40` : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={selectedData ? accentColor : "rgba(255,255,255,0.4)"}
                      strokeWidth="1.5"
                    >
                      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{
                        color: selectedData ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.6)",
                        textShadow: selectedData ? `0 0 20px ${accentColor}30` : "none",
                      }}
                    >
                      {selectedData?.version || "Select test dataset"}
                    </div>
                    {selectedData && (
                      <div className="text-xs text-white/60 font-mono mt-0.5">
                        {selectedData.image_count} images
                        {selectedData.has_ground_truth && (
                          <span className="ml-2 text-green-400">● GT available</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
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
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && !loading && (
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

            {datasets.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-white/30 text-sm font-mono">No datasets found</div>
                <div className="text-white/20 text-xs mt-1">Check test_data_OCR directory</div>
              </div>
            ) : (
              <div className="py-2 max-h-72 overflow-y-auto">
                {datasets.map((dataset, idx) => (
                  <motion.button
                    key={dataset.version}
                    onClick={() => {
                      onSelect(dataset.version)
                      setIsOpen(false)
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="w-full px-4 py-3 text-left relative group"
                    style={{
                      background:
                        selectedDataset === dataset.version
                          ? `linear-gradient(90deg, ${accentColor}15 0%, transparent 100%)`
                          : "transparent",
                    }}
                  >
                    {/* Selection indicator */}
                    {selectedDataset === dataset.version && (
                      <motion.div
                        layoutId="datasetSelected"
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

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-xs"
                          style={{
                            background:
                              selectedDataset === dataset.version
                                ? `${accentColor}30`
                                : "rgba(255,255,255,0.05)",
                            color:
                              selectedDataset === dataset.version
                                ? accentColor
                                : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{
                              color:
                                selectedDataset === dataset.version
                                  ? accentColor
                                  : "rgba(255,255,255,0.8)",
                            }}
                          >
                            {dataset.version}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-white/30">
                          {dataset.image_count} imgs
                        </span>
                        {dataset.has_ground_truth && (
                          <div
                            className="px-2 py-0.5 rounded text-[9px] font-mono"
                            style={{
                              background: "rgba(34,197,94,0.15)",
                              color: "rgba(34,197,94,0.8)",
                              border: "1px solid rgba(34,197,94,0.2)",
                            }}
                          >
                            GT
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
