import { NextResponse } from "next/server"
import { listVersions } from "@/lib/s3"

export async function GET() {
  try {
    const versions = await listVersions()
    return NextResponse.json({ versions })
  } catch (error) {
    console.error("Error listing S3 versions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list versions" },
      { status: 500 }
    )
  }
}
