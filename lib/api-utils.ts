import type { Denial, DenialDetail } from "@/types/api"

// Utility to normalize denial data from API response
export function normalizeDenial(rawDenial: any): Denial {
  // Map your API fields to the expected UI fields
  const validStatuses: Denial["status"][] = ["In Review", "Appeal Filed", "Denied", "Resolved"]

  // Map backend status values to UI status values
  let normalizedStatus: Denial["status"] = "In Review" // default fallback

  const backendStatus = rawDenial.status?.toString().trim()

  switch (backendStatus) {
    case "New":
      normalizedStatus = "In Review"
      break
    case "In Review":
      normalizedStatus = "In Review"
      break
    case "RCA Completed":
      normalizedStatus = "In Review" // RCA is analysis step, still under review
      break
    case "Appeal Generated":
      normalizedStatus = "Appeal Filed"
      break
    case "Appeal Filed":
      normalizedStatus = "Appeal Filed"
      break
    case "Denied":
      normalizedStatus = "Denied"
      break
    case "Resolved":
      normalizedStatus = "Resolved"
      break
    default:
      // For any unknown status, try to match against valid UI statuses
      if (validStatuses.includes(backendStatus as Denial["status"])) {
        normalizedStatus = backendStatus as Denial["status"]
      } else {
        console.warn(`Unknown backend status: "${backendStatus}", defaulting to "In Review"`)
        normalizedStatus = "In Review"
      }
  }

  return {
    id: rawDenial.id?.toString() || rawDenial.denialId || "",
    date: rawDenial.serviceDate || new Date().toISOString(),
    location: rawDenial.location || "Unknown Location",
    patientName: rawDenial.patientName || "Unknown Patient",
    patientId: rawDenial.id?.toString() || "", // Using id as patientId since no separate field
    claimNumber: rawDenial.claimId || "",
    insurancePayer: rawDenial.insurance || "Unknown Payer",
    denialReason: rawDenial.denialReason || "Reason not specified",
    claimAmount: rawDenial.amount || 0,
    status: normalizedStatus,
    priority: "medium", // Default since not provided by API
    createdAt: rawDenial.denialDate || new Date().toISOString(),
    updatedAt: rawDenial.denialDate || new Date().toISOString(),
    rcaStatus: backendStatus === "RCA Completed" ? "completed" : "pending",
  }
}

// Enhanced normalizeDenialDetail function
export function normalizeDenialDetail(rawDenial: any): DenialDetail {
  const baseDenial = normalizeDenial(rawDenial)

  // Parse appealResult - now it's a proper JSON object, not a string
  let appealResult = undefined
  if (rawDenial.appealResult) {
    try {
      // The appealResult field is now a proper JSON object
      appealResult = rawDenial.appealResult
    } catch (error) {
      console.warn("Failed to parse appealResult:", error)
    }
  }

  // Determine root cause based on backend status and rcaResult
  let rootCause = undefined
  const backendStatus = rawDenial.status?.toString().trim()

  if (backendStatus === "RCA Completed" && rawDenial.rcaResult?.analysis) {
    rootCause = rawDenial.rcaResult.analysis
  } else if (backendStatus === "RCA Completed") {
    rootCause = "Root cause analysis completed. Issues identified from extracted documentation data."
  }

  return {
    ...baseDenial,
    summary: rawDenial.notes || undefined,
    rootCause: rootCause,
    appealLetter: appealResult?.emailDraft || undefined,
    appealDeadline: rawDenial.appealDeadline || undefined,
    claimType: rawDenial.claimType || undefined,
    provider: rawDenial.provider || undefined,
    providerNPI: rawDenial.providerNPI || undefined,
    diagnosis: rawDenial.diagnosis || undefined,
    actionTaken: rawDenial.actionTaken || undefined,
    resolutionDate: rawDenial.resolutionDate || undefined,
    appealResult: appealResult, // Include the parsed appeal result
    // Store the raw rcaResult for use in the detail page
    rcaResult: rawDenial.rcaResult,
    ediDetails: {
      form837Data: {
        claimControlNumber: rawDenial.claimId,
        serviceDate: rawDenial.serviceDate,
        chargedAmount: rawDenial.amount,
        providerNPI: rawDenial.providerNPI,
        facilityNPI: rawDenial.providerNPI,
      },
      form835Data: {
        payerName: rawDenial.insurance,
        claimStatus: rawDenial.status,
        denialCodes: rawDenial.denialReason ? [rawDenial.denialReason] : [],
      },
    },
    documents: [], // Not provided by API yet
  }
}

// Utility to check if a field is available
export function isFieldAvailable(value: any): boolean {
  return value !== undefined && value !== null && value !== ""
}

// Utility to get display value with fallback
export function getDisplayValue(value: any, fallback = "Not available"): string {
  return isFieldAvailable(value) ? String(value) : fallback
}
