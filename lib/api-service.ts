import type { Denial, DenialDetail, DenialFilters, Document } from "@/types/api"
import { normalizeDenial, normalizeDenialDetail } from "./api-utils"

// Direct API base URL
const API_BASE_URL = "https://medical-backend-api-demo.azurewebsites.net/api"

console.log("🔧 API Service: Using backend URL:", API_BASE_URL)

class ApiService {
  private baseUrl: string = API_BASE_URL
  private uploadTimeout = 300000 // Keep timeout for uploads only (5 minutes)

  // Simple request method without timeout
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const requestConfig: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    }

    try {
      console.log("🔧 Making request:", url, "(no timeout - allowing long operations)")

      const response = await fetch(url, requestConfig)

      console.log("🔧 Response status:", response.status)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          // Use default error message
        }
        throw new Error(errorMessage)
      }

      // Handle response
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        console.log("🔧 Response data:", data)
        return data
      } else if (response.status === 204) {
        return {} as T
      } else {
        const text = await response.text()
        return text as unknown as T
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        throw new Error("Network Error: Unable to connect to backend API")
      }

      throw error
    }
  }

  // Upload method with timeout (uploads still need reasonable limits)
  private async uploadRequest<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            onProgress(progress)
          }
        })
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const contentType = xhr.getResponseHeader("content-type")
            if (contentType && contentType.includes("application/json")) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              resolve({ message: xhr.responseText } as T)
            }
          } catch {
            resolve({ message: xhr.responseText } as T)
          }
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Upload network error"))
      })

      xhr.addEventListener("timeout", () => {
        reject(new Error("Upload timeout"))
      })

      xhr.open("POST", url)
      xhr.timeout = this.uploadTimeout // Keep timeout for uploads
      xhr.send(formData)
    })
  }

  // API methods
  async getDenials(filters?: DenialFilters): Promise<Denial[]> {
    const queryParams = new URLSearchParams()

    if (filters) {
      if (filters.status?.length) {
        queryParams.append("status", filters.status.join(","))
      }
      if (filters.dateFrom) {
        queryParams.append("dateFrom", filters.dateFrom)
      }
      if (filters.dateTo) {
        queryParams.append("dateTo", filters.dateTo)
      }
      if (filters.location) {
        queryParams.append("location", filters.location)
      }
      if (filters.priority?.length) {
        queryParams.append("priority", filters.priority.join(","))
      }
    }

    const endpoint = `/Denials${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    const rawData = await this.request<any[]>(endpoint)
    return rawData.map(normalizeDenial)
  }

  async getDenialById(id: string): Promise<DenialDetail> {
    const rawData = await this.request<any>(`/Denials/${id}`)
    return normalizeDenialDetail(rawData)
  }

  async updateDenialStatus(id: string, status: Denial["status"]): Promise<void> {
    return this.request<void>(`/Denials/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }

  async getDocument(id: string): Promise<Blob> {
    const response = await this.request<Response>(`/documents/${id}`)
    return response as unknown as Blob
  }

  async uploadDocument(denialId: string, file: File, type: Document["type"]): Promise<Document> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)
    return this.uploadRequest<Document>(`/Denials/${denialId}/documents`, formData)
  }

  async triggerRCA(denialId: string): Promise<any> {
    console.log("🔧 Triggering RCA (no timeout - allowing long processing time)")

    try {
      // The RCA endpoint now returns the same structure as /Denials/id with rcaResult populated
      const response = await this.request<any>(`/Denials/${denialId}/rca`, {
        method: "POST",
      })

      console.log("✅ RCA API response received:", response)

      // Extract the rcaResult from the response
      if (response.rcaResult) {
        return response.rcaResult
      } else {
        throw new Error("RCA result not found in response")
      }
    } catch (error) {
      console.error("❌ RCA API call failed:", error)
      throw error
    }
  }

  async generateAppeal(denialId: string): Promise<any> {
    console.log("🔧 Generating appeal (no timeout - allowing long processing time)")

    try {
      const response = await this.request<any>(`/Denials/${denialId}/appeal`, {
        method: "POST",
      })

      console.log("✅ Appeal API response received:", response)
      return response
    } catch (error) {
      console.error("❌ Appeal generation API call failed:", error)
      throw error
    }
  }

  async uploadDenialFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<{ message: string; denialId?: string }> {
    const formData = new FormData()
    formData.append("file", file, file.name)
    return this.uploadRequest<{ message: string; denialId?: string }>("/Denials", formData, onProgress)
  }
}

// Create and export singleton
const apiService = new ApiService()

export { apiService }
export const {
  getDenials,
  getDenialById,
  updateDenialStatus,
  getDocument,
  uploadDocument,
  triggerRCA,
  generateAppeal,
  uploadDenialFile,
} = apiService
