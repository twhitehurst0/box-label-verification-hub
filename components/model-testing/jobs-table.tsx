"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { InferenceJob, JobStatus } from "@/types/model-testing"

interface JobsTableProps {
  jobs: InferenceJob[]
  loading: boolean
  onViewResults: (jobId: string) => void
  onDeleteJob: (jobId: string) => void
  onRefresh: () => void
  accentColor: string
  deletingJobId?: string | null
}

const statusConfig: Record<JobStatus, { color: string; bgColor: string; label: string }> = {
  pending: { color: "#fbbf24", bgColor: "rgba(251,191,36,0.15)", label: "Pending" },
  running: { color: "#a855f7", bgColor: "rgba(168,85,247,0.15)", label: "Running" },
  completed: { color: "#22c55e", bgColor: "rgba(34,197,94,0.15)", label: "Complete" },
  failed: { color: "#ef4444", bgColor: "rgba(239,68,68,0.15)", label: "Failed" },
  cancelled: { color: "#6b7280", bgColor: "rgba(107,114,128,0.15)", label: "Cancelled" },
}

export function JobsTable({
  jobs,
  loading,
  onViewResults,
  onDeleteJob,
  onRefresh,
  accentColor,
  deletingJobId,
}: JobsTableProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          Recent Jobs
        </h3>
        <motion.button
          onClick={onRefresh}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider"
          style={{
            background: "rgba(80,80,100,0.5)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.8)",
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
            transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </motion.svg>
          Refresh
        </motion.button>
      </div>

      {/* Table container */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(40,40,55,0.8) 0%, rgba(30,30,45,0.8) 100%)",
          border: `1px solid ${accentColor}25`,
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
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

        {loading && jobs.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-t-transparent mb-4"
              style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-white/60 text-sm font-mono">Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <span className="text-white/60 text-sm">No inference jobs yet</span>
            <span className="text-white/40 text-xs mt-1">Run an inference to see results here</span>
          </div>
        ) : (
          <div className="relative">
            {/* Table header */}
            <div
              className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-mono uppercase tracking-wider"
              style={{
                background: "rgba(60,60,80,0.5)",
                borderBottom: `1px solid ${accentColor}20`,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Engine</div>
              <div className="col-span-2">Dataset</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-white/[0.03]">
              <AnimatePresence>
                {jobs.map((job, idx) => {
                  const status = statusConfig[job.status]
                  const isExpanded = expandedJob === job.job_id

                  return (
                    <motion.div
                      key={job.job_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative group"
                    >
                      {/* Main row */}
                      <div
                        className="grid grid-cols-12 gap-4 px-5 py-4 items-center cursor-pointer transition-colors"
                        onClick={() => setExpandedJob(isExpanded ? null : job.job_id)}
                        style={{
                          background: isExpanded
                            ? `linear-gradient(90deg, ${accentColor}08 0%, transparent 100%)`
                            : "transparent",
                        }}
                      >
                        {/* Status */}
                        <div className="col-span-2">
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium"
                            style={{
                              background: status.bgColor,
                              color: status.color,
                              border: `1px solid ${status.color}30`,
                            }}
                          >
                            {job.status === "running" && (
                              <motion.div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: status.color }}
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                            {status.label}
                          </div>
                        </div>

                        {/* Engine */}
                        <div className="col-span-2">
                          <span className="text-white/90 text-sm font-medium">
                            {job.engine === "easyocr" ? "⚡ EasyOCR" : "🎯 PaddleOCR"}
                          </span>
                        </div>

                        {/* Dataset */}
                        <div className="col-span-2">
                          <span className="text-white/80 text-sm font-mono">
                            {job.dataset_version}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.1)" }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${job.progress}%` }}
                                style={{
                                  background:
                                    job.status === "completed"
                                      ? "#22c55e"
                                      : job.status === "failed"
                                        ? "#ef4444"
                                        : accentColor,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-white/70 w-8">
                              {Math.round(job.progress)}%
                            </span>
                          </div>
                        </div>

                        {/* Created */}
                        <div className="col-span-2">
                          <span className="text-white/70 text-sm">
                            {formatDate(job.created_at)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex justify-end gap-2">
                          {job.status === "completed" && (
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewResults(job.job_id)
                              }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider"
                              style={{
                                background: `${accentColor}20`,
                                border: `1px solid ${accentColor}40`,
                                color: accentColor,
                              }}
                            >
                              View
                            </motion.button>
                          )}
                          {/* Delete button */}
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Delete job ${job.job_id.slice(0, 8)}...? This will remove all data from Pixeltable.`)) {
                                onDeleteJob(job.job_id)
                              }
                            }}
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(239,68,68,0.2)" }}
                            whileTap={{ scale: 0.95 }}
                            disabled={deletingJobId === job.job_id}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              opacity: deletingJobId === job.job_id ? 0.5 : 1,
                            }}
                          >
                            {deletingJobId === job.job_id ? (
                              <motion.div
                                className="w-3.5 h-3.5 rounded-full border border-red-400 border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="2"
                              >
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
                                <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
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
                            className="p-1.5 rounded-lg"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
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
                            >
                              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.svg>
                          </motion.button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                            style={{
                              background: "rgba(0,0,0,0.2)",
                              borderTop: "1px solid rgba(255,255,255,0.03)",
                            }}
                          >
                            <div className="px-5 py-4 grid grid-cols-4 gap-6 text-xs">
                              <div>
                                <span className="text-white/30 block mb-1">Job ID</span>
                                <span className="text-white/60 font-mono text-[10px]">
                                  {job.job_id.slice(0, 8)}...
                                </span>
                              </div>
                              <div>
                                <span className="text-white/30 block mb-1">Images</span>
                                <span className="text-white/60">
                                  {job.processed_images} / {job.total_images}
                                </span>
                              </div>
                              <div>
                                <span className="text-white/30 block mb-1">Started</span>
                                <span className="text-white/60">
                                  {formatDate(job.started_at || null)}
                                </span>
                              </div>
                              <div>
                                <span className="text-white/30 block mb-1">Completed</span>
                                <span className="text-white/60">
                                  {formatDate(job.completed_at || null)}
                                </span>
                              </div>
                              {job.error_message && (
                                <div className="col-span-4">
                                  <span className="text-red-400/60 block mb-1">Error</span>
                                  <span className="text-red-400/80 text-[11px]">
                                    {job.error_message}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
