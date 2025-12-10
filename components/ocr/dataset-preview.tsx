"use client"

import { motion } from "framer-motion"
import type { DatasetStats } from "@/types/ocr"

interface DatasetPreviewProps {
  stats: DatasetStats | null
  loading: boolean
  datasetName: string
  accentColor: string
}

export function DatasetPreview({
  stats,
  loading,
  datasetName,
  accentColor,
}: DatasetPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Glass background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accentColor}08 0%, rgba(255,255,255,0.04) 50%, ${accentColor}05 100%)`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      />

      {/* Accent glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Border */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: `1px solid ${accentColor}20`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="mb-4">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            Dataset Preview
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Main stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Images"
                value={stats.imageCount.toLocaleString()}
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect
                      x="2"
                      y="4"
                      width="16"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="7" cy="9" r="1.5" fill="currentColor" />
                    <path
                      d="M5 14L8 11L10 13L14 9L17 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                accentColor={accentColor}
              />
              <StatCard
                label="Annotations"
                value={stats.annotationCount.toLocaleString()}
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect
                      x="3"
                      y="5"
                      width="8"
                      height="6"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <rect
                      x="9"
                      y="9"
                      width="8"
                      height="6"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  </svg>
                }
                accentColor={accentColor}
              />
              <StatCard
                label="Avg per Image"
                value={stats.averageAnnotationsPerImage.toString()}
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 3V17M3 10H17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                }
                accentColor={accentColor}
              />
            </div>

            {/* Categories */}
            {stats.categories.length > 0 && (
              <div>
                <h3 className="text-white/50 text-xs font-medium mb-3 uppercase tracking-wider">
                  Categories ({stats.categories.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.categories.map((category, idx) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)`,
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span className="text-white/80 text-sm">{category.name}</span>
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: `${accentColor}20`,
                          color: accentColor,
                        }}
                      >
                        {category.count.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution info */}
            {stats.imageResolutions && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>
                    Resolution range:{" "}
                    <span className="text-white/60">
                      {stats.imageResolutions.min.width}x{stats.imageResolutions.min.height}
                    </span>
                    {" → "}
                    <span className="text-white/60">
                      {stats.imageResolutions.max.width}x{stats.imageResolutions.max.height}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-white/40 text-sm">
            Select a dataset to preview its contents
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accentColor: string
}) {
  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex justify-center mb-2"
        style={{ color: accentColor }}
      >
        {icon}
      </div>
      <div
        className="text-2xl font-bold mb-1"
        style={{
          color: "white",
          textShadow: `0 0 30px ${accentColor}40`,
        }}
      >
        {value}
      </div>
      <div className="text-white/40 text-xs uppercase tracking-wider">{label}</div>
    </div>
  )
}
