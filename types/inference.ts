export interface InferenceOption {
  id: string
  title: string
  description: string
  image: string
  route: string
  accentColor: string
  imagePosition?: string // CSS object-position (e.g., "center 30%" to crop top)
  imageScale?: number // Scale factor for the image (e.g., 1.2 to zoom in)
  comingSoon?: boolean // Show "Soon" badge on ENTER button
}
