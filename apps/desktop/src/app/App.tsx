import { useEffect } from "react"
import { initializeDepgraphIntegration } from "@/core/depsgraph"
import { AppErrorBoundary, UpdateDialog } from "@/interface"
import { OnboardingDialog } from "@/interface/onboarding"
import { useDrawingSync } from "@/lib/hooks"
import { AppLayout } from "@/windowmanager"

export function App() {
  // Initialize depsgraph integration with modeller store
  useEffect(() => {
    const cleanup = initializeDepgraphIntegration()
    return cleanup
  }, [])

  // Enable auto-sync between modeller and drawing views
  // When 3D shapes change, dependent drawing views auto-regenerate
  useDrawingSync({ enabled: true, debounceMs: 500 })

  return (
    <AppErrorBoundary>
      <AppLayout />
      <UpdateDialog />
      <OnboardingDialog />
    </AppErrorBoundary>
  )
}
