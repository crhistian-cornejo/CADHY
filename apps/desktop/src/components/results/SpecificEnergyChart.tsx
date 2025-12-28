/**
 * SpecificEnergyChart - E-y Diagram (Specific Energy vs Depth)
 *
 * Displays specific energy diagram with dynamic unit conversion.
 */

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useUnits } from "@/hooks/use-units"
import type { GvfStation, GvfSummary } from "./types"

interface SpecificEnergyChartProps {
  stations: GvfStation[]
  summary: GvfSummary
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { station: number } }>
  lengthLabel: string
  precision: number
}

function CustomTooltip({ active, payload, lengthLabel, precision }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]?.payload
  return (
    <div className="bg-popover border border-border rounded-2xl p-2 shadow-lg text-xs">
      <p className="font-medium mb-1">
        Station: {data?.station?.toFixed(precision)} {lengthLabel}
      </p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-blue-400">
          {entry.name}: {entry.value.toFixed(precision)} {lengthLabel}
        </p>
      ))}
    </div>
  )
}

export function SpecificEnergyChart({ stations, summary }: SpecificEnergyChartProps) {
  const { lengthLabel, convertLengthToDisplay, precision } = useUnits()
  // Prepare chart data with converted values
  const data = stations.map((s) => ({
    station: convertLengthToDisplay(s.station),
    y: convertLengthToDisplay(s.waterDepth),
    E: convertLengthToDisplay(s.specificEnergy),
  }))

  const { criticalDepth } = summary

  // Minimum specific energy at critical depth (converted)
  const Emin = convertLengthToDisplay(criticalDepth * 1.5) // For rectangular: Emin = 1.5 * yc

  // Calculate y-axis and x-axis domains
  const maxY = Math.max(...data.map((d) => d.y)) * 1.2
  const maxE = Math.max(...data.map((d) => d.E)) * 1.1

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />

        <XAxis
          dataKey="E"
          type="number"
          domain={[0, maxE]}
          tickFormatter={(v) => v.toFixed(2)}
          label={{
            value: `Specific Energy E (${lengthLabel})`,
            position: "bottom",
            offset: 15,
            className: "fill-muted-foreground text-xs",
          }}
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />

        <YAxis
          dataKey="y"
          type="number"
          domain={[0, maxY]}
          tickFormatter={(v) => v.toFixed(2)}
          label={{
            value: `Depth y (${lengthLabel})`,
            angle: -90,
            position: "insideLeft",
            className: "fill-muted-foreground text-xs",
          }}
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />

        <Tooltip content={<CustomTooltip lengthLabel={lengthLabel} precision={precision} />} />

        {/* Critical depth reference line */}
        <ReferenceLine
          y={convertLengthToDisplay(summary.criticalDepth)}
          stroke="#eab308"
          strokeDasharray="5 5"
          label={{
            value: "yc",
            position: "right",
            className: "fill-amber-500 text-xs",
          }}
        />

        {/* Normal depth reference line */}
        <ReferenceLine
          y={convertLengthToDisplay(summary.normalDepth)}
          stroke="#22c55e"
          strokeDasharray="5 5"
          label={{
            value: "yn",
            position: "right",
            className: "fill-emerald-500 text-xs",
          }}
        />

        {/* Minimum energy reference line */}
        <ReferenceLine
          x={Emin}
          stroke="#f97316"
          strokeDasharray="3 3"
          label={{
            value: "Emin",
            position: "top",
            className: "fill-orange-500 text-xs",
          }}
        />

        {/* Computed points */}
        <Scatter data={data} dataKey="y" fill="#3b82f6" name="Computed" />

        {/* Connect points with line */}
        <Line
          type="monotone"
          dataKey="y"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          name="Profile"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
