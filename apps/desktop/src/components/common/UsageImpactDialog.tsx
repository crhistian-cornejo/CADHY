"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import { cn } from "@cadhy/ui/lib/utils"
import { Analytics02Icon, ComputerIcon, CpuIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { invoke } from "@tauri-apps/api/core"
import * as React from "react"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

interface SystemMetrics {
  memoryUsedMb: number
  memoryTotalMb: number
  memoryPercent: number
  cpuUsage: number
  gpuInfo: string
}

interface MetricsDataPoint {
  time: string
  ram: number
  cpu: number
}

// ============================================================================
// HOOKS - 1 minute of data (12 points @ 5s each)
// ============================================================================

const MAX_HISTORY_POINTS = 12
const POLL_INTERVAL = 5000 // 5 seconds

function useMetricsHistory() {
  const [currentMetrics, setCurrentMetrics] = React.useState<SystemMetrics | null>(null)
  const [history, setHistory] = React.useState<MetricsDataPoint[]>([])

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const metrics = await invoke<SystemMetrics>("get_system_metrics")
        setCurrentMetrics(metrics)

        const timestamp = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          minute: "2-digit",
          second: "2-digit",
        })

        setHistory((prev) => [
          ...prev.slice(-(MAX_HISTORY_POINTS - 1)),
          {
            time: timestamp,
            ram: Math.round(metrics.memoryPercent * 10) / 10,
            cpu: Math.round(metrics.cpuUsage * 10) / 10,
          },
        ])
      } catch (error) {
        console.error("[UsageImpactPopover] Failed to fetch metrics:", error)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return { currentMetrics, history }
}

// ============================================================================
// MINI BAR CHART - SIMPLE, NO ANIMATION BUGS
// ============================================================================

interface MiniBarChartProps {
  data: { time: string; value: number }[]
  height?: number
  className?: string
}

function MiniBarChart({ data, height = 32, className }: MiniBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  // Pad data to always show 12 bars
  const paddedData = React.useMemo(() => {
    if (data.length >= MAX_HISTORY_POINTS) return data
    const padding = Array(MAX_HISTORY_POINTS - data.length)
      .fill(null)
      .map((_, i) => ({ time: "", value: 0 }))
    return [...padding, ...data]
  }, [data])

  // Dynamic scale
  const maxValue = React.useMemo(() => {
    const dataMax = Math.max(...data.map((d) => d.value), 1)
    return Math.max(5, Math.ceil(dataMax * 1.2))
  }, [data])

  const hoveredPoint = hoveredIndex !== null ? paddedData[hoveredIndex] : null

  return (
    <div className={cn("space-y-1", className)}>
      {/* Bar chart */}
      <div
        className="flex items-end gap-0.5"
        style={{ height }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {paddedData.map((point, index) => {
          const barHeight = Math.max(2, (point.value / maxValue) * height)
          const isHovered = hoveredIndex === index
          const isLatest = index === paddedData.length - 1 && point.value > 0
          const hasData = point.value > 0

          return (
            <div
              key={`bar-${index}`}
              className={cn(
                "flex-1 rounded-sm transition-all duration-200 ease-out",
                hasData
                  ? isHovered || isLatest
                    ? "bg-foreground/60"
                    : "bg-foreground/20"
                  : "bg-foreground/5"
              )}
              style={{
                height: barHeight,
                minWidth: 6,
              }}
              onMouseEnter={() => hasData && setHoveredIndex(index)}
            />
          )
        })}
      </div>

      {/* Hover info - fixed height to prevent layout shift */}
      <div className="h-3.5 text-[10px] tabular-nums">
        {hoveredPoint && hoveredPoint.time ? (
          <span className="font-medium text-foreground">{hoveredPoint.value}%</span>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================================
// USAGE IMPACT POPOVER
// ============================================================================

interface UsageImpactPopoverProps {
  className?: string
}

export function UsageImpactPopover({ className }: UsageImpactPopoverProps) {
  const { t } = useTranslation()
  const { currentMetrics, history } = useMetricsHistory()
  const [open, setOpen] = React.useState(false)

  if (!currentMetrics) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground/50", className)}>
        <HugeiconsIcon icon={Analytics02Icon} className="size-3.5 animate-pulse" />
      </div>
    )
  }

  const ramData = history.map((h) => ({ time: h.time, value: h.ram }))
  const cpuData = history.map((h) => ({ time: h.time, value: h.cpu }))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-md",
                "hover:bg-muted/60 transition-colors duration-150",
                "cursor-pointer text-muted-foreground hover:text-foreground",
                className
              )}
            >
              <HugeiconsIcon icon={Analytics02Icon} className="size-3.5" />
              <span className="text-xs font-mono tabular-nums">
                {currentMetrics.memoryPercent.toFixed(1)}%
              </span>
            </PopoverTrigger>
          }
        />
        <TooltipContent side="top" className="text-center">
          <div className="font-medium">{t("statusBar.usageImpact", "Usage Impact")}</div>
          <div className="text-xs text-muted-foreground">
            {t("statusBar.clickToShowGraphs", "Click to show graphs")}
          </div>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className={cn(
          "w-64 p-3",
          // Smooth enter/exit animations
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=top]:slide-in-from-bottom-2"
        )}
      >
        {/* RAM Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={ComputerIcon} className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">RAM</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {currentMetrics.memoryUsedMb} MB ({currentMetrics.memoryPercent.toFixed(1)}%)
            </span>
          </div>
          <MiniBarChart data={ramData} height={28} />
        </div>

        {/* CPU Section */}
        <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={CpuIcon} className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">CPU</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {currentMetrics.cpuUsage.toFixed(1)}%
            </span>
          </div>
          <MiniBarChart data={cpuData} height={28} />
        </div>

        {/* Time scale */}
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/40">
          <span>1 min</span>
          <span>{t("common.now", "now")}</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { UsageImpactPopover as UsageImpactDialog }
export default UsageImpactPopover
