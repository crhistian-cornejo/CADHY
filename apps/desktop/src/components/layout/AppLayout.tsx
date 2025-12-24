import {
  Button,
  cn,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@cadhy/ui"
import {
  Album01Icon,
  Analytics01Icon,
  BookOpen01Icon,
  CubeIcon,
  GridIcon,
  Home01Icon,
  Search01Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  SparklesIcon,
  WaveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AIChatPanel } from "@/components/ai"
import { CommandPalette, useCommandPalette } from "@/components/command-palette"
import { ChatErrorBoundary, UpdateBadge } from "@/components/common"
import { GalleryView } from "@/components/gallery"
import { ModellerView } from "@/components/modeller"
import {
  NewProjectDialog,
  OpenProjectDialog,
  ProjectsView,
  SaveAsDialog,
} from "@/components/project"
import {
  useAppHotkeys,
  useAutoSave,
  useGlobalHotkeyHandler,
  useUnsavedChangesWarning,
} from "@/hooks"
import { useIsFullscreen, usePlatform } from "@/hooks/use-platform"
import { useLayoutStore } from "@/stores/layout-store"
import { useNavigationStore, type ViewId } from "@/stores/navigation-store"
import { useProjectStore } from "@/stores/project-store"
import {
  AboutDialog,
  HelpDialog,
  KeyboardShortcutsDialog,
  NotificationsDialog,
  PreferencesDialog,
  PrivacySecurityDialog,
} from "./dialogs"
import { LogoDropdown } from "./LogoDropdown"
import { StatusBar } from "./StatusBar"
import { WindowControls } from "./WindowControls"
import { WorkInProgress } from "./WorkInProgress"

// Dialog state context to share between components
interface DialogState {
  help: boolean
  about: boolean
  shortcuts: boolean
  profile: boolean
  notifications: boolean
  privacy: boolean
}

interface DialogActions {
  openHelp: () => void
  openAbout: () => void
  openShortcuts: () => void
  openProfile: () => void
  openNotifications: () => void
  openPrivacy: () => void
  closeAll: () => void
  setDialog: (dialog: keyof DialogState, open: boolean) => void
}

// Titlebar height constant - used for CSS variable
const TITLEBAR_HEIGHT = "2.25rem" // 36px = h-9

export function AppLayout() {
  const { t } = useTranslation()
  const { panels, togglePanel } = useLayoutStore()
  const { currentView } = useNavigationStore()
  const { closeProject } = useProjectStore()

  // Command palette state
  const commandPalette = useCommandPalette()

  // Dialog states
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [openProjectOpen, setOpenProjectOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [dialogs, setDialogs] = useState<DialogState>({
    help: false,
    about: false,
    shortcuts: false,
    profile: false,
    notifications: false,
    privacy: false,
  })

  // Dialog actions - defined early so hotkeys can use them
  const dialogActions: DialogActions = {
    openHelp: () => setDialogs((prev) => ({ ...prev, help: true })),
    openAbout: () => setDialogs((prev) => ({ ...prev, about: true })),
    openShortcuts: () => setDialogs((prev) => ({ ...prev, shortcuts: true })),
    openProfile: () => setDialogs((prev) => ({ ...prev, profile: true })),
    openNotifications: () => setDialogs((prev) => ({ ...prev, notifications: true })),
    openPrivacy: () => setDialogs((prev) => ({ ...prev, privacy: true })),
    closeAll: () =>
      setDialogs({
        help: false,
        about: false,
        shortcuts: false,
        profile: false,
        notifications: false,
        privacy: false,
      }),
    setDialog: (dialog, open) => setDialogs((prev) => ({ ...prev, [dialog]: open })),
  }

  // Project hooks - auto-save and unsaved warning
  useAutoSave()
  useUnsavedChangesWarning()

  // Global keyboard shortcut handler - processes all registered hotkeys
  useGlobalHotkeyHandler()

  // Register all application hotkeys
  useAppHotkeys({
    onOpenCommandPalette: () => commandPalette.setOpen(true),
    onOpenSettings: () => dialogActions.setDialog("profile", true),
    onOpenShortcuts: () => dialogActions.setDialog("shortcuts", true),
    onNewProject: () => setNewProjectOpen(true),
    onOpenProject: () => setOpenProjectOpen(true),
    onSaveProjectAs: () => setSaveAsOpen(true),
  })

  // Listen to native menu events from Tauri (macOS/Windows)
  useEffect(() => {
    const unlisten = listen<string>("menu-event", (event) => {
      const menuId = event.payload
      switch (menuId) {
        case "new_project":
          setNewProjectOpen(true)
          break
        case "open_project":
          setOpenProjectOpen(true)
          break
        case "close_project":
          closeProject()
          break
        // Note: save_project and save_project_as are handled in project-store via keyboard shortcuts
        // undo/redo are handled in ModellerView
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [closeProject])

  return (
    <TooltipProvider delay={300}>
      <div
        className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
        style={{ "--titlebar-height": TITLEBAR_HEIGHT } as React.CSSProperties}
      >
        {/* Titlebar - Full width horizontal bar at top */}
        <Titlebar
          onOpenCommandPalette={() => commandPalette.setOpen(true)}
          onNewProject={() => setNewProjectOpen(true)}
          onOpenProject={() => setOpenProjectOpen(true)}
          dialogActions={dialogActions}
        />

        {/* Main content area */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Content area with optional AI Chat Panel */}
          <div className="flex-1 min-h-0 flex flex-col">
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1"
              autoSaveId="cadhy-main-layout"
            >
              {/* Main content panel */}
              <ResizablePanel
                id="main-content"
                order={1}
                defaultSize={panels.aiChat ? 65 : 100}
                minSize={50}
              >
                {/* Render different views based on currentView */}
                {currentView === "projects" ? (
                  <ProjectsView
                    onProjectOpen={(project) => {
                      // Set loading state and navigate to modeller immediately
                      useProjectStore.getState().setLoading(true)
                      useNavigationStore.getState().setView("modeller")
                      // Then open the project file asynchronously
                      useProjectStore
                        .getState()
                        .openExistingProject(project.path)
                        .catch((error) => {
                          console.error("Failed to open project:", error)
                          // Navigate back to projects on error
                          useNavigationStore.getState().setView("projects")
                        })
                    }}
                    onNewProject={() => setNewProjectOpen(true)}
                    onOpenProjectDialog={() => setOpenProjectOpen(true)}
                    onGoToExamples={() => useNavigationStore.getState().setView("examples")}
                  />
                ) : currentView === "modeller" ? (
                  <ModellerView
                    onNewProject={() => setNewProjectOpen(true)}
                    onOpenProject={() => setOpenProjectOpen(true)}
                  />
                ) : currentView === "mesh" ? (
                  <WorkInProgress feature={t("wip.features.meshGeneration")} />
                ) : currentView === "cfd" ? (
                  <WorkInProgress feature={t("wip.features.cfdAnalysis")} />
                ) : currentView === "results" ? (
                  <WorkInProgress feature={t("wip.features.resultsVisualization")} />
                ) : currentView === "examples" ? (
                  <WorkInProgress feature={t("wip.features.examplesLibrary")} />
                ) : currentView === "gallery" ? (
                  <GalleryView />
                ) : (
                  <div className="flex h-full items-center justify-center bg-background">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold mb-2 capitalize">{currentView}</h2>
                      <p className="text-sm text-muted-foreground">
                        Main Workspace - {currentView} view
                      </p>
                    </div>
                  </div>
                )}
              </ResizablePanel>

              {/* AI Chat Panel - Global, works from any view */}
              {panels.aiChat && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                    id="ai-chat-global"
                    order={2}
                    defaultSize={35}
                    minSize={20}
                    maxSize={50}
                  >
                    <div className="h-full">
                      <ChatErrorBoundary>
                        <AIChatPanel
                          onClose={() => togglePanel("aiChat")}
                          onOpenProject={() => setOpenProjectOpen(true)}
                          onNewProject={() => setNewProjectOpen(true)}
                        />
                      </ChatErrorBoundary>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>

          {/* Statusbar */}
          <StatusBar />
        </div>
      </div>

      {/* Project Dialogs */}
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <OpenProjectDialog open={openProjectOpen} onOpenChange={setOpenProjectOpen} />
      <SaveAsDialog open={saveAsOpen} onOpenChange={setSaveAsOpen} />

      {/* Help & Support Dialogs */}
      <HelpDialog
        open={dialogs.help}
        onOpenChange={(open) => dialogActions.setDialog("help", open)}
        onOpenShortcuts={() => {
          dialogActions.setDialog("help", false)
          dialogActions.openShortcuts()
        }}
      />
      <AboutDialog
        open={dialogs.about}
        onOpenChange={(open) => dialogActions.setDialog("about", open)}
      />
      <KeyboardShortcutsDialog
        open={dialogs.shortcuts}
        onOpenChange={(open) => dialogActions.setDialog("shortcuts", open)}
      />

      {/* Account & Preferences Dialogs */}
      <PreferencesDialog
        open={dialogs.profile}
        onOpenChange={(open) => dialogActions.setDialog("profile", open)}
      />
      <NotificationsDialog
        open={dialogs.notifications}
        onOpenChange={(open) => dialogActions.setDialog("notifications", open)}
      />
      <PrivacySecurityDialog
        open={dialogs.privacy}
        onOpenChange={(open) => dialogActions.setDialog("privacy", open)}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPalette.open}
        onOpenChange={commandPalette.setOpen}
        onNewProject={() => setNewProjectOpen(true)}
        onOpenProject={() => setOpenProjectOpen(true)}
        onOpenSettings={() => {
          /* TODO: Open settings */
        }}
        onOpenShortcuts={() => dialogActions.openShortcuts()}
      />

      {/* Toast Notifications */}
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}

// ============================================================================
// NAVIGATION ITEMS (moved from sidebar)
// ============================================================================

// File actions
const fileActions = [
  { id: "projects" as ViewId, icon: Home01Icon, labelKey: "sidebar.home" },
  { id: "gallery" as ViewId, icon: Album01Icon, labelKey: "sidebar.gallery" },
  { id: "examples" as ViewId, icon: BookOpen01Icon, labelKey: "sidebar.examples" },
]

// Workspace modules
const workspaceModules = [
  { id: "modeller" as ViewId, icon: CubeIcon, labelKey: "sidebar.modeller" },
  { id: "mesh" as ViewId, icon: GridIcon, labelKey: "sidebar.mesh" },
  { id: "cfd" as ViewId, icon: WaveIcon, labelKey: "sidebar.cfd" },
  { id: "results" as ViewId, icon: Analytics01Icon, labelKey: "sidebar.results" },
]

// ============================================================================
// TITLEBAR
// ============================================================================

function Titlebar({
  onOpenCommandPalette,
  onNewProject,
  onOpenProject,
  dialogActions,
}: {
  onOpenCommandPalette: () => void
  onNewProject: () => void
  onOpenProject: () => void
  dialogActions: DialogActions
}) {
  const { isMacOS } = usePlatform()
  const isFullscreen = useIsFullscreen()
  const { t } = useTranslation()
  const { panels, togglePanel } = useLayoutStore()
  const currentProject = useProjectStore((s) => s.currentProject)
  const { currentView, setView } = useNavigationStore()
  const modKey = isMacOS ? "⌘" : "Ctrl"

  // On macOS fullscreen, traffic lights are hidden, so logo can be on the left
  const showLogoLeft = isMacOS && isFullscreen

  // Show modeller panel toggles only in modeller view
  const isModellerView = currentView === "modeller"

  // Handle AI Chat toggle - requires a project to be open
  const handleToggleAiChat = () => {
    if (!currentProject) {
      // Show toast notification that a project is required
      toast.warning(t("ai.projectRequired.toast"))
      return
    }
    togglePanel("aiChat")
  }

  // Toggle modeller left panel (OUTLINER/ASSETS)
  const handleToggleModellerLeft = () => {
    togglePanel("modellerLeft")
  }

  // Toggle modeller right panel (Viewport Settings)
  const handleToggleModellerRight = () => {
    togglePanel("modellerRight")
  }

  // Handle navigation item clicks
  const handleNavClick = (id: ViewId) => {
    setView(id)
  }

  return (
    <header
      data-tauri-drag-region
      className={cn(
        "relative flex h-9 shrink-0 items-center bg-background/80 backdrop-blur-sm",
        isMacOS ? "pl-3 pr-3" : "pl-3 pr-0"
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-2 z-10" data-tauri-drag-region>
        {isMacOS ? (
          // macOS: Show logo on left when fullscreen, otherwise just traffic lights space
          showLogoLeft ? (
            <div className="flex items-center gap-2" data-tauri-drag-region>
              <LogoDropdown
                onNewProject={onNewProject}
                onOpenProject={onOpenProject}
                dialogActions={dialogActions}
              />
              {/* Modeller left panel toggle - next to logo when fullscreen */}
              {isModellerView && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant={panels.modellerLeft ? "secondary" : "ghost"}
                        size="icon-sm"
                        onClick={handleToggleModellerLeft}
                        data-tauri-drag-region="false"
                      >
                        <HugeiconsIcon icon={SidebarLeft01Icon} className="size-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {t("toolbar.toggleLeftPanel", "Toggle Left Panel")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : (
            // Traffic lights space when not fullscreen + Logo dropdown
            <div className="flex items-center gap-2" data-tauri-drag-region>
              <div className="w-[60px]" data-tauri-drag-region />
              <LogoDropdown
                onNewProject={onNewProject}
                onOpenProject={onOpenProject}
                dialogActions={dialogActions}
              />
            </div>
          )
        ) : (
          // Windows/Linux: Logo dropdown + Panel toggles + Command palette on left
          <>
            <LogoDropdown
              onNewProject={onNewProject}
              onOpenProject={onOpenProject}
              dialogActions={dialogActions}
            />

            {/* Modeller left panel toggle (OUTLINER/ASSETS) */}
            {isModellerView && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant={panels.modellerLeft ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={handleToggleModellerLeft}
                      data-tauri-drag-region="false"
                    >
                      <HugeiconsIcon icon={SidebarLeft01Icon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("toolbar.toggleLeftPanel", "Toggle Left Panel")}</TooltipContent>
              </Tooltip>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-2 px-3 text-muted-foreground"
              data-tauri-drag-region="false"
              onClick={onOpenCommandPalette}
            >
              <HugeiconsIcon icon={Search01Icon} className="size-4" />
              <span className="text-xs">{t("titlebar.search")}</span>
              <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded-2xl border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
                <span className="text-xs">{modKey}</span>K
              </kbd>
            </Button>
            <div className="flex items-center gap-1 ml-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant={panels.aiChat ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={handleToggleAiChat}
                      data-tauri-drag-region="false"
                    >
                      <HugeiconsIcon icon={SparklesIcon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("toolbar.toggleAiChat")}</TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>

      {/* Center section: Navigation items */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        data-tauri-drag-region
      >
        <nav className="flex items-center gap-1 pointer-events-auto" data-tauri-drag-region="false">
          {/* File Actions */}
          {fileActions.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant={currentView === item.id ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => handleNavClick(item.id)}
                  >
                    <HugeiconsIcon icon={item.icon} className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t(item.labelKey)}</TooltipContent>
            </Tooltip>
          ))}

          {/* Separator */}
          <div className="h-4 w-px bg-border/40 mx-1" />

          {/* Workspace Modules */}
          {workspaceModules.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant={currentView === item.id ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => handleNavClick(item.id)}
                  >
                    <HugeiconsIcon icon={item.icon} className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t(item.labelKey)}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 z-10 ml-auto">
        {/* Update Badge */}
        <UpdateBadge />

        {isMacOS ? (
          // macOS: View toggles + Command palette on right
          <>
            {/* Modeller left panel toggle for macOS - only when NOT fullscreen (when fullscreen it's on left) */}
            {isModellerView && !showLogoLeft && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant={panels.modellerLeft ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={handleToggleModellerLeft}
                      data-tauri-drag-region="false"
                    >
                      <HugeiconsIcon icon={SidebarLeft01Icon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("toolbar.toggleLeftPanel", "Toggle Left Panel")}</TooltipContent>
              </Tooltip>
            )}

            {/* Modeller right panel toggle */}
            {isModellerView && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant={panels.modellerRight ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={handleToggleModellerRight}
                      data-tauri-drag-region="false"
                    >
                      <HugeiconsIcon icon={SidebarRight01Icon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>
                  {t("toolbar.toggleRightPanel", "Toggle Right Panel")}
                </TooltipContent>
              </Tooltip>
            )}

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant={panels.aiChat ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={handleToggleAiChat}
                      data-tauri-drag-region="false"
                    >
                      <HugeiconsIcon icon={SparklesIcon} className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("toolbar.toggleAiChat")}</TooltipContent>
              </Tooltip>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-2 px-3 text-muted-foreground"
              data-tauri-drag-region="false"
              onClick={onOpenCommandPalette}
            >
              <HugeiconsIcon icon={Search01Icon} className="size-4" />
              <span className="text-xs">{t("titlebar.search")}</span>
              <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded-2xl border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
                <span className="text-xs">{modKey}</span>K
              </kbd>
            </Button>
          </>
        ) : (
          // Windows/Linux: Modeller right panel toggle on right
          isModellerView && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={panels.modellerRight ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={handleToggleModellerRight}
                    data-tauri-drag-region="false"
                  >
                    <HugeiconsIcon icon={SidebarRight01Icon} className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("toolbar.toggleRightPanel", "Toggle Right Panel")}</TooltipContent>
            </Tooltip>
          )
        )}
        {/* Window Controls (Windows/Linux only) */}
        <WindowControls />
      </div>
    </header>
  )
}
