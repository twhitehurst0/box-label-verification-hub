"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { PreprocessingComparison, PreprocessingType } from "@/types/model-testing"
import { PREPROCESSING_OPTIONS } from "@/types/model-testing"

interface ComparisonViewerProps {
  comparisons: PreprocessingComparison[]
  loading: boolean
  onClose: () => void
  accentColor: string
}

export function ComparisonViewer({
  comparisons,
  loading,
  onClose,
  accentColor,
}: ComparisonViewerProps) {
  // Sort by exact match rate (best first)
  const sortedComparisons = useMemo(() => {
    return [...comparisons]
      .filter((c) => c.summary !== null)
      .sort((a, b) => (b.summary?.overall_exact_match_rate || 0) - (a.summary?.overall_exact_match_rate || 0))
  }, [comparisons])

  const pendingCount = comparisons.filter((c) => c.status === "running" || c.status === "pending").length
  const completedCount = comparisons.filter((c) => c.status === "completed").length
  const best = sortedComparisons[0]

  const getPreprocessingName = (id: PreprocessingType) => {
    return PREPROCESSING_OPTIONS.find((o) => o.id === id)?.name || id
  }

  const getMetricColor = (value: number, isLowerBetter = false) => {
    if (isLowerBetter) {
      if (value < 0.2) return "#22c55e" // green
      if (value < 0.5) return "#eab308" // yellow
      return "#ef4444" // red
    } else {
      if (value > 0.7) return "#22c55e"
      if (value > 0.4) return "#eab308"
      return "#ef4444"
    }
  }

  const maxRate = Math.max(...sortedComparisons.map((c) => c.summary?.overall_exact_match_rate || 0))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(20,20,30,0.98) 0%, rgba(15,15,25,0.98) 100%)",
            border: `1px solid ${accentColor}30`,
            boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${accentColor}15`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header glow line */}
          <div
            className="h-[2px] w-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
            }}
          />

          {/* Header */}
          <div className="relative px-6 py-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-xl font-medium tracking-wide"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  Preprocessing Comparison
                </h2>
                <p className="text-sm text-white/40 mt-1 font-mono">
                  {loading
                    ? `Processing ${pendingCount} remaining...`
                    : `${completedCount} methods compared`}
                </p>
              </div>

              {/* Close button */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            </div>

            {/* Progress indicator for loading */}
            {loading && (
              <div className="mt-4">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <motion.div
                    className="h-full"
                    style={{ background: accentColor }}
                    animate={{ width: `${(completedCount / comparisons.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Best performer highlight */}
            {best && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 100%)`,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${accentColor}30`, border: `1px solid ${accentColor}50` }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={accentColor}
                      stroke="none"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: accentColor }}>
                      Best Performer
                    </div>
                    <div className="text-lg font-medium text-white">
                      {getPreprocessingName(best.preprocessing)}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-bold" style={{ color: "#22c55e" }}>
                      {((best.summary?.overall_exact_match_rate || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] font-mono text-white/40">Exact Match</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Comparison table */}
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-white/40">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Method</div>
                <div className="col-span-2 text-right">Exact Match</div>
                <div className="col-span-2 text-right">Normalized</div>
                <div className="col-span-2 text-right">CER</div>
                <div className="col-span-1 text-right">Status</div>
              </div>

              {/* Data rows */}
              {sortedComparisons.map((comparison, idx) => {
                const isWinner = idx === 0 && !loading
                const exactRate = comparison.summary?.overall_exact_match_rate || 0
                const normalizedRate = comparison.summary?.overall_normalized_match_rate || 0
                const cer = comparison.summary?.overall_cer || 0
                const barWidth = maxRate > 0 ? (exactRate / maxRate) * 100 : 0

                return (
                  <motion.div
                    key={comparison.job_id || `comparison-${comparison.preprocessing}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative grid grid-cols-12 gap-4 px-4 py-3 rounded-lg group"
                    style={{
                      background: isWinner
                        ? `linear-gradient(90deg, ${accentColor}10 0%, transparent 100%)`
                        : "rgba(255,255,255,0.02)",
                    }}
                  >
                    {/* Background bar visualization */}
                    <div
                      className="absolute inset-y-0 left-0 transition-all opacity-20"
                      style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${getMetricColor(exactRate)}40 0%, transparent 100%)`,
                      }}
                    />

                    {/* Rank */}
                    <div className="col-span-1 relative flex items-center">
                      <span
                        className="text-sm font-mono font-bold"
                        style={{
                          color: isWinner ? accentColor : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {idx + 1}
                      </span>
                    </div>

                    {/* Method name */}
                    <div className="col-span-4 relative flex items-center gap-2">
                      {isWinner && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                        />
                      )}
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: isWinner ? "white" : "rgba(255,255,255,0.8)" }}
                      >
                        {getPreprocessingName(comparison.preprocessing)}
                      </span>
                    </div>

                    {/* Exact Match Rate */}
                    <div className="col-span-2 relative flex items-center justify-end">
                      <span
                        className="text-sm font-mono font-bold"
                        style={{ color: getMetricColor(exactRate) }}
                      >
                        {(exactRate * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Normalized Match Rate */}
                    <div className="col-span-2 relative flex items-center justify-end">
                      <span
                        className="text-sm font-mono"
                        style={{ color: getMetricColor(normalizedRate) }}
                      >
                        {(normalizedRate * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* CER */}
                    <div className="col-span-2 relative flex items-center justify-end">
                      <span
                        className="text-sm font-mono"
                        style={{ color: getMetricColor(cer, true) }}
                      >
                        {(cer * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 relative flex items-center justify-end">
                      {comparison.status === "completed" ? (
                        <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                      ) : comparison.status === "running" ? (
                        <motion.div
                          className="w-2 h-2 rounded-full"
                          style={{ background: accentColor }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      ) : (
                        <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {/* Still running items */}
              {comparisons
                .filter((c) => c.status === "running" || c.status === "pending")
                .map((comparison, idx) => (
                  <motion.div
                    key={comparison.job_id || `pending-${comparison.preprocessing}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="col-span-1">
                      <span className="text-sm font-mono text-white/20">-</span>
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded border-2 border-t-transparent"
                        style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span className="text-sm text-white/50">
                        {getPreprocessingName(comparison.preprocessing)}
                      </span>
                    </div>
                    <div className="col-span-6 flex items-center justify-center">
                      <span className="text-xs font-mono text-white/30">Processing...</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: accentColor }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 border-t border-white/10 flex items-center justify-between"
            style={{ background: "rgba(0,0,0,0.2)" }}
          >
            <div className="text-[10px] font-mono text-white/30">
              Metrics: Exact Match (case-sensitive) | Normalized (lowercase, trimmed) | CER (character error rate)
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: `${accentColor}20`,
                color: accentColor,
                border: `1px solid ${accentColor}40`,
              }}
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
