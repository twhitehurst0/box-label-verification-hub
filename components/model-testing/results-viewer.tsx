"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { JobResults, FieldStats, ImageResult } from "@/types/model-testing"
import { API_BASE } from "@/lib/api-config"

interface ResultsViewerProps {
  results: JobResults | null
  loading: boolean
  onClose: () => void
  accentColor: string
  mode?: "modal" | "inline"
}

export function ResultsViewer({
  results,
  loading,
  onClose,
  accentColor,
  mode = "modal",
}: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "fields" | "images" | "visuals">("summary")

  if (!results && !loading) return null

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatCER = (value: number) => value.toFixed(3)

  const panel = (
    <motion.div
      initial={mode === "modal" ? { scale: 0.95, y: 20 } : { opacity: 0, y: 10 }}
      animate={mode === "modal" ? { scale: 1, y: 0 } : { opacity: 1, y: 0 }}
      exit={mode === "modal" ? { scale: 0.95, y: 20 } : { opacity: 0, y: -10 }}
      transition={mode === "modal" ? { type: "spring", damping: 25 } : { duration: 0.2 }}
      className={mode === "modal" ? "relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl" : "relative w-full overflow-hidden rounded-2xl"}
      style={{
        background: "linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(10,10,15,0.98) 100%)",
        border: `1px solid ${accentColor}30`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 60px ${accentColor}15`,
      }}
      onClick={(e) => mode === "modal" && e.stopPropagation()}
    >
          {/* Header decoration line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accentColor}60 50%, transparent 100%)`,
            }}
          />

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="2"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-semibold">Benchmark Results</h2>
                {results && (
                  <p className="text-white/40 text-xs font-mono">
                    {results.job.engine.toUpperCase()} • {results.job.dataset_version}
                  </p>
                )}
              </div>
            </div>

            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </motion.button>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-1 px-6 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            {(["summary", "fields", "images", "visuals"] as const).map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider relative"
                style={{
                  background: activeTab === tab ? `${accentColor}20` : "transparent",
                  color: activeTab === tab ? accentColor : "rgba(255,255,255,0.4)",
                  border: activeTab === tab ? `1px solid ${accentColor}40` : "1px solid transparent",
                }}
              >
                {tab}
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <div className={mode === "modal" ? "p-6 overflow-y-auto max-h-[calc(85vh-140px)]" : "p-6 overflow-y-auto max-h-[60vh]"}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent mb-4"
                  style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-white/40 text-sm">Loading results...</span>
              </div>
            ) : results?.summary ? (
              <AnimatePresence mode="wait">
                {activeTab === "summary" && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <SummaryView summary={results.summary} accentColor={accentColor} />
                  </motion.div>
                )}

                {activeTab === "fields" && (
                  <motion.div
                    key="fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <FieldsView
                      perFieldStats={results.summary.per_field_stats}
                      accentColor={accentColor}
                    />
                  </motion.div>
                )}

                {activeTab === "images" && (
                  <motion.div
                    key="images"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ImagesView images={results.images} accentColor={accentColor} />
                  </motion.div>
                )}

                {activeTab === "visuals" && (
                  <motion.div
                    key="visuals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <VisualsView
                      images={results.images}
                      datasetVersion={results.job.dataset_version}
                      accentColor={accentColor}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="text-center py-12 text-white/40">
                No benchmark data available
              </div>
            )}
          </div>
    </motion.div>
  )

  if (mode === "inline") {
    return panel
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        {panel}
      </motion.div>
    </AnimatePresence>
  )
}

function SummaryView({
  summary,
  accentColor,
}: {
  summary: JobResults["summary"]
  accentColor: string
}) {
  if (!summary) return null

  const metrics = [
    {
      label: "Exact Match Rate",
      value: summary.overall_exact_match_rate,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: summary.overall_exact_match_rate > 0.7 ? "#22c55e" : summary.overall_exact_match_rate > 0.4 ? "#fbbf24" : "#ef4444",
    },
    {
      label: "Normalized Match",
      value: summary.overall_normalized_match_rate,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: summary.overall_normalized_match_rate > 0.7 ? "#22c55e" : summary.overall_normalized_match_rate > 0.4 ? "#fbbf24" : "#ef4444",
    },
    {
      label: "Avg. CER",
      value: summary.overall_cer,
      format: (v: number) => v.toFixed(3),
      color: summary.overall_cer < 0.2 ? "#22c55e" : summary.overall_cer < 0.5 ? "#fbbf24" : "#ef4444",
      inverted: true,
    },
    {
      label: "Images Processed",
      value: summary.total_images,
      format: (v: number) => v.toString(),
      color: accentColor,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative rounded-xl p-5 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: metric.color }}
            />
            <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-2">
              {metric.label}
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: metric.color, textShadow: `0 0 30px ${metric.color}50` }}
            >
              {metric.format(metric.value)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Accuracy gauge */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-4">
          Overall Accuracy Distribution
        </div>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${summary.overall_exact_match_rate * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, ${accentColor} 0%, #22c55e 100%)`,
              boxShadow: `0 0 20px ${accentColor}50`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/30 font-mono">
          <span>0%</span>
          <span>{(summary.overall_exact_match_rate * 100).toFixed(1)}% Exact Match</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}

function FieldsView({
  perFieldStats,
  accentColor,
}: {
  perFieldStats: Record<string, FieldStats>
  accentColor: string
}) {
  const fields = Object.entries(perFieldStats).sort(
    (a, b) => b[1].exact_match_rate - a[1].exact_match_rate
  )

  return (
    <div className="space-y-3">
      {fields.map(([fieldName, stats], idx) => {
        const accuracy = stats.exact_match_rate * 100
        const color = accuracy > 70 ? "#22c55e" : accuracy > 40 ? "#fbbf24" : "#ef4444"

        return (
          <motion.div
            key={fieldName}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative rounded-lg p-4 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">{fieldName}</span>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="text-white/40">
                  n={stats.sample_count}
                </span>
                <span style={{ color }}>
                  {accuracy.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${accuracy}%` }}
                transition={{ duration: 0.8, delay: idx * 0.05 }}
                style={{ background: color }}
              />
            </div>
            <div className="flex gap-6 mt-2 text-[9px] text-white/30 font-mono">
              <span>Normalized: {(stats.normalized_match_rate * 100).toFixed(1)}%</span>
              <span>CER: {stats.average_cer.toFixed(3)}</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function ImagesView({
  images,
  accentColor,
}: {
  images: JobResults["images"]
  accentColor: string
}) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  if (images.length === 0) {
    return <div className="text-center py-12 text-white/40">No image results available</div>
  }

  return (
    <div className="space-y-2">
      {images.slice(0, 20).map((img, idx) => (
        <motion.div
          key={img.image_filename}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-lg overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <button
            onClick={() => setExpandedImage(expandedImage === img.image_filename ? null : img.image_filename)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono"
                style={{ background: `${accentColor}20`, color: accentColor }}
              >
                {idx + 1}
              </div>
              <span className="text-white/70 text-sm font-mono">{img.image_filename}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/30 text-[10px] font-mono">
                {img.detections.length} detections • {img.processing_time_ms.toFixed(0)}ms
              </span>
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                animate={{ rotate: expandedImage === img.image_filename ? 180 : 0 }}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </div>
          </button>

          <AnimatePresence>
            {expandedImage === img.image_filename && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="p-4 grid grid-cols-2 gap-3">
                  {Object.entries(img.ocr_results).map(([className, text]) => (
                    <div
                      key={className}
                      className="rounded p-3"
                      style={{ background: "rgba(0,0,0,0.3)" }}
                    >
                      <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-1">
                        {className}
                      </div>
                      <div className="text-white/70 text-xs break-words">
                        {text || <span className="text-white/20 italic">No text detected</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
      {images.length > 20 && (
        <div className="text-center py-4 text-white/30 text-sm">
          + {images.length - 20} more images
        </div>
      )}
    </div>
  )
}

// Color palette for different detection classes - vibrant, distinct colors
const CLASS_COLORS: Record<string, string> = {
  "Made In Label": "#ff6b6b",
  "Barcode": "#4ecdc4",
  "Box Number": "#45b7d1",
  "Halal stamp": "#96ceb4",
  "SKU Name": "#ffeaa7",
  "Pack Date": "#dfe6e9",
  "Kill Date": "#fd79a8",
  "Product Instructions": "#a29bfe",
  "Facility Name": "#74b9ff",
  "Facility Address": "#81ecec",
  "Net Weight Label": "#fab1a0",
  "Net Weight (kg)": "#ff7675",
  "Net Weight (lb)": "#fdcb6e",
  "Piece Count": "#e17055",
  "Meta Data": "#00b894",
  "Site Stamp": "#6c5ce7",
}

function getClassColor(className: string): string {
  return CLASS_COLORS[className] || "#a855f7"
}

function VisualsView({
  images,
  datasetVersion,
  accentColor,
}: {
  images: ImageResult[]
  datasetVersion: string
  accentColor: string
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hoveredDetection, setHoveredDetection] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const selectedImage = images[selectedIndex]

  // Reset image loaded state when selection changes
  useEffect(() => {
    setImageLoaded(false)
  }, [selectedIndex])

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/40">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-40">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="text-sm">No images with detections available</span>
      </div>
    )
  }

  const imageUrl = `${API_BASE}/images/${datasetVersion}/${selectedImage.image_filename}`

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setImageLoaded(true)
  }

  return (
    <div className="space-y-4">
      {/* Image selector strip */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
          style={{
            scrollbarColor: `${accentColor}40 rgba(255,255,255,0.05)`,
          }}
        >
          {images.slice(0, 30).map((img, idx) => (
            <motion.button
              key={img.image_filename}
              onClick={() => setSelectedIndex(idx)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex-shrink-0 rounded-lg overflow-hidden"
              style={{
                width: 64,
                height: 48,
                border: selectedIndex === idx
                  ? `2px solid ${accentColor}`
                  : "2px solid rgba(255,255,255,0.1)",
                boxShadow: selectedIndex === idx
                  ? `0 0 20px ${accentColor}40`
                  : "none",
              }}
            >
              <img
                src={`${API_BASE}/images/${datasetVersion}/${img.image_filename}`}
                alt={img.image_filename}
                className="w-full h-full object-cover"
                style={{
                  filter: selectedIndex === idx ? "brightness(1)" : "brightness(0.6)",
                }}
              />
              {/* Detection count badge */}
              <div
                className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-mono font-bold"
                style={{
                  background: img.detections.length > 0 ? accentColor : "rgba(255,255,255,0.3)",
                  color: img.detections.length > 0 ? "#000" : "#fff",
                }}
              >
                {img.detections.length}
              </div>
            </motion.button>
          ))}
        </div>
        {images.length > 30 && (
          <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent pointer-events-none" />
        )}
      </div>

      {/* Main visualization area */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(10,10,20,0.8) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Technical grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Image container */}
        <div ref={containerRef} className="relative aspect-[4/3] flex items-center justify-center p-4">
          {/* Loading state */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-8 h-8 rounded-full border-2 border-t-transparent"
                style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          )}

          {/* Image with bounding boxes */}
          <div className="relative max-w-full max-h-full">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={selectedImage.image_filename}
              className="max-w-full max-h-[50vh] object-contain rounded"
              onLoad={handleImageLoad}
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />

            {/* Bounding boxes overlay */}
            {imageLoaded && imageRef.current && (
              <svg
                className="absolute inset-0 pointer-events-none"
                viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                  width: imageRef.current.clientWidth,
                  height: imageRef.current.clientHeight,
                }}
              >
                <defs>
                  {/* Glow filter for boxes */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {selectedImage.detections.map((det, idx) => {
                  const [x1, y1, x2, y2] = det.bbox
                  const color = getClassColor(det.class)
                  const isHovered = hoveredDetection === idx
                  const width = x2 - x1
                  const height = y2 - y1

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredDetection(idx)}
                      onMouseLeave={() => setHoveredDetection(null)}
                      style={{ pointerEvents: "all", cursor: "pointer" }}
                    >
                      {/* Background fill on hover */}
                      <rect
                        x={x1}
                        y={y1}
                        width={width}
                        height={height}
                        fill={color}
                        fillOpacity={isHovered ? 0.15 : 0.05}
                        rx={2}
                      />

                      {/* Main bounding box */}
                      <rect
                        x={x1}
                        y={y1}
                        width={width}
                        height={height}
                        fill="none"
                        stroke={color}
                        strokeWidth={isHovered ? 3 : 2}
                        rx={2}
                        filter={isHovered ? "url(#glow)" : undefined}
                      />

                      {/* Corner brackets for technical look */}
                      <g stroke={color} strokeWidth={isHovered ? 3 : 2} fill="none">
                        {/* Top-left */}
                        <path d={`M${x1},${y1 + 8} L${x1},${y1} L${x1 + 8},${y1}`} />
                        {/* Top-right */}
                        <path d={`M${x2 - 8},${y1} L${x2},${y1} L${x2},${y1 + 8}`} />
                        {/* Bottom-left */}
                        <path d={`M${x1},${y2 - 8} L${x1},${y2} L${x1 + 8},${y2}`} />
                        {/* Bottom-right */}
                        <path d={`M${x2 - 8},${y2} L${x2},${y2} L${x2},${y2 - 8}`} />
                      </g>

                      {/* Label background */}
                      <rect
                        x={x1}
                        y={y1 - 20}
                        width={det.class.length * 7 + 40}
                        height={18}
                        fill={color}
                        rx={2}
                        opacity={isHovered ? 1 : 0.9}
                      />

                      {/* Label text */}
                      <text
                        x={x1 + 4}
                        y={y1 - 6}
                        fill="#000"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {det.class} {(det.confidence * 100).toFixed(0)}%
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Bottom info bar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: "rgba(0,0,0,0.4)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-white/60">
              {selectedImage.image_filename}
            </span>
            <span className="text-white/30 text-xs">|</span>
            <span className="font-mono text-xs" style={{ color: accentColor }}>
              {selectedImage.detections.length} detections
            </span>
          </div>
          <span className="font-mono text-[10px] text-white/30">
            {imageDimensions.width > 0 && `${imageDimensions.width}×${imageDimensions.height}px`}
          </span>
        </div>
      </div>

      {/* Detection legend */}
      {selectedImage.detections.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-3">
            Detected Fields
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedImage.detections.map((det, idx) => {
              const color = getClassColor(det.class)
              const isHovered = hoveredDetection === idx

              return (
                <motion.div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer"
                  style={{
                    background: isHovered ? `${color}30` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isHovered ? color : "rgba(255,255,255,0.1)"}`,
                  }}
                  onMouseEnter={() => setHoveredDetection(idx)}
                  onMouseLeave={() => setHoveredDetection(null)}
                  whileHover={{ scale: 1.02 }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  <span className="text-xs text-white/80 font-medium">{det.class}</span>
                  <span className="text-[10px] font-mono text-white/40">
                    {(det.confidence * 100).toFixed(0)}%
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* OCR results for detected fields */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-3">
              OCR Results
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedImage.ocr_results).map(([className, text]) => {
                const color = getClassColor(className)
                return (
                  <div
                    key={className}
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div
                      className="text-[9px] font-mono uppercase tracking-wider mb-1"
                      style={{ color }}
                    >
                      {className}
                    </div>
                    <div className="text-white/80 text-xs break-words font-mono">
                      {text || <span className="text-white/20 italic">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation hint */}
      <div className="text-center text-white/30 text-[10px] font-mono">
        Image {selectedIndex + 1} of {Math.min(images.length, 30)}
        {images.length > 30 && ` (showing first 30)`}
      </div>
    </div>
  )
}
