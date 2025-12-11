// OCR Engine Types
export type OCREngine = "easyocr" | "paddleocr"

export interface OCREngineOption {
  id: OCREngine
  name: string
  description: string
  icon: string
}

// Dataset Types
export interface TestDataset {
  version: string
  name: string
  images_dir: string
  image_count: number
  has_ground_truth: boolean
}

// Job Types
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export interface InferenceJob {
  job_id: string
  engine: OCREngine
  dataset_version: string
  dataset_name: string
  status: JobStatus
  total_images: number
  processed_images: number
  progress: number
  created_at: string | null
  started_at?: string | null
  completed_at?: string | null
  error_message?: string | null
}

// Results Types
export interface FieldStats {
  exact_match_rate: number
  normalized_match_rate: number
  average_cer: number
  sample_count: number
}

export interface JobSummary {
  total_images: number
  overall_exact_match_rate: number
  overall_normalized_match_rate: number
  overall_cer: number
  per_field_stats: Record<string, FieldStats>
}

export interface DetectionResult {
  class: string
  confidence: number
  bbox: [number, number, number, number]
}

export interface ImageResult {
  image_filename: string
  image_path: string | null
  detections: DetectionResult[]
  ocr_results: Record<string, string>
  processing_time_ms: number
}

export interface JobResults {
  job: InferenceJob
  summary: JobSummary | null
  images: ImageResult[]
}

// API Response Types
export interface StartInferenceResponse {
  success: boolean
  job_id?: string
  message: string
  total_images?: number
}

// Available OCR Engines
export const OCR_ENGINES: OCREngineOption[] = [
  {
    id: "easyocr",
    name: "EasyOCR",
    description: "Lightweight, good for printed text",
    icon: "⚡",
  },
  {
    id: "paddleocr",
    name: "PaddleOCR",
    description: "High-performance with angle detection",
    icon: "🎯",
  },
]

// Detection classes from OCR_scripts
export const DETECTION_CLASSES = [
  "Made In Label",
  "Barcode",
  "Box Number",
  "Halal stamp",
  "SKU Name",
  "Pack Date",
  "Kill Date",
  "Product Instructions",
  "Facility Name",
  "Facility Address",
  "Net Weight Label",
  "Net Weight (kg)",
  "Net Weight (lb)",
  "Piece Count",
  "Meta Data",
  "Site Stamp",
] as const
