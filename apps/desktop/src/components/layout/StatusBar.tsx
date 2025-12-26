/**
 * StatusBar Component
 *
 * Professional status bar with system metrics, coordinates, and performance info.
 * Adapted from GraphCAD design patterns.
 */

import { Button, cn, formatKbd, Kbd, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  CpuIcon,
  CubeIcon,
  FloppyDiskIcon,
  Loading01Icon,
  Message01Icon,
  PackageIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { invoke } from "@tauri-apps/api/core"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlatform } from "@/hooks/use-platform"
import { useUnits } from "@/hooks/use-units"
import {
  formatTimeAgo,
  useAutoSaveCountdown,
  useAutoSaveError,
  useAutoSaveLastSaved,
  useAutoSaveStatus,
} from "@/stores/autosave-store"
import {
  useActiveTool,
  useIsDirty,
  useObjects,
  useSelectedObjects,
  useSelectionMode,
  useTransformMode,
} from "@/stores/modeller"
import { useCurrentProject, useIsProjectLoading } from "@/stores/project-store"
import { useStatusNotification } from "@/stores/status-notification-store"
import { useCoordinateSource, useCoordinates } from "@/stores/viewport-coordinates-store"

// ============================================================================
// PERFORMANCE METRICS HOOK
// ============================================================================

interface PerformanceMetrics {
  fps: number
  memory: string
  memoryPercent: number
  gpu: string
  cpuUsage: number
}

interface SystemMetrics {
  memoryUsedMb: number
  memoryTotalMb: number
  memoryPercent: number
  cpuUsage: number
  gpuInfo: string
}

function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: "0 MB",
    memoryPercent: 0,
    gpu: "...",
    cpuUsage: 0,
  })

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    // Fetch system metrics from Tauri every 2 seconds
    const fetchSystemMetrics = async () => {
      try {
        const systemMetrics = await invoke<SystemMetrics>("get_system_metrics")
        // Show CADHY app memory usage with percentage
        const memory = `${systemMetrics.memoryUsedMb} MB`
        const memoryPercent = systemMetrics.memoryPercent
        const gpu = systemMetrics.gpuInfo
        const cpuUsage = systemMetrics.cpuUsage

        setMetrics((prev) => ({
          ...prev,
          memory,
          memoryPercent,
          gpu,
          cpuUsage,
        }))
      } catch (error) {
        console.error("[StatusBar] Failed to fetch system metrics:", error)
      }
    }

    // Initial fetch
    fetchSystemMetrics()

    // Update system metrics every 2 seconds
    const metricsInterval = setInterval(fetchSystemMetrics, 2000)

    // Update FPS every frame
    const update = () => {
      frameCount++
      const currentTime = performance.now()

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))

        setMetrics((prev) => ({ ...prev, fps }))
        frameCount = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(update)
    }

    animationId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(metricsInterval)
    }
  }, [])

  return metrics
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StatusBar() {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()
  const metrics = usePerformanceMetrics()
  const { unitSystem, toggleUnitSystem, lengthLabel } = useUnits()
  const notification = useStatusNotification()
  const isLoadingProject = useIsProjectLoading()
  const currentProject = useCurrentProject()

  // Auto-save state
  const autoSaveStatus = useAutoSaveStatus()
  const autoSaveCountdown = useAutoSaveCountdown()
  const autoSaveLastSaved = useAutoSaveLastSaved()
  const autoSaveError = useAutoSaveError()

  // Modeller Store Hooks
  const objects = useObjects()
  const selectedObjects = useSelectedObjects()
  const selectionMode = useSelectionMode()
  const transformMode = useTransformMode()
  const activeTool = useActiveTool()
  const isDirty = useIsDirty()

  // Format countdown for display
  const countdownDisplay = useMemo(() => {
    if (autoSaveCountdown === null) return null
    if (autoSaveCountdown <= 0) return "0s"
    return `${autoSaveCountdown}s`
  }, [autoSaveCountdown])

  // Get last saved display
  const lastSavedDisplay = useMemo(() => {
    return formatTimeAgo(autoSaveLastSaved)
  }, [autoSaveLastSaved])

  // Dynamic Selection Summary
  const selectionSummary = useMemo(() => {
    if (selectedObjects.length === 0) {
      if (objects.length === 0) return t("statusBar.emptyScene", "Empty Scene")
      return `${objects.length} ${t("statusBar.objects", "Objects")}`
    }
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0]
      return `${t("statusBar.selected", "Selected")}: ${obj.name}`
    }
    return t("statusBar.multipleSelected", { count: selectedObjects.length })
  }, [selectedObjects, objects.length, t])

  // Dynamic Hints based on context
  const hints = useMemo(() => {
    const list = []

    if (activeTool) {
      list.push({ kbd: "Esc", label: t("common.cancel", "Cancel") })
    } else if (selectedObjects.length > 0) {
      if (transformMode === "none") {
        list.push({ kbd: "G", label: t("toolbar.move", "Move") })
        list.push({ kbd: "R", label: t("toolbar.rotate", "Rotate") })
        list.push({ kbd: "S", label: t("toolbar.scale", "Scale") })
        list.push({ kbd: "4", label: t("statusBar.selBody", "Body Mode") })
      } else {
        list.push({ kbd: "Esc", label: t("common.cancel", "Cancel") })
        list.push({ kbd: "Enter", label: t("common.apply", "Apply") })
      }
    } else {
      list.push({ kbd: "1-4", label: t("statusBar.selMode", "Selection Mode") })
      list.push({ kbd: "Shift+C", label: t("tools.createChannel.label", "Channel") })
    }

    return list
  }, [selectedObjects, transformMode, activeTool, t])

  // Get app version from injected runtime state (or fallback)
  const version = window.__CADHY__?.version ? `v${window.__CADHY__.version}` : "v0.1.0"

  // Get real-time viewport coordinates from the store
  // - When no object selected: shows cursor position on ground plane (from raycasting)
  // - When object(s) selected: shows centroid of selection bounding box
  const coordinates = useCoordinates()
  const coordinateSource = useCoordinateSource()

  return (
    <footer
      className={cn(
        "flex h-7 shrink-0 items-center px-3 text-xs text-muted-foreground select-none transition-all duration-300",
        isMacOS ? "bg-background/60 backdrop-blur-md" : "bg-card/80 backdrop-blur-sm"
      )}
      role="status"
      aria-label="Application status bar"
    >
      {/* Left Section - Status & Node Info */}
      <div className="flex items-center gap-2 overflow-hidden mr-4">
        {/* Status Indicator with Auto-Save */}
        <div className="flex items-center gap-2">
          {isLoadingProject ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <HugeiconsIcon icon={Loading01Icon} className="size-3 animate-spin" />
              <span className="font-medium">{t("common.loading", "Loading...")}</span>
            </div>
          ) : autoSaveStatus === "saving" ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <HugeiconsIcon icon={FloppyDiskIcon} className="size-3 animate-pulse" />
              <span className="font-medium">{t("statusBar.saving", "Saving...")}</span>
            </div>
          ) : autoSaveStatus === "saved" ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 animate-in fade-in duration-300">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
              <span className="font-medium">{t("statusBar.saved", "Saved")}</span>
            </div>
          ) : autoSaveStatus === "error" ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
                    <HugeiconsIcon icon={Alert01Icon} className="size-3" />
                    <span className="font-medium">{t("statusBar.saveError", "Save failed")}</span>
                  </div>
                }
              />
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-red-400">{autoSaveError || "Unknown error"}</div>
              </TooltipContent>
            </Tooltip>
          ) : isDirty && currentProject ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-medium">{t("statusBar.modified", "Modified")}</span>
                    {countdownDisplay && (
                      <span className="text-amber-400/70 text-xs tabular-nums ml-1">
                        ({countdownDisplay})
                      </span>
                    )}
                  </div>
                }
              />
              <TooltipContent side="top">
                <div>{t("statusBar.unsavedChanges", "Unsaved changes")}</div>
                {countdownDisplay && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("statusBar.autoSaveIn", "Auto-save in")} {countdownDisplay}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ) : currentProject ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/80">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
                    <span className="font-medium">{t("statusBar.ready", "Ready")}</span>
                  </div>
                }
              />
              <TooltipContent side="top">
                {lastSavedDisplay ? (
                  <div>
                    {t("statusBar.lastSaved", "Last saved")}: {lastSavedDisplay}
                  </div>
                ) : (
                  <div>{t("statusBar.allChangesSaved", "All changes saved")}</div>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-muted/50 border border-border/30 text-muted-foreground">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
              <span className="font-medium">{t("statusBar.ready", "Ready")}</span>
            </div>
          )}
        </div>

        {notification && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in slide-in-from-left-2 duration-300"
            )}
            role="alert"
            aria-live="polite"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {t(notification.messageKey)}
            </span>
          </div>
        )}

        <span className="text-muted-foreground/30">│</span>

        {/* Selection Indicator & Info */}
        <div className="flex items-center gap-2 px-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-1.5 cursor-default text-foreground/80">
                  <HugeiconsIcon
                    icon={selectionMode === "body" ? PackageIcon : CubeIcon}
                    className="size-3"
                  />
                  <span className="font-medium capitalize">{selectionMode}</span>
                </div>
              }
            />
            <TooltipContent side="top">
              {t("statusBar.selectionMode", "Selection Mode")}: {selectionMode}
              <div className="text-xs text-muted-foreground mt-1">Keys 1, 2, 3, 4 to switch</div>
            </TooltipContent>
          </Tooltip>

          <span className="text-muted-foreground/30">│</span>
          <span className="text-foreground/70">{selectionSummary}</span>
        </div>

        <span className="text-muted-foreground/50">│</span>

        {/* Dynamic Hints Section */}
        <div className="flex items-center gap-3 overflow-hidden">
          {hints.map((hint) => (
            <div
              key={hint.kbd}
              className="flex items-center gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              <Kbd className="bg-muted px-1 py-0.5 text-xs min-w-[16px] flex justify-center">
                {formatKbd(hint.kbd)}
              </Kbd>
              <span className="text-muted-foreground/80">{hint.label}</span>
            </div>
          ))}
        </div>

        {/* Help / active tool info */}
        {activeTool && (
          <>
            <span className="text-muted-foreground/50">│</span>
            <div className="flex items-center gap-1.5 text-primary animate-pulse">
              <HugeiconsIcon icon={Message01Icon} className="size-3" />
              <span className="font-medium">
                {t(`tools.${activeTool}.hint`, `Using ${activeTool}`)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right Section - Metrics & Settings */}
      <div className="ml-auto flex items-center gap-2 h-full">
        {/* Coordinates Display */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-2xl bg-muted/40 cursor-default font-mono text-muted-foreground transition-all hover:bg-muted/60">
                <HugeiconsIcon icon={Target01Icon} className="size-3 text-primary/70 mr-1" />
                <span className="text-foreground/50">X</span>
                <span className="text-foreground/90 tabular-nums">{coordinates.x.toFixed(2)}</span>
                <span className="text-foreground/50 ml-1.5">Y</span>
                <span className="text-foreground/90 tabular-nums">{coordinates.y.toFixed(2)}</span>
                <span className="text-foreground/50 ml-1.5">Z</span>
                <span className="text-foreground/90 tabular-nums">{coordinates.z.toFixed(2)}</span>
              </div>
            }
          />
          <TooltipContent side="top">
            {coordinateSource === "selection"
              ? t("statusBar.selectionCenter", "Selection Center")
              : t("statusBar.cursorPosition")}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* Units Toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleUnitSystem}
                className="h-5 px-1.5 text-xs uppercase font-bold text-muted-foreground hover:text-foreground"
              >
                {unitSystem}
              </Button>
            }
          />
          <TooltipContent side="top">
            {t("statusBar.toggleUnits", "Switch Unit System")}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/30 hidden md:inline">│</span>

        {/* Metrics Section (Desktop only) */}
        <div className="hidden lg:flex items-center gap-3 px-1 text-muted-foreground/70">
          {/* FPS */}
          <div className="flex items-center gap-1">
            <span className="tabular-nums font-mono">{metrics.fps}</span>
            <span>FPS</span>
          </div>

          {/* CPU Usage */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-1">
                  <HugeiconsIcon icon={CpuIcon} className="size-3" />
                  <span className="tabular-nums font-mono">{metrics.cpuUsage.toFixed(1)}%</span>
                </div>
              }
            />
            <TooltipContent side="top">CADHY CPU Usage</TooltipContent>
          </Tooltip>

          {/* Memory Usage */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-1">
                  <span className="text-xs">RAM</span>
                  <span className="tabular-nums font-mono text-xs">
                    {metrics.memory} ({metrics.memoryPercent.toFixed(1)}%)
                  </span>
                </div>
              }
            />
            <TooltipContent side="top">CADHY Memory Usage</TooltipContent>
          </Tooltip>

          {/* GPU Info */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-1 max-w-[120px]">
                  <HugeiconsIcon icon={CubeIcon} className="size-3" />
                  <span className="text-xs truncate">{metrics.gpu}</span>
                </div>
              }
            />
            <TooltipContent side="top">Graphics: {metrics.gpu}</TooltipContent>
          </Tooltip>
        </div>

        <span className="text-muted-foreground/50">│</span>

        {/* App Version */}
        <div className="px-1 font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-default">
          {version}
        </div>
      </div>
    </footer>
  )
}

export default StatusBar
