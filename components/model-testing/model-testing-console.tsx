"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EngineSelector } from "./engine-selector"
import { DatasetSelector } from "./dataset-selector"
import { PreprocessingSelector } from "./preprocessing-selector"
import { InferenceButton } from "./inference-button"
import { RunAllButton } from "./run-all-button"
import { JobsTable } from "./jobs-table"
import { ResultsViewer } from "./results-viewer"
import { ComparisonViewer } from "./comparison-viewer"
import type {
  OCREngine,
  TestDataset,
  InferenceJob,
  JobResults,
  StartInferenceResponse,
  PreprocessingType,
  PreprocessingComparison,
  StartBatchInferenceResponse,
  JobSummary,
} from "@/types/model-testing"
import { OCR_ENGINES } from "@/types/model-testing"
import { API_BASE } from "@/lib/api-config"

const ACCENT_COLOR = "#a855f7"

export function ModelTestingConsole() {
  const [mounted, setMounted] = useState(false)

  // Selection state
  const [selectedEngine, setSelectedEngine] = useState<OCREngine | null>(null)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [selectedPreprocessing, setSelectedPreprocessing] = useState<PreprocessingType[]>(["none"])

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
  const [rightTab, setRightTab] = useState<"jobs" | "completed" | "results">("jobs")

  // Error state
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")

  // Delete state
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [deletingBatch, setDeletingBatch] = useState(false)

  // Batch comparison state
  const [runningBatch, setRunningBatch] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisons, setComparisons] = useState<PreprocessingComparison[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  const getApiErrorMessage = (data: any, status: number) => {
    const detail = data?.detail
    if (typeof detail === "string") return detail
    if (detail && typeof detail === "object") {
      if (typeof detail.message === "string") return detail.message
      if (typeof detail.error === "string" && typeof detail.message === "string") return `${detail.error}: ${detail.message}`
    }
    if (typeof data?.message === "string") return data.message
    return `Request failed (HTTP ${status})`
  }

  // SmolVLM2 is end-to-end (no preprocessing); keep selection sane.
  useEffect(() => {
    if (selectedEngine === "smolvlm2") {
      setSelectedPreprocessing(["none"])
    }
  }, [selectedEngine])

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

  // Start inference (single preprocessing option)
  const handleStartInference = async () => {
    if (!selectedEngine || !selectedDataset) return
    const preprocessing =
      selectedEngine === "smolvlm2"
        ? "none"
        : selectedPreprocessing.length > 0
          ? selectedPreprocessing[0]
          : "none"

    try {
      setRunningInference(true)
      setProgress(0)
      setError(null)
      setNotice(null)

      const res = await fetch(`${API_BASE}/inference/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: selectedEngine,
          dataset_version: selectedDataset,
          dataset_name: "default",
          preprocessing,
          use_gpu: true,
        }),
      })

      const data: any = await res.json().catch(() => null)
      if (!res.ok) {
        setError(getApiErrorMessage(data, res.status))
        setRunningInference(false)
        return
      }
      const typed: StartInferenceResponse = data

      if (typed.success && typed.job_id) {
        fetchJobs()
        if (typed.queued) {
          const pos = typed.queue_position ? ` (#${typed.queue_position})` : ""
          setNotice(`Queued${pos}. It will start automatically when capacity is available.`)
        }
      } else {
        setError(typed.message || "Failed to start inference")
      }
    } catch (err) {
      setError(`Failed to start inference: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setRunningInference(false)
      setCurrentJobId(null)
      setProgress(0)
    }
  }

  // Start batch inference (multiple preprocessing options)
  const handleStartBatchInference = async () => {
    if (!selectedEngine || !selectedDataset || selectedPreprocessing.length < 2) return
    if (selectedEngine === "smolvlm2") return

    try {
      setRunningBatch(true)
      setError(null)
      setNotice(null)

      // Initialize comparisons with pending status
      const initialComparisons: PreprocessingComparison[] = selectedPreprocessing.map((p) => ({
        preprocessing: p,
        job_id: "",
        summary: null,
        status: "pending" as const,
      }))
      setComparisons(initialComparisons)
      setShowComparison(true)

      const res = await fetch(`${API_BASE}/inference/start-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine: selectedEngine,
          dataset_version: selectedDataset,
          dataset_name: "default",
          preprocessing_options: selectedPreprocessing,
        }),
      })

      const data: any = await res.json().catch(() => null)
      if (!res.ok) {
        setError(getApiErrorMessage(data, res.status))
        setRunningBatch(false)
        setShowComparison(false)
        return
      }
      const typed: StartBatchInferenceResponse = data

      if (typed.success && typed.job_ids) {
        // Update comparisons with job IDs
        const initialStatus = typed.queued ? ("pending" as const) : ("running" as const)
        const updatedComparisons = selectedPreprocessing.map((p, i) => ({
          preprocessing: p,
          job_id: typed.job_ids[i],
          summary: null,
          status: initialStatus,
        }))
        setComparisons(updatedComparisons)
        fetchJobs()

        // Start polling for batch results
        pollBatchResults(typed.job_ids, updatedComparisons)
        if (typed.queued) {
          const pos = typed.queue_position ? ` (#${typed.queue_position})` : ""
          setNotice(`Batch queued${pos}. Jobs will run sequentially.`)
        }
      } else {
        setError(typed.message || "Failed to start batch inference")
        setShowComparison(false)
      }
    } catch (err) {
      setError(`Failed to start batch inference: ${err instanceof Error ? err.message : "Unknown error"}`)
      setShowComparison(false)
    } finally {
      setRunningBatch(false)
    }
  }

  // Poll for batch results - fetch jobs list instead of individual status to reduce DB load
  const pollBatchResults = async (jobIds: string[], initialComparisons: PreprocessingComparison[]) => {
    // Small delay to ensure jobs are created in the backend
    await new Promise(resolve => setTimeout(resolve, 2000))

    const pollInterval = setInterval(async () => {
      try {
        // Fetch the jobs list once instead of individual status calls
        // This reduces Pixeltable database load significantly
        const jobsRes = await fetch(`${API_BASE}/inference/jobs`)
        if (!jobsRes.ok) {
          console.warn("Failed to fetch jobs list")
          return
        }
        const allJobs = await jobsRes.json()

        // Map jobs to comparisons
        const updatedComparisons: PreprocessingComparison[] = await Promise.all(
          initialComparisons.map(async (comp, i) => {
            const jobId = jobIds[i]
            const job = allJobs.find((j: { job_id: string }) => j.job_id === jobId)

            if (!job) {
              return { ...comp, job_id: jobId }
            }

            let summary: JobSummary | null = null
            if (job.status === "completed") {
              // Add small delay between result fetches to avoid DB contention
              await new Promise(resolve => setTimeout(resolve, i * 200))
              try {
                const resultsRes = await fetch(`${API_BASE}/inference/jobs/${jobId}/results`)
                if (resultsRes.ok) {
                  const results = await resultsRes.json()
                  summary = results.summary
                }
              } catch {
                // Results not available yet, continue without summary
              }
            }

            return {
              ...comp,
              job_id: jobId,
              status: job.status,
              summary,
            }
          })
        )

        setComparisons(updatedComparisons)

        // Check if all jobs are complete
        const allComplete = updatedComparisons.every(
          (c) => c.status === "completed" || c.status === "failed"
        )
        if (allComplete) {
          clearInterval(pollInterval)
          setRunningBatch(false)
          // Final refresh
          fetchJobs()
        }
      } catch (err) {
        console.error("Failed to poll batch results:", err)
      }
    }, 5000) // Poll every 5 seconds instead of 2.5 to reduce load
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

      // If the deleted job is currently being viewed, close/clear it.
      if (viewingResults === jobId) {
        setViewingResults(null)
        setResultsData(null)
      }
    } catch (err) {
      console.error("Failed to delete job:", err)
      setError(`Failed to delete job: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setDeletingJobId(null)
    }
  }

  // Delete multiple jobs
  const handleDeleteSelected = async (jobIds: string[]) => {
    if (jobIds.length === 0) return

    setDeletingBatch(true)

    try {
      const res = await fetch(`${API_BASE}/inference/jobs/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_ids: jobIds }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()

      if (data.failed_count > 0) {
        setError(`Deleted ${data.deleted_count} jobs, but ${data.failed_count} failed`)
      }

      // Refresh jobs list
      await fetchJobs()

      // If the currently viewed job was deleted, close/clear it.
      if (viewingResults && jobIds.includes(viewingResults)) {
        setViewingResults(null)
        setResultsData(null)
      }
    } catch (err) {
      console.error("Failed to delete jobs:", err)
      setError(`Failed to delete jobs: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setDeletingBatch(false)
    }
  }

  // Partition jobs into Jobs vs Completed (completed >= 30m old)
  const nowMs = Date.now()
  const archivedCompletedJobs = jobs.filter((j) => {
    if (j.status !== "completed") return false
    if (!j.completed_at) return false
    const ts = Date.parse(j.completed_at) || Date.parse(j.completed_at.replace(" ", "T"))
    if (!Number.isFinite(ts)) return false
    return nowMs - ts >= 30 * 60 * 1000
  })
  const jobsTabJobs = jobs.filter((j) => !archivedCompletedJobs.some((c) => c.job_id === j.job_id))

  const hasActiveJobs = jobs.some((j) => j.status === "running" || j.status === "pending")
  const canRunInference = selectedEngine && selectedDataset && !runningInference && !runningBatch && apiStatus === "online"
  const supportsPreprocessing = selectedEngine !== "smolvlm2"
  const canRunBatch = supportsPreprocessing && canRunInference && selectedPreprocessing.length >= 2
  const showBatchButton = supportsPreprocessing && selectedPreprocessing.length >= 2

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
      <div className="relative z-10 mx-auto w-full max-w-none px-6 py-8">
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

          {/* Notice display (non-error) */}
          <AnimatePresence>
            {notice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-xl overflow-hidden"
                style={{
                  background: `${ACCENT_COLOR}12`,
                  border: `1px solid ${ACCENT_COLOR}35`,
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white/80 text-sm">{notice}</p>
                  <button
                    onClick={() => setNotice(null)}
                    className="text-white/40 text-xs hover:text-white/70"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configuration panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Panel wrapper */}
            <div
              className="relative rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)",
                border: `1px solid ${ACCENT_COLOR}30`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${ACCENT_COLOR}10`,
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Top highlight */}
              <div
                className="absolute inset-x-0 top-0 h-[1px] rounded-t-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
                }}
              />

              <div className="p-6 space-y-8 rounded-2xl overflow-visible">
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
                  disabled={runningInference || runningBatch || apiStatus !== "online"}
                  accentColor={ACCENT_COLOR}
                />

                {/* Preprocessing selector */}
                <PreprocessingSelector
                  selectedOptions={selectedPreprocessing}
                  onSelect={setSelectedPreprocessing}
                  disabled={runningInference || runningBatch || apiStatus !== "online" || !supportsPreprocessing}
                  accentColor={ACCENT_COLOR}
                />

                {/* Run button - show single or batch based on selection */}
                {showBatchButton ? (
                  <RunAllButton
                    onClick={handleStartBatchInference}
                    disabled={!canRunBatch}
                    loading={runningBatch}
                    selectedCount={selectedPreprocessing.length}
                    accentColor={ACCENT_COLOR}
                  />
                ) : (
                  <InferenceButton
                    onClick={handleStartInference}
                    disabled={!canRunInference}
                    loading={runningInference}
                    progress={progress}
                    accentColor={ACCENT_COLOR}
                  />
                )}

                {hasActiveJobs && (
                  <div className="mt-3 text-[10px] font-mono text-white/40 leading-relaxed">
                    Jobs run one-at-a-time on the backend; additional runs you start here will be queued automatically.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Jobs table panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
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
                {/* Right-panel tabs */}
                <div className="flex items-center gap-2 mb-5">
                  {([
                    { id: "jobs", label: "Jobs" },
                    { id: "completed", label: "Completed" },
                    { id: "results", label: "Results" },
                  ] as const).map((t) => {
                    const active = rightTab === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setRightTab(t.id)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all"
                        style={{
                          background: active ? `${ACCENT_COLOR}22` : "rgba(255,255,255,0.04)",
                          border: active ? `1px solid ${ACCENT_COLOR}55` : "1px solid rgba(255,255,255,0.08)",
                          color: active ? ACCENT_COLOR : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>

                {rightTab === "jobs" && (
                  <JobsTable
                    title="Jobs"
                    jobs={jobsTabJobs}
                    loading={loadingJobs}
                    onViewResults={handleViewResults}
                    onDeleteJob={handleDeleteJob}
                    onDeleteSelected={handleDeleteSelected}
                    onRefresh={fetchJobs}
                    accentColor={ACCENT_COLOR}
                    deletingJobId={deletingJobId}
                    deletingBatch={deletingBatch}
                  />
                )}

                {rightTab === "completed" && (
                  <JobsTable
                    title="Completed"
                    jobs={archivedCompletedJobs}
                    loading={loadingJobs}
                    onViewResults={handleViewResults}
                    onDeleteJob={handleDeleteJob}
                    onDeleteSelected={handleDeleteSelected}
                    onRefresh={fetchJobs}
                    accentColor={ACCENT_COLOR}
                    deletingJobId={deletingJobId}
                    deletingBatch={deletingBatch}
                  />
                )}

                {rightTab === "results" && (
                  <div className="text-white/40 text-sm">
                    Results dashboard is coming next (this tab will become the visual hub for completed runs).
                  </div>
                )}
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

      {/* Comparison viewer modal */}
      {showComparison && (
        <ComparisonViewer
          comparisons={comparisons}
          loading={runningBatch}
          onClose={() => {
            setShowComparison(false)
            if (!runningBatch) {
              setComparisons([])
            }
          }}
          accentColor={ACCENT_COLOR}
        />
      )}
    </div>
  )
}
