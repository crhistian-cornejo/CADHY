/**
 * Modeller View Component - CADHY
 *
 * Main 3D modelling workspace with Plasticity-inspired layout:
 * - Left sidebar with 2 tabs (Outliner/Scene + Assets/Props)
 * - Full viewport with floating overlays inside (toolbars, panels)
 * - All toolbars are inside the 3D viewport as floating overlays
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
import { Add01Icon, CubeIcon, File01Icon, FolderOpenIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { listen } from "@tauri-apps/api/event"
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { PanelErrorBoundary, ViewerErrorBoundary } from "@/components/common"
import { useGlobalHotkeyHandler } from "@/hooks"
import { useLayoutActions, useShowModellerLeft, useShowModellerRight } from "@/stores/layout-store"
import { useModellerStore, useObjects, useSelectedIds } from "@/stores/modeller"
import { useCurrentProject, useIsProjectLoading } from "@/stores/project-store"
import { BoxLoader, ChuteCreator, TransitionCreator } from "./creators"
import { CADOperationsProvider } from "./dialogs"
import { CameraAnimationPanel } from "./panels"
import { PropertiesPanel } from "./properties"
import { ScenePanel } from "./scene"
import { Viewport3D, ViewportSettingsPanel } from "./viewport"

// ============================================================================
// TYPES
// ============================================================================

interface ModellerViewProps {
  className?: string
  onNewProject?: () => void
  onOpenProject?: () => void
}

// Plasticity-style: OUTLINER + ASSETS (we use Scene + Props)
type LeftPanelTab = "scene" | "props"

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
  // Plasticity-style: OUTLINER first (scene), then ASSETS (props)
  const [activeTab, setActiveTab] = useState<LeftPanelTab>("scene")
  const [showAnimationPanel, setShowAnimationPanel] = useState(false)
  const _selectedIds = useSelectedIds()
  const _objects = useObjects()
  const currentProject = useCurrentProject()
  const isLoading = useIsProjectLoading()

  // Use layout store for panel visibility (controlled from Titlebar)
  const showLeftPanel = useShowModellerLeft()
  const showRightPanel = useShowModellerRight()
  const { togglePanel } = useLayoutActions()

  // Get dialog states from store
  const isChuteCreatorOpen = useModellerStore((state) => state.isChuteCreatorOpen)
  const isTransitionCreatorOpen = useModellerStore((state) => state.isTransitionCreatorOpen)
  const { closeChuteCreator, closeTransitionCreator } = useModellerStore()

  // Toggle left panel callback for keyboard shortcut
  const handleToggleLeftPanel = useCallback(() => {
    togglePanel("modellerLeft")
  }, [togglePanel])

  // Toggle animation panel callback
  const handleToggleAnimationPanel = useCallback(() => {
    setShowAnimationPanel((prev) => !prev)
  }, [])

  // Dialog handlers
  const handleChuteCreated = useCallback(() => {
    closeChuteCreator()
    // Could add toast notification here if desired
  }, [closeChuteCreator])

  const handleTransitionCreated = useCallback(() => {
    closeTransitionCreator()
    // Could add toast notification here if desired
  }, [closeTransitionCreator])

  // Enable keyboard shortcuts
  useKeyboardShortcuts(handleToggleLeftPanel)

  // Enable modeller-specific hotkeys (View Mode 1/2/3, etc.)
  useGlobalHotkeyHandler("modeller")

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
    <CADOperationsProvider>
      <div className={cn("flex h-full flex-row bg-background", className)}>
        {/* Main Content Area - Plasticity layout: Left sidebar + Full Viewport */}
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1"
          autoSaveId="cadhy-modeller-layout-v5"
        >
          {/* Left Panel - OUTLINER + ASSETS (Scene + Props) */}
          {showLeftPanel && (
            <>
              <ResizablePanel id="left-panel" order={1} defaultSize={15} minSize={9} maxSize={30}>
                <div className="flex h-full flex-col bg-background">
                  {/* Tab Header */}
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as LeftPanelTab)}
                    className="flex flex-col h-full"
                  >
                    <div className="flex items-center bg-background">
                      <TabsList className="flex-1 h-11 p-1.5 bg-muted/20 rounded-full border-0 grid grid-cols-2 gap-1.5">
                        <TabsTrigger
                          value="scene"
                          className="h-full rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium transition-all"
                          title={t("modeller.tabs.sceneTooltip")}
                        >
                          {t("modeller.tabs.scene", "Scene")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="props"
                          className="h-full rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium transition-all"
                          title={t("modeller.tabs.propsTooltip")}
                        >
                          {t("modeller.tabs.props", "Properties")}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Tab Contents */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <TabsContent
                        value="scene"
                        className="h-full m-0 data-[state=inactive]:hidden"
                      >
                        <PanelErrorBoundary context="Scene Panel">
                          <ScenePanel />
                        </PanelErrorBoundary>
                      </TabsContent>
                      <TabsContent
                        value="props"
                        className="h-full m-0 data-[state=inactive]:hidden"
                      >
                        <PanelErrorBoundary context="Properties Panel">
                          <PropertiesPanel />
                        </PanelErrorBoundary>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </ResizablePanel>

              <ResizableHandle className="w-px bg-transparent hover:bg-border/50 transition-colors" />
            </>
          )}

          {/* Center - Full Viewport (all toolbars are floating overlays inside) */}
          <ResizablePanel id="viewport" order={2} defaultSize={64} minSize={40}>
            <ViewerErrorBoundary>
              <Viewport3D
                showAnimationPanel={showAnimationPanel}
                onToggleAnimationPanel={handleToggleAnimationPanel}
              />
            </ViewerErrorBoundary>
          </ResizablePanel>

          {/* Right Panel - Viewport Settings */}
          {showRightPanel && (
            <>
              <ResizableHandle className="w-px bg-transparent hover:bg-border/50 transition-colors" />
              <ResizablePanel id="right-panel" order={3} defaultSize={15} minSize={9} maxSize={25}>
                <PanelErrorBoundary context="Viewport Settings Panel">
                  <ViewportSettingsPanel />
                </PanelErrorBoundary>
              </ResizablePanel>
            </>
          )}

          {/* Animation Panel (optional, shown when needed) */}
          {showAnimationPanel && (
            <>
              <ResizableHandle className="w-px bg-transparent hover:bg-border/50 transition-colors" />
              <ResizablePanel
                id="animation-panel"
                order={4}
                defaultSize={18}
                minSize={15}
                maxSize={30}
              >
                <PanelErrorBoundary context="Camera Animation Panel">
                  <CameraAnimationPanel onClose={handleToggleAnimationPanel} />
                </PanelErrorBoundary>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Hydraulic Creation Dialogs */}
        {isChuteCreatorOpen && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-auto">
              <ChuteCreator onClose={closeChuteCreator} onCreated={handleChuteCreated} />
            </div>
          </div>
        )}

        {isTransitionCreatorOpen && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-auto">
              <TransitionCreator
                onClose={closeTransitionCreator}
                onCreated={handleTransitionCreated}
              />
            </div>
          </div>
        )}
      </div>
    </CADOperationsProvider>
  )
}

export default ModellerView
