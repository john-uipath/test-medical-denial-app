"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"

const API_BASE_URL = "https://medical-backend-api-demo.azurewebsites.net/api"

export function EnvChecker() {
  const [status, setStatus] = useState<{
    isReachable: boolean
    error?: string
    lastCheck?: Date
  } | null>(null)

  const checkEnvironment = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${API_BASE_URL}/Denials`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      setStatus({
        isReachable: response.ok,
        error: response.ok ? undefined : `Backend returned ${response.status}: ${response.statusText}`,
        lastCheck: new Date(),
      })
    } catch (error) {
      setStatus({
        isReachable: false,
        error: `Cannot reach backend: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastCheck: new Date(),
      })
    }
  }

  useEffect(() => {
    checkEnvironment()
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== "development" || !status) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Backend Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs">Backend:</span>
            {status.isReachable ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>

          <div className="text-xs text-gray-600 break-all">
            <strong>URL:</strong> {API_BASE_URL}
          </div>

          {status.error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <strong>Error:</strong> {status.error}
            </div>
          )}

          {status.lastCheck && (
            <div className="text-xs text-gray-500">Last checked: {status.lastCheck.toLocaleTimeString()}</div>
          )}

          <Button size="sm" variant="outline" onClick={checkEnvironment} className="w-full">
            <RefreshCw className="h-3 w-3 mr-1" />
            Recheck
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
