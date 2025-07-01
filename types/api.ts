// API Interface Definitions for Backend Integration

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "reviewer" | "analyst"
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

// Core denial interface - simplified with single status
export interface Denial {
  id: string
  date: string // ISO date string
  location: string // Hospital/facility name
  patientName: string
  patientId: string
  claimNumber: string
  insurancePayer: string
  denialReason: string
  claimAmount: number
  status: "In Review" | "Appeal Filed" | "Denied" | "Resolved"
  priority: "low" | "medium" | "high" | "urgent"
  createdAt: string
  updatedAt: string
  // Keep rcaStatus for backend compatibility but don't show in main UI
  rcaStatus?: "pending" | "processing" | "completed" | "failed"
}

// Extended denial detail interface - most fields are optional
export interface DenialDetail extends Denial {
  summary?: string // Maps to 'notes' field from API
  rootCause?: string // Generated based on status
  appealLetter?: string // Auto-generated appeal letter
  appealDeadline?: string // Direct from API
  claimType?: string // Direct from API
  provider?: string // Direct from API
  providerNPI?: string // Direct from API
  diagnosis?: string // Direct from API
  actionTaken?: string // Direct from API
  resolutionDate?: string // Direct from API
  appealResult?: AppealResult // Pre-existing appeal result from API
  rcaResult?: RCAApiResult // Raw RCA result from API
  ediDetails?: {
    form837Data?: Form837Data
    form835Data?: Form835Data
  }
  documents?: Document[]
}

// Update Form837Data to include more fields
export interface Form837Data {
  submitterName?: string
  submitterEIN?: string
  receiverName?: string
  claimControlNumber?: string // Maps to claimId
  patientControlNumber?: string
  serviceDate?: string // Direct from API
  diagnosisCodes?: string[]
  procedureCodes?: string[]
  chargedAmount?: number // Maps to amount
  providerNPI?: string // Direct from API
  facilityNPI?: string
}

// Update Form835Data to include more fields
export interface Form835Data {
  payerName?: string // Maps to insurance
  payerIdentifier?: string
  paymentDate?: string
  claimPaymentAmount?: number
  claimStatus?: string // Maps to status
  adjustmentReasonCodes?: string[]
  remarkCodes?: string[]
  denialCodes?: string[] // Maps to denialReason
}

export interface Document {
  id: string
  name: string
  type: "denial_letter" | "doctor_notes" | "medical_records" | "prior_auth" | "other"
  url: string
  uploadedAt: string
  size: number // in bytes
}

// Upload response interface
export interface UploadDenialResponse {
  message: string
  denialId?: string
  processingStatus?: "queued" | "processing" | "completed" | "failed"
}

// API Endpoints Interface - Remove auth endpoints since login is hardcoded
export interface ApiEndpoints {
  // Denials
  getDenials: (filters?: DenialFilters) => Promise<Denial[]>
  getDenialById: (id: string) => Promise<DenialDetail>
  updateDenialStatus: (id: string, status: Denial["status"]) => Promise<void>
  uploadDenialFile: (file: File) => Promise<UploadDenialResponse>

  // Documents
  getDocument: (id: string) => Promise<Blob>
  uploadDocument: (denialId: string, file: File, type: Document["type"]) => Promise<Document>

  // RCA & Appeals
  triggerRCA: (denialId: string) => Promise<void>
  generateAppeal: (denialId: string) => Promise<string>
}

export interface DenialFilters {
  status?: Denial["status"][]
  dateFrom?: string
  dateTo?: string
  location?: string
  priority?: Denial["priority"][]
}

// Add API Error types
export interface ApiError {
  message: string
  code: string
  status: number
}

// Add pagination support
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// Helper function to safely access nested properties
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  return path.split(".").reduce((current, key) => current?.[key], obj) ?? defaultValue
}

// Appeal result interface
export interface AppealResult {
  appealStatus: string
  emailDraft: string
  supportDocumentLinks: string[]
  missingInformation: string[]
  generatedAt: string
  jobId: number
}

// RCA API result interface - matches the backend structure
export interface RCAApiResult {
  recommendations: string
  analysis: string
  ediFileAnalysis: string
  denialSource: {
    document: string
    segment: string
    fieldName: string
    value: string
  }
  contentAnalysis: string
  analysisCompletedAt: string
  jobId: number
  status: string
}
