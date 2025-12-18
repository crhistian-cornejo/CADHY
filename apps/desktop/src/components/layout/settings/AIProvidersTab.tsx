/**
 * AI Providers Tab - Settings Dialog
 *
 * Manages AI provider configuration including:
 * - Ollama Local
 * - CADHY Gateway fallback
 */

import { Badge, Button, cn, Separator, toast } from "@cadhy/ui"
import {
  AlertCircleIcon,
  InformationCircleIcon,
  LinkIcon,
  Loading02Icon,
  SparklesIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAIProvider } from "@/hooks/use-ai-provider"
import { useSettingsStore } from "@/stores/settings-store"
import { SetupInstructionsDialog, type SetupType } from "../SetupInstructionsDialog"

export function AIProvidersTab() {
  const { t } = useTranslation()
  const {
    hasOllamaLocal,
    ollamaModels,
    usingGateway,
    statusMessage,
    isDetecting,
    refreshProviders,
  } = useAIProvider()

  const ai = useSettingsStore((s) => s.ai)
  const ollamaStatus = ai.ollamaLocalStatus

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [setupDialog, setSetupDialog] = useState<{ open: boolean; type: SetupType }>({
    open: false,
    type: "ollama",
  })

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshProviders()
      toast.success(t("settings.ai.refreshed", "Provider status updated"))
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshProviders, t])

  const openSetupDialog = useCallback((type: SetupType) => {
    setSetupDialog({ open: true, type })
  }, [])

  return (
    <div className="space-y-4">
      {/* Active Provider Status */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-2 rounded-full",
                isDetecting ? "bg-yellow-500 animate-pulse" : "bg-green-500"
              )}
            />
            <span className="text-xs font-medium">
              {t("settings.ai.activeProvider", "Active Provider")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="size-6"
          >
            <HugeiconsIcon
              icon={Loading02Icon}
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{statusMessage}</p>
      </div>

      <Separator />

      {/* Ollama Local */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-600">O</span>
            </div>
            <div>
              <h4 className="text-xs font-medium">Ollama (Local)</h4>
              <p className="text-[10px] text-muted-foreground">
                {t("settings.ai.ollamaDesc", "Run AI models locally on your machine")}
              </p>
            </div>
          </div>
          {hasOllamaLocal ? (
            <Badge
              variant="outline"
              className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30"
            >
              <HugeiconsIcon icon={Tick02Icon} className="size-3 mr-1" />
              {t("settings.ai.running", "Running")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              {t("settings.ai.notRunning", "Not running")}
            </Badge>
          )}
        </div>

        {hasOllamaLocal && ollamaStatus && (
          <div className="text-[10px] text-muted-foreground pl-10 space-y-0.5">
            {ollamaStatus.version && <p>Version: {ollamaStatus.version}</p>}
            <p>
              {t("settings.ai.ollamaModels", "{{count}} models installed", {
                count: ollamaModels.length,
              })}
            </p>
            {ollamaModels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {ollamaModels.slice(0, 4).map((model) => (
                  <Badge key={model} variant="secondary" className="text-[9px] px-1.5 py-0">
                    {model}
                  </Badge>
                ))}
                {ollamaModels.length > 4 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    +{ollamaModels.length - 4} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {!hasOllamaLocal && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={() => openSetupDialog("ollama")}
          >
            <HugeiconsIcon icon={LinkIcon} className="size-3.5" />
            {t("settings.ai.setupOllama", "How to set up Ollama")}
          </Button>
        )}

        {hasOllamaLocal && ollamaModels.length === 0 && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/10 text-[10px] text-yellow-700 dark:text-yellow-400">
            <HugeiconsIcon icon={AlertCircleIcon} className="size-3.5 mt-0.5 shrink-0" />
            <p>
              {t(
                "settings.ai.ollamaNoModels",
                "Ollama is running but no models are installed. Run 'ollama pull qwen3:8b' to get started."
              )}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Gateway Fallback */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={SparklesIcon} className="size-4 text-violet-500" />
            </div>
            <div>
              <h4 className="text-xs font-medium">CADHY Gateway</h4>
              <p className="text-[10px] text-muted-foreground">
                {t("settings.ai.gatewayDesc", "Fallback when no other provider is available")}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              usingGateway && "bg-violet-500/10 text-violet-600 border-violet-500/30"
            )}
          >
            {usingGateway
              ? t("settings.ai.active", "Active")
              : t("settings.ai.available", "Available")}
          </Badge>
        </div>

        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/20 text-[10px] text-muted-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5 mt-0.5 shrink-0" />
          <p>
            {t(
              "settings.ai.gatewayInfo",
              "The gateway provides AI access with rate limiting. For unlimited usage, set up Ollama."
            )}
          </p>
        </div>
      </div>

      {/* Setup Instructions Dialog */}
      <SetupInstructionsDialog
        open={setupDialog.open}
        onOpenChange={(open) => setSetupDialog((prev) => ({ ...prev, open }))}
        type={setupDialog.type}
      />
    </div>
  )
}
