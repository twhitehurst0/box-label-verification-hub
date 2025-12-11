"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EngineSelector } from "./engine-selector"
import { DatasetSelector } from "./dataset-selector"
import { InferenceButton } from "./inference-button"
import { JobsTable } from "./jobs-table"
import { ResultsViewer } from "./results-viewer"
import type {
  OCREngine,
  TestDataset,
  InferenceJob,
  JobResults,
  StartInferenceResponse,
} from "@/types/model-testing"
import { OCR_ENGINES } from "@/types/model-testing"

const ACCENT_COLOR = "#a855f7"
const API_BASE = "http://localhost:8000"

export function ModelTestingConsole() {
  const [mounted, setMounted] = useState(false)

  // Selection state
  const [selectedEngine, setSelectedEngine] = useState<OCREngine | null>(null)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)

  // Data state
  const [datasets, setDatasets] = useState<TestDataset[]>([])
  const [jobs, setJobs] = useState<InferenceJob[]>([])

  // Loading states
  const [loadingDatasets, setLoadingDatasets] = useState(true)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [runningInference, setRunningInference] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Results viewer state
  const [viewingResults, setViewingResults] = useState<string | null>(null)
  const [resultsData, setResultsData] = useState<JobResults | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")

  // Delete state
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check API health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/health`)
        if (res.ok) {
          setApiStatus("online")
        } else {
          setApiStatus("offline")
        }
      } catch {
        setApiStatus("offline")
      }
    }
    checkHealth()
  }, [])

  // Fetch datasets
  useEffect(() => {
    async function fetchDatasets() {
      if (apiStatus !== "online") return

      try {
        setLoadingDatasets(true)
        const res = await fetch(`${API_BASE}/datasets`)
        const data = await res.json()
        setDatasets(data || [])
      } catch (err) {
        console.error("Failed to fetch datasets:", err)
        setError("Failed to load datasets. Is the backend running?")
      } finally {
        setLoadingDatasets(false)
      }
    }
    fetchDatasets()
  }, [apiStatus])

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (apiStatus !== "online") return

    try {
      setLoadingJobs(true)
      const res = await fetch(`${API_BASE}/inference/jobs`)
      const data = await res.json()
      setJobs(data || [])
    } catch (err) {
      console.error("Failed to fetch jobs:", err)
    } finally {
      setLoadingJobs(false)
    }
  }, [apiStatus])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Live auto-refresh for all jobs (polls every 2 seconds when any job is running)
  useEffect(() => {
    if (apiStatus !== "online") return

    // Check if any job is running or pending
    const hasActiveJobs = jobs.some((j) => j.status === "running" || j.status === "pending")

    if (!hasActiveJobs && !runningInference) return

    const interval = setInterval(async () => {
      try {
        // If we have a specific current job, poll its status
        if (currentJobId && runningInference) {
          const res = await fetch(`${API_BASE}/inference/jobs/${currentJobId}/status`)
          const data = await res.json()

          setProgress(data.progress || 0)

          if (data.status === "completed" || data.status === "failed") {
            setRunningInference(false)
            setCurrentJobId(null)
            setProgress(0)
          }
        }

        // Always refresh the full jobs list for live updates
        fetchJobs()
      } catch (err) {
        console.error("Failed to poll job status:", err)
      }
    }, 2000) // Poll every 2 seconds for smoother updates

    return () => clearInterval(interval)
  }, [currentJobId, runningInference, fetchJobs, jobs, apiStatus])

  // Start inference
  const handleStartInference = async () => {
    if (!selectedEngine || !selectedDataset) return

    try {
      setRunningInference(true)
      setProgress(0)
      setError(null)

      const res = await fetch(`${API_BASE}/inference/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: selectedEngine,
          dataset_version: selectedDataset,
          dataset_name: "default",
        }),
      })

      const data: StartInferenceResponse = await res.json()

      if (data.success && data.job_id) {
        setCurrentJobId(data.job_id)
        fetchJobs()
      } else {
        setError(data.message || "Failed to start inference")
        setRunningInference(false)
      }
    } catch (err) {
      setError("Failed to start inference. Check if backend is running.")
      setRunningInference(false)
    }
  }

  // View results
  const handleViewResults = async (jobId: string) => {
    setViewingResults(jobId)
    setLoadingResults(true)

    try {
      const res = await fetch(`${API_BASE}/inference/jobs/${jobId}/results`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      setResultsData(data)
    } catch (err) {
      console.error("Failed to fetch results:", err)
      setError(`Failed to fetch results: ${err instanceof Error ? err.message : "Unknown error"}`)
      setViewingResults(null)
    } finally {
      setLoadingResults(false)
    }
  }

  // Delete job
  const handleDeleteJob = async (jobId: string) => {
    setDeletingJobId(jobId)

    try {
      const res = await fetch(`${API_BASE}/inference/jobs/${jobId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      // Refresh jobs list
      await fetchJobs()
    } catch (err) {
      console.error("Failed to delete job:", err)
      setError(`Failed to delete job: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setDeletingJobId(null)
    }
  }

  const canRunInference = selectedEngine && selectedDataset && !runningInference && apiStatus === "online"

  if (!mounted) {
    return <div className="h-full w-full bg-black" />
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Accent color overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 30% 20%, ${ACCENT_COLOR}15 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 70% 80%, ${ACCENT_COLOR}10 0%, transparent 50%)
          `,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Floating accent orb */}
      <motion.div
        className="fixed w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ACCENT_COLOR}10 0%, transparent 70%)`,
          filter: "blur(80px)",
          left: "60%",
          top: "30%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{
                  background: `linear-gradient(135deg, #fff 0%, ${ACCENT_COLOR} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Model Testing
              </h1>
              <p className="text-white/70 text-sm mt-1 font-mono">
                OCR Inference & Benchmark Suite
              </p>
            </div>

            {/* API Status indicator */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: apiStatus === "online"
                  ? "rgba(34,197,94,0.1)"
                  : apiStatus === "offline"
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(251,191,36,0.1)",
                border: `1px solid ${
                  apiStatus === "online"
                    ? "rgba(34,197,94,0.3)"
                    : apiStatus === "offline"
                      ? "rgba(239,68,68,0.3)"
                      : "rgba(251,191,36,0.3)"
                }`,
              }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{
                  background: apiStatus === "online"
                    ? "#22c55e"
                    : apiStatus === "offline"
                      ? "#ef4444"
                      : "#fbbf24",
                }}
                animate={apiStatus === "checking" ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{
                  color: apiStatus === "online"
                    ? "#22c55e"
                    : apiStatus === "offline"
                      ? "#ef4444"
                      : "#fbbf24",
                }}
              >
                {apiStatus === "checking" ? "Connecting..." : apiStatus === "online" ? "API Online" : "API Offline"}
              </span>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-red-400 text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400/60 text-xs hover:text-red-400"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {apiStatus === "offline" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
              }}
            >
              <p className="text-yellow-400/80 text-sm">
                Backend API is not running. Start it with:
              </p>
              <code className="block mt-2 text-xs font-mono text-yellow-400/60 bg-black/30 p-2 rounded">
                cd backend && pip install -r requirements.txt && python main.py
              </code>
            </motion.div>
          )}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Panel wrapper */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)",
                border: `1px solid ${ACCENT_COLOR}30`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${ACCENT_COLOR}10`,
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Top highlight */}
              <div
                className="absolute inset-x-0 top-0 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
                }}
              />

              <div className="p-6 space-y-8">
                {/* Section header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${ACCENT_COLOR}30 0%, ${ACCENT_COLOR}10 100%)`,
                      border: `1px solid ${ACCENT_COLOR}40`,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={ACCENT_COLOR}
                      strokeWidth="2"
                    >
                      <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-sm">Configuration</h2>
                    <p className="text-white/30 text-xs">Select engine and dataset</p>
                  </div>
                </div>

                {/* Engine selector */}
                <EngineSelector
                  engines={OCR_ENGINES}
                  selectedEngine={selectedEngine}
                  onSelect={setSelectedEngine}
                  disabled={runningInference || apiStatus !== "online"}
                  accentColor={ACCENT_COLOR}
                />

                {/* Dataset selector */}
                <DatasetSelector
                  datasets={datasets}
                  selectedDataset={selectedDataset}
                  onSelect={setSelectedDataset}
                  loading={loadingDatasets}
                  disabled={runningInference || apiStatus !== "online"}
                  accentColor={ACCENT_COLOR}
                />

                {/* Run button */}
                <InferenceButton
                  onClick={handleStartInference}
                  disabled={!canRunInference}
                  loading={runningInference}
                  progress={progress}
                  accentColor={ACCENT_COLOR}
                />
              </div>
            </div>
          </motion.div>

          {/* Jobs table panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div
              className="relative rounded-2xl overflow-hidden h-full"
              style={{
                background: "linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)",
                border: `1px solid ${ACCENT_COLOR}30`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${ACCENT_COLOR}10`,
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Top highlight */}
              <div
                className="absolute inset-x-0 top-0 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
                }}
              />

              <div className="p-6">
                <JobsTable
                  jobs={jobs}
                  loading={loadingJobs}
                  onViewResults={handleViewResults}
                  onDeleteJob={handleDeleteJob}
                  onRefresh={fetchJobs}
                  accentColor={ACCENT_COLOR}
                  deletingJobId={deletingJobId}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Results viewer modal */}
      {viewingResults && (
        <ResultsViewer
          results={resultsData}
          loading={loadingResults}
          onClose={() => {
            setViewingResults(null)
            setResultsData(null)
          }}
          accentColor={ACCENT_COLOR}
        />
      )}
    </div>
  )
}
