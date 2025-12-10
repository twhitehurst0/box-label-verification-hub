"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

/**
 * Test page to verify navigation works
 * Visit /test-nav to test different navigation methods
 */
export default function TestNavPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Navigation Test Page</h1>

      <div className="space-y-6">
        {/* Test 1: Basic Link */}
        <div className="p-4 border border-white/20 rounded-lg">
          <h2 className="text-xl mb-2">Test 1: Basic Next.js Link</h2>
          <Link
            href="/ocr"
            className="inline-block px-6 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400"
          >
            Go to OCR Page (Link)
          </Link>
        </div>

        {/* Test 2: Button with router.push */}
        <div className="p-4 border border-white/20 rounded-lg">
          <h2 className="text-xl mb-2">Test 2: Button with router.push</h2>
          <button
            onClick={() => router.push("/ocr")}
            className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400"
          >
            Go to OCR Page (router.push)
          </button>
        </div>

        {/* Test 3: Button with window.location */}
        <div className="p-4 border border-white/20 rounded-lg">
          <h2 className="text-xl mb-2">Test 3: Button with window.location</h2>
          <button
            onClick={() => { window.location.href = "/ocr" }}
            className="px-6 py-3 bg-orange-500 text-black rounded-lg hover:bg-orange-400"
          >
            Go to OCR Page (window.location)
          </button>
        </div>

        {/* Test 4: Native anchor tag */}
        <div className="p-4 border border-white/20 rounded-lg">
          <h2 className="text-xl mb-2">Test 4: Native anchor tag</h2>
          <a
            href="/ocr"
            className="inline-block px-6 py-3 bg-purple-500 text-black rounded-lg hover:bg-purple-400"
          >
            Go to OCR Page (anchor tag)
          </a>
        </div>

        {/* Test 5: Link with nested content */}
        <div className="p-4 border border-white/20 rounded-lg">
          <h2 className="text-xl mb-2">Test 5: Link with nested divs</h2>
          <Link
            href="/ocr"
            className="inline-block relative"
          >
            <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
            <div className="relative px-6 py-3 bg-red-500 text-black rounded-lg hover:bg-red-400">
              Go to OCR Page (nested divs with pointer-events-none)
            </div>
          </Link>
        </div>

        {/* Back to projects link */}
        <div className="pt-8">
          <Link href="/projects" className="text-cyan-400 underline">
            ← Back to Projects
          </Link>
        </div>
      </div>
    </div>
  )
}
