/**
 * Onboarding Store
 *
 * Manages the onboarding flow state and persistence.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface OnboardingState {
  hasCompletedOnboarding: boolean
  currentStep: number
  setHasCompletedOnboarding: (completed: boolean) => void
  setCurrentStep: (step: number) => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      currentStep: 0,

      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),

      setCurrentStep: (step) => set({ currentStep: step }),

      resetOnboarding: () => set({ hasCompletedOnboarding: false, currentStep: 0 }),
    }),
    {
      name: "cadhy-onboarding",
    }
  )
)
