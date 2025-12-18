import { AppErrorBoundary, UpdateDialog } from "@/components/common"
import { AppLayout } from "@/components/layout/AppLayout"
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog"

export function App() {
  return (
    <AppErrorBoundary>
      <AppLayout />
      <UpdateDialog />
      <OnboardingDialog />
    </AppErrorBoundary>
  )
}
