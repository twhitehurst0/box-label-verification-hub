/**
 * Projects Page
 *
 * Full-screen project selector gallery with video cards for OCR and Detection projects.
 * Features drag, swipe, scroll wheel, and keyboard navigation.
 */

import { ProjectGallerySlider } from "@/components/project-selector/project-gallery-slider"

export default function ProjectsPage() {
  return (
    <div className="h-screen w-screen bg-black">
      <ProjectGallerySlider />
    </div>
  )
}
