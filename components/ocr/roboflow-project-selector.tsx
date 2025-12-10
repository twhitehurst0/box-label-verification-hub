"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { RoboflowProject } from "@/types/ocr"

interface RoboflowProjectSelectorProps {
  projects: RoboflowProject[]
  selectedProject: string | null
  onSelect: (projectId: string | null) => void
  loading: boolean
  accentColor: string
}

export function RoboflowProjectSelector({
  projects,
  selectedProject,
  onSelect,
  loading,
  accentColor,
}: RoboflowProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const selectedProjectData = projects.find((p) => p.id === selectedProject)

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-white/40 text-xs font-medium mb-2 uppercase tracking-wider">
        Project
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
          <div className="flex items-center justify-between">
            {loading ? (
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-white/40 text-sm">Loading projects...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {selectedProjectData && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
                        border: `1px solid ${accentColor}30`,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 2H12C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2Z"
                          stroke={accentColor}
                          strokeWidth="1.5"
                        />
                        <path
                          d="M5 7H11M5 10H9"
                          stroke={accentColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <span
                      className={`text-sm block ${selectedProject ? "text-white" : "text-white/40"}`}
                      style={selectedProject ? { textShadow: `0 0 20px ${accentColor}40` } : {}}
                    >
                      {selectedProjectData?.name || "Select Roboflow project"}
                    </span>
                    {selectedProjectData?.type && (
                      <span className="text-white/30 text-xs">{selectedProjectData.type}</span>
                    )}
                  </div>
                </div>
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
              </>
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
            {/* Search input */}
            <div className="p-3 border-b border-white/10">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-white/40"
                >
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M11 11L14 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">
                {searchQuery ? "No projects match your search" : "No projects found"}
              </div>
            ) : (
              <div className="py-1 max-h-72 overflow-y-auto">
                {filteredProjects.map((project) => (
                  <motion.button
                    key={project.id}
                    onClick={() => {
                      onSelect(project.id)
                      setIsOpen(false)
                      setSearchQuery("")
                    }}
                    className="w-full px-4 py-3 text-left transition-colors relative group"
                    whileHover={{ x: 4 }}
                    style={{
                      background:
                        selectedProject === project.id
                          ? `linear-gradient(90deg, ${accentColor}15 0%, transparent 100%)`
                          : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            selectedProject === project.id
                              ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`
                              : "rgba(255,255,255,0.05)",
                          border: `1px solid ${selectedProject === project.id ? `${accentColor}30` : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 2H12C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2Z"
                            stroke={selectedProject === project.id ? accentColor : "rgba(255,255,255,0.4)"}
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm block truncate"
                          style={{
                            color: selectedProject === project.id ? accentColor : "rgba(255,255,255,0.8)",
                          }}
                        >
                          {project.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <span>{project.type}</span>
                          {project.images !== undefined && (
                            <>
                              <span>•</span>
                              <span>{project.images} images</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedProject === project.id && (
                      <motion.div
                        layoutId="projectSelected"
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
