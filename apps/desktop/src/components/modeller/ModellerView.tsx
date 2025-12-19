/**
 * Modeller View Component - CADHY
 *
 * Main 3D modelling workspace with:
 * - Viewport with GPU-accelerated 3D rendering
 * - Toolbar for transform and view controls
 * - Left sidebar with tabs (Create, Props, Layers, Scene)
 * - Resizable panels
 */

import {
  Button,
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  Alert01Icon,
  CubeIcon,
  File01Icon,
  FolderOpenIcon,
  HierarchyIcon,
  Layers01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { listen } from "@tauri-apps/api/event"
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { PanelErrorBoundary, ViewerErrorBoundary } from "@/components/common"
import {
  useModellerStore,
  useNotificationSummary,
  useObjects,
  useSelectedIds,
  useSnapMode,
  useViewportSettings,
} from "@/stores/modeller-store"
import { useCurrentProject, useIsProjectLoading } from "@/stores/project-store"
import { BoxLoader } from "./BoxLoader"
import { CameraAnimationPanel } from "./CameraAnimationPanel"
import { CreatePanel } from "./CreatePanel"
import { LayersPanel } from "./LayersPanel"
import { NotificationsPanel } from "./NotificationsPanel"
import { PropertiesPanel } from "./PropertiesPanel"
import { ScenePanel } from "./ScenePanel"
import { Viewport3D } from "./Viewport3D"
import { ViewportToolbar } from "./ViewportToolbar"

// ============================================================================
// TYPES
// ============================================================================

interface ModellerViewProps {
  className?: string
  onNewProject?: () => void
  onOpenProject?: () => void
}

type LeftPanelTab = "create" | "props" | "layers" | "scene" | "checks"

// ============================================================================
// ANIMATED GRID BACKGROUND
// ============================================================================

function GridPattern({
  offsetX,
  offsetY,
}: {
  offsetX: ReturnType<typeof useMotionValue>
  offsetY: ReturnType<typeof useMotionValue>
}) {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="modeller-grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#modeller-grid-pattern)" />
    </svg>
  )
}

function AnimatedGridBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
  }

  const gridOffsetX = useMotionValue(0)
  const gridOffsetY = useMotionValue(0)

  const speedX = 0.3
  const speedY = 0.3

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get()
    const currentY = gridOffsetY.get()
    gridOffsetX.set((currentX + speedX) % 40)
    gridOffsetY.set((currentY + speedY) % 40)
  })

  const maskImage = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="absolute inset-0 overflow-hidden"
    >
      {/* Base grid - very subtle */}
      <div className="absolute inset-0 opacity-[0.03]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      {/* Interactive grid - follows mouse */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-[-15%] top-[-15%] w-[35%] h-[35%] rounded-full bg-primary/20 dark:bg-primary/10 blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[-15%] w-[35%] h-[35%] rounded-full bg-blue-500/20 dark:bg-blue-600/10 blur-[100px]" />
      </div>
    </div>
  )
}

// ============================================================================
// NO PROJECT SELECTED PAGE
// ============================================================================

interface NoProjectSelectedProps {
  onNewProject?: () => void
  onOpenProject?: () => void
}

function NoProjectSelected({ onNewProject, onOpenProject }: NoProjectSelectedProps) {
  const { t } = useTranslation()

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-background overflow-hidden">
      {/* Animated Grid Background */}
      <AnimatedGridBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-8">
        {/* Icon */}
        <div className="relative mb-6">
          <div className="size-20 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/40 backdrop-blur-sm">
            <HugeiconsIcon icon={CubeIcon} className="size-10 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 backdrop-blur-sm">
            <HugeiconsIcon icon={File01Icon} className="size-4 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-2">{t("modeller.noProjectSelected")}</h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">{t("modeller.noProjectSelectedDesc")}</p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 backdrop-blur-sm"
            onClick={onOpenProject}
          >
            <HugeiconsIcon icon={FolderOpenIcon} className="size-4" />
            {t("modeller.openProject")}
          </Button>
          <Button size="sm" className="gap-2" onClick={onNewProject}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            {t("modeller.newProject")}
          </Button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 backdrop-blur-sm border border-border text-[10px]">
              Cmd+N
            </kbd>
            <span>{t("modeller.new")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/80 backdrop-blur-sm border border-border text-[10px]">
              Cmd+O
            </kbd>
            <span>{t("modeller.open")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * ModellerView-specific keyboard shortcuts
 * Note: Most shortcuts are now handled by useAppHotkeys via hotkeyRegistry.
 * This hook only handles modeller-specific shortcuts that aren't global.
 */
function useKeyboardShortcuts(onToggleLeftPanel?: () => void) {
  const { undo, redo } = useModellerStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toLowerCase()
      const isCtrl = e.ctrlKey || e.metaKey

      // Toggle left panel (P key - modeller specific, not in global registry)
      if (key === "p" && !isCtrl) {
        onToggleLeftPanel?.()
      }
    }

    // Use capture phase to ensure we get events before Canvas/OrbitControls
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [onToggleLeftPanel])

  // Listen to Tauri menu events for undo/redo (macOS native menu)
  useEffect(() => {
    const unlisten = listen<string>("menu-event", (event) => {
      const menuId = event.payload
      if (menuId === "undo") {
        undo()
      } else if (menuId === "redo") {
        redo()
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [undo, redo])
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ModellerView({ className, onNewProject, onOpenProject }: ModellerViewProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<LeftPanelTab>("create")
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showAnimationPanel, setShowAnimationPanel] = useState(false)
  const selectedIds = useSelectedIds()
  const objects = useObjects()
  const notificationSummary = useNotificationSummary()
  const prevSelectedCountRef = useRef(0)
  const currentProject = useCurrentProject()
  const isLoading = useIsProjectLoading()

  // Toggle left panel callback for keyboard shortcut
  const handleToggleLeftPanel = useCallback(() => {
    setShowLeftPanel((prev) => !prev)
  }, [])

  // Toggle animation panel callback
  const handleToggleAnimationPanel = useCallback(() => {
    setShowAnimationPanel((prev) => !prev)
  }, [])

  // Enable keyboard shortcuts
  useKeyboardShortcuts(handleToggleLeftPanel)

  // Auto-switch to Props when an object is selected from viewport
  // Only switch if we went from 0 to 1+ selection AND we're on create/layers tab
  // Don't switch if on Scene tab (user is browsing objects there)
  useEffect(() => {
    const hadNoSelection = prevSelectedCountRef.current === 0
    const hasSelection = selectedIds.length > 0
    const shouldAutoSwitch = activeTab === "create" || activeTab === "layers"

    if (hasSelection && hadNoSelection && shouldAutoSwitch) {
      setActiveTab("props")
    }
    prevSelectedCountRef.current = selectedIds.length
  }, [selectedIds.length, activeTab])

  // Show loading state while project is being opened
  if (isLoading) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <BoxLoader message={t("modeller.loadingProject")} />
      </div>
    )
  }

  // If no project is open, show the "No Project Selected" page
  if (!currentProject) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <NoProjectSelected onNewProject={onNewProject} onOpenProject={onOpenProject} />
      </div>
    )
  }

  return (
    <div className={cn("flex h-full flex-row bg-background", className)}>
      {/* Main Content */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
        autoSaveId="cadhy-modeller-layout"
      >
        {/* Left Panel with Tabs */}
        {showLeftPanel && (
          <>
            <ResizablePanel
              id="left-panel"
              order={1}
              defaultSize={showAnimationPanel ? 25 : 35}
              minSize={20}
              maxSize={50}
            >
              <div className="flex h-full flex-col border-r border-border/40 bg-background">
                {/* Horizontal Tabs - symmetric with toolbar */}
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as LeftPanelTab)}
                  className="flex flex-col h-full"
                >
                  <div className="flex items-center gap-1 border-b border-border/40 bg-background/95 px-2 py-1 backdrop-blur-sm">
                    <TabsList className="flex-1 h-8 p-0.5 bg-muted/30 border rounded-md grid grid-cols-5 gap-0.5">
                      <TabsTrigger
                        value="create"
                        className="h-7 px-1.5 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm flex items-center justify-center gap-1"
                        title={t("modeller.tabs.createTooltip")}
                      >
                        <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                        <span className="hidden lg:inline">{t("modeller.tabs.create")}</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="props"
                        className="h-7 px-1.5 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm flex items-center justify-center gap-1 relative"
                        title={t("modeller.tabs.propsTooltip")}
                      >
                        <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />
                        <span className="hidden lg:inline">{t("modeller.tabs.props")}</span>
                        {selectedIds.length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 size-2 bg-green-500 rounded-full" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="layers"
                        className="h-7 px-1.5 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm flex items-center justify-center gap-1"
                        title={t("modeller.tabs.layersTooltip")}
                      >
                        <HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
                        <span className="hidden lg:inline">{t("modeller.tabs.layers")}</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="scene"
                        className="h-7 px-1.5 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm flex items-center justify-center gap-1 relative"
                        title={t("modeller.tabs.sceneTooltip")}
                      >
                        <HugeiconsIcon icon={HierarchyIcon} className="size-3.5" />
                        <span className="hidden lg:inline">{t("modeller.tabs.scene")}</span>
                        {objects.length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 size-3.5 text-[8px] bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                            {objects.length > 9 ? "9+" : objects.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="checks"
                        className="h-7 px-1.5 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm flex items-center justify-center gap-1 relative"
                        title={t("modeller.tabs.checksTooltip")}
                      >
                        <HugeiconsIcon icon={Alert01Icon} className="size-3.5" />
                        <span className="hidden lg:inline">{t("modeller.tabs.checks")}</span>
                        {notificationSummary.total > 0 && (
                          <span
                            className={cn(
                              "absolute -top-0.5 -right-0.5 size-3.5 text-[8px] rounded-full flex items-center justify-center font-medium",
                              notificationSummary.error > 0
                                ? "bg-red-500 text-white"
                                : notificationSummary.warning > 0
                                  ? "bg-amber-500 text-white"
                                  : "bg-blue-500 text-white"
                            )}
                          >
                            {notificationSummary.total > 9 ? "9+" : notificationSummary.total}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="create" className="h-full m-0 data-[state=inactive]:hidden">
                      <PanelErrorBoundary context="Create Panel">
                        <CreatePanel />
                      </PanelErrorBoundary>
                    </TabsContent>
                    <TabsContent value="props" className="h-full m-0 data-[state=inactive]:hidden">
                      <PanelErrorBoundary context="Properties Panel">
                        <PropertiesPanel />
                      </PanelErrorBoundary>
                    </TabsContent>
                    <TabsContent value="layers" className="h-full m-0 data-[state=inactive]:hidden">
                      <PanelErrorBoundary context="Layers Panel">
                        <LayersPanel />
                      </PanelErrorBoundary>
                    </TabsContent>
                    <TabsContent value="scene" className="h-full m-0 data-[state=inactive]:hidden">
                      <PanelErrorBoundary context="Scene Panel">
                        <ScenePanel />
                      </PanelErrorBoundary>
                    </TabsContent>
                    <TabsContent value="checks" className="h-full m-0 data-[state=inactive]:hidden">
                      <PanelErrorBoundary context="Notifications Panel">
                        <NotificationsPanel />
                      </PanelErrorBoundary>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />
          </>
        )}

        {/* Center - Viewport */}
        <ResizablePanel
          id="viewport"
          order={2}
          defaultSize={showAnimationPanel ? 50 : showLeftPanel ? 65 : 100}
          minSize={40}
        >
          <div className="h-full flex flex-col">
            {/* Viewport Toolbar */}
            <ViewportToolbar
              showLeftPanel={showLeftPanel}
              onToggleLeftPanel={handleToggleLeftPanel}
              showAnimationPanel={showAnimationPanel}
              onToggleAnimationPanel={handleToggleAnimationPanel}
            />

            {/* Viewport */}
            <div className="flex-1 relative">
              <ViewerErrorBoundary>
                <Viewport3D showAnimationPanel={showAnimationPanel} />
              </ViewerErrorBoundary>
            </div>
          </div>
        </ResizablePanel>

        {/* Right Panel - Camera Animations */}
        {showAnimationPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="animation-panel"
              order={3}
              defaultSize={25}
              minSize={20}
              maxSize={40}
            >
              <PanelErrorBoundary context="Camera Animation Panel">
                <CameraAnimationPanel onClose={handleToggleAnimationPanel} />
              </PanelErrorBoundary>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}

export default ModellerView
