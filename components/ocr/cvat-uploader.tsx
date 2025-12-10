"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { VersionSelector } from "./version-selector"
import { DatasetSelector } from "./dataset-selector"
import { DatasetPreview } from "./dataset-preview"
import { RoboflowProjectSelector } from "./roboflow-project-selector"
import { UploadButton } from "./upload-button"
import type { S3Version, S3Dataset, DatasetStats, RoboflowProject, UploadProgress } from "@/types/ocr"

const ACCENT_COLOR = "#00d4ff"

export function CvatUploader() {
  const [mounted, setMounted] = useState(false)

  // S3 State
  const [versions, setVersions] = useState<S3Version[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [datasets, setDatasets] = useState<S3Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null)

  // Roboflow State
  const [roboflowProjects, setRoboflowProjects] = useState<RoboflowProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Loading states
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [loadingDatasets, setLoadingDatasets] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    total: 0,
    uploaded: 0,
    failed: 0,
    status: "idle",
  })

  // Error states
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch versions on mount
  useEffect(() => {
    async function fetchVersions() {
      try {
        setLoadingVersions(true)
        const res = await fetch("/api/s3/versions")
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setVersions(data.versions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load versions")
      } finally {
        setLoadingVersions(false)
      }
    }
    fetchVersions()
  }, [])

  // Fetch Roboflow projects on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoadingProjects(true)
        const res = await fetch("/api/roboflow/projects")
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setRoboflowProjects(data.projects || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Roboflow projects")
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  // Fetch datasets when version changes and auto-select "default"
  useEffect(() => {
    if (!selectedVersion) {
      setDatasets([])
      setSelectedDataset(null)
      setDatasetStats(null)
      return
    }

    async function fetchDatasets() {
      try {
        setLoadingDatasets(true)
        setSelectedDataset(null)
        setDatasetStats(null)
        const res = await fetch(`/api/s3/datasets?version=${encodeURIComponent(selectedVersion!)}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        const fetchedDatasets = data.datasets || []
        setDatasets(fetchedDatasets)
        // Auto-select "default" dataset if it exists
        const defaultDataset = fetchedDatasets.find((d: S3Dataset) => d.name === "default")
        if (defaultDataset) {
          setSelectedDataset("default")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load datasets")
      } finally {
        setLoadingDatasets(false)
      }
    }
    fetchDatasets()
  }, [selectedVersion])

  // Fetch dataset stats when dataset changes
  useEffect(() => {
    if (!selectedVersion || !selectedDataset) {
      setDatasetStats(null)
      return
    }

    async function fetchStats() {
      try {
        setLoadingStats(true)
        const res = await fetch(
          `/api/s3/dataset-info?version=${encodeURIComponent(selectedVersion!)}&dataset=${encodeURIComponent(selectedDataset!)}`
        )
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setDatasetStats(data.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dataset info")
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [selectedVersion, selectedDataset])

  const handleUpload = async () => {
    if (!selectedVersion || !selectedDataset || !selectedProject) return

    try {
      setUploadProgress({
        total: datasetStats?.imageCount || 0,
        uploaded: 0,
        failed: 0,
        status: "uploading",
      })

      const res = await fetch("/api/roboflow/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: selectedVersion,
          dataset: selectedDataset,
          projectId: selectedProject,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setUploadProgress({
          total: data.uploaded + data.failed,
          uploaded: data.uploaded,
          failed: data.failed,
          status: "success",
        })
      } else {
        setUploadProgress({
          total: data.uploaded + data.failed,
          uploaded: data.uploaded,
          failed: data.failed,
          status: "error",
          error: data.error || data.errors?.join(", ") || "Upload failed",
        })
      }
    } catch (err) {
      setUploadProgress({
        total: 0,
        uploaded: 0,
        failed: 0,
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }

  const canUpload = selectedVersion && selectedDataset && selectedProject && uploadProgress.status !== "uploading"

  if (!mounted) {
    return <div className="h-full w-full bg-black" />
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Subtle accent color overlay - particles show through from parent */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 30% 20%, ${ACCENT_COLOR}20 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 70% 80%, ${ACCENT_COLOR}15 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating accent orb */}
      <motion.div
        className="fixed w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ACCENT_COLOR}12 0%, transparent 70%)`,
          filter: "blur(100px)",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl"
            >
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400/60 text-xs mt-2 hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* S3 Source Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <GlassCard title="S3 Source" accentColor={ACCENT_COLOR}>
            <VersionSelector
              versions={versions}
              selectedVersion={selectedVersion}
              onSelect={setSelectedVersion}
              loading={loadingVersions}
              accentColor={ACCENT_COLOR}
              label="Dataset Version"
            />
          </GlassCard>
        </motion.div>

        {/* Dataset Preview */}
        <AnimatePresence>
          {(selectedDataset || loadingStats) && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8"
            >
              <DatasetPreview
                stats={datasetStats}
                loading={loadingStats}
                datasetName={selectedDataset || ""}
                accentColor={ACCENT_COLOR}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Roboflow Destination */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <GlassCard title="Roboflow Destination" accentColor={ACCENT_COLOR}>
            <RoboflowProjectSelector
              projects={roboflowProjects}
              selectedProject={selectedProject}
              onSelect={setSelectedProject}
              loading={loadingProjects}
              accentColor={ACCENT_COLOR}
            />
          </GlassCard>
        </motion.div>

        {/* Upload Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <UploadButton
            onClick={handleUpload}
            disabled={!canUpload}
            progress={uploadProgress}
            accentColor={ACCENT_COLOR}
          />
        </motion.div>
      </div>
    </div>
  )
}

// Reusable Glass Card Component
function GlassCard({
  title,
  children,
  accentColor,
}: {
  title: string
  children: React.ReactNode
  accentColor: string
}) {
  return (
    <div className="relative rounded-2xl">
      {/* Glass background */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 100%)`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      />

      {/* Border glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15)`,
        }}
      />

      {/* Top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6">
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: accentColor }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
