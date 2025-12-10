import { NextRequest, NextResponse } from "next/server"
import { getDatasetAnnotations, parseAnnotationStats } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const version = searchParams.get("version")
    const dataset = searchParams.get("dataset")

    if (!version || !dataset) {
      return NextResponse.json(
        { error: "Version and dataset parameters are required" },
        { status: 400 }
      )
    }

    const annotations = await getDatasetAnnotations(version, dataset)
    const stats = parseAnnotationStats(annotations)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching dataset info:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dataset info" },
      { status: 500 }
    )
  }
}
