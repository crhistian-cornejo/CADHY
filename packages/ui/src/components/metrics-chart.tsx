"use client"

import { Badge } from "@cadhy/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cadhy/ui/components/card"
import type { ChartConfig } from "@cadhy/ui/components/chart"
import { ChartContainer } from "@cadhy/ui/components/chart"
import { cn } from "@cadhy/ui/lib/utils"
import { ComputerIcon, CpuIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion, useSpring } from "motion/react"
import * as React from "react"
import { Bar, BarChart, Cell, ReferenceLine } from "recharts"

const CHART_MARGIN = 35

export interface MetricsData {
  time: string
  value: number
}

export interface SystemMetricsChartProps {
  /** Title of the metric (e.g., "CPU Usage", "RAM Usage") */
  title: string
  /** Current percentage value (0-100) */
  currentValue: number
  /** Historical data points for the chart */
  data: MetricsData[]
  /** Percentage change from previous period */
  percentageChange?: number
  /** Icon to display - defaults to CpuIcon */
  icon?: typeof CpuIcon
  /** Color theme for the chart */
  colorTheme?: "primary" | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5"
  /** Description text below the title */
  description?: string
  /** Class name for additional styling */
  className?: string
}

/**
 * SystemMetricsChart - A beautiful animated bar chart for displaying system metrics
 *
 * Shows CPU or RAM usage with interactive hover states and smooth animations.
 * Adapted for CADHY's base-vega design system.
 */
export function SystemMetricsChart({
  title,
  data,
  percentageChange,
  icon = CpuIcon,
  colorTheme = "primary",
  description,
  className,
}: SystemMetricsChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

  // Chart configuration with theme support for light/dark modes
  const chartConfig = React.useMemo(
    () =>
      ({
        value: {
          label: title,
          theme: {
            light: `var(--${colorTheme})`,
            dark: `var(--${colorTheme})`,
          },
        },
      }) satisfies ChartConfig,
    [title, colorTheme]
  )

  // Calculate the displayed value (active bar or max value)
  const displayValue = React.useMemo(() => {
    if (activeIndex !== undefined && data[activeIndex]) {
      return { index: activeIndex, value: data[activeIndex].value }
    }
    return data.reduce(
      (max, item, index) => {
        return item.value > max.value ? { index, value: item.value } : max
      },
      { index: 0, value: 0 }
    )
  }, [activeIndex, data])

  // Spring animation for smooth value transitions
  const springValue = useSpring(displayValue.value, {
    stiffness: 100,
    damping: 20,
  })

  const [animatedValue, setAnimatedValue] = React.useState(displayValue.value)

  React.useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setAnimatedValue(Math.round(latest))
    })
    return unsubscribe
  }, [springValue])

  React.useEffect(() => {
    springValue.set(displayValue.value)
  }, [displayValue.value, springValue])

  // Determine value status color
  const getValueColor = (value: number) => {
    if (value >= 90) return "text-destructive"
    if (value >= 70) return "text-status-warning"
    return "text-foreground"
  }

  return (
    <Card className={cn("overflow-hidden", className)} size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={icon} className="size-5 text-muted-foreground" />
          <span
            className={cn("font-mono text-2xl tracking-tighter", getValueColor(displayValue.value))}
          >
            {animatedValue}%
          </span>
          {percentageChange !== undefined && (
            <Badge variant={percentageChange >= 0 ? "secondary" : "outline"} className="gap-1">
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: percentageChange >= 0 ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                ↑
              </motion.span>
              <span>{Math.abs(percentageChange).toFixed(1)}%</span>
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description || title}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="h-[80px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            onMouseLeave={() => setActiveIndex(undefined)}
            margin={{
              left: CHART_MARGIN,
              right: 5,
              top: 10,
              bottom: 5,
            }}
          >
            <Bar dataKey="value" fill={`var(--color-value)`} radius={[4, 4, 0, 0]} maxBarSize={24}>
              {data.map((item, index) => (
                <Cell
                  key={`${item.time}-${item.value}`}
                  className="transition-opacity duration-200 cursor-pointer"
                  opacity={index === displayValue.index ? 1 : 0.25}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              ))}
            </Bar>
            <ReferenceLine
              opacity={0.5}
              y={animatedValue}
              stroke="var(--foreground)"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={<ReferenceLabel value={displayValue.value} />}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface ReferenceLabelProps {
  viewBox?: {
    x?: number
    y?: number
  }
  value: number
}

const ReferenceLabel: React.FC<ReferenceLabelProps> = (props) => {
  const { viewBox, value } = props
  const x = viewBox?.x ?? 0
  const y = viewBox?.y ?? 0

  // Dynamic width based on value length
  const width = React.useMemo(() => {
    const characterWidth = 8
    const padding = 14
    return `${value}%`.length * characterWidth + padding
  }, [value])

  return (
    <>
      <rect
        x={x - CHART_MARGIN}
        y={y - 9}
        width={width}
        height={18}
        fill="var(--foreground)"
        rx={6}
      />
      <text
        className="font-mono"
        fontWeight={600}
        fontSize={11}
        x={x - CHART_MARGIN + 6}
        y={y + 4}
        fill="var(--background)"
      >
        {value}%
      </text>
    </>
  )
}

// ============================================================================
// CPU METRICS CHART
// ============================================================================

export interface CpuMetricsChartProps extends Omit<SystemMetricsChartProps, "title" | "icon"> {
  title?: string
}

/**
 * CpuMetricsChart - Specialized chart for CPU usage display
 */
export function CpuMetricsChart({
  title = "CPU",
  currentValue,
  data,
  percentageChange,
  colorTheme = "chart-2",
  description = "Current CPU utilization",
  ...props
}: CpuMetricsChartProps) {
  return (
    <SystemMetricsChart
      title={title}
      currentValue={currentValue}
      data={data}
      percentageChange={percentageChange}
      icon={CpuIcon}
      colorTheme={colorTheme}
      description={description}
      {...props}
    />
  )
}

// ============================================================================
// RAM METRICS CHART
// ============================================================================

export interface RamMetricsChartProps extends Omit<SystemMetricsChartProps, "title" | "icon"> {
  title?: string
  /** Memory in MB */
  memoryMb?: number
}

/**
 * RamMetricsChart - Specialized chart for RAM usage display
 */
export function RamMetricsChart({
  title = "RAM",
  currentValue,
  data,
  percentageChange,
  memoryMb,
  colorTheme = "chart-3",
  description,
  ...props
}: RamMetricsChartProps) {
  const memoryDescription = memoryMb ? `${memoryMb} MB used` : description || "Current memory usage"

  return (
    <SystemMetricsChart
      title={title}
      currentValue={currentValue}
      data={data}
      percentageChange={percentageChange}
      icon={ComputerIcon}
      colorTheme={colorTheme}
      description={memoryDescription}
      {...props}
    />
  )
}

export default SystemMetricsChart
