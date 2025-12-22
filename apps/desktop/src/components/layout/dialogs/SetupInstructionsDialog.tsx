/**
 * Setup Instructions Dialog - CADHY
 *
 * Shows step-by-step instructions for setting up AI providers.
 * Each command has a copy button for easy copying.
 */

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@cadhy/ui"
import {
  ArrowRight01Icon,
  CommandLineIcon,
  Copy01Icon,
  Download01Icon,
  RefreshIcon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

export type SetupType = "ollama" | "ollama-cloud"

interface SetupInstructionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: SetupType
}

interface SetupStep {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  command?: string
  link?: {
    url: string
    label: string
  }
}

// ============================================================================
// COPY BUTTON COMPONENT
// ============================================================================

function CopyButton({ text, className }: { text: string; className?: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(t("common.copied", "Copied!"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("common.copyFailed", "Failed to copy"))
    }
  }, [text, t])

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      className={cn("size-6 shrink-0", className)}
      title={t("common.copy", "Copy")}
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        className={cn("size-3.5", copied && "text-green-500")}
      />
    </Button>
  )
}

// ============================================================================
// STEP COMPONENT
// ============================================================================

function SetupStepItem({
  step,
  stepNumber,
  isLast,
}: {
  step: SetupStep
  stepNumber: number
  isLast: boolean
}) {
  const handleOpenLink = useCallback(() => {
    if (step.link) {
      window.open(step.link.url, "_blank", "noopener,noreferrer")
    }
  }, [step.link])

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && <div className="absolute left-[15px] top-[36px] bottom-0 w-px bg-border" />}

      <div className="flex gap-3">
        {/* Step number */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {stepNumber}
        </div>

        <div className="flex-1 pb-4">
          {/* Title with icon */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-muted-foreground">{step.icon}</span>
            <h4 className="text-sm font-medium">{step.title}</h4>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-2">{step.description}</p>

          {/* Command box */}
          {step.command && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border/50 font-mono text-xs">
              <code className="flex-1 select-all break-all">{step.command}</code>
              <CopyButton text={step.command} />
            </div>
          )}

          {/* Link button */}
          {step.link && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs gap-1.5"
              onClick={handleOpenLink}
            >
              {step.link.label}
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN DIALOG
// ============================================================================

export function SetupInstructionsDialog({
  open,
  onOpenChange,
  type,
}: SetupInstructionsDialogProps) {
  const { t } = useTranslation()

  // Get steps based on type
  const getSteps = (): SetupStep[] => {
    switch (type) {
      case "ollama":
        return [
          {
            id: "install",
            icon: <HugeiconsIcon icon={Download01Icon} className="size-4" />,
            title: t("setup.ollama.step1.title", "Install Ollama"),
            description: t(
              "setup.ollama.step1.desc",
              "Download and install Ollama for your operating system."
            ),
            command: "brew install ollama",
            link: {
              url: "https://ollama.com/download",
              label: t("setup.ollama.downloadPage", "Download Page"),
            },
          },
          {
            id: "start",
            icon: <HugeiconsIcon icon={CommandLineIcon} className="size-4" />,
            title: t("setup.ollama.step2.title", "Start Ollama"),
            description: t(
              "setup.ollama.step2.desc",
              "Run the Ollama server. It will run in the background on port 11434."
            ),
            command: "ollama serve",
          },
          {
            id: "pull",
            icon: <HugeiconsIcon icon={Download01Icon} className="size-4" />,
            title: t("setup.ollama.step3.title", "Download a Model"),
            description: t(
              "setup.ollama.step3.desc",
              "Download a recommended model. Qwen 3 8B has excellent tool calling support (~4.7 GB)."
            ),
            command: "ollama pull qwen3:8b",
          },
          {
            id: "restart",
            icon: <HugeiconsIcon icon={RefreshIcon} className="size-4" />,
            title: t("setup.ollama.step4.title", "Restart CADHY"),
            description: t(
              "setup.ollama.step4.desc",
              "Close and reopen CADHY. It will automatically detect Ollama and your installed models."
            ),
          },
        ]

      case "ollama-cloud":
        return [
          {
            id: "signup",
            icon: <HugeiconsIcon icon={UserIcon} className="size-4" />,
            title: t("setup.ollamaCloud.step1.title", "Create Account"),
            description: t(
              "setup.ollamaCloud.step1.desc",
              "Sign up for a free Ollama Cloud account at ollama.com."
            ),
            link: {
              url: "https://ollama.com",
              label: t("setup.ollamaCloud.signUp", "Sign up at ollama.com"),
            },
          },
          {
            id: "signin",
            icon: <HugeiconsIcon icon={CommandLineIcon} className="size-4" />,
            title: t("setup.ollamaCloud.step2.title", "Sign in via CLI"),
            description: t(
              "setup.ollamaCloud.step2.desc",
              "Run this command and follow the browser authentication flow."
            ),
            command: "ollama signin",
          },
          {
            id: "run",
            icon: <HugeiconsIcon icon={CommandLineIcon} className="size-4" />,
            title: t("setup.ollamaCloud.step3.title", "Run a Cloud Model"),
            description: t(
              "setup.ollamaCloud.step3.desc",
              "Test a cloud model. GPT-OSS 120B is OpenAI's open-weight model with excellent reasoning."
            ),
            command: "ollama run gpt-oss:120b-cloud",
          },
          {
            id: "restart",
            icon: <HugeiconsIcon icon={RefreshIcon} className="size-4" />,
            title: t("setup.ollamaCloud.step4.title", "Restart CADHY"),
            description: t(
              "setup.ollamaCloud.step4.desc",
              "Close and reopen CADHY to use cloud models."
            ),
          },
        ]

      default:
        return []
    }
  }

  const steps = getSteps()

  const getTitle = () => {
    switch (type) {
      case "ollama":
        return t("setup.ollama.title", "Set up Ollama (Local)")
      case "ollama-cloud":
        return t("setup.ollamaCloud.title", "Set up Ollama Cloud")
      default:
        return ""
    }
  }

  const getDescription = () => {
    switch (type) {
      case "ollama":
        return t(
          "setup.ollama.description",
          "Run AI models locally on your machine with complete privacy."
        )
      case "ollama-cloud":
        return t(
          "setup.ollamaCloud.description",
          "Access large models like GPT-OSS 120B and DeepSeek 671B."
        )
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw]" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-base">{getTitle()}</DialogTitle>
          <DialogDescription className="text-xs">{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {steps.map((step, index) => (
            <SetupStepItem
              key={step.id}
              step={step}
              stepNumber={index + 1}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
