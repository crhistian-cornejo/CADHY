/**
 * Drawings View Component - CADHY
 *
 * Dedicated view for technical drawings (planos técnicos):
 * - Full 2D viewport for technical drawings
 * - Top toolbar with drawing tools
 * - Right collapsible properties panel
 * - Left sidebar for drawing management
 */

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@cadhy/ui"
import { PanelErrorBoundary } from "@/components/common"
import { useDrawingStore } from "@/stores/drawing-store"
import { useShowModellerLeft, useShowModellerRight } from "@/stores/layout-store"
import { DrawingPropertiesPanel } from "./panels/DrawingPropertiesPanel"
import { DrawingsListPanel } from "./panels/DrawingsListPanel"
import { DrawingToolbar } from "./toolbars/DrawingToolbar"
import { Viewport2D } from "./viewport/Viewport2D"

// ============================================================================
// COMPONENT
// ============================================================================

interface DrawingsViewProps {
  onNewProject?: () => void
  onOpenProject?: () => void
}

export function DrawingsView({ onNewProject, onOpenProject }: DrawingsViewProps) {
  const showLeftPanel = useShowModellerLeft()
  const showRightPanel = useShowModellerRight()

  const activeDrawingId = useDrawingStore((s) => s.activeDrawingId)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left sidebar - Drawings list (min size by default) */}
        {showLeftPanel && (
          <>
            <ResizablePanel
              id="drawings-left-panel"
              order={1}
              defaultSize={15}
              minSize={12}
              maxSize={25}
              className="border-r border-border/40 overflow-hidden"
            >
              <PanelErrorBoundary>
                <DrawingsListPanel />
              </PanelErrorBoundary>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Main viewport area - maximized by default */}
        <ResizablePanel
          id="drawings-viewport"
          order={2}
          defaultSize={
            showLeftPanel && showRightPanel ? 70 : showLeftPanel || showRightPanel ? 85 : 100
          }
          minSize={50}
        >
          <div className="relative h-full w-full">
            <Viewport2D drawingId={activeDrawingId} />
            {/* Floating vertical toolbar */}
            <DrawingToolbar className="absolute left-3 top-1/2 -translate-y-1/2 z-10" />
          </div>
        </ResizablePanel>

        {/* Right sidebar - Properties panel (min size by default) */}
        {showRightPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="drawings-right-panel"
              order={3}
              defaultSize={15}
              minSize={12}
              maxSize={25}
              className="border-l border-border/40 overflow-hidden"
            >
              <PanelErrorBoundary>
                <DrawingPropertiesPanel />
              </PanelErrorBoundary>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
