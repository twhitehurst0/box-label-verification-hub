# CLAUDE.md

Development guidelines for Claude Code when working with this repository.

## Project Overview

Unified Next.js application for Flovision Box Label Verification featuring 3D interactive components (React Three Fiber) and 2D animations (Framer Motion).

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # Run ESLint
```

## Routes

| Route | Components Used |
|-------|-----------------|
| `/` | Landing page with navigation |
| `/cosmos` | ParticleSphere, HolographicText, EnterButtonIndustrial, RocketOrbit3D |
| `/button` | AnimatedButton, EnterButton |
| `/vercel-button` | Vercel3DButton |

## Component Reference

### Cosmos Components (`components/cosmos/`)

| Component | Purpose |
|-----------|---------|
| `particle-sphere.tsx` | 1500 particles + 24 orbiting video planes |
| `holographic-text.tsx` | Chromatic aberration text with parallax |
| `enter-button-industrial.tsx` | Floating industrial button (Framer Motion) |
| `enter-button-3d.tsx` | Cosmic 3D button with color cycling |
| `rocket-orbit-3d.tsx` | 6 rockets on elliptical orbits |

### Button Components (`components/button/`)

| Component | Purpose |
|-----------|---------|
| `animated-button.tsx` | Industrial toggle switch with filaments |
| `enter-button.tsx` | Industrial Enter button (full-screen) |

### Vercel Button (`components/vercel-button/`)

| Component | Purpose |
|-----------|---------|
| `vercel-3d-button.tsx` | 3D button editor with control panel |

## Tech Stack

- **Framework**: Next.js 15.1, React 19, TypeScript
- **3D**: @react-three/fiber, @react-three/drei, three
- **Animation**: framer-motion
- **Styling**: Tailwind CSS v4, shadcn/ui (new-york style)

## Code Patterns

### Video Textures (ParticleSphere)

```tsx
const videoTextures = useMemo(() => {
  videoFiles.forEach((videoFile) => {
    const video = document.createElement("video")
    video.src = videoFile
    video.autoplay = true
    video.muted = true
    video.loop = true
    const texture = new THREE.VideoTexture(video)
    textures.push(texture)
  })
  return textures
}, [])
```

### 3D Animation (useFrame)

```tsx
useFrame((state, delta) => {
  const lerpSpeed = 12 * delta
  current.current = THREE.MathUtils.lerp(current.current, target.current, lerpSpeed)
  meshRef.current.position.y = current.current
})
```

### Framer Motion Animation

```tsx
<motion.div
  animate={{
    y: isHovered ? 0 : [0, -8, 0],
    scale: isPressed ? 0.96 : 1,
  }}
  transition={{
    y: { duration: 3, ease: "easeInOut", repeat: Infinity },
  }}
/>
```

## File Locations

- **Videos**: `/public/videos/vid1.mp4` - `/public/videos/vid10.mp4`
- **Fonts**: `/public/fonts/Inter_Bold.json` (Three.js typeface)
- **UI Components**: `/components/ui/` (shadcn/ui)
- **Utilities**: `/lib/utils.ts`

## Color Theme

Industrial button accent: `#ff8800` (orange)

## Best Practices

1. Use `"use client"` for R3F and Framer Motion components
2. Memoize Three.js geometries with `useMemo`
3. Use refs for direct mesh manipulation
4. Handle SSR with `mounted` state for Canvas
5. Keep video textures in `/public/videos/`
