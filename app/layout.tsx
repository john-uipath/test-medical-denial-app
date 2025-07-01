import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { EnvChecker } from "@/components/env-checker"

export const metadata: Metadata = {
  title: "Medical Denial Processing App",
  description: "Hospital vs Insurance denial processing system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
          <EnvChecker />
        </ErrorBoundary>
      </body>
    </html>
  )
}
