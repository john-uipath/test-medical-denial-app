"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, AlertTriangle } from "lucide-react"

const API_BASE_URL = "https://medical-backend-api-demo.azurewebsites.net/api"

export function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "online" | "offline" | "error">("checking")
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkBackendStatus = async () => {
    try {
      setStatus("checking")

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
      setStatus(response.ok ? "online" : "error")
      setLastCheck(new Date())
    } catch (error) {
      setStatus("offline")
      setLastCheck(new Date())
    }
  }

  useEffect(() => {
    checkBackendStatus()
    const interval = setInterval(checkBackendStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return { variant: "secondary" as const, icon: Wifi, text: "Backend Online" }
      case "offline":
        return { variant: "destructive" as const, icon: WifiOff, text: "Backend Offline" }
      case "error":
        return { variant: "destructive" as const, icon: AlertTriangle, text: "Backend Error" }
      default:
        return { variant: "outline" as const, icon: Wifi, text: "Checking..." }
    }
  }

  const statusConfig = getStatusConfig()
  const Icon = statusConfig.icon

  return (
    <Badge
      variant={statusConfig.variant}
      className="flex items-center gap-1 cursor-pointer"
      onClick={checkBackendStatus}
      title={`Click to refresh • Last check: ${lastCheck?.toLocaleTimeString() || "Never"}`}
    >
      <Icon className={`h-3 w-3 ${status === "checking" ? "animate-spin" : ""}`} />
      {statusConfig.text}
    </Badge>
  )
}
