// OCR Engine Types
export type OCREngine = "easyocr" | "paddleocr"

export interface OCREngineOption {
  id: OCREngine
  name: string
  description: string
  icon: string
}

// Preprocessing Types
export type PreprocessingType =
  | "none"
  | "rescale"
  | "binarize_otsu"
  | "binarize_adaptive"
  | "binarize_sauvola"
  | "denoise_gaussian"
  | "denoise_median"
  | "dilation"
  | "erosion"
  | "deskew"
  | "add_border"
  | "invert"

export type PreprocessingCategory = "baseline" | "binarization" | "noise" | "morphological" | "geometric"

export interface PreprocessingOption {
  id: PreprocessingType
  name: string
  description: string
  category: PreprocessingCategory
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
  preprocessing: PreprocessingType
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

// Preprocessing Options
export const PREPROCESSING_OPTIONS: PreprocessingOption[] = [
  { id: "none", name: "None (Baseline)", description: "Original image without preprocessing", category: "baseline" },
  { id: "rescale", name: "Rescale 300 DPI", description: "Upscale image for better OCR accuracy", category: "geometric" },
  { id: "binarize_otsu", name: "Otsu Binarization", description: "Global thresholding for text extraction", category: "binarization" },
  { id: "binarize_adaptive", name: "Adaptive Threshold", description: "Local adaptive thresholding for uneven lighting", category: "binarization" },
  { id: "binarize_sauvola", name: "Sauvola Binarization", description: "Document-optimized local thresholding", category: "binarization" },
  { id: "denoise_gaussian", name: "Gaussian Blur", description: "Smooth noise with Gaussian filter", category: "noise" },
  { id: "denoise_median", name: "Median Filter", description: "Remove salt-and-pepper noise", category: "noise" },
  { id: "dilation", name: "Dilation", description: "Expand characters for thin text", category: "morphological" },
  { id: "erosion", name: "Erosion", description: "Shrink characters for heavy ink bleed", category: "morphological" },
  { id: "deskew", name: "Deskew", description: "Rotate to straighten text lines", category: "geometric" },
  { id: "add_border", name: "Add Border", description: "Add 10px white margin around text", category: "geometric" },
  { id: "invert", name: "Invert Colors", description: "Ensure dark text on light background", category: "baseline" },
]

// Category display names for grouping
export const PREPROCESSING_CATEGORIES: Record<PreprocessingCategory, string> = {
  baseline: "Baseline",
  binarization: "Binarization",
  noise: "Noise Removal",
  morphological: "Morphological",
  geometric: "Geometric",
}

// Batch Inference Types
export interface StartBatchInferenceResponse {
  success: boolean
  job_ids: string[]
  message: string
  total_jobs: number
}

// Comparison Types for Run All feature
export interface PreprocessingComparison {
  preprocessing: PreprocessingType
  job_id: string
  summary: JobSummary | null
  status: JobStatus
}
