"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { S3Version } from "@/types/ocr"

interface VersionSelectorProps {
  versions: S3Version[]
  selectedVersion: string | null
  onSelect: (version: string | null) => void
  loading: boolean
  accentColor: string
  label?: string
}

export function VersionSelector({
  versions,
  selectedVersion,
  onSelect,
  loading,
  accentColor,
  label = "Version",
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedVersionData = versions.find((v) => v.name === selectedVersion)

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-white/40 text-xs font-medium mb-2 uppercase tracking-wider text-center">
        {label}
      </label>

      {/* Dropdown trigger */}
      <motion.button
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className="relative w-full text-left"
        whileTap={{ scale: 0.995 }}
      >
        <div
          className="relative overflow-hidden rounded-xl p-4 transition-all duration-200"
          style={{
            background: isOpen
              ? `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)`
              : `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
            border: `1px solid ${isOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: isOpen
              ? `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)`
              : `0 2px 10px rgba(0,0,0,0.1)`,
          }}
        >
          <div className="flex items-center justify-center">
            {loading ? (
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-white/40 text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${selectedVersion ? "text-white" : "text-white/40"}`}
                  style={selectedVersion ? { textShadow: `0 0 20px ${accentColor}40` } : {}}
                >
                  {selectedVersionData?.name || "Select dataset version"}
                </span>
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </div>
            )}
          </div>
        </div>
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 w-full mt-2 overflow-hidden rounded-xl"
            style={{
              background: `linear-gradient(135deg, rgba(30,30,35,0.95) 0%, rgba(20,20,25,0.95) 100%)`,
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            {versions.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">
                No versions found
              </div>
            ) : (
              <div className="py-1 max-h-60 overflow-y-auto">
                {versions.map((version) => (
                  <motion.button
                    key={version.name}
                    onClick={() => {
                      onSelect(version.name)
                      setIsOpen(false)
                    }}
                    className="w-full px-4 py-3 text-left text-sm transition-colors relative group"
                    whileHover={{ x: 4 }}
                    style={{
                      color: selectedVersion === version.name ? accentColor : "rgba(255,255,255,0.8)",
                      background:
                        selectedVersion === version.name
                          ? `linear-gradient(90deg, ${accentColor}15 0%, transparent 100%)`
                          : "transparent",
                    }}
                  >
                    <span className="relative z-10">{version.name}</span>
                    {selectedVersion === version.name && (
                      <motion.div
                        layoutId="versionSelected"
                        className="absolute left-0 top-0 bottom-0 w-0.5"
                        style={{ background: accentColor }}
                      />
                    )}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%)`,
                      }}
                    />
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
