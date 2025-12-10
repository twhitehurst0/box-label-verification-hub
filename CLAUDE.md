# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm dev --port 3007  # Run on specific port
pnpm build            # Production build
pnpm lint             # Run ESLint
npx tsc --noEmit      # Type check
```

## Architecture

Next.js 15.1 app with React 19 featuring 3D components (React Three Fiber) and 2D animations (Framer Motion).

### Routes

- `/` - Landing page with navigation
- `/cosmos` - 3D particle sphere gallery with video textures
- `/button` - Industrial-style 2D animated buttons
- `/vercel-button` - 3D button configurator with controls

### Component Organization

- `components/cosmos/` - 3D gallery components (ParticleSphere, HolographicText, RocketOrbit3D)
- `components/button/` - 2D animated button components
- `components/vercel-button/` - 3D button editor
- `components/ui/` - shadcn/ui primitives (new-york style)

## Key Patterns

### Client Components
All R3F and Framer Motion components must use `"use client"` directive.

### Three.js Video Textures
```tsx
const videoTextures = useMemo(() => {
  const video = document.createElement("video")
  video.src = videoFile
  video.autoplay = true
  video.muted = true
  video.loop = true
  return new THREE.VideoTexture(video)
}, [])
```

### R3F Animation Loop
```tsx
useFrame((state, delta) => {
  meshRef.current.rotation.y += delta * 0.5
})
```

### SSR Handling
Use `mounted` state to prevent Canvas hydration issues:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
```

## Assets

- Videos: `/public/videos/vid1.mp4` - `/public/videos/vid10.mp4`
- Fonts: `/public/fonts/Inter_Bold.json` (Three.js typeface)

## Styling

- Tailwind CSS v4 with `@/*` path alias
- Industrial theme accent: `#ff8800`
