import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
import { Rocket01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { open } from "@tauri-apps/plugin-shell"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface UpdateBadgeState {
  type: "pending" | "installed"
  version: string
}

export function UpdateBadge() {
  const { t } = useTranslation()
  const [badgeState, setBadgeState] = useState<UpdateBadgeState | null>(null)

  useEffect(() => {
    // Load badge state from localStorage
    const stored = localStorage.getItem("cadhy-update-badge")
    if (stored) {
      try {
        const state = JSON.parse(stored) as UpdateBadgeState
        setBadgeState(state)
      } catch {
        // Invalid JSON, clear it
        localStorage.removeItem("cadhy-update-badge")
      }
    }

    // Listen for storage changes (in case it's updated from UpdateDialog)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cadhy-update-badge" && e.newValue) {
        try {
          const state = JSON.parse(e.newValue) as UpdateBadgeState
          setBadgeState(state)
        } catch {
          setBadgeState(null)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleClick = async () => {
    if (!badgeState?.version) return

    // Open changelog on GitHub
    const url = `https://github.com/crhistian-cornejo/CADHY/releases/tag/v${badgeState.version}`
    await open(url)

    // Clear badge after clicking
    localStorage.removeItem("cadhy-update-badge")
    setBadgeState(null)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.removeItem("cadhy-update-badge")
    setBadgeState(null)
  }

  if (!badgeState) return null

  const isPending = badgeState.type === "pending"
  const isInstalled = badgeState.type === "installed"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-2 px-2.5 text-xs font-medium border-2 relative animate-in fade-in slide-in-from-top-2 duration-300",
              isPending &&
                "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20",
              isInstalled &&
                "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            )}
            onClick={handleClick}
            data-tauri-drag-region="false"
          >
            <HugeiconsIcon icon={Rocket01Icon} className="size-3.5" />
            <span>
              {isPending ? t("update.badgePending") : t("update.badgeInstalled")}{" "}
              {badgeState.version}
            </span>
            {/* Pulse animation for pending updates */}
            {isPending && (
              <span className="absolute -top-0.5 -right-0.5 flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-orange-500" />
              </span>
            )}
          </Button>
        }
      />
      <TooltipContent side="bottom">
        <div className="space-y-1">
          <p className="font-medium">
            {isPending ? t("update.tooltipPending") : t("update.tooltipInstalled")}
          </p>
          <p className="text-xs text-muted-foreground">{t("update.clickToViewChangelog")}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
