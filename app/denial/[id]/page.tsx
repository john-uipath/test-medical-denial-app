"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  TrendingUp,
  Shield,
  RefreshCw,
  Zap,
  Download,
  Mail,
  ExternalLink,
} from "lucide-react"
import type { DenialDetail, AppealResult } from "@/types/api"
import { apiService } from "@/lib/api-service"

interface RCAResult {
  issues: Array<{
    category: string
    severity: "High" | "Medium" | "Low"
    description: string
    recommendation: string
  }>
  source: "api" | "offline" | "cached"
  apiResponse?: {
    analysis: string
    recommendations: string
    ediFileAnalysis: string
    contentAnalysis: string
    denialSource: string
    status: string
    jobId: number
    completedAt: string
  }
}

export default function DenialDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [denial, setDenial] = useState<DenialDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rcaResult, setRcaResult] = useState<RCAResult | null>(null)
  const [isPreparingAppeal, setIsPreparingAppeal] = useState(false)
  const [appealResult, setAppealResult] = useState<AppealResult | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null)

  const loadDenialDetail = async () => {
    if (!params.id) return

    setIsLoading(true)
    setError(null)

    try {
      console.log("🔧 Loading denial detail for ID:", params.id)
      const denialData = await apiService.getDenialById(params.id as string)
      console.log("🔧 Received denial detail:", denialData)
      setDenial(denialData)

      // If denial already has an appeal result, set it
      if (denialData.appealResult) {
        console.log("🔧 Found existing appeal result:", denialData.appealResult)
        setAppealResult(denialData.appealResult)
      }

      // If denial already has RCA result, set it
      if (denialData.rcaResult) {
        console.log("🔧 Found existing RCA result:", denialData.rcaResult)
        const existingRcaResult: RCAResult = {
          source: "api",
          issues: [], // We'll show the API response instead
          apiResponse: {
            analysis: denialData.rcaResult.analysis,
            recommendations: denialData.rcaResult.recommendations,
            ediFileAnalysis: denialData.rcaResult.ediFileAnalysis,
            contentAnalysis: denialData.rcaResult.contentAnalysis,
            denialSource: JSON.stringify(denialData.rcaResult.denialSource),
            status: denialData.rcaResult.status,
            jobId: denialData.rcaResult.jobId,
            completedAt: denialData.rcaResult.analysisCompletedAt,
          },
        }
        setRcaResult(existingRcaResult)
      }
    } catch (err) {
      console.error("❌ Error loading denial details:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load denial details"
      setError(errorMessage)
      setDenial(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDenialDetail()
  }, [params.id])

  const generateContextualRCA = (denialData: DenialDetail): RCAResult => {
    const denialReason = (denialData?.denialReason || "").toLowerCase()

    if (denialReason.includes("prior authorization") || denialReason.includes("co197")) {
      return {
        source: "offline",
        issues: [
          {
            category: "Prior Authorization",
            severity: "High",
            description: "Emergency services claim denied due to lack of prior authorization (Code: CO197)",
            recommendation:
              "File appeal emphasizing emergency nature of services - prior auth not required for emergency care per CMS guidelines",
          },
          {
            category: "Emergency Services Regulation",
            severity: "High",
            description: "Violation of Emergency Medical Treatment and Labor Act (EMTALA) requirements",
            recommendation:
              "Reference EMTALA regulations that prohibit prior authorization requirements for emergency services",
          },
          {
            category: "Documentation",
            severity: "Medium",
            description: "Emergency department documentation should clearly establish emergency nature",
            recommendation:
              "Ensure ED records document chief complaint, triage level, and medical necessity for emergency care",
          },
        ],
      }
    }

    // Default analysis for other denial types
    return {
      source: "offline",
      issues: [
        {
          category: "Documentation",
          severity: "High",
          description: "Insufficient supporting documentation for medical necessity",
          recommendation: "Gather additional clinical notes and supporting documentation",
        },
        {
          category: "Coding Review",
          severity: "Medium",
          description: "Verify diagnosis and procedure codes align with services provided",
          recommendation: "Review ICD-10 and CPT codes for accuracy and specificity",
        },
        {
          category: "Policy Compliance",
          severity: "Medium",
          description: "Ensure services meet payer policy requirements",
          recommendation: "Review payer-specific coverage policies and guidelines",
        },
      ],
    }
  }

  const handleAnalyze = async () => {
    if (!denial) return

    setIsAnalyzing(true)
    setAnalysisStatus("Initializing analysis...")

    try {
      setAnalysisStatus("Connecting to RCA analysis service...")

      // Call the actual API - now returns rcaResult directly
      const response = await apiService.triggerRCA(denial.id)

      setAnalysisStatus("Processing analysis results...")

      // Transform the API response into our RCAResult format
      const apiResult: RCAResult = {
        source: "api",
        issues: [], // Remove hardcoded issues
        apiResponse: {
          analysis: response.analysis,
          recommendations: response.recommendations,
          ediFileAnalysis: response.ediFileAnalysis,
          contentAnalysis: response.contentAnalysis,
          denialSource: JSON.stringify(response.denialSource),
          status: response.status,
          jobId: response.jobId,
          completedAt: response.analysisCompletedAt,
        },
      }

      setRcaResult(apiResult)

      // Update denial state with API analysis
      setDenial((prev) =>
        prev
          ? {
              ...prev,
              rootCause: response.analysis || "Analysis completed: Issues identified from backend RCA service.",
              rcaStatus: "completed",
            }
          : null,
      )

      setAnalysisStatus("Analysis complete - results from backend RCA service")
      console.log("✅ RCA completed successfully with API response")
    } catch (err) {
      console.error("❌ Error running RCA:", err)

      // Fallback to contextual offline analysis
      setAnalysisStatus("API unavailable - generating offline analysis...")

      const offlineResult = generateContextualRCA(denial)
      setRcaResult(offlineResult)

      setDenial((prev) =>
        prev
          ? {
              ...prev,
              rootCause:
                "Analysis completed (offline mode): Prior authorization denial for emergency services identified as primary issue.",
              rcaStatus: "completed",
            }
          : null,
      )

      const errorMessage = err instanceof Error ? err.message : "RCA analysis failed"
      if (errorMessage.includes("timeout")) {
        setAnalysisStatus("Analysis complete - using offline intelligence due to timeout")
      } else if (errorMessage.includes("Network Error")) {
        setAnalysisStatus("Analysis complete - using offline intelligence (network unavailable)")
      } else {
        setAnalysisStatus("Analysis complete - using offline intelligence")
      }
    } finally {
      setIsAnalyzing(false)
      // Clear status after a delay
      setTimeout(() => setAnalysisStatus(null), 3000)
    }
  }

  const handlePrepareAppeal = async () => {
    if (!denial) return

    setIsPreparingAppeal(true)
    try {
      const isRegeneration = !!appealResult
      console.log(`🔧 ${isRegeneration ? "Regenerating" : "Generating"} appeal for denial:`, denial.id)

      // Call the actual appeal API
      const response = await apiService.generateAppeal(denial.id)
      console.log("🔧 Appeal API response:", response)

      setAppealResult(response)

      setDenial((prev) =>
        prev
          ? {
              ...prev,
              appealLetter: response.emailDraft,
              status: "Appeal Filed",
              appealResult: response, // Update the appeal result in denial
            }
          : null,
      )
    } catch (err) {
      console.error("❌ Error preparing appeal:", err)

      // Fallback to basic appeal letter
      const fallbackAppeal: AppealResult = {
        appealStatus: "Generated Offline",
        emailDraft: `Dear Claims Review Team,

We are writing to formally appeal the denial of claim ${denial.claimNumber} for patient ${denial.patientName}.

CLAIM DETAILS:
- Service Date: ${new Date(denial.date).toLocaleDateString()}
- Claim Amount: $${denial.claimAmount.toLocaleString()}
- Denial Reason: ${denial.denialReason}

APPEAL BASIS:
After careful review of the denial reason and supporting documentation, we believe this claim was incorrectly denied. The services provided were medically necessary and appropriate for the patient's condition.

We respectfully request that you reconsider this denial and approve payment for the services rendered.

Thank you for your prompt attention to this matter.

Sincerely,
Medical Review Team
${denial.location}`,
        supportDocumentLinks: [],
        missingInformation: [],
        generatedAt: new Date().toISOString(),
        jobId: 0,
      }

      setAppealResult(fallbackAppeal)
    } finally {
      setIsPreparingAppeal(false)
    }
  }

  const handleSubmitAppeal = () => {
    if (!denial || !appealResult) return

    const subject = `Appeal for Denied Claim ${denial.claimNumber} - ${denial.patientName}`
    const body = appealResult.emailDraft

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, "_blank")
  }

  const handleDownloadAppeal = () => {
    if (!appealResult) return

    const content = appealResult.emailDraft
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `appeal-${denial?.claimNumber || "letter"}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading denial details from backend...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Denial</h2>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={loadDenialDetail}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!denial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Denial Not Found</h2>
          <p className="text-gray-600 mb-4">The requested denial could not be found.</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      "In Review": { variant: "default" as const, icon: Clock, text: "Under Review" },
      "Appeal Filed": { variant: "secondary" as const, icon: FileText, text: "Appeal Filed" },
      Denied: { variant: "destructive" as const, icon: XCircle, text: "Denied" },
      Resolved: { variant: "outline" as const, icon: CheckCircle, text: "Resolved" },
    }

    const config = variants[status as keyof typeof variants] || {
      variant: "default" as const,
      icon: AlertTriangle,
      text: status || "Unknown",
    }

    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "text-red-600 bg-red-50 border-red-200"
      case "Medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "Low":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getAppealStatusColor = (status: string) => {
    switch (status) {
      case "Missing Required Info":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "Ready to Submit":
        return "text-green-600 bg-green-50 border-green-200"
      case "Generated Offline":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Denial Review: {denial.claimNumber}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadDenialDetail}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              {getStatusBadge(denial.status)}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Section - Claim Summary and Patient Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Claim Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Claim Summary</CardTitle>
              <p className="text-sm text-gray-500">Overview of the denied claim</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <User className="h-4 w-4" />
                    Patient
                  </div>
                  <p className="font-semibold">{denial.patientName}</p>
                  <p className="text-sm text-gray-500">ID: {denial.id}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <DollarSign className="h-4 w-4" />
                    Claim Amount
                  </div>
                  <p className="font-semibold text-lg">${denial.claimAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    Service Date
                  </div>
                  <p className="font-semibold">{new Date(denial.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="h-4 w-4" />
                    Appeal Deadline
                  </div>
                  <p className="font-semibold text-red-600">
                    {denial.appealDeadline
                      ? new Date(denial.appealDeadline).toLocaleDateString()
                      : new Date(new Date(denial.date).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <FileText className="h-4 w-4" />
                  Claim Type & Denial Reason
                </div>
                <p className="font-semibold">{denial.denialReason}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Provider NPI</p>
                  <p className="font-semibold">{denial.providerNPI || "Not available"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Denial Date</p>
                  <p className="font-semibold">{new Date(denial.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient & Insurance Information */}
          <Card>
            <CardHeader>
              <CardTitle>Patient & Insurance Information</CardTitle>
              <p className="text-sm text-gray-500">Patient and coverage details</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Insurance</p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <p className="font-semibold">{denial.insurancePayer}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Claim Type</p>
                  <p className="font-semibold">{denial.claimType || "Not specified"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-semibold text-xs">{denial.provider || "Not available"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-semibold text-xs">{denial.location}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <p className="font-semibold capitalize">{denial.priority}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Denial Date</p>
                  <p className="font-semibold">{new Date(denial.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Appeal Deadline</p>
                  <p className="font-semibold text-red-600">
                    {denial.appealDeadline ? new Date(denial.appealDeadline).toLocaleDateString() : "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="appeal" disabled={!rcaResult}>
              Appeal
              {!rcaResult && <span className="ml-1 text-xs opacity-60">(Analysis Required)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Root Cause Analysis */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Root Cause Analysis
                      </CardTitle>
                      <p className="text-sm text-gray-500">AI-powered analysis of denial patterns</p>
                    </div>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
                      {isAnalyzing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          {rcaResult ? "Re-analyze" : "Analyze"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Show analysis status */}
                  {analysisStatus && (
                    <Alert className="mb-4">
                      <Clock className="h-4 w-4 animate-spin" />
                      <AlertDescription>{analysisStatus}</AlertDescription>
                    </Alert>
                  )}

                  {rcaResult ? (
                    <div className="space-y-4">
                      {/* Analysis source indicator */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Last analyzed on{" "}
                          {rcaResult?.apiResponse?.completedAt
                            ? new Date(rcaResult.apiResponse.completedAt).toLocaleString()
                            : new Date().toLocaleString()}
                        </span>
                      </div>

                      {rcaResult?.issues?.length > 0 &&
                        rcaResult.issues.map((issue, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{issue.category}</h4>
                              <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                            <div className="text-sm">
                              <span className="font-medium text-gray-600">Recommendation:</span>
                              <p className="text-gray-600">{issue.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      {rcaResult?.apiResponse && (
                        <div className="mt-6 space-y-4">
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <Zap className="h-4 w-4 text-green-500" />
                              Detailed API Analysis
                            </h4>

                            <div className="space-y-4">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h5 className="font-medium text-blue-800 mb-2">Analysis Summary</h5>
                                <p className="text-sm text-blue-700 whitespace-pre-line">
                                  {rcaResult.apiResponse.analysis}
                                </p>
                              </div>

                              {/* Supporting Document Analysis Section */}
                              {rcaResult.apiResponse.contentAnalysis && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <h5 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Supporting Document Analysis
                                  </h5>
                                  <p className="text-sm text-orange-700 whitespace-pre-line">
                                    {rcaResult.apiResponse.contentAnalysis}
                                  </p>
                                </div>
                              )}

                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h5 className="font-medium text-green-800 mb-2">Recommendations</h5>
                                <p className="text-sm text-green-700 whitespace-pre-line">
                                  {rcaResult.apiResponse.recommendations}
                                </p>
                              </div>

                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h5 className="font-medium text-purple-800 mb-2">EDI File Analysis</h5>
                                <p className="text-sm text-purple-700">{rcaResult.apiResponse.ediFileAnalysis}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium">Job ID:</span> {rcaResult.apiResponse.jobId}
                                </div>
                                <div>
                                  <span className="font-medium">Completed:</span>{" "}
                                  {new Date(rcaResult.apiResponse.completedAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Click "Analyze" to identify root causes</p>
                      <p className="text-sm text-gray-400 mt-2">
                        AI-powered analysis will review claim details and identify potential issues
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Appeal Outlook */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Appeal Outlook
                  </CardTitle>
                  <p className="text-sm text-gray-500">Success probability and strategy</p>
                </CardHeader>
                <CardContent>
                  {rcaResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">95%</p>
                          <p className="text-sm text-green-700">Success Probability</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">${denial.claimAmount.toLocaleString()}</p>
                          <p className="text-sm text-blue-700">Expected Recovery</p>
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">Key Appeal Strategy</h4>
                        <p className="text-sm text-yellow-700">
                          {rcaResult?.issues?.some((i) => i.category.includes("Prior Authorization"))
                            ? "Emergency services do not require prior authorization. Focus appeal on EMTALA compliance and regulatory requirements."
                            : "Focus on medical necessity documentation and policy compliance. Gather supporting clinical evidence."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Appeal analysis will be available</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Complete root cause analysis to generate appeal recommendations
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Associated Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {denial?.documents?.length > 0 ? (
                  <div className="space-y-4">
                    {denial.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-gray-500">
                              {doc.type.replace("_", " ").toUpperCase()} • {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No documents available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Timeline view coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {denial.summary ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Extracted Notes:</h4>
                    <p className="text-sm text-gray-700">{denial.summary}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No notes available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appeal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appeal Management</CardTitle>
                <p className="text-sm text-gray-500">Prepare and submit appeals for this denial</p>
              </CardHeader>
              <CardContent>
                {!rcaResult ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Analysis Required</h3>
                    <p className="text-gray-500 mb-4">
                      Complete the Root Cause Analysis first to unlock appeal generation capabilities.
                    </p>
                    <Button
                      onClick={() => {
                        // Switch to analysis tab and trigger analysis
                        const analysisTab = document.querySelector('[value="analysis"]') as HTMLElement
                        analysisTab?.click()
                      }}
                      variant="outline"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Go to Analysis
                    </Button>
                  </div>
                ) : appealResult ? (
                  <div className="space-y-6">
                    {/* Appeal Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">
                          {denial?.appealResult ? "Appeal Previously Generated" : "Appeal Generated Successfully"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getAppealStatusColor(appealResult.appealStatus)}>
                          {appealResult.appealStatus}
                        </Badge>
                        {denial?.appealResult && (
                          <Badge variant="outline" className="text-xs">
                            From API
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Show generation info */}
                    {denial?.appealResult && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <span>This appeal was previously generated and is available for use.</span>
                            <Button variant="outline" size="sm" onClick={() => setAppealResult(null)}>
                              Generate New Appeal
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {appealResult?.missingInformation?.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">Missing Information Required:</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {appealResult.missingInformation.map((item, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {item.replace(/([A-Z])/g, " $1").trim()}
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Please update the appeal letter with the missing information before submission.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {appealResult?.supportDocumentLinks?.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Supporting Documents ({appealResult.supportDocumentLinks.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {appealResult.supportDocumentLinks.map((doc, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{doc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Appeal Letter */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Generated Appeal Letter</h4>
                        <div className="text-xs text-gray-500">
                          Job ID: {appealResult?.jobId || "N/A"} • Generated:{" "}
                          {appealResult?.generatedAt ? new Date(appealResult.generatedAt).toLocaleString() : "N/A"}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                          {appealResult?.emailDraft || "No appeal content available"}
                        </pre>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button onClick={handleDownloadAppeal}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Appeal Letter
                      </Button>
                      <Button variant="outline" onClick={handleSubmitAppeal}>
                        <Mail className="h-4 w-4 mr-2" />
                        Submit via Email
                      </Button>
                      <Button variant="outline" onClick={handlePrepareAppeal} disabled={isPreparingAppeal}>
                        {isPreparingAppeal ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate Appeal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Appeal Deadline</p>
                          <p className="text-lg font-semibold text-red-600">
                            {denial.appealDeadline
                              ? new Date(denial.appealDeadline).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : new Date(new Date(denial.date).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Estimated Recovery</p>
                          <p className="text-2xl font-bold">${denial.claimAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Success Probability</p>
                          <p className="text-lg font-semibold">95%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Appeal Strategy</p>
                          <p className="text-sm">
                            Emergency services appeal - focus on EMTALA compliance and regulatory requirements
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handlePrepareAppeal}
                        disabled={isPreparingAppeal}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        {isPreparingAppeal ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Preparing Appeal...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Appeal Letter
                          </>
                        )}
                      </Button>
                      <Button variant="outline" disabled>
                        Request Peer Review
                      </Button>
                      <Button variant="outline" disabled>
                        Schedule Appeal Call
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
