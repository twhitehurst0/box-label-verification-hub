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
- `/projects` - Project selector gallery with liquid glass UI
- `/ocr` - Dataset Uploader with S3 to Roboflow integration
- `/inference/model-testing` - Model testing page (placeholder)
- `/inference/reporting` - Reporting dashboard (placeholder)
- `/cosmos` - 3D particle sphere gallery with video textures
- `/button` - Industrial-style 2D animated buttons
- `/vercel-button` - 3D button configurator with controls

### Component Organization

- `components/ocr/` - Dataset uploader components (CvatUploader, VersionSelector, DatasetPreview, etc.)
- `components/project-selector/` - Project gallery (ProjectCard, ProjectGallerySlider)
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

### Liquid Glass Styling
```tsx
style={{
  background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
  backdropFilter: "blur(40px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.12)",
}}
```

### Gradient Text with Shimmer
```tsx
style={{
  backgroundImage: `linear-gradient(135deg, #fff 0%, ${accentColor} 50%, #fff 100%)`,
  backgroundSize: "200% 200%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  animation: "shimmer 4s ease-in-out infinite",
}}
```

## Assets

- Videos: `/public/videos/vid1.mp4` - `/public/videos/vid10.mp4`
- Fonts: `/public/fonts/Inter_Bold.json` (Three.js typeface)

## Styling

- Tailwind CSS v4 with `@/*` path alias
- Industrial theme accent: `#ff8800`
- OCR/Dataset Uploader accent: `#00d4ff`
- Inference Testing accent: `#a855f7`
