import type { RoboflowProject, RoboflowWorkspace } from "@/types/ocr"

const ROBOFLOW_API_BASE = "https://api.roboflow.com"

function getApiKey(): string {
  const apiKey = process.env.ROBOFLOW_API_KEY
  if (!apiKey) {
    throw new Error("ROBOFLOW_API_KEY environment variable is not set")
  }
  return apiKey
}

function getWorkspace(): string {
  const workspace = process.env.ROBOFLOW_WORKSPACE
  if (!workspace) {
    throw new Error("ROBOFLOW_WORKSPACE environment variable is not set")
  }
  return workspace
}

// Fetch all projects in the workspace
export async function listProjects(): Promise<RoboflowProject[]> {
  const apiKey = getApiKey()
  const workspace = getWorkspace()

  const response = await fetch(
    `${ROBOFLOW_API_BASE}/${workspace}?api_key=${apiKey}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Roboflow API error: ${response.status} - ${errorText}`)
  }

  const data: { workspace: RoboflowWorkspace } = await response.json()

  // Map to simplified project structure
  const projects: RoboflowProject[] = data.workspace.projects.map((proj) => ({
    id: proj.id,
    name: proj.name,
    type: proj.type,
    images: proj.images,
    classes: proj.classes,
    created: proj.created,
    updated: proj.updated,
  }))

  // Sort by name
  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

// Upload a single image with its annotation to a Roboflow project
export async function uploadImage(
  projectId: string,
  imageBuffer: Buffer,
  imageName: string,
  annotationJson: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = getApiKey()

  // Extract project name from full ID (e.g., "workspace/project-name" -> "project-name")
  const projectName = projectId.includes("/")
    ? projectId.split("/")[1]
    : projectId

  // Convert image to base64
  const base64Image = imageBuffer.toString("base64")

  // Upload image first
  const uploadUrl = `${ROBOFLOW_API_BASE}/dataset/${projectName}/upload?api_key=${apiKey}&name=${encodeURIComponent(imageName)}`

  const imageResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: base64Image,
  })

  if (!imageResponse.ok) {
    const errorText = await imageResponse.text()
    return { success: false, error: `Image upload failed: ${errorText}` }
  }

  const imageData = await imageResponse.json()
  const imageId = imageData.id

  if (!imageId) {
    return { success: false, error: "No image ID returned from upload" }
  }

  // Upload annotation for the image
  const annotationUrl = `${ROBOFLOW_API_BASE}/dataset/${projectName}/annotate/${imageId}?api_key=${apiKey}`

  const annotationResponse = await fetch(annotationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: annotationJson,
  })

  if (!annotationResponse.ok) {
    const errorText = await annotationResponse.text()
    return {
      success: false,
      id: imageId,
      error: `Annotation upload failed: ${errorText}`,
    }
  }

  return { success: true, id: imageId }
}

// Convert COCO format annotation for a single image to Roboflow format
export function cocoToRoboflowAnnotation(
  imageId: number,
  cocoAnnotations: {
    annotations: Array<{
      id: number
      image_id: number
      category_id: number
      bbox: [number, number, number, number]
    }>
    categories: Array<{ id: number; name: string }>
    images: Array<{ id: number; width: number; height: number }>
  }
): string {
  const image = cocoAnnotations.images.find((img) => img.id === imageId)
  if (!image) {
    throw new Error(`Image with id ${imageId} not found`)
  }

  const imageAnnotations = cocoAnnotations.annotations.filter(
    (ann) => ann.image_id === imageId
  )

  const categoryMap = new Map(
    cocoAnnotations.categories.map((cat) => [cat.id, cat.name])
  )

  // Convert to Roboflow annotation format
  const roboflowAnnotations = imageAnnotations.map((ann) => {
    const [x, y, width, height] = ann.bbox
    const className = categoryMap.get(ann.category_id) || "unknown"

    return {
      x: x + width / 2, // Convert to center x
      y: y + height / 2, // Convert to center y
      width,
      height,
      class: className,
    }
  })

  return JSON.stringify({
    image: {
      width: image.width,
      height: image.height,
    },
    annotations: roboflowAnnotations,
  })
}
