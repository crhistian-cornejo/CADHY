/**
 * WseProfileChart - Water Surface Profile Chart
 *
 * Shows bed elevation, water surface, and energy grade line
 * with dynamic unit conversion based on global settings.
 */

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useUnits } from "@/hooks/use-units"
import type { GvfStation, GvfSummary } from "./types"

interface WseProfileChartProps {
  stations: GvfStation[]
  summary: GvfSummary
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
  lengthLabel: string
  precision: number
}

function CustomTooltip({ active, payload, label, lengthLabel, precision }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
      <p className="font-medium mb-1">
        Station: {label?.toFixed(precision)} {lengthLabel}
      </p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(precision)} {lengthLabel}
        </p>
      ))}
    </div>
  )
}

export function WseProfileChart({ stations, summary }: WseProfileChartProps) {
  const { lengthLabel, convertLengthToDisplay, precision } = useUnits()

  // Prepare chart data with converted values
  const data = stations.map((s) => ({
    station: convertLengthToDisplay(s.station),
    bed: convertLengthToDisplay(s.bedElevation),
    wse: convertLengthToDisplay(s.wse),
    egl: convertLengthToDisplay(s.egl),
    yn: convertLengthToDisplay(s.bedElevation + summary.normalDepth),
    yc: convertLengthToDisplay(s.bedElevation + summary.criticalDepth),
  }))

  // Calculate y-axis domain
  const minElev = Math.min(...data.map((d) => d.bed))
  const maxElev = Math.max(...data.map((d) => d.egl))
  const domainPadding = (maxElev - minElev) * 0.1

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />

        <XAxis
          dataKey="station"
          type="number"
          domain={["auto", "auto"]}
          tickFormatter={(v) => v.toFixed(0)}
          label={{
            value: `Station (${lengthLabel})`,
            position: "bottom",
            offset: 15,
            className: "fill-muted-foreground text-[10px]",
          }}
          className="text-[10px]"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />

        <YAxis
          type="number"
          domain={[minElev - domainPadding, maxElev + domainPadding]}
          tickFormatter={(v) => v.toFixed(2)}
          label={{
            value: `Elevation (${lengthLabel})`,
            angle: -90,
            position: "insideLeft",
            className: "fill-muted-foreground text-[10px]",
          }}
          className="text-[10px]"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />

        <Tooltip content={<CustomTooltip lengthLabel={lengthLabel} precision={precision} />} />

        {/* Bed elevation (area fill) */}
        <Area
          type="monotone"
          dataKey="bed"
          name="Bed"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          fillOpacity={0.5}
        />

        {/* Normal depth line */}
        <Line
          type="monotone"
          dataKey="yn"
          name="Normal (yn)"
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
        />

        {/* Critical depth line */}
        <Line
          type="monotone"
          dataKey="yc"
          name="Critical (yc)"
          stroke="#eab308"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
        />

        {/* Water surface elevation */}
        <Line
          type="monotone"
          dataKey="wse"
          name="Water Surface"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />

        {/* Energy grade line */}
        <Line
          type="monotone"
          dataKey="egl"
          name="Energy Line"
          stroke="#f97316"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
