/**
 * Onboarding Dialog - CADHY
 *
 * Welcome flow for first-time users.
 * Clean, minimal design following app style.
 */

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  ScrollArea,
} from "@cadhy/ui"
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CubeIcon,
  FolderOpenIcon,
  RocketIcon,
  SparklesIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useOnboardingStore } from "@/stores/onboarding-store"

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingStep {
  id: string
  icon: typeof CubeIcon
  iconColor: string
  title: string
  description: string
  features: {
    icon: typeof Add01Icon
    text: string
  }[]
}

// ============================================================================
// ONBOARDING STEPS DATA
// ============================================================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: RocketIcon,
    iconColor: "text-primary",
    title: "Welcome to CADHY",
    description: "Professional hydraulic engineering software with AI assistance",
    features: [
      {
        icon: CubeIcon,
        text: "Create 3D models of hydraulic structures",
      },
      {
        icon: SparklesIcon,
        text: "Run Manning equation and GVF analysis",
      },
      {
        icon: FolderOpenIcon,
        text: "Organize projects with folders",
      },
    ],
  },
  {
    id: "projects",
    icon: Add01Icon,
    iconColor: "text-blue-500",
    title: "Create & Manage Projects",
    description: "Start new projects or open existing ones",
    features: [
      {
        icon: Add01Icon,
        text: "Create new projects with custom settings",
      },
      {
        icon: FolderOpenIcon,
        text: "Organize projects in folders",
      },
      {
        icon: Tick02Icon,
        text: "Recent projects for quick access",
      },
    ],
  },
  {
    id: "modeling",
    icon: CubeIcon,
    iconColor: "text-emerald-500",
    title: "3D Hydraulic Modeling",
    description: "Design channels, pipes, and hydraulic structures",
    features: [
      {
        icon: CubeIcon,
        text: "OpenCASCADE-powered 3D geometry",
      },
      {
        icon: Add01Icon,
        text: "Rectangular, trapezoidal, circular channels",
      },
      {
        icon: Tick02Icon,
        text: "Real-time 3D viewport with WebGL",
      },
    ],
  },
  {
    id: "ai",
    icon: SparklesIcon,
    iconColor: "text-amber-500",
    title: "AI Assistant",
    description: "Get help with calculations and hydraulic design",
    features: [
      {
        icon: SparklesIcon,
        text: "Chat with AI about your project",
      },
      {
        icon: Tick02Icon,
        text: "Support for Gemini, Ollama, and more",
      },
      {
        icon: Add01Icon,
        text: "Configure AI providers in Settings",
      },
    ],
  },
]

// ============================================================================
// STEP CONTENT COMPONENT
// ============================================================================

function StepContent({ step }: { step: OnboardingStep }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      {/* Icon */}
      <div
        className={cn(
          "size-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-6",
          step.iconColor
        )}
      >
        <HugeiconsIcon icon={step.icon} className="size-8" />
      </div>

      {/* Title */}
      <h3 className="mb-2">{step.title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-8 max-w-md">{step.description}</p>

      {/* Features List */}
      <div className="w-full max-w-md space-y-3">
        {step.features.map((feature, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40 text-left"
          >
            <div className="size-8 shrink-0 rounded-2xl bg-card border border-border flex items-center justify-center">
              <HugeiconsIcon icon={feature.icon} className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm flex-1 pt-0.5">{feature.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

function StepIndicator({ totalSteps, currentStep }: { totalSteps: number; currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === currentStep
              ? "w-8 bg-primary"
              : index < currentStep
                ? "w-1.5 bg-primary/50"
                : "w-1.5 bg-muted"
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// MAIN DIALOG COMPONENT
// ============================================================================

export function OnboardingDialog() {
  const { t } = useTranslation()
  const { hasCompletedOnboarding, setHasCompletedOnboarding } = useOnboardingStore()
  const [currentStep, setCurrentStep] = useState(0)

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      setHasCompletedOnboarding(true)
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setHasCompletedOnboarding(true)
  }

  return (
    <Dialog open={!hasCompletedOnboarding} onOpenChange={handleSkip}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh]" showCloseButton={false}>
        <DialogHeader>
          <StepIndicator totalSteps={ONBOARDING_STEPS.length} currentStep={currentStep} />
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6">
          <StepContent step={ONBOARDING_STEPS[currentStep]} />
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 justify-between">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 mr-1.5" />
                {t("onboarding.back", "Back")}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!isLastStep && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                {t("onboarding.skip", "Skip")}
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? (
                <>
                  <HugeiconsIcon icon={Tick02Icon} className="size-4 mr-1.5" />
                  {t("onboarding.getStarted", "Get Started")}
                </>
              ) : (
                <>
                  {t("onboarding.next", "Next")}
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
