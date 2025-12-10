import { NextResponse } from "next/server"
import { listProjects } from "@/lib/roboflow"

export async function GET() {
  try {
    const projects = await listProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error listing Roboflow projects:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list projects" },
      { status: 500 }
    )
  }
}
