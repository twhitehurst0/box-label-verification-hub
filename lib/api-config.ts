// API Configuration for Model Testing Backend
// In production, NEXT_PUBLIC_API_URL should point to your AWS App Runner endpoint
// e.g., https://<service-id>.us-east-1.awsapprunner.com

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
