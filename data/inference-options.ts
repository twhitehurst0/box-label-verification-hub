import type { InferenceOption } from "@/types/inference"

export const inferenceOptions: InferenceOption[] = [
  {
    id: "model-testing",
    title: "Model Testing",
    description: "Test and evaluate machine learning models with real-time inference",
    image: "/Inference_testing/1.gif",
    route: "/inference/model-testing",
    accentColor: "#a855f7",
    imagePosition: "center 65%", // Crop from top to hide ML model text
    imageScale: 1.15,
  },
  {
    id: "reporting",
    title: "Reporting",
    description: "Generate comprehensive reports and analytics from model outputs",
    image: "/Inference_testing/2.gif",
    route: "/inference/reporting",
    accentColor: "#a855f7",
    imagePosition: "center center",
    imageScale: 0.85, // Scale down to fit better
  },
]
