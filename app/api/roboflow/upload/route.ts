import { NextRequest, NextResponse } from "next/server"
import {
  getDatasetAnnotations,
  listDatasetImages,
  getImage,
} from "@/lib/s3"
import { uploadImage, cocoToYoloAnnotation } from "@/lib/roboflow"
import type { UploadRequest, UploadResponse } from "@/types/ocr"

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json()
    const { version, dataset, projectId } = body

    if (!version || !dataset || !projectId) {
      return NextResponse.json(
        { error: "Version, dataset, and projectId are required" },
        { status: 400 }
      )
    }

    // Fetch annotations from S3 (COCO JSON format)
    const annotations = await getDatasetAnnotations(version, dataset)

    // List all images in the dataset
    const imageKeys = await listDatasetImages(version, dataset)

    // Create a map of filename to image id
    const filenameToId = new Map(
      annotations.images.map((img) => [img.file_name, img.id])
    )

    let uploaded = 0
    let failed = 0
    const errors: string[] = []

    // Upload each image with its annotations
    for (const imageKey of imageKeys) {
      try {
        // Extract filename from key
        const filename = imageKey.split("/").pop() || ""
        const imageId = filenameToId.get(filename)

        if (imageId === undefined) {
          console.warn(`No annotation found for image: ${filename}`)
          failed++
          errors.push(`No annotation found for: ${filename}`)
          continue
        }

        // Get image buffer from S3
        const imageBuffer = await getImage(imageKey)

        // Convert COCO annotation to YOLO format (Roboflow REST API accepts this)
        const annotationData = cocoToYoloAnnotation(imageId, annotations)

        // Upload to Roboflow
        const result = await uploadImage(
          projectId,
          imageBuffer,
          filename,
          annotationData
        )

        if (result.success) {
          uploaded++
        } else {
          failed++
          if (result.error) {
            errors.push(`${filename}: ${result.error}`)
          }
        }
      } catch (err) {
        failed++
        const errorMsg = err instanceof Error ? err.message : "Unknown error"
        errors.push(`${imageKey}: ${errorMsg}`)
      }
    }

    const response: UploadResponse = {
      success: failed === 0,
      uploaded,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors returned
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error uploading to Roboflow:", error)
    return NextResponse.json(
      {
        success: false,
        uploaded: 0,
        failed: 0,
        error: error instanceof Error ? error.message : "Failed to upload dataset",
      },
      { status: 500 }
    )
  }
}
