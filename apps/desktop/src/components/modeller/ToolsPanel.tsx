/**
 * Tools Panel
 *
 * Unified panel for all advanced modeling and optimization tools
 */

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, ScrollArea } from "@cadhy/ui"
import { useState } from "react"
import { DebugStatsPanel } from "./panels/DebugStatsPanel"
import { MeasurementToolsPanel } from "./panels/MeasurementToolsPanel"
import { PerformanceSettingsPanel } from "./panels/PerformanceSettingsPanel"
import { SectionToolPanel } from "./panels/SectionToolPanel"
import { SnappingSettingsPanel } from "./panels/SnappingSettingsPanel"

type ToolSection = "measurement" | "section" | "snapping" | "performance" | "debug"

export function ToolsPanel() {
  const [openSections, setOpenSections] = useState<ToolSection[]>(["measurement"])

  return (
    <ScrollArea className="h-full">
      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={(value) => setOpenSections(value as ToolSection[])}
        className="w-full"
      >
        {/* Measurement Tools */}
        <AccordionItem value="measurement" className="border-b border-border/40">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Measurement Tools</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <MeasurementToolsPanel />
          </AccordionContent>
        </AccordionItem>

        {/* Section Tool */}
        <AccordionItem value="section" className="border-b border-border/40">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Section Tool</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <SectionToolPanel />
          </AccordionContent>
        </AccordionItem>

        {/* Snapping Settings */}
        <AccordionItem value="snapping" className="border-b border-border/40">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Smart Snapping</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <SnappingSettingsPanel />
          </AccordionContent>
        </AccordionItem>

        {/* Performance Settings */}
        <AccordionItem value="performance" className="border-b border-border/40">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Performance Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <PerformanceSettingsPanel />
          </AccordionContent>
        </AccordionItem>

        {/* Debug Stats */}
        <AccordionItem value="debug" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Debug Stats</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <DebugStatsPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollArea>
  )
}
