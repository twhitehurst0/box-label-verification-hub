import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import type { S3Version, S3Dataset, COCOAnnotations, DatasetStats } from "@/types/ocr"

const S3_BUCKET = process.env.S3_BUCKET || "box-label-processing-central"
const S3_BASE_PREFIX = "processed/ocr/"

async function headLastModified(client: S3Client, key: string): Promise<Date | null> {
  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    )
    return res.LastModified ?? null
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode
    const name = err?.name
    // Missing objects should not break listing
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return null
    }
    throw err
  }
}

async function getVersionUploadedAt(client: S3Client, version: string): Promise<string | undefined> {
  // Prefer a canonical manifest file if present (cheap + deterministic)
  const directAnnotationsKey = `${S3_BASE_PREFIX}${version}/final/annotations.json`
  const direct = await headLastModified(client, directAnnotationsKey)
  if (direct) return direct.toISOString()

  const finalPrefix = `${S3_BASE_PREFIX}${version}/final/`

  // If annotations.json is nested under dataset folders, use the newest annotations.json
  const list = await client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: finalPrefix,
      Delimiter: "/",
    })
  )

  const datasetPrefixes = (list.CommonPrefixes || [])
    .map((p) => p.Prefix || "")
    .filter(Boolean)
    .slice(0, 25) // safety cap

  if (datasetPrefixes.length > 0) {
    const heads = await Promise.allSettled(
      datasetPrefixes.map((p) => headLastModified(client, `${p}annotations.json`))
    )
    const times = heads
      .flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value.getTime()] : []))
    if (times.length > 0) {
      return new Date(Math.max(...times)).toISOString()
    }
  }

  // Fallback: best-effort max LastModified from the first page under final/
  const listObjects = await client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: finalPrefix,
      MaxKeys: 1000,
    })
  )

  const max = (listObjects.Contents || []).reduce<Date | null>((acc, obj) => {
    const lm = obj.LastModified ?? null
    if (!lm) return acc
    if (!acc) return lm
    return lm > acc ? lm : acc
  }, null)

  return max ? max.toISOString() : undefined
}

// Create S3 client (credentials from environment)
export function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  })
}

// List version folders (e.g., version-1, version-2)
export async function listVersions(): Promise<S3Version[]> {
  const client = getS3Client()

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: S3_BASE_PREFIX,
    Delimiter: "/",
  })

  const response = await client.send(command)

  const baseVersions: S3Version[] = (response.CommonPrefixes || [])
    .map((prefix) => {
      const fullPath = prefix.Prefix || ""
      // Extract version name from path like "processed/ocr/version-1/"
      const name = fullPath.replace(S3_BASE_PREFIX, "").replace(/\/$/, "")
      return {
        name,
        path: fullPath,
      }
    })
    .filter((v) => v.name.startsWith("version-"))
    .sort((a, b) => {
      // Sort by version number
      const numA = parseInt(a.name.replace("version-", "")) || 0
      const numB = parseInt(b.name.replace("version-", "")) || 0
      return numA - numB
    })

  const versions = await Promise.all(
    baseVersions.map(async (v) => ({
      ...v,
      uploadedAt: await getVersionUploadedAt(client, v.name),
    }))
  )

  return versions
}

// List dataset folders within a version's final/ directory
// Handles two structures:
// 1. version/final/dataset-name/annotations.json (multiple datasets)
// 2. version/final/annotations.json (single dataset - treat final/ as the dataset)
export async function listDatasets(version: string): Promise<S3Dataset[]> {
  const client = getS3Client()

  // Always go to final/ directory
  const prefix = `${S3_BASE_PREFIX}${version}/final/`

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
    Delimiter: "/",
  })

  const response = await client.send(command)

  // Check if annotations.json exists directly in final/ (single dataset structure)
  const hasDirectAnnotations = (response.Contents || []).some(
    (obj) => obj.Key === `${prefix}annotations.json`
  )

  if (hasDirectAnnotations) {
    // Single dataset structure - treat final/ itself as the dataset
    return [
      {
        name: "default",
        path: prefix,
      },
    ]
  }

  // Multiple datasets structure - list subfolders
  const datasets: S3Dataset[] = (response.CommonPrefixes || [])
    .map((prefixObj) => {
      const fullPath = prefixObj.Prefix || ""
      // Extract dataset name from path like "processed/ocr/version-1/final/dataset 1/"
      const name = fullPath.replace(prefix, "").replace(/\/$/, "")
      return {
        name,
        path: fullPath,
      }
    })
    .filter((d) => d.name.length > 0 && d.name !== "images") // Exclude images folder
    .sort((a, b) => a.name.localeCompare(b.name))

  return datasets
}

// Fetch and parse annotations.json from a dataset
export async function getDatasetAnnotations(
  version: string,
  dataset: string
): Promise<COCOAnnotations> {
  const client = getS3Client()

  // Handle "default" dataset (when annotations.json is directly in final/)
  const key = dataset === "default"
    ? `${S3_BASE_PREFIX}${version}/final/annotations.json`
    : `${S3_BASE_PREFIX}${version}/final/${dataset}/annotations.json`

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new Error("Empty response from S3")
  }

  const bodyString = await response.Body.transformToString()
  const annotations: COCOAnnotations = JSON.parse(bodyString)

  return annotations
}

// Parse COCO annotations into stats
export function parseAnnotationStats(annotations: COCOAnnotations): DatasetStats {
  const categoryMap = new Map<number, { name: string; count: number }>()

  // Initialize categories
  for (const cat of annotations.categories) {
    categoryMap.set(cat.id, { name: cat.name, count: 0 })
  }

  // Count annotations per category
  for (const ann of annotations.annotations) {
    const cat = categoryMap.get(ann.category_id)
    if (cat) {
      cat.count++
    }
  }

  // Build category stats array
  const categories = Array.from(categoryMap.entries())
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count) // Sort by count descending

  // Calculate image resolution stats
  let imageResolutions: DatasetStats["imageResolutions"] | undefined
  if (annotations.images.length > 0) {
    const widths = annotations.images.map((img) => img.width)
    const heights = annotations.images.map((img) => img.height)
    imageResolutions = {
      min: { width: Math.min(...widths), height: Math.min(...heights) },
      max: { width: Math.max(...widths), height: Math.max(...heights) },
    }
  }

  return {
    imageCount: annotations.images.length,
    annotationCount: annotations.annotations.length,
    categories,
    averageAnnotationsPerImage:
      annotations.images.length > 0
        ? Math.round((annotations.annotations.length / annotations.images.length) * 10) / 10
        : 0,
    imageResolutions,
  }
}

// List images in a dataset
export async function listDatasetImages(
  version: string,
  dataset: string
): Promise<string[]> {
  const client = getS3Client()

  // Handle "default" dataset (when images/ is directly in final/)
  const prefix = dataset === "default"
    ? `${S3_BASE_PREFIX}${version}/final/images/`
    : `${S3_BASE_PREFIX}${version}/final/${dataset}/images/`

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
  })

  const response = await client.send(command)

  const images = (response.Contents || [])
    .map((obj) => obj.Key || "")
    .filter((key) => {
      const ext = key.toLowerCase()
      return ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png")
    })

  return images
}

// Get a single image as a buffer
export async function getImage(key: string): Promise<Buffer> {
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new Error("Empty response from S3")
  }

  const byteArray = await response.Body.transformToByteArray()
  return Buffer.from(byteArray)
}
