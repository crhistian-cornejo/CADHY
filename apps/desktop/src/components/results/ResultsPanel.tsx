/**
 * ResultsPanel - Main container for hydraulic analysis results
 *
 * Displays GVF analysis results with tabs for:
 * - Profile chart (water surface elevation)
 * - Data table (station-by-station)
 * - E-y diagram (specific energy)
 * - Summary statistics
 */

import { cn } from "@cadhy/ui/lib/utils"
import { useState } from "react"
import { GvfProfileTable } from "./GvfProfileTable"
import { GvfSummaryPanel } from "./GvfSummaryPanel"
import { SpecificEnergyChart } from "./SpecificEnergyChart"
import type { GvfResult, ResultTab } from "./types"
import { WseProfileChart } from "./WseProfileChart"

interface ResultsPanelProps {
  result: GvfResult | null
  className?: string
}

const tabs: { id: ResultTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "table", label: "Table" },
  { id: "energy", label: "E-y Diagram" },
  { id: "summary", label: "Summary" },
]

export function ResultsPanel({ result, className }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>("profile")

  if (!result) {
    return (
      <div
        className={cn("flex items-center justify-center h-full text-muted-foreground", className)}
      >
        <div className="text-center">
          <p className="text-sm">No analysis results</p>
          <p className="text-xs mt-1">Run hydraulic analysis to see results</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Status indicators */}
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Q: {result.summary.discharge.toFixed(3)} m³/s</span>
          <span className="text-border">|</span>
          <span>S₀: {result.summary.slope.toFixed(4)}</span>
          {result.summary.profileType && (
            <>
              <span className="text-border">|</span>
              <span
                className={cn(
                  result.summary.profileType.startsWith("S") && "text-amber-500",
                  result.summary.profileType.startsWith("M") && "text-blue-500"
                )}
              >
                {result.summary.profileType}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "profile" && (
          <div className="h-full p-2">
            <WseProfileChart stations={result.stations} summary={result.summary} />
          </div>
        )}

        {activeTab === "table" && (
          <GvfProfileTable stations={result.stations} summary={result.summary} />
        )}

        {activeTab === "energy" && (
          <div className="h-full p-2">
            <SpecificEnergyChart stations={result.stations} summary={result.summary} />
          </div>
        )}

        {activeTab === "summary" && (
          <div className="h-full overflow-auto">
            <GvfSummaryPanel summary={result.summary} />
          </div>
        )}
      </div>

      {/* Legend (for chart views) */}
      {(activeTab === "profile" || activeTab === "energy") && (
        <div className="flex items-center justify-center gap-4 py-1.5 border-t border-border text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500" />
            <span className="text-muted-foreground">Water Surface</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-0.5 bg-orange-500 border-dashed"
              style={{ borderTop: "1px dashed" }}
            />
            <span className="text-muted-foreground">Energy Line</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-0.5 bg-emerald-500 border-dashed"
              style={{ borderTop: "1px dashed" }}
            />
            <span className="text-muted-foreground">Normal (yn)</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-0.5 bg-amber-500 border-dashed"
              style={{ borderTop: "1px dashed" }}
            />
            <span className="text-muted-foreground">Critical (yc)</span>
          </div>
        </div>
      )}
    </div>
  )
}
