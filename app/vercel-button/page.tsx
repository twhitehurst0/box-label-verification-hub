/**
 * 3D Vercel Button Editor Page
 *
 * Interactive 3D button configurator with real-time controls:
 * - Adjustable button position, rotation, and scale
 * - Camera controls (position, FOV, orbit mode)
 * - Light source positioning and intensity
 * - Logo and text placement
 * - Configuration export to JSON
 *
 * @route /vercel-button
 */

import Vercel3DButton from "@/components/vercel-button/vercel-3d-button"

export default function VercelButtonPage() {
  return <Vercel3DButton />
}
