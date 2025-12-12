"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts"

import type { InferenceJob, JobResults, JobSummaryRow, OCREngine } from "@/types/model-testing"
import { API_BASE } from "@/lib/api-config"
import { ResultsViewer } from "./results-viewer"

type ResultsSubTab = "dashboard" | "run"

interface ResultsTabProps {
  accentColor: string
  jobs: InferenceJob[]
  selectedJobId: string | null
  results: JobResults | null
  loadingResults: boolean
  onSelectJob: (jobId: string) => void
  onClearSelection: () => void
}

function parseBackendTimestampMs(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  // Accept ISO, or "YYYY-MM-DD HH:MM:SS(.ffffff)" from Python.
  let s = dateStr.trim()
  if (!s) return null
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T")
  // Truncate fractional seconds to milliseconds (JS Date prefers 0-3 digits).
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

function formatShortTime(dateStr: string | null | undefined): string {
  const ms = parseBackendTimestampMs(dateStr)
  if (!ms) return "—"
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPercent01(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function ResultsTab({
  accentColor,
  jobs,
  selectedJobId,
  results,
  loadingResults,
  onSelectJob,
  onClearSelection,
}: ResultsTabProps) {
  const [active, setActive] = useState<ResultsSubTab>("dashboard")
  const [summaries, setSummaries] = useState<JobSummaryRow[]>([])
  const [loadingSummaries, setLoadingSummaries] = useState(false)
  const [summariesError, setSummariesError] = useState<string | null>(null)
  const [metric, setMetric] = useState<"exact" | "normalized" | "cer">("exact")

  useEffect(() => {
    if (selectedJobId) setActive("run")
  }, [selectedJobId])

  const refreshSummaries = async () => {
    try {
      setLoadingSummaries(true)
      setSummariesError(null)
      const res = await fetch(`${API_BASE}/inference/job-summaries?limit=200`)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = (await res.json()) as JobSummaryRow[]
      setSummaries(Array.isArray(data) ? data : [])
    } catch (e) {
      setSummariesError(e instanceof Error ? e.message : "Failed to load summaries")
    } finally {
      setLoadingSummaries(false)
    }
  }

  useEffect(() => {
    refreshSummaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const jobById = useMemo(() => {
    const m = new Map<string, InferenceJob>()
    for (const j of jobs) m.set(j.job_id, j)
    return m
  }, [jobs])

  const visibleSummaries = useMemo(() => {
    // Keep dashboard consistent with deletes: only show summaries for jobs that still exist in the jobs list.
    return summaries.filter((s) => jobById.has(s.job_id))
  }, [summaries, jobById])

  const kpis = useMemo(() => {
    const exact = mean(visibleSummaries.map((s) => s.overall_exact_match_rate))
    const normalized = mean(visibleSummaries.map((s) => s.overall_normalized_match_rate))
    const cer = mean(visibleSummaries.map((s) => s.overall_cer))
    return { count: visibleSummaries.length, exact, normalized, cer }
  }, [visibleSummaries])

  const trendData = useMemo(() => {
    const sorted = [...visibleSummaries].sort((a, b) => {
      const ta = parseBackendTimestampMs(a.created_at) ?? 0
      const tb = parseBackendTimestampMs(b.created_at) ?? 0
      return ta - tb
    })
    return sorted.map((s) => ({
      job_id: s.job_id,
      time: formatShortTime(s.created_at),
      exact: Math.round(s.overall_exact_match_rate * 1000) / 10,
      normalized: Math.round(s.overall_normalized_match_rate * 1000) / 10,
      cer: Math.round(s.overall_cer * 1000) / 1000,
      engine: s.engine,
    }))
  }, [visibleSummaries])

  const engineData = useMemo(() => {
    const byEngine = new Map<OCREngine, JobSummaryRow[]>()
    for (const s of visibleSummaries) {
      const arr = byEngine.get(s.engine as OCREngine) || []
      arr.push(s)
      byEngine.set(s.engine as OCREngine, arr)
    }
    const rows: Array<{ engine: string; exact: number; normalized: number; cer: number; n: number }> = []
    for (const [engine, arr] of byEngine.entries()) {
      rows.push({
        engine,
        exact: Math.round(mean(arr.map((x) => x.overall_exact_match_rate)) * 1000) / 10,
        normalized: Math.round(mean(arr.map((x) => x.overall_normalized_match_rate)) * 1000) / 10,
        cer: Math.round(mean(arr.map((x) => x.overall_cer)) * 1000) / 1000,
        n: arr.length,
      })
    }
    rows.sort((a, b) => b.exact - a.exact)
    return rows
  }, [visibleSummaries])

  const fieldData = useMemo(() => {
    // Weighted aggregate across runs by sample_count per field.
    const acc = new Map<string, { exactN: number; exactD: number; normN: number; normD: number; cerN: number; cerD: number }>()
    for (const s of visibleSummaries) {
      const stats = s.per_field_stats || {}
      for (const [fieldName, st] of Object.entries(stats)) {
        const n = Number(st.sample_count || 0)
        if (!n) continue
        const cur = acc.get(fieldName) || { exactN: 0, exactD: 0, normN: 0, normD: 0, cerN: 0, cerD: 0 }
        cur.exactN += Number(st.exact_match_rate || 0) * n
        cur.exactD += n
        cur.normN += Number(st.normalized_match_rate || 0) * n
        cur.normD += n
        cur.cerN += Number(st.average_cer || 0) * n
        cur.cerD += n
        acc.set(fieldName, cur)
      }
    }
    const rows = Array.from(acc.entries()).map(([field, v]) => ({
      field,
      exact: v.exactD ? Math.round((v.exactN / v.exactD) * 1000) / 10 : 0,
      normalized: v.normD ? Math.round((v.normN / v.normD) * 1000) / 10 : 0,
      cer: v.cerD ? Math.round((v.cerN / v.cerD) * 1000) / 1000 : 0,
      n: v.exactD,
    }))
    rows.sort((a, b) => b.exact - a.exact)
    return rows
  }, [visibleSummaries])

  const recentRuns = useMemo(() => {
    const completed = jobs
      .filter((j) => j.status === "completed")
      .sort((a, b) => {
        const ta = parseBackendTimestampMs(a.completed_at || a.created_at) ?? 0
        const tb = parseBackendTimestampMs(b.completed_at || b.created_at) ?? 0
        return tb - ta
      })
    return completed.slice(0, 12)
  }, [jobs])

  const TabButton = ({ id, label, disabled }: { id: ResultsSubTab; label: string; disabled?: boolean }) => {
    const isActive = active === id
    return (
      <button
        onClick={() => !disabled && setActive(id)}
        disabled={disabled}
        className="px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all"
        style={{
          background: isActive ? `${accentColor}22` : "rgba(255,255,255,0.04)",
          border: isActive ? `1px solid ${accentColor}55` : "1px solid rgba(255,255,255,0.08)",
          color: isActive ? accentColor : "rgba(255,255,255,0.55)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TabButton id="dashboard" label="Dashboard" />
          <TabButton id="run" label="Run" disabled={!selectedJobId} />
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={refreshSummaries}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <span>Refresh</span>
          </motion.button>

          {active === "run" && selectedJobId && (
            <motion.button
              onClick={() => {
                onClearSelection()
                setActive("dashboard")
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}35`,
                color: accentColor,
              }}
            >
              <span>Back</span>
            </motion.button>
          )}
        </div>
      </div>

      {active === "dashboard" && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Completed Runs", value: kpis.count.toString(), color: accentColor },
              { label: "Avg Exact Match", value: formatPercent01(kpis.exact), color: kpis.exact > 0.7 ? "#22c55e" : kpis.exact > 0.4 ? "#fbbf24" : "#ef4444" },
              { label: "Avg Normalized", value: formatPercent01(kpis.normalized), color: kpis.normalized > 0.7 ? "#22c55e" : kpis.normalized > 0.4 ? "#fbbf24" : "#ef4444" },
              { label: "Avg CER", value: kpis.count ? kpis.cer.toFixed(3) : "—", color: kpis.cer < 0.2 ? "#22c55e" : kpis.cer < 0.5 ? "#fbbf24" : "#ef4444" },
            ].map((k, idx) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative rounded-xl p-5 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: k.color }} />
                <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-2">{k.label}</div>
                <div className="text-2xl font-bold" style={{ color: k.color, textShadow: `0 0 30px ${k.color}50` }}>
                  {k.value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty state */}
          {visibleSummaries.length === 0 && !loadingSummaries ? (
            <div className="rounded-xl p-10 text-center text-white/40" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
              No completed benchmark summaries yet. Run an inference with ground truth enabled, then come back here.
            </div>
          ) : (
            <>
              {/* Trend + Engines */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Trend</div>
                    <div className="flex items-center gap-2">
                      {([
                        { id: "exact", label: "Exact" },
                        { id: "normalized", label: "Norm" },
                        { id: "cer", label: "CER" },
                      ] as const).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMetric(m.id)}
                          className="px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider"
                          style={{
                            background: metric === m.id ? `${accentColor}22` : "rgba(255,255,255,0.04)",
                            border: metric === m.id ? `1px solid ${accentColor}45` : "1px solid rgba(255,255,255,0.08)",
                            color: metric === m.id ? accentColor : "rgba(255,255,255,0.45)",
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(10,10,15,0.95)",
                            border: `1px solid ${accentColor}30`,
                            borderRadius: 10,
                            color: "rgba(255,255,255,0.8)",
                          }}
                          formatter={(value: any) => (metric === "cer" ? value : `${value}%`)}
                        />
                        <Line
                          type="monotone"
                          dataKey={metric}
                          stroke={accentColor}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-3">Engine Comparison (Avg Exact %)</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={engineData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="engine" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(10,10,15,0.95)",
                            border: `1px solid ${accentColor}30`,
                            borderRadius: 10,
                            color: "rgba(255,255,255,0.8)",
                          }}
                          formatter={(value: any, name: any) => {
                            if (name === "cer") return value
                            return `${value}%`
                          }}
                        />
                        <Bar dataKey="exact" fill={accentColor} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Field performance + Recent runs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-3">Per-field Accuracy (weighted)</div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fieldData.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="field"
                          tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                          width={120}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(10,10,15,0.95)",
                            border: `1px solid ${accentColor}30`,
                            borderRadius: 10,
                            color: "rgba(255,255,255,0.8)",
                          }}
                          formatter={(value: any) => `${value}%`}
                        />
                        <Bar dataKey="exact" fill={accentColor} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-white/30">
                    Showing top 10 fields by exact match rate.
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-3">Recent Completed Runs</div>
                  <div className="space-y-2">
                    {recentRuns.length === 0 ? (
                      <div className="text-white/40 text-sm">No completed runs yet.</div>
                    ) : (
                      recentRuns.map((j) => {
                        const s = visibleSummaries.find((x) => x.job_id === j.job_id)
                        return (
                          <button
                            key={j.job_id}
                            onClick={() => onSelectJob(j.job_id)}
                            className="w-full text-left rounded-lg px-3 py-2 transition-all"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-white/80 text-xs font-mono">
                                {j.engine.toUpperCase()} • {j.dataset_version}
                              </div>
                              <div className="text-white/30 text-[10px] font-mono whitespace-nowrap">
                                {formatShortTime(j.completed_at || j.created_at)}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 gap-3">
                              <div className="text-white/40 text-[10px] font-mono">
                                preprocess: {j.preprocessing}
                              </div>
                              <div className="text-[10px] font-mono" style={{ color: accentColor }}>
                                {s ? `${(s.overall_exact_match_rate * 100).toFixed(1)}%` : "—"}
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <AnimatePresence>
            {summariesError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl p-4 overflow-hidden"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-red-400 text-sm">Failed to load summaries: {summariesError}</span>
                  <button className="text-red-400/60 text-xs hover:text-red-400" onClick={() => setSummariesError(null)}>
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {active === "run" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accentColor}30`, background: "rgba(0,0,0,0.25)" }}>
          {selectedJobId ? (
            <ResultsViewer
              mode="inline"
              results={results}
              loading={loadingResults}
              onClose={onClearSelection}
              accentColor={accentColor}
            />
          ) : (
            <div className="p-10 text-center text-white/40">Select a completed job to view results.</div>
          )}
        </div>
      )}
    </div>
  )
}


