"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, FileArchive, CheckCircle, AlertTriangle, X, Info, Clock } from "lucide-react"
import { apiService } from "@/lib/api-service"

interface UploadDenialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UploadDenialModal({ isOpen, onClose, onSuccess }: UploadDenialModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [timeoutWarning, setTimeoutWarning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
        setError("Please select a ZIP file")
        return
      }

      // Validate file size (max 100MB for better timeout handling)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError("File size must be less than 100MB")
        return
      }

      setFile(selectedFile)
      setError(null)
      setTimeoutWarning(selectedFile.size > 50 * 1024 * 1024) // Warn for files > 50MB
      setDebugInfo(`File selected: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file")
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)
    setDebugInfo("Preparing upload...")

    try {
      setDebugInfo("Starting upload to backend...")

      const response = await apiService.uploadDenialFile(file, (progress) => {
        setUploadProgress(progress)
        if (progress > 0) {
          setDebugInfo(`Uploading... ${progress}%`)
        }
      })

      setUploadProgress(100)
      setSuccess(true)
      setDebugInfo(`Upload successful: ${response.message}`)

      // Auto-close after success
      setTimeout(() => {
        handleClose()
        onSuccess()
      }, 2000)
    } catch (error) {
      console.error("Upload error:", error)
      let errorMessage = "Upload failed. Please try again."

      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          errorMessage =
            "Upload timed out. The file may be too large or your connection is slow. Please try with a smaller file or check your internet connection."
        } else if (error.message.includes("Network error")) {
          errorMessage = "Network error occurred. Please check your internet connection and try again."
        } else if (error.message.includes("415")) {
          errorMessage = "Server doesn't support this file type. Please ensure your backend accepts ZIP files."
        } else if (error.message.includes("413")) {
          errorMessage = "File is too large for the server. Please try with a smaller file."
        } else if (error.message.includes("500")) {
          errorMessage = "Server error occurred while processing the file. Please try again later."
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      setDebugInfo(`Upload failed: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setError(null)
      setSuccess(false)
      setUploadProgress(0)
      setDebugInfo(null)
      setTimeoutWarning(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      onClose()
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as React.ChangeEvent<HTMLInputElement>
      handleFileChange(fakeEvent)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add New Denial
          </DialogTitle>
          <DialogDescription>
            Upload a ZIP file containing EDI files (837, 835) and supporting documents to create a new denial record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700">Upload Successful!</h3>
              <p className="text-sm text-gray-600">Your denial has been processed and added to the system.</p>
            </div>
          ) : (
            <>
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  file ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileArchive className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="font-medium text-green-700">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || "application/zip"}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setFile(null)} className="mt-2">
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-gray-600">Drag and drop your ZIP file here, or click to browse</p>
                    <p className="text-xs text-gray-500">Supported: ZIP files up to 100MB</p>
                  </div>
                )}
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select ZIP File</Label>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </div>

              {/* Timeout Warning */}
              {timeoutWarning && !isUploading && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Large file detected:</strong> Files over 50MB may take longer to upload. Please ensure you
                    have a stable internet connection.
                  </AlertDescription>
                </Alert>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <p className="text-xs text-gray-500 text-center">Please keep this window open while uploading...</p>
                  )}
                </div>
              )}

              {/* Debug Info */}
              {debugInfo && process.env.NODE_ENV === "development" && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs font-mono">{debugInfo}</AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{error}</p>
                      {error.includes("timeout") && (
                        <div className="text-xs space-y-1">
                          <p>
                            <strong>Troubleshooting tips:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Try with a smaller file (under 50MB)</li>
                            <li>Check your internet connection</li>
                            <li>Ensure the backend server is running</li>
                            <li>Contact support if the issue persists</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Info Box */}
              <Alert>
                <FileArchive className="h-4 w-4" />
                <AlertDescription>
                  <strong>ZIP file should contain:</strong>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• EDI 837 file (Professional Healthcare Claim)</li>
                    <li>• EDI 835 file (Healthcare Claim Payment/Advice)</li>
                    <li>• Supporting documents (denial letters, medical records)</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Upload timeout:</strong> 2 minutes for large files
                  </p>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? "Uploading..." : "Upload & Process"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
