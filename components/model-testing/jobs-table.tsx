"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { InferenceJob, JobStatus, PreprocessingType } from "@/types/model-testing"
import { ALL_PREPROCESSING_OPTIONS } from "@/types/model-testing"

interface JobsTableProps {
  jobs: InferenceJob[]
  loading: boolean
  title?: string
  onViewResults: (jobId: string) => void
  onDeleteJob: (jobId: string) => void
  onDeleteSelected: (jobIds: string[]) => void
  onRefresh: () => void
  accentColor: string
  deletingJobId?: string | null
  deletingBatch?: boolean
}

const statusConfig: Record<JobStatus, { color: string; bgColor: string; label: string; glow: string }> = {
  pending: { color: "#fbbf24", bgColor: "rgba(251,191,36,0.12)", label: "Pending", glow: "0 0 12px rgba(251,191,36,0.3)" },
  running: { color: "#a855f7", bgColor: "rgba(168,85,247,0.12)", label: "Running", glow: "0 0 12px rgba(168,85,247,0.4)" },
  completed: { color: "#22c55e", bgColor: "rgba(34,197,94,0.12)", label: "Complete", glow: "0 0 12px rgba(34,197,94,0.3)" },
  failed: { color: "#ef4444", bgColor: "rgba(239,68,68,0.12)", label: "Failed", glow: "0 0 12px rgba(239,68,68,0.3)" },
  cancelled: { color: "#6b7280", bgColor: "rgba(107,114,128,0.12)", label: "Cancelled", glow: "none" },
}

export function JobsTable({
  jobs,
  loading,
  title = "Jobs",
  onViewResults,
  onDeleteJob,
  onDeleteSelected,
  onRefresh,
  accentColor,
  deletingJobId,
  deletingBatch,
}: JobsTableProps) {
  type SortField = "status" | "date"
  type SortOrder = "asc" | "desc"

  const statusOrder: Record<JobStatus, number> = {
    completed: 0,
    running: 1,
    pending: 2,
    failed: 3,
    cancelled: 4,
  }
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Calculate ETA for running jobs
  const calculateETA = (job: InferenceJob): string | null => {
    if (job.status !== "running" || !job.started_at || job.processed_images < 1) {
      return null
    }

    const startedMs = parseBackendTimestampMs(job.started_at)
    if (!startedMs) return null

    const now = Date.now()
    const elapsedMs = now - startedMs
    const avgMsPerImage = elapsedMs / job.processed_images
    const remainingImages = job.total_images - job.processed_images

    if (remainingImages <= 0) return "< 1s"

    const remainingMs = remainingImages * avgMsPerImage

    // Format as human-readable time
    const seconds = Math.round(remainingMs / 1000)
    if (seconds < 60) return `~${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSec = seconds % 60
    if (minutes < 60) return `~${minutes}m ${remainingSec}s`
    const hours = Math.floor(minutes / 60)
    const remainingMin = minutes % 60
    return `~${hours}h ${remainingMin}m`
  }

  const parseBackendTimestampMs = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null
    let s = dateStr.trim()
    if (!s) return null
    if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T")
    const m = s.match(/^(.+T\\d\\d:\\d\\d:\\d\\d)(\\.(\\d+))?$/)
    if (m) {
      const base = m[1]
      const frac = m[3] || ""
      const ms = frac ? `.${frac.slice(0, 3).padEnd(3, "0")}` : ""
      s = `${base}${ms}Z`
    }
    const t = Date.parse(s)
    return Number.isFinite(t) ? t : null
  }

  // Sort jobs based on current sort settings
  const sortedJobs = [...jobs].sort((a, b) => {
    let comparison = 0

    if (sortField === "status") {
      comparison = statusOrder[a.status] - statusOrder[b.status]
    } else if (sortField === "date") {
      const dateA = parseBackendTimestampMs(a.created_at) ?? 0
      const dateB = parseBackendTimestampMs(b.created_at) ?? 0
      comparison = dateA - dateB
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  const toggleSortField = (field: SortField) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      // Set new field with default order
      setSortField(field)
      setSortOrder(field === "date" ? "desc" : "asc")
    }
  }

  // Enable horizontal scrolling with mouse wheel
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Check if container has horizontal overflow
      const hasHorizontalScroll = container.scrollWidth > container.clientWidth

      if (hasHorizontalScroll) {
        // Prevent vertical scroll and convert to horizontal
        e.preventDefault()
        container.scrollLeft += e.deltaY + e.deltaX
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [jobs])

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set())
    } else {
      setSelectedJobs(new Set(jobs.map((j) => j.job_id)))
    }
  }

  const handleDeleteSelected = () => {
    if (selectedJobs.size === 0) return
    const jobIds = Array.from(selectedJobs)
    if (confirm(`Delete ${jobIds.length} selected job(s)? This will remove all data from Pixeltable.`)) {
      onDeleteSelected(jobIds)
      setSelectedJobs(new Set())
    }
  }

  const isAllSelected = jobs.length > 0 && selectedJobs.size === jobs.length
  const hasSelection = selectedJobs.size > 0

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    const ms = parseBackendTimestampMs(dateStr)
    if (!ms) return "—"
    const date = new Date(ms)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPreprocessingName = (id: PreprocessingType | string | undefined) => {
    if (!id || id === "none") return "None"
    const option = ALL_PREPROCESSING_OPTIONS.find((o) => o.id === id)
    return option?.name || id
  }

  // Custom checkbox component
  const Checkbox = ({ checked, onChange, size = "sm" }: { checked: boolean; onChange: () => void; size?: "sm" | "md" }) => {
    const dimensions = size === "sm" ? "w-4 h-4" : "w-5 h-5"
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onChange()
        }}
        className={`${dimensions} rounded-[4px] flex items-center justify-center transition-all duration-200 border`}
        style={{
          background: checked
            ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`
            : "rgba(255,255,255,0.03)",
          borderColor: checked ? accentColor : "rgba(255,255,255,0.15)",
          boxShadow: checked ? `0 0 8px ${accentColor}40` : "none",
        }}
      >
        {checked && (
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
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3
            className="text-[11px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {title}
          </h3>
          <AnimatePresence>
            {hasSelection && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                className="flex items-center gap-2"
              >
                <span
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}15 100%)`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  {selectedJobs.size} selected
                </span>
                <motion.button
                  onClick={handleDeleteSelected}
                  disabled={deletingBatch}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171",
                    opacity: deletingBatch ? 0.5 : 1,
                  }}
                >
                  {deletingBatch ? (
                    <motion.div
                      className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  Delete
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort controls */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30 px-2.5">
              Sort
            </span>
            <div className="h-4 w-px bg-white/10" />

            {/* Status sort button */}
            <motion.button
              onClick={() => toggleSortField("status")}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium transition-all"
              style={{
                color: sortField === "status" ? accentColor : "rgba(255,255,255,0.5)",
                background: sortField === "status" ? `${accentColor}10` : "transparent",
              }}
            >
              Status
              {sortField === "status" && (
                <motion.svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: sortOrder === "asc" ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </motion.button>

            <div className="h-4 w-px bg-white/10" />

            {/* Date sort button */}
            <motion.button
              onClick={() => toggleSortField("date")}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium transition-all"
              style={{
                color: sortField === "date" ? accentColor : "rgba(255,255,255,0.5)",
                background: sortField === "date" ? `${accentColor}10` : "transparent",
              }}
            >
              Date
              {sortField === "date" && (
                <motion.svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: sortOrder === "asc" ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </motion.button>
          </div>

          {/* Refresh button */}
          <motion.button
            onClick={onRefresh}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <motion.svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              animate={loading ? { rotate: 360 } : {}}
              transition={loading ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}
            >
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </motion.svg>
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Table container with horizontal scroll */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(25,25,35,0.95) 0%, rgba(18,18,28,0.98) 100%)",
          border: `1px solid rgba(255,255,255,0.06)`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}
      >
        {loading && jobs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <motion.div
              className="w-10 h-10 rounded-full border-2 border-t-transparent mb-4"
              style={{ borderColor: `${accentColor}30`, borderTopColor: "transparent" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-white/40 text-sm">Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <span className="text-white/50 text-sm font-medium">No inference jobs yet</span>
            <span className="text-white/30 text-xs mt-1">Run an inference to see results here</span>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.1) transparent",
            }}
          >
            <table className="w-full min-w-[700px]">
              {/* Table header */}
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <th className="w-12 px-4 py-3 text-left">
                    <Checkbox checked={isAllSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Status</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Engine</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Preprocess</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Dataset</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[120px]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Progress</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Created</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Actions</span>
                  </th>
                </tr>
              </thead>

              {/* Table body */}
              <tbody>
                <AnimatePresence>
                  {sortedJobs.map((job, idx) => {
                    const status = statusConfig[job.status]
                    const isExpanded = expandedJob === job.job_id
                    const isSelected = selectedJobs.has(job.job_id)

                    return (
                      <React.Fragment key={job.job_id || `job-${idx}`}>
                        <motion.tr
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.2 }}
                          onClick={() => setExpandedJob(isExpanded ? null : job.job_id)}
                          className="cursor-pointer group transition-colors"
                          style={{
                            background: isExpanded
                              ? `linear-gradient(90deg, ${accentColor}08 0%, transparent 100%)`
                              : isSelected
                                ? "rgba(168,85,247,0.04)"
                                : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                          }}
                        >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <Checkbox checked={isSelected} onChange={() => toggleJobSelection(job.job_id)} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide"
                            style={{
                              background: status.bgColor,
                              color: status.color,
                              boxShadow: status.glow,
                            }}
                          >
                            {job.status === "running" && (
                              <motion.div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: status.color }}
                                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              />
                            )}
                            {status.label}
                          </div>
                        </td>

                        {/* Engine */}
                        <td className="px-4 py-3">
                          <span className="text-white/80 text-xs font-medium">
                            {job.engine === "easyocr"
                              ? "⚡ Easy"
                              : job.engine === "paddleocr"
                                ? "🎯 Paddle"
                                : job.engine === "smolvlm2"
                                  ? "🧠 SmolVLM2"
                                  : job.engine}
                          </span>
                        </td>

                        {/* Preprocessing */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[11px] font-mono px-2 py-0.5 rounded"
                            style={{
                              background: job.preprocessing && job.preprocessing !== "none"
                                ? `${accentColor}12`
                                : "rgba(255,255,255,0.04)",
                              color: job.preprocessing && job.preprocessing !== "none"
                                ? accentColor
                                : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {getPreprocessingName(job.preprocessing)}
                          </span>
                        </td>

                        {/* Dataset */}
                        <td className="px-4 py-3">
                          <span className="text-white/60 text-xs font-mono">
                            {job.dataset_version}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[60px]"
                              style={{ background: "rgba(255,255,255,0.08)" }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${job.progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                style={{
                                  background: job.status === "completed"
                                    ? "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)"
                                    : job.status === "failed"
                                      ? "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                                      : `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
                                  boxShadow: job.status === "running" ? `0 0 8px ${accentColor}50` : "none",
                                }}
                              />
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-mono text-white/50 w-8 text-right">
                                {Math.round(job.progress)}%
                              </span>
                              {job.status === "running" && (() => {
                                const eta = calculateETA(job)
                                return eta ? (
                                  <span className="text-[9px] font-mono text-white/30 whitespace-nowrap">
                                    ETA: {eta}
                                  </span>
                                ) : null
                              })()}
                            </div>
                            {job.status === "completed" && (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onViewResults(job.job_id)
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all"
                                style={{
                                  background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}15 100%)`,
                                  border: `1px solid ${accentColor}30`,
                                  color: accentColor,
                                }}
                              >
                                View
                              </motion.button>
                            )}
                          </div>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3">
                          <span className="text-white/50 text-[11px] whitespace-nowrap">
                            {formatDate(job.created_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete job ${job.job_id.slice(0, 8)}...?`)) {
                                  onDeleteJob(job.job_id)
                                }
                              }}
                              whileHover={{ scale: 1.05, backgroundColor: "rgba(239,68,68,0.15)" }}
                              whileTap={{ scale: 0.95 }}
                              disabled={deletingJobId === job.job_id}
                              className="p-1.5 rounded-md transition-all"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                opacity: deletingJobId === job.job_id ? 0.4 : 1,
                              }}
                            >
                              {deletingJobId === job.job_id ? (
                                <motion.div
                                  className="w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                                />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </motion.button>
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedJob(isExpanded ? null : job.job_id)
                              }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-1.5 rounded-md transition-all"
                              style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <motion.svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="2"
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </motion.svg>
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expanded details row - directly under each job */}
                      {isExpanded && (
                        <motion.tr
                          key={`expanded-${job.job_id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={8} className="p-0">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                              style={{
                                background: "rgba(0,0,0,0.25)",
                                borderBottom: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <div className="px-6 py-5 grid grid-cols-5 gap-8">
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-1.5">Job ID</span>
                                  <span className="text-white/60 font-mono text-xs">{job.job_id.slice(0, 12)}...</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-1.5">Preprocessing</span>
                                  <span className="text-white/60 text-xs">{getPreprocessingName(job.preprocessing)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-1.5">Images</span>
                                  <span className="text-white/60 text-xs">{job.processed_images} / {job.total_images}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-1.5">Started</span>
                                  <span className="text-white/60 text-xs">{formatDate(job.started_at || null)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-1.5">Completed</span>
                                  <span className="text-white/60 text-xs">{formatDate(job.completed_at || null)}</span>
                                </div>
                                {job.error_message && (
                                  <div className="col-span-5 mt-2 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    <span className="text-[10px] uppercase tracking-wider text-red-400/60 block mb-1">Error</span>
                                    <span className="text-red-400/80 text-xs">{job.error_message}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
