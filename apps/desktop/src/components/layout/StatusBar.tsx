/**
 * StatusBar Component
 *
 * Professional status bar with system metrics, coordinates, and performance info.
 * Adapted from GraphCAD design patterns.
 */

import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
import {
  CheckmarkCircle02Icon,
  CpuIcon,
  CubeIcon,
  Link01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlatform } from "@/hooks/use-platform"
import { useUnits } from "@/hooks/use-units"
import { useStatusNotification } from "@/stores/status-notification-store"

// ============================================================================
// TYPES
// ============================================================================

interface PerformanceMetrics {
  fps: number
  memory: number // MB
  gpu: string
}

// UnitSystem type is now imported from useUnits hook

// ============================================================================
// HELPERS
// ============================================================================

function getFpsColor(fps: number): string {
  if (fps >= 55) return "text-emerald-500"
  if (fps >= 30) return "text-yellow-500"
  return "text-red-500"
}

function getMemoryColor(memory: number): string {
  if (memory < 500) return "text-emerald-500"
  if (memory < 1000) return "text-yellow-500"
  return "text-red-500"
}

// ============================================================================
// HOOKS
// ============================================================================

function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    gpu: "Unknown",
  })

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const measureFps = () => {
      frameCount++
      const currentTime = performance.now()

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))

        // Get memory if available
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize
          ? Math.round(
              (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
                .usedJSHeapSize /
                1024 /
                1024
            )
          : 0

        setMetrics((prev) => ({ ...prev, fps, memory }))

        frameCount = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(measureFps)
    }

    // Try to get GPU info - create context, read info, then destroy it
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info")
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL
        )
        // Shorten GPU name
        const shortGpu = renderer
          .replace(/ANGLE \(|\)/g, "")
          .replace(/Direct3D11 vs_5_0 ps_5_0, /g, "")
          .replace(/,.*$/, "")
          .trim()
          .slice(0, 25)
        setMetrics((prev) => ({ ...prev, gpu: shortGpu }))
      }
      // Destroy WebGL context immediately after reading GPU info
      const loseContext = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")
      if (loseContext) {
        loseContext.loseContext()
      }
    }
    // Remove canvas from memory
    canvas.width = 0
    canvas.height = 0

    animationId = requestAnimationFrame(measureFps)

    return () => cancelAnimationFrame(animationId)
  }, [])

  return metrics
}

// useUnitSystem is now replaced by the global useUnits hook from project-store

// ============================================================================
// COMPONENT
// ============================================================================

export function StatusBar() {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()
  const metrics = usePerformanceMetrics()
  const { unitSystem, toggleUnitSystem, lengthLabel } = useUnits()
  const notification = useStatusNotification()
  const [version, setVersion] = useState<string>("v0.1.0")

  // Get app version dynamically
  useEffect(() => {
    getVersion()
      .then((v) => setVersion(`v${v}`))
      .catch(() => setVersion("v0.1.0")) // Fallback
  }, [])

  // Mock data - replace with actual store values
  const nodeCount = 0
  const edgeCount = 0
  const isDirty = false
  const isExecuting = false

  // Mock coordinates
  const coordinates = { x: 0.0, y: 0.0, z: 0.0 }

  return (
    <footer
      className={cn(
        "flex h-6 shrink-0 items-center border-t px-2 text-[10px] text-muted-foreground select-none",
        isMacOS
          ? "border-border/30 bg-background/80 backdrop-blur-sm"
          : "border-border/50 bg-card/50"
      )}
      role="status"
      aria-label="Application status bar"
      aria-live="polite"
    >
      {/* Left Section - Status & Node Info */}
      <div className="flex items-center gap-2" role="group" aria-label="Project status">
        {/* Status Indicator */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1.5 cursor-default">
                <div
                  className={cn(
                    "size-1.5 rounded-full",
                    isExecuting
                      ? "bg-yellow-500 animate-pulse"
                      : isDirty
                        ? "bg-orange-500"
                        : "bg-emerald-500"
                  )}
                />
                <span className="text-foreground/70 font-medium">
                  {isExecuting
                    ? t("statusBar.processing")
                    : isDirty
                      ? t("statusBar.unsaved")
                      : t("statusBar.ready")}
                </span>
              </div>
            }
          />
          <TooltipContent side="top">
            {isExecuting
              ? t("statusBar.processing")
              : isDirty
                ? t("statusBar.unsaved")
                : t("statusBar.ready")}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* Save Notification - Subtle inline indicator */}
        {notification && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in slide-in-from-left-2 duration-300"
            role="alert"
            aria-live="polite"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {t(notification.messageKey)}
            </span>
          </div>
        )}

        {notification && <span className="text-muted-foreground/50">│</span>}

        {/* Node Count */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1 cursor-default">
                <HugeiconsIcon icon={CubeIcon} className="size-3" />
                <span>{nodeCount}</span>
              </div>
            }
          />
          <TooltipContent side="top">
            {nodeCount} {t("statusBar.objects")}
          </TooltipContent>
        </Tooltip>

        {/* Edge Count */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1 cursor-default">
                <HugeiconsIcon icon={Link01Icon} className="size-3" />
                <span>{edgeCount}</span>
              </div>
            }
          />
          <TooltipContent side="top">
            {edgeCount} {t("statusBar.connections")}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* Keyboard Shortcuts Hint */}
        <span className="text-muted-foreground/60 hidden md:inline">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Space</kbd>{" "}
          {t("toolbar.pan")}
          <span className="mx-1">•</span>
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Del</kbd>{" "}
          {t("toolbar.delete")}
        </span>
      </div>

      {/* Right Section - Metrics & Settings */}
      <div className="ml-auto flex items-center gap-2">
        {/* Coordinates Display */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 cursor-default font-mono text-muted-foreground">
                <HugeiconsIcon icon={Target01Icon} className="size-3 text-primary mr-1" />
                <span className="text-foreground/80">X</span>
                <span className="text-foreground">{coordinates.x.toFixed(2)}</span>
                <span className="text-foreground/80 ml-1">Y</span>
                <span className="text-foreground">{coordinates.y.toFixed(2)}</span>
                <span className="text-foreground/80 ml-1">Z</span>
                <span className="text-foreground">{coordinates.z.toFixed(2)}</span>
              </div>
            }
          />
          <TooltipContent side="top">{t("statusBar.cursorPosition")}</TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* Unit System Toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] font-medium hover:bg-muted"
                onClick={toggleUnitSystem}
              >
                {unitSystem === "metric" ? `SI (${lengthLabel})` : `IMP (${lengthLabel})`}
              </Button>
            }
          />
          <TooltipContent side="top">
            {t("statusBar.switchUnits", {
              units: unitSystem === "metric" ? t("statusBar.imperial") : t("statusBar.metric"),
            })}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* FPS Counter */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                className={cn(
                  "flex items-center gap-1 cursor-default font-mono",
                  getFpsColor(metrics.fps)
                )}
              >
                <span>{metrics.fps}</span>
                <span className="text-muted-foreground text-[9px]">{t("statusBar.fps")}</span>
              </div>
            }
          />
          <TooltipContent side="top">
            {t("statusBar.framesPerSecond")}
            <div className="text-muted-foreground">
              {metrics.fps >= 55
                ? `✓ ${t("statusBar.excellent")}`
                : metrics.fps >= 30
                  ? `⚠ ${t("statusBar.moderate")}`
                  : `✗ ${t("statusBar.low")}`}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Memory Usage */}
        {metrics.memory > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <div
                  className={cn(
                    "flex items-center gap-1 cursor-default font-mono",
                    getMemoryColor(metrics.memory)
                  )}
                >
                  <span>{metrics.memory}</span>
                  <span className="text-muted-foreground text-[9px]">MB</span>
                </div>
              }
            />
            <TooltipContent side="top">
              {t("statusBar.memoryUsage")}: {metrics.memory} MB
              <div className="text-muted-foreground">
                {metrics.memory < 500
                  ? `✓ ${t("statusBar.low")}`
                  : metrics.memory < 1000
                    ? `⚠ ${t("statusBar.moderate")}`
                    : `✗ High`}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        <span className="text-muted-foreground/50">│</span>

        {/* GPU Info */}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1 cursor-default max-w-[120px] truncate">
                <HugeiconsIcon icon={CpuIcon} className="size-3 shrink-0" />
                <span className="truncate">{metrics.gpu}</span>
              </div>
            }
          />
          <TooltipContent side="top">
            {t("statusBar.gpu")}: {metrics.gpu}
          </TooltipContent>
        </Tooltip>

        <span className="text-muted-foreground/50">│</span>

        {/* Version */}
        <span className="text-muted-foreground/60">{version}</span>
      </div>
    </footer>
  )
}
