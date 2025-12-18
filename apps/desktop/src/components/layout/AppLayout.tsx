import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
  useSidebar,
} from "@cadhy/ui"
import {
  Add01Icon,
  Analytics01Icon,
  // Profile dropdown icons
  ArrowUpDownIcon,
  // Sidebar Navigation Icons
  BookOpen01Icon,
  Clock01Icon,
  ComputerIcon,
  CreditCardIcon,
  CubeIcon,
  File01Icon,
  FileExportIcon,
  FloppyDiskIcon,
  FolderAddIcon,
  GridIcon,
  HelpCircleIcon,
  Home01Icon,
  InformationCircleIcon,
  Logout01Icon,
  Moon01Icon,
  Notification01Icon,
  Search01Icon,
  Settings01Icon,
  SparklesIcon,
  Sun01Icon,
  TranslateIcon,
  WaveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AIChatPanel } from "@/components/ai"
import { CommandPalette, useCommandPalette } from "@/components/command-palette"
import { ChatErrorBoundary } from "@/components/common"
import { ModellerView } from "@/components/modeller"
import { NewProjectDialog, OpenProjectDialog, ProjectsView } from "@/components/project"
import { useAutoSave, useProjectShortcuts, useUnsavedChangesWarning } from "@/hooks"
import { usePlatform } from "@/hooks/use-platform"
import { type LanguageCode, languages } from "@/i18n"
import { useLayoutStore } from "@/stores/layout-store"
import { useNavigationStore, type ViewId } from "@/stores/navigation-store"
import { useProjectStore } from "@/stores/project-store"
import { useRecentProjectsStore } from "@/stores/recent-projects-store"
import { useUserProfile } from "@/stores/settings-store"
import { useThemeStore } from "@/stores/theme-store"
import { AboutDialog } from "./AboutDialog"
import { HelpDialog } from "./HelpDialog"
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog"
import { NotificationsDialog } from "./NotificationsDialog"
import { PrivacySecurityDialog } from "./PrivacySecurityDialog"
import { SettingsDialog } from "./SettingsDialog"
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
  const [dialogs, setDialogs] = useState<DialogState>({
    help: false,
    about: false,
    shortcuts: false,
    profile: false,
    notifications: false,
    privacy: false,
  })

  // Project hooks - auto-save, unsaved warning, and keyboard shortcuts
  useAutoSave()
  useUnsavedChangesWarning()
  useProjectShortcuts({
    onNewProject: () => setNewProjectOpen(true),
    onOpenProject: () => setOpenProjectOpen(true),
    onCloseProject: () => closeProject(),
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

  // Dialog actions
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

  return (
    <TooltipProvider delay={300}>
      <SidebarProvider defaultOpen={false}>
        <div
          className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
          style={{ "--titlebar-height": TITLEBAR_HEIGHT } as React.CSSProperties}
        >
          {/* Titlebar - Full width horizontal bar at top */}
          <Titlebar onOpenCommandPalette={() => commandPalette.setOpen(true)} />

          {/* Below titlebar: Sidebar + Content + StatusBar */}
          <div className="flex min-h-0 flex-1">
            {/* Sidebar */}
            <AppSidebar
              onNewProject={() => setNewProjectOpen(true)}
              dialogActions={dialogActions}
            />

            {/* Main Area with StatusBar */}
            <SidebarInset className="flex flex-col">
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
                        <div className="h-full border-l border-border/40">
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

              {/* Statusbar - inside SidebarInset so it adjusts with sidebar */}
              <StatusBar />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>

      {/* Project Dialogs */}
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <OpenProjectDialog open={openProjectOpen} onOpenChange={setOpenProjectOpen} />

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
      <SettingsDialog
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
// TITLEBAR
// ============================================================================

function Titlebar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { isMacOS } = usePlatform()
  const { t } = useTranslation()
  const { panels, togglePanel } = useLayoutStore()
  const currentProject = useProjectStore((s) => s.currentProject)
  const modKey = isMacOS ? "⌘" : "Ctrl"

  // Handle AI Chat toggle - requires a project to be open
  const handleToggleAiChat = () => {
    if (!currentProject) {
      // Show toast notification that a project is required
      toast.warning(t("ai.projectRequired.toast"))
      return
    }
    togglePanel("aiChat")
  }

  return (
    <header
      data-tauri-drag-region
      className={cn(
        "relative flex h-9 shrink-0 items-center border-b border-border/40 bg-background/80 backdrop-blur-sm",
        isMacOS ? "pl-3 pr-3" : "pl-3 pr-0"
      )}
    >
      {/* Center: Logo + Title (absolute positioned for true centering) */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none"
        data-tauri-drag-region
      >
        <img
          src="/LOGO.png"
          alt="CADHY"
          className="size-5 pointer-events-none"
          data-tauri-drag-region
        />
        <span
          className="text-xs font-medium tracking-wide text-foreground/80 pointer-events-none"
          data-tauri-drag-region
        >
          CADHY
        </span>
      </div>

      {/* Left section */}
      <div className="flex items-center gap-2 z-10" data-tauri-drag-region>
        {isMacOS ? (
          // macOS: Traffic lights space
          <div className="w-[70px]" data-tauri-drag-region />
        ) : (
          // Windows/Linux: Sidebar toggle + Command palette on left
          <>
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-2 px-3 text-muted-foreground"
              data-tauri-drag-region="false"
              onClick={onOpenCommandPalette}
            >
              <HugeiconsIcon icon={Search01Icon} className="size-4" />
              <span className="text-xs">{t("titlebar.search")}</span>
              <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
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

      {/* Spacer */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Right section */}
      <div className="flex items-center gap-2 z-10">
        {isMacOS && (
          // macOS: View toggles + Command palette on right
          <>
            <SidebarTrigger />
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
              <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
                <span className="text-xs">{modKey}</span>K
              </kbd>
            </Button>
          </>
        )}
        {/* Window Controls (Windows/Linux only) */}
        <WindowControls />
      </div>
    </header>
  )
}

// ============================================================================
// SIDEBAR
// ============================================================================

// File actions for header
const fileActions = [
  { id: "projects" as ViewId, icon: Home01Icon, labelKey: "sidebar.home" },
  { id: "new-project" as ViewId, icon: Add01Icon, labelKey: "sidebar.newProject" },
  { id: "examples" as ViewId, icon: BookOpen01Icon, labelKey: "sidebar.examples" },
]

// Workspace modules for main content
const workspaceModules = [
  { id: "modeller" as ViewId, icon: CubeIcon, labelKey: "sidebar.modeller" },
  { id: "mesh" as ViewId, icon: GridIcon, labelKey: "sidebar.mesh" },
  { id: "cfd" as ViewId, icon: WaveIcon, labelKey: "sidebar.cfd" },
  { id: "results" as ViewId, icon: Analytics01Icon, labelKey: "sidebar.results" },
]

function AppSidebar({
  onNewProject,
  dialogActions,
}: {
  onNewProject: () => void
  dialogActions: DialogActions
}) {
  const { t } = useTranslation()
  const { currentView, setView } = useNavigationStore()

  // Handle file action clicks
  const handleFileAction = useCallback(
    (id: ViewId) => {
      if (id === "new-project") {
        onNewProject()
      } else {
        setView(id)
      }
    },
    [onNewProject, setView]
  )

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* File Actions */}
      <SidebarHeader className="px-2 py-2">
        <SidebarMenu>
          {fileActions.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                tooltip={t(item.labelKey)}
                isActive={currentView === item.id}
                onClick={() => handleFileAction(item.id)}
              >
                <HugeiconsIcon icon={item.icon} className="size-4" />
                <span>{t(item.labelKey)}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Workspace Modules */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.workspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceModules.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={t(item.labelKey)}
                    isActive={currentView === item.id}
                    onClick={() => setView(item.id)}
                  >
                    <HugeiconsIcon icon={item.icon} className="size-4" />
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserProfileDropdown dialogActions={dialogActions} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

// ============================================================================
// USER PROFILE DROPDOWN
// ============================================================================

function UserProfileDropdown({ dialogActions }: { dialogActions: DialogActions }) {
  const { t, i18n } = useTranslation()
  const profile = useUserProfile()
  const { theme, setTheme } = useThemeStore()
  const { isMobile } = useSidebar()
  const { setView } = useNavigationStore()
  const { isMacOS } = usePlatform()
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject)
  const currentProject = useProjectStore((s) => s.currentProject)
  const recentProjects = useRecentProjectsStore((s) => s.projects)
  const clearRecentProjects = useRecentProjectsStore((s) => s.clearAllProjects)
  const openExistingProject = useProjectStore((s) => s.openExistingProject)
  const setLoading = useProjectStore((s) => s.setLoading)

  // Platform-aware modifier key for shortcuts
  const modKey = isMacOS ? "⌘" : "Ctrl+"

  // Handle opening a recent project
  const handleOpenRecentProject = useCallback(
    async (path: string) => {
      setLoading(true)
      setView("modeller")
      try {
        await openExistingProject(path)
      } catch (error) {
        console.error("Failed to open recent project:", error)
        setView("projects")
      }
    },
    [openExistingProject, setLoading, setView]
  )

  const currentLanguage = i18n.language as LanguageCode

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback className="rounded-lg">
                {profile.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{profile.name}</span>
              <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
            </div>
            <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-auto size-4" />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
        className="w-56 rounded-lg"
      >
        {/* User Info Header */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="rounded-lg">
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{profile.name}</span>
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* File Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("menu.file")}</DropdownMenuLabel>
          <DropdownMenuItem>
            <HugeiconsIcon icon={File01Icon} className="size-4" />
            {t("menu.newFile")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={FolderAddIcon} className="size-4" />
            {t("menu.newFolder")}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={Clock01Icon} className="size-4" />
              {t("menu.openRecent")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[200px]">
                {recentProjects.length > 0 ? (
                  <>
                    {recentProjects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleOpenRecentProject(project.path)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium">{project.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                          {project.path}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearRecentProjects}
                      className="text-destructive focus:text-destructive"
                    >
                      {t("menu.clearRecent")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    {t("openProject.noRecent")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => currentProject && saveCurrentProject()}
            disabled={!currentProject}
          >
            <HugeiconsIcon icon={FloppyDiskIcon} className="size-4" />
            {t("menu.save")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={FileExportIcon} className="size-4" />
            {t("menu.export")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* View Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("menu.view")}</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={Sun01Icon} className="size-4" />
              {t("menu.theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                >
                  <DropdownMenuRadioItem value="light">
                    <HugeiconsIcon icon={Sun01Icon} className="size-4" />
                    {t("menu.light")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <HugeiconsIcon icon={Moon01Icon} className="size-4" />
                    {t("menu.dark")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <HugeiconsIcon icon={ComputerIcon} className="size-4" />
                    {t("menu.system")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={TranslateIcon} className="size-4" />
              {t("menu.language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={currentLanguage}
                  onValueChange={handleLanguageChange}
                >
                  {languages.map((lang) => (
                    <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Account Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("menu.account")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={dialogActions.openProfile}>
            <HugeiconsIcon icon={Settings01Icon} className="size-4" />
            {t("menu.preferences")}
            <DropdownMenuShortcut>{modKey},</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={SparklesIcon} className="size-4" />
            {t("menu.upgradeToPro")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={CreditCardIcon} className="size-4" />
            {t("menu.billing")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={dialogActions.openNotifications}>
            <HugeiconsIcon icon={Notification01Icon} className="size-4" />
            {t("menu.notifications")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Help Section */}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={dialogActions.openHelp}>
            <HugeiconsIcon icon={HelpCircleIcon} className="size-4" />
            {t("menu.helpSupport")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={dialogActions.openAbout}>
            <HugeiconsIcon icon={InformationCircleIcon} className="size-4" />
            {t("menu.about")}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <HugeiconsIcon icon={Logout01Icon} className="size-4" />
          {t("menu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
