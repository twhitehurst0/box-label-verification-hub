/**
 * Home Page
 *
 * Landing page with navigation to all available demos:
 * - /cosmos - 3D particle sphere gallery
 * - /button - Industrial animated buttons
 * - /vercel-button - 3D Vercel button configurator
 */

import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">
        Flovision Box Label Verification Hub
      </h1>
      <p className="text-lg text-gray-400 mb-12 text-center max-w-2xl">
        A collection of 3D interactive components and animated UI elements
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <Link
          href="/cosmos"
          className="group relative p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-orange-500/50 hover:bg-gray-900 transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-xl font-semibold mb-2 text-orange-400">Cosmos Gallery</h2>
          <p className="text-sm text-gray-400">
            3D particle sphere with video textures, holographic text, and orbiting rockets
          </p>
        </Link>

        <Link
          href="/button"
          className="group relative p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-orange-500/50 hover:bg-gray-900 transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-xl font-semibold mb-2 text-orange-400">Industrial Buttons</h2>
          <p className="text-sm text-gray-400">
            Animated toggle switch and Enter button with glass tube aesthetics
          </p>
        </Link>

        <Link
          href="/vercel-button"
          className="group relative p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-orange-500/50 hover:bg-gray-900 transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-xl font-semibold mb-2 text-orange-400">3D Button Editor</h2>
          <p className="text-sm text-gray-400">
            Configurable 3D Vercel button with real-time controls
          </p>
        </Link>
      </div>
    </div>
  )
}
