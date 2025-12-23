/**
 * StatusBar Component
 *
 * Professional status bar with system metrics, coordinates, and performance info.
 * Adapted from GraphCAD design patterns.
 */

import { Button, cn, formatKbd, Kbd, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
import {
  CheckmarkCircle02Icon,
  CpuIcon,
  CubeIcon,
  GridIcon,
  Loading01Icon,
  MagnetIcon,
  Message01Icon,
  PackageIcon,
  Target01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlatform } from "@/hooks/use-platform"
import { useUnits } from "@/hooks/use-units"
import {
  useActiveTool,
  useCameraView,
  useGridSettings,
  useIsDirty,
  useObjects,
  useSelectedObjects,
  useSelectionMode,
  useTransformMode,
} from "@/stores/modeller"
import { useIsProjectLoading } from "@/stores/project-store"
import { useStatusNotification } from "@/stores/status-notification-store"

// ============================================================================
// PERFORMANCE METRICS HOOK
// ============================================================================

interface PerformanceMetrics {
  fps: number
  memory: string
  gpu: string
}

function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: "0 MB",
    gpu: "...",
  })

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const update = () => {
      frameCount++
      const currentTime = performance.now()

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))

        // Get memory usage if available
        const memory = (performance as any).memory
          ? `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)} MB`
          : "N/A"

        // GPU info (simplified)
        const gpu = "Discrete GPU"

        setMetrics({ fps, memory, gpu })
        frameCount = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(update)
    }

    animationId = requestAnimationFrame(update)

    return () => cancelAnimationFrame(animationId)
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

  // Modeller Store Hooks
  const objects = useObjects()
  const selectedObjects = useSelectedObjects()
  const selectionMode = useSelectionMode()
  const transformMode = useTransformMode()
  const activeTool = useActiveTool()
  const gridSettings = useGridSettings()
  const cameraView = useCameraView()
  const isDirty = useIsDirty()

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

  // Cursor coordinates tracking - simplified placeholder
  const coordinates = { x: 0.0, y: 0.0, z: 0.0 }

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
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {isLoadingProject ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <HugeiconsIcon icon={Loading01Icon} className="size-3 animate-spin" />
              <span className="font-medium">{t("common.loading", "Loading...")}</span>
            </div>
          ) : isDirty ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-medium">{t("statusBar.modified", "Modified")}</span>
                  </div>
                }
              />
              <TooltipContent side="top">
                {t("statusBar.unsavedChanges", "Unsaved changes")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/80">
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
        {/* View/Projection Mode */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-muted/50 transition-colors cursor-default rounded-2xl border border-transparent hover:border-border/30">
                <HugeiconsIcon icon={ViewIcon} className="size-3 text-muted-foreground" />
                <span className="font-medium uppercase tracking-wider text-xs">{cameraView}</span>
              </div>
            }
          />
          <TooltipContent side="top">
            {t("modeller.view", "View")}: {cameraView}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* Grid Setting */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-muted/50 transition-colors cursor-default rounded-2xl border border-transparent hover:border-border/30">
                <HugeiconsIcon icon={GridIcon} className="size-3 text-muted-foreground" />
                <span className="tabular-nums">{gridSettings.size}m</span>
                {gridSettings.snapEnabled && (
                  <HugeiconsIcon icon={MagnetIcon} className="size-2.5 text-primary ml-0.5" />
                )}
              </div>
            }
          />
          <TooltipContent side="top">
            {t("statusBar.gridSize", "Grid Size")}: {gridSettings.size}m
            {gridSettings.snapEnabled && (
              <div className="text-primary text-xs">Snap active ({gridSettings.snapSize}m)</div>
            )}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

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
          <TooltipContent side="top">{t("statusBar.cursorPosition")}</TooltipContent>
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
          <div className="flex items-center gap-1">
            <span className="tabular-nums font-mono">{metrics.fps}</span>
            <span>FPS</span>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-1">
                  <HugeiconsIcon icon={CpuIcon} className="size-3" />
                  <span className="tabular-nums font-mono">{metrics.memory}</span>
                </div>
              }
            />
            <TooltipContent side="top">{t("statusBar.memoryUsage")}</TooltipContent>
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
