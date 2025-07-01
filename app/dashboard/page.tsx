"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  LogOut,
  Search,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  DollarSign,
  RefreshCw,
} from "lucide-react"
import type { Denial } from "@/types/api"
import { apiService } from "@/lib/api-service"
import { ApiStatus } from "@/components/api-status"
import { UploadDenialModal } from "@/components/upload-denial-modal"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [denials, setDenials] = useState<Denial[]>([])
  const [filteredDenials, setFilteredDenials] = useState<Denial[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDenials = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("🔧 Loading denials from backend...")
      const data = await apiService.getDenials()
      console.log("🔧 Received denials:", data)
      setDenials(data)
      setFilteredDenials(data)
    } catch (error) {
      console.error("❌ Error loading denials:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load denials"
      setError(errorMessage)
      setDenials([])
      setFilteredDenials([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDenials()
  }, [])

  useEffect(() => {
    let filtered = denials

    if (searchTerm) {
      filtered = filtered.filter(
        (denial) =>
          denial.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          denial.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          denial.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((denial) => denial.status === statusFilter)
    }

    setFilteredDenials(filtered)
  }, [denials, searchTerm, statusFilter])

  const getStatusBadge = (status: Denial["status"]) => {
    const variants = {
      "In Review": { variant: "default" as const, icon: Clock, text: "In Review" },
      "Appeal Filed": { variant: "secondary" as const, icon: FileText, text: "Appeal Filed" },
      Denied: { variant: "destructive" as const, icon: XCircle, text: "Denied" },
      Resolved: { variant: "outline" as const, icon: CheckCircle, text: "Resolved" },
    }

    // Add fallback for unknown status values
    const config = variants[status] || {
      variant: "default" as const,
      icon: AlertCircle,
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

  const getPriorityColor = (priority: Denial["priority"]) => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      urgent: "text-red-600",
    }
    return colors[priority]
  }

  const handleReviewDenial = (denialId: string) => {
    router.push(`/denial/${denialId}`)
  }

  const refreshDenials = async () => {
    await loadDenials()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Medical Denial Dashboard</h1>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
                <ApiStatus />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={refreshDenials} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Add New Denial
              </Button>
              <Button variant="outline" onClick={logout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={refreshDenials}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading denials from backend...</p>
          </div>
        )}

        {/* Content - only show when not loading */}
        {!isLoading && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Denials</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{denials.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Review</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {denials.filter((d) => d.status === "In Review").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appeal Filed</CardTitle>
                  <FileText className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {denials.filter((d) => d.status === "Appeal Filed").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Denied</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {denials.filter((d) => d.status === "Denied").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {denials.filter((d) => d.status === "Resolved").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Total Amount Card */}
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">Total Denied Amount</CardTitle>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${denials.reduce((sum, d) => sum + d.claimAmount, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Across {denials.length} denial{denials.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by patient name, claim number, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Appeal Filed">Appeal Filed</SelectItem>
                      <SelectItem value="Denied">Denied</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Denials Table */}
            <Card>
              <CardHeader>
                <CardTitle>Denial Claims</CardTitle>
              </CardHeader>
              <CardContent>
                {denials.length === 0 && !error ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Denials Found</h3>
                    <p className="text-gray-500 mb-4">There are no denial records in the system.</p>
                    <Button onClick={() => setShowUploadModal(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Add First Denial
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Claim #</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDenials.map((denial) => (
                        <TableRow key={denial.id}>
                          <TableCell>{new Date(denial.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{denial.patientName}</TableCell>
                          <TableCell>{denial.location}</TableCell>
                          <TableCell>{denial.claimNumber}</TableCell>
                          <TableCell>${denial.claimAmount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(denial.status)}</TableCell>
                          <TableCell>
                            <span className={`font-medium capitalize ${getPriorityColor(denial.priority)}`}>
                              {denial.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewDenial(denial.id)}
                              className="flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Upload Modal */}
      <UploadDenialModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={refreshDenials}
      />
    </div>
  )
}
