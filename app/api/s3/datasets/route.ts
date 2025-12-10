import { NextRequest, NextResponse } from "next/server"
import { listDatasets } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const version = searchParams.get("version")

    if (!version) {
      return NextResponse.json(
        { error: "Version parameter is required" },
        { status: 400 }
      )
    }

    const datasets = await listDatasets(version)
    return NextResponse.json({ datasets })
  } catch (error) {
    console.error("Error listing S3 datasets:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list datasets" },
      { status: 500 }
    )
  }
}
