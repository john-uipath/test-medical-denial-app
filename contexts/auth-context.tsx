"use client"

import { createContext, useContext, type ReactNode } from "react"

interface AuthContextType {
  user: { name: string; email: string; role: string } | null
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock user - no authentication required
  const user = {
    name: "Medical Review Team",
    email: "team@hospital.com",
    role: "admin",
  }

  const logout = () => {
    // No-op since there's no real authentication
    window.location.href = "/"
  }

  return <AuthContext.Provider value={{ user, logout, isLoading: false }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
