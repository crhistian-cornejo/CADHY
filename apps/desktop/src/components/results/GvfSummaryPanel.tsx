/**
 * GvfSummaryPanel - Summary statistics for GVF analysis
 *
 * All values are stored in SI units internally and displayed
 * according to the global unit system settings.
 */

import { useUnits } from "@/hooks/use-units"
import { SummaryCard } from "./SummaryCard"
import type { GvfSummary } from "./types"

interface GvfSummaryPanelProps {
  summary: GvfSummary
}

export function GvfSummaryPanel({ summary }: GvfSummaryPanelProps) {
  const { formatLength } = useUnits()

  const getVelocityStatus = (v: number) => {
    if (v < 0.3) return "warning" // Sedimentation risk
    if (v > 5.0) return "danger" // High erosion
    if (v > 3.5) return "warning" // Erosion warning
    return "normal"
  }

  const getFroudeStatus = (fr: number) => {
    if (fr < 0.95) return "normal" // Subcritical
    if (fr > 1.05) return "danger" // Supercritical
    return "warning" // Critical
  }

  return (
    <div className="space-y-4 p-4">
      {/* Depths */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Depths
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Normal Depth (yn)" value={summary.normalDepth} unitType="length" />
          <SummaryCard
            label="Critical Depth (yc)"
            value={summary.criticalDepth}
            unitType="length"
          />
        </div>
      </div>

      {/* Flow Parameters */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Flow Parameters
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Discharge (Q)" value={summary.discharge} unitType="flowRate" />
          <SummaryCard label="Slope (S₀)" value={summary.slope} />
          <SummaryCard label="Manning's n" value={summary.manningN} />
          {summary.profileType && (
            <SummaryCard
              label="Profile Type"
              value={summary.profileType}
              status={summary.profileType.startsWith("S") ? "warning" : "normal"}
            />
          )}
        </div>
      </div>

      {/* Velocity */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Velocity
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard
            label="Min"
            value={summary.minVelocity}
            unitType="velocity"
            status={getVelocityStatus(summary.minVelocity)}
          />
          <SummaryCard label="Avg" value={summary.avgVelocity} unitType="velocity" />
          <SummaryCard
            label="Max"
            value={summary.maxVelocity}
            unitType="velocity"
            status={getVelocityStatus(summary.maxVelocity)}
          />
        </div>
      </div>

      {/* Froude Number */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Froude Number
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label="Min Fr"
            value={summary.minFroude}
            status={getFroudeStatus(summary.minFroude)}
          />
          <SummaryCard
            label="Max Fr"
            value={summary.maxFroude}
            status={getFroudeStatus(summary.maxFroude)}
          />
        </div>
      </div>

      {/* Hydraulic Jump */}
      {summary.hasHydraulicJump && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Hydraulic Jump
          </h3>
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-500 font-medium">
              Jump detected at station {formatLength(summary.jumpStation ?? 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
