# Flovision Box Label Verification Hub

A unified Next.js application featuring 3D interactive components, animated UI elements, and ML data pipeline tools for box label verification.

## Features

### Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with navigation to all demos |
| `/projects` | Project selector gallery with liquid glass cards |
| `/ocr` | Dataset Uploader - S3 to Roboflow integration |
| `/inference/model-testing` | Model inference testing (placeholder) |
| `/inference/reporting` | Test reporting dashboard (placeholder) |
| `/cosmos` | 3D particle sphere gallery with video textures, holographic text, and orbiting rockets |
| `/button` | Industrial-style animated toggle and enter buttons |
| `/vercel-button` | 3D Vercel button configurator with real-time controls |

### Components

#### Project Selector (`/projects`)
- **ProjectGallerySlider**: Horizontal slider with draggable project cards
- **ProjectCard**: Liquid glass cards with video backgrounds and hover effects

#### Dataset Uploader (`/ocr`)
- **CvatUploader**: Main container with S3/Roboflow integration
- **LiquidGlassNavbar**: Centered navigation with animated divider and Inference Testing dropdown
- **VersionSelector**: S3 version dropdown with glass styling
- **DatasetPreview**: COCO annotation stats display (image count, categories, annotations)
- **RoboflowProjectSelector**: Searchable project dropdown
- **UploadButton**: Animated upload with progress states

#### Cosmos Gallery (`/cosmos`)
- **ParticleSphere**: 1500+ animated particles with 24 orbiting video texture planes
- **HolographicText**: Chromatic aberration text effect with parallax and glitch animations
- **EnterButtonIndustrial**: Floating industrial button with glass tube aesthetics
- **RocketOrbit3D**: 6 rockets on elliptical orbits with thruster flames

#### Industrial Buttons (`/button`)
- **AnimatedButton**: Toggle switch with steel mechanism, glass tube, and filament animations
- **EnterButton**: Press-action button with same industrial aesthetic

#### 3D Button Editor (`/vercel-button`)
- **Vercel3DButton**: Configurable 3D button with:
  - Position, rotation, and scale controls
  - Camera controls (orbit mode, FOV)
  - Light source positioning
  - JSON configuration export

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 15.1, React 19, TypeScript |
| 3D Rendering | @react-three/fiber, @react-three/drei, Three.js |
| Animation | Framer Motion |
| Styling | Tailwind CSS v4, shadcn/ui |
| Analytics | Vercel Analytics |

## Project Structure

```
flovision-box-label-verification-hub/
├── app/
│   ├── layout.tsx           # Root layout with fonts and analytics
│   ├── page.tsx             # Landing page
│   ├── globals.css          # Global styles and CSS variables
│   ├── projects/
│   │   └── page.tsx         # Project selector gallery
│   ├── ocr/
│   │   └── page.tsx         # Dataset uploader with navbar
│   ├── inference/
│   │   ├── model-testing/
│   │   │   └── page.tsx     # Model testing (placeholder)
│   │   └── reporting/
│   │       └── page.tsx     # Reporting dashboard (placeholder)
│   ├── api/
│   │   ├── s3/              # S3 API routes (versions, datasets, dataset-info)
│   │   └── roboflow/        # Roboflow API routes (projects, upload)
│   ├── cosmos/
│   │   └── page.tsx         # 3D particle sphere gallery
│   ├── button/
│   │   └── page.tsx         # Industrial buttons demo
│   └── vercel-button/
│       └── page.tsx         # 3D button editor
├── components/
│   ├── ocr/                 # Dataset uploader components
│   │   ├── cvat-uploader.tsx
│   │   ├── version-selector.tsx
│   │   ├── dataset-preview.tsx
│   │   ├── roboflow-project-selector.tsx
│   │   └── upload-button.tsx
│   ├── project-selector/    # Project gallery components
│   │   ├── project-card.tsx
│   │   └── project-gallery-slider.tsx
│   ├── cosmos/              # 3D gallery components
│   │   ├── particle-sphere.tsx
│   │   ├── holographic-text.tsx
│   │   ├── enter-button-industrial.tsx
│   │   ├── enter-button-3d.tsx
│   │   └── rocket-orbit-3d.tsx
│   ├── button/              # 2D animated buttons
│   │   ├── animated-button.tsx
│   │   └── enter-button.tsx
│   ├── vercel-button/       # 3D button editor
│   │   └── vercel-3d-button.tsx
│   └── ui/                  # shadcn/ui components
├── public/
│   ├── fonts/               # Three.js typeface JSON
│   └── videos/              # Video textures (vid1-vid11.mp4)
├── lib/
│   ├── utils.ts             # Utility functions
│   ├── s3.ts                # AWS S3 client utilities
│   └── roboflow.ts          # Roboflow API wrapper
├── types/
│   └── ocr.ts               # OCR type definitions
├── data/
│   └── projects.ts          # Project definitions
└── hooks/                   # Custom React hooks
```

## Requirements

- Node.js 18+
- pnpm (recommended) or npm
- Modern browser with WebGL support

## Development

```bash
# Run on specific port
pnpm dev --port 3007

# Lint code
pnpm lint

# Type check
npx tsc --noEmit
```

## Environment Variables

Create a `.env.local` file with the following variables for S3 and Roboflow integration:

```env
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
S3_BUCKET=box-label-processing-central
ROBOFLOW_API_KEY=xxx
ROBOFLOW_WORKSPACE=your-workspace-url
```

## License

Private - All rights reserved.
