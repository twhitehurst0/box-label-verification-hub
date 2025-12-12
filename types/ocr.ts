// S3 Data Types
export interface S3Version {
  name: string
  path: string
  /**
   * Best-effort timestamp for when this version was uploaded to S3.
   * This is derived from S3 object LastModified (not a true folder created-at).
   */
  uploadedAt?: string
}

export interface S3Dataset {
  name: string
  path: string
}

// COCO Annotation Format Types
export interface COCOImage {
  id: number
  file_name: string
  width: number
  height: number
  date_captured?: string
}

export interface COCOAnnotation {
  id: number
  image_id: number
  category_id: number
  bbox: [number, number, number, number] // [x, y, width, height]
  area: number
  iscrowd: number
  segmentation?: number[][] | { counts: number[]; size: [number, number] }
}

export interface COCOCategory {
  id: number
  name: string
  supercategory?: string
}

export interface COCOAnnotations {
  info?: {
    year?: number
    version?: string
    description?: string
    contributor?: string
    url?: string
    date_created?: string
  }
  licenses?: Array<{
    id: number
    name: string
    url: string
  }>
  images: COCOImage[]
  annotations: COCOAnnotation[]
  categories: COCOCategory[]
}

// Dataset Stats (parsed from COCO)
export interface CategoryStats {
  id: number
  name: string
  count: number
}

export interface DatasetStats {
  imageCount: number
  annotationCount: number
  categories: CategoryStats[]
  averageAnnotationsPerImage: number
  imageResolutions?: {
    min: { width: number; height: number }
    max: { width: number; height: number }
  }
}

// Roboflow Types
export interface RoboflowProject {
  id: string
  name: string
  type: string
  images?: number
  classes?: Record<string, number>
  created?: number
  updated?: number
}

export interface RoboflowWorkspace {
  name: string
  url: string
  members?: number
  projects: RoboflowProject[]
}

// Upload Types
export interface UploadProgress {
  total: number
  uploaded: number
  failed: number
  currentFile?: string
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

export interface UploadRequest {
  version: string
  dataset: string
  projectId: string
}

export interface UploadResponse {
  success: boolean
  uploaded: number
  failed: number
  errors?: string[]
}
