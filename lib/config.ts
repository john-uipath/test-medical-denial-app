// Simple configuration without complex imports
const API_BASE_URL = "https://medical-backend-api-demo.azurewebsites.net/api"

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000,
  },
  app: {
    name: "Medical Denial Processing",
    version: "1.0.0",
  },
} as const

// Simple debug function
export function debugConfig() {
  if (typeof window === "undefined") {
    console.log("=== Configuration Debug ===")
    console.log("API Base URL:", API_BASE_URL)
    console.log("========================")
  }
}
