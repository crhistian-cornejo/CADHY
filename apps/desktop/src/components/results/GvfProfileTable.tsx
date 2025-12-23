/**
 * GvfProfileTable - Station-by-station data table
 *
 * Displays GVF analysis results with dynamic unit conversion
 * based on global unit system settings.
 */

import { cn } from "@cadhy/ui/lib/utils"
import { useUnits } from "@/hooks/use-units"
import type { GvfStation, GvfSummary } from "./types"

interface GvfProfileTableProps {
  stations: GvfStation[]
  summary: GvfSummary
}

export function GvfProfileTable({ stations, summary }: GvfProfileTableProps) {
  const {
    lengthLabel,
    velocityLabel,
    areaLabel,
    convertLengthToDisplay,
    convertVelocityToDisplay,
    convertAreaToDisplay,
    precision,
  } = useUnits()
  const getFroudeColor = (fr: number) => {
    if (fr < 0.95) return "text-blue-500" // Subcritical
    if (fr > 1.05) return "text-red-500" // Supercritical
    return "text-amber-500" // Critical
  }

  const getVelocityColor = (v: number) => {
    if (v < 0.3) return "text-blue-400" // Sedimentation risk
    if (v > 5.0) return "text-red-500" // High erosion
    if (v > 3.5) return "text-amber-500" // Erosion warning
    return "text-foreground" // Normal
  }

  const getDepthIndicator = (depth: number) => {
    const yn = summary.normalDepth
    const yc = summary.criticalDepth

    if (Math.abs(depth - yn) < 0.01) return { symbol: "yn", color: "text-emerald-500" }
    if (Math.abs(depth - yc) < 0.01) return { symbol: "yc", color: "text-amber-500" }
    if (depth > yn && depth > yc) return { symbol: "", color: "" }
    return { symbol: "", color: "" }
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs font-mono">
        <thead className="sticky top-0 bg-background border-b border-border">
          <tr className="text-left text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">Station</th>
            <th className="px-2 py-1.5 font-medium">z₀</th>
            <th className="px-2 py-1.5 font-medium">y</th>
            <th className="px-2 py-1.5 font-medium">WSE</th>
            <th className="px-2 py-1.5 font-medium">EGL</th>
            <th className="px-2 py-1.5 font-medium">V</th>
            <th className="px-2 py-1.5 font-medium">Fr</th>
            <th className="px-2 py-1.5 font-medium">A</th>
            <th className="px-2 py-1.5 font-medium">R</th>
          </tr>
          <tr className="text-xs text-muted-foreground/70">
            <th className="px-2 pb-1">({lengthLabel})</th>
            <th className="px-2 pb-1">({lengthLabel})</th>
            <th className="px-2 pb-1">({lengthLabel})</th>
            <th className="px-2 pb-1">({lengthLabel})</th>
            <th className="px-2 pb-1">({lengthLabel})</th>
            <th className="px-2 pb-1">({velocityLabel})</th>
            <th className="px-2 pb-1">(-)</th>
            <th className="px-2 pb-1">({areaLabel})</th>
            <th className="px-2 pb-1">({lengthLabel})</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station, idx) => {
            const depthIndicator = getDepthIndicator(station.waterDepth)
            return (
              <tr
                key={idx}
                className={cn(
                  "border-b border-border/50 hover:bg-muted/30 transition-colors",
                  station.flowRegime === "critical" && "bg-amber-500/5",
                  station.flowRegime === "supercritical" && "bg-red-500/5"
                )}
              >
                <td className="px-2 py-1">
                  {convertLengthToDisplay(station.station).toFixed(precision)}
                </td>
                <td className="px-2 py-1 text-muted-foreground">
                  {convertLengthToDisplay(station.bedElevation).toFixed(precision)}
                </td>
                <td className="px-2 py-1">
                  <span className={depthIndicator.color || ""}>
                    {convertLengthToDisplay(station.waterDepth).toFixed(precision)}
                    {depthIndicator.symbol && (
                      <span className="ml-1 text-xs">{depthIndicator.symbol}</span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-1 text-blue-400">
                  {convertLengthToDisplay(station.wse).toFixed(precision)}
                </td>
                <td className="px-2 py-1 text-orange-400">
                  {convertLengthToDisplay(station.egl).toFixed(precision)}
                </td>
                <td className={cn("px-2 py-1", getVelocityColor(station.velocity))}>
                  {convertVelocityToDisplay(station.velocity).toFixed(precision)}
                </td>
                <td className={cn("px-2 py-1 font-medium", getFroudeColor(station.froude))}>
                  {station.froude.toFixed(precision)}
                </td>
                <td className="px-2 py-1 text-muted-foreground">
                  {convertAreaToDisplay(station.area).toFixed(precision)}
                </td>
                <td className="px-2 py-1 text-muted-foreground">
                  {convertLengthToDisplay(station.hydraulicRadius).toFixed(precision)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
