/**
 * Projects View Component - CADHY
 *
 * Main view for browsing, organizing, and opening projects.
 * Features:
 * - Breadcrumb navigation for folder hierarchy
 * - Folder drill-down to show projects inside
 * - Projects grid/list with filtering and search
 * - Quick actions for project management
 */

import type { FolderColorPreset, ProjectFolder, RecentProject } from "@cadhy/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  cn,
  Input,
  ScrollArea,
} from "@cadhy/ui"
import {
  Add01Icon,
  ArrowLeft01Icon,
  BookOpen01Icon,
  Clock01Icon,
  FileImportIcon,
  FolderAddIcon,
  FolderOpenIcon,
  GridViewIcon,
  Home01Icon,
  Menu01Icon,
  PlayIcon,
  Search01Icon,
  SortingAZ01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useRecentProjectsStore } from "@/stores/recent-projects-store"
import { AnimatedFolder } from "./AnimatedFolder"
import { CreateFolderDialog } from "./CreateFolderDialog"
import { EditFolderDialog } from "./EditFolderDialog"
import { ProjectCard } from "./ProjectCard"

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = "grid" | "list"
type SortMode = "recent" | "name"

export interface ProjectsViewProps {
  onProjectOpen?: (project: RecentProject) => void
  onNewProject?: () => void
  onOpenProjectDialog?: () => void
  onGoToExamples?: () => void
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

// Helper to get greeting based on time of day
function getGreetingKey(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

// Helper to format relative time
function formatRelativeTime(
  timestamp: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t("openProject.today")
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days === 1) return t("openProject.yesterday")
  return t("openProject.daysAgo", { count: days })
}

export function ProjectsView({
  onProjectOpen,
  onNewProject,
  onOpenProjectDialog,
  onGoToExamples,
  className,
}: ProjectsViewProps) {
  const { t } = useTranslation()

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortMode, setSortMode] = useState<SortMode>("recent")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [flyingProjectId, setFlyingProjectId] = useState<string | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [editFolderOpen, setEditFolderOpen] = useState(false)
  const [folderToEdit, setFolderToEdit] = useState<ProjectFolder | null>(null)
  const [pendingProjectForFolder, setPendingProjectForFolder] = useState<string | null>(null)

  // Current folder navigation state (null = root/home)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  // Store data - use individual selectors to avoid object creation
  const folders = useRecentProjectsStore((s) => s.folders)
  const projects = useRecentProjectsStore((s) => s.projects)
  const removeProject = useRecentProjectsStore((s) => s.removeProject)
  const assignProjectToFolder = useRecentProjectsStore((s) => s.assignProjectToFolder)
  const canAddToFolder = useRecentProjectsStore((s) => s.canAddToFolder)
  const createFolder = useRecentProjectsStore((s) => s.createFolder)
  const updateFolder = useRecentProjectsStore((s) => s.updateFolder)
  const deleteFolder = useRecentProjectsStore((s) => s.deleteFolder)
  const getProjectById = useRecentProjectsStore((s) => s.getProjectById)
  const getFolderById = useRecentProjectsStore((s) => s.getFolderById)

  // Get current folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null
    return getFolderById(currentFolderId)
  }, [currentFolderId, getFolderById])

  // Compute derived state with useMemo to avoid infinite loops
  const foldersWithProjects = useMemo(() => {
    const sortedFolders = [...folders].sort((a, b) => a.sortOrder - b.sortOrder)
    return sortedFolders.map((folder) => ({
      folder,
      projects: projects.filter((p) => p.folderId === folder.id),
    }))
  }, [folders, projects])

  const unfolderedProjects = useMemo(() => {
    return projects.filter((p) => !p.folderId)
  }, [projects])

  // Projects in current folder (when inside a folder)
  const projectsInCurrentFolder = useMemo(() => {
    if (!currentFolderId) return []
    return projects.filter((p) => p.folderId === currentFolderId)
  }, [currentFolderId, projects])

  // Filter and sort projects (either unfoldered at root, or all in current folder)
  const filteredProjects = useMemo(() => {
    const sourceProjects = currentFolderId ? projectsInCurrentFolder : unfolderedProjects
    let filtered = [...sourceProjects]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query)
      )
    }

    // Sort
    if (sortMode === "recent") {
      filtered.sort((a, b) => b.lastOpened - a.lastOpened)
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    }

    return filtered
  }, [currentFolderId, projectsInCurrentFolder, unfolderedProjects, searchQuery, sortMode])

  // Handlers
  const handleProjectOpen = useCallback(
    (project: RecentProject) => {
      onProjectOpen?.(project)
    },
    [onProjectOpen]
  )

  const handleMoveToFolder = useCallback(
    (projectId: string, folderId: string) => {
      // Start flying animation
      setFlyingProjectId(projectId)

      // Wait for animation then move
      setTimeout(() => {
        assignProjectToFolder(projectId, folderId)
        setFlyingProjectId(null)
      }, 400)
    },
    [assignProjectToFolder]
  )

  const handleRemoveFromFolder = useCallback(
    (projectId: string) => {
      assignProjectToFolder(projectId, undefined)
    },
    [assignProjectToFolder]
  )

  const handleCreateNewFolder = useCallback((projectId?: string) => {
    if (projectId) {
      setPendingProjectForFolder(projectId)
    }
    setCreateFolderOpen(true)
  }, [])

  const handleFolderCreate = useCallback(
    (name: string, color: FolderColorPreset) => {
      const newFolder = createFolder(name, color)

      // If we have a pending project, assign it to the new folder
      if (pendingProjectForFolder) {
        assignProjectToFolder(pendingProjectForFolder, newFolder.id)
        setPendingProjectForFolder(null)
      }
    },
    [createFolder, assignProjectToFolder, pendingProjectForFolder]
  )

  // Navigate into a folder
  const handleFolderClick = useCallback((folderId: string) => {
    setCurrentFolderId(folderId)
    setSearchQuery("") // Clear search when entering folder
    setSelectedProjectId(null)
  }, [])

  // Navigate back to root
  const handleNavigateToRoot = useCallback(() => {
    setCurrentFolderId(null)
    setSearchQuery("")
    setSelectedProjectId(null)
  }, [])

  // Handle project open from folder preview (when at root, hover shows projects)
  const handleFolderProjectOpen = useCallback(
    (folderProject: { id: string; name: string; thumbnail?: string }) => {
      const project = getProjectById(folderProject.id)
      if (project) {
        handleProjectOpen(project)
      }
    },
    [handleProjectOpen, getProjectById]
  )

  // Handle edit folder
  const handleEditFolder = useCallback((folder: ProjectFolder) => {
    setFolderToEdit(folder)
    setEditFolderOpen(true)
  }, [])

  // Handle save folder changes
  const handleSaveFolder = useCallback(
    (folderId: string, name: string, colorPreset: FolderColorPreset) => {
      updateFolder(folderId, { name, colorPreset })
    },
    [updateFolder]
  )

  // Handle delete folder
  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      deleteFolder(folderId)
      // If we're inside the deleted folder, navigate back to root
      if (currentFolderId === folderId) {
        setCurrentFolderId(null)
      }
    },
    [deleteFolder, currentFolderId]
  )

  const hasFolders = foldersWithProjects.length > 0
  const hasProjects = filteredProjects.length > 0
  const _isEmpty = !hasFolders && unfolderedProjects.length === 0
  const isInFolder = currentFolderId !== null

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-1.5">
        <div className="flex items-center gap-2">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {isInFolder ? (
                  <BreadcrumbLink
                    onClick={handleNavigateToRoot}
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                  >
                    <HugeiconsIcon icon={Home01Icon} className="size-3" />
                    <span className="text-xs">Projects</span>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-1">
                    <HugeiconsIcon icon={Home01Icon} className="size-3" />
                    <span className="text-xs font-medium">Projects</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>

              {isInFolder && currentFolder && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs font-medium">
                      {currentFolder.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Back button when in folder */}
          {isInFolder && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={handleNavigateToRoot}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3" />
              Back
            </Button>
          )}

          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={onNewProject}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3" />
            New
          </Button>
          {!isInFolder && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={() => handleCreateNewFolder()}
            >
              <HugeiconsIcon icon={FolderAddIcon} className="size-3" />
              Folder
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Search */}
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder={isInFolder ? "Search in folder..." : "Search..."}
              className="h-6 w-32 pl-6 text-[10px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort toggle */}
          <div className="flex h-6 items-center rounded border bg-muted/50 p-0.5">
            <Button
              variant={sortMode === "recent" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 gap-0.5 px-1.5 text-[10px] rounded-sm"
              onClick={() => setSortMode("recent")}
            >
              <HugeiconsIcon icon={Clock01Icon} className="size-3" />
              Recent
            </Button>
            <Button
              variant={sortMode === "name" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 gap-0.5 px-1.5 text-[10px] rounded-sm"
              onClick={() => setSortMode("name")}
            >
              <HugeiconsIcon icon={SortingAZ01Icon} className="size-3" />
              Name
            </Button>
          </div>

          {/* View mode toggle */}
          <div className="flex h-6 items-center rounded border bg-muted/50 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0 rounded-sm"
              onClick={() => setViewMode("grid")}
            >
              <HugeiconsIcon icon={GridViewIcon} className="size-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0 rounded-sm"
              onClick={() => setViewMode("list")}
            >
              <HugeiconsIcon icon={Menu01Icon} className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* ============== ROOT VIEW (Home) ============== */}
          {!isInFolder && (
            <>
              {/* ===== WELCOME HERO SECTION ===== */}
              <section className="mb-2">
                {/* Greeting */}
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold tracking-tight mb-1">
                    {t(`home.greeting.${getGreetingKey()}`)} 👋
                  </h1>
                  <p className="text-sm text-muted-foreground">{t("home.welcome")}</p>
                </div>

                {/* Continue Last Project Card - Only show if there are projects */}
                {projects.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("home.continueWorking")}
                      </h2>
                    </div>
                    <button
                      onClick={() => handleProjectOpen(projects[0])}
                      className={cn(
                        "w-full max-w-md group relative overflow-hidden rounded-xl",
                        "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
                        "border border-primary/20 hover:border-primary/40",
                        "transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
                        "p-4 text-left"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Thumbnail or placeholder */}
                        <div className="shrink-0 size-14 rounded-lg bg-muted/50 border border-border/40 overflow-hidden flex items-center justify-center">
                          {projects[0].thumbnail ? (
                            <img
                              src={projects[0].thumbnail}
                              alt={projects[0].name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                              <span className="text-lg font-bold text-muted-foreground/50">
                                {projects[0].name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Project info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {t("home.lastProject")}
                          </p>
                          <h3 className="font-medium truncate mb-0.5">{projects[0].name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {t("home.openedAgo", {
                              time: formatRelativeTime(projects[0].lastOpened, t),
                            })}
                          </p>
                        </div>

                        {/* Continue button */}
                        <div
                          className={cn(
                            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                            "bg-primary text-primary-foreground",
                            "group-hover:bg-primary/90 transition-colors",
                            "text-xs font-medium"
                          )}
                        >
                          <HugeiconsIcon icon={PlayIcon} className="size-3.5" />
                          {t("home.continueProject")}
                        </div>
                      </div>

                      {/* Decorative gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </button>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("home.quickActions.title")}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* New Project */}
                    <button
                      onClick={onNewProject}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                        "bg-card border border-border/40 hover:border-primary/40",
                        "hover:bg-primary/5 transition-all duration-200",
                        "hover:shadow-md hover:shadow-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center",
                          "bg-primary/10 text-primary",
                          "group-hover:bg-primary group-hover:text-primary-foreground",
                          "transition-colors duration-200"
                        )}
                      >
                        <HugeiconsIcon icon={Add01Icon} className="size-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t("home.quickActions.newProject")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("home.quickActions.newProjectDesc")}
                        </p>
                      </div>
                    </button>

                    {/* Open Project */}
                    <button
                      onClick={onOpenProjectDialog}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                        "bg-card border border-border/40 hover:border-blue-500/40",
                        "hover:bg-blue-500/5 transition-all duration-200",
                        "hover:shadow-md hover:shadow-blue-500/5"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center",
                          "bg-blue-500/10 text-blue-500",
                          "group-hover:bg-blue-500 group-hover:text-white",
                          "transition-colors duration-200"
                        )}
                      >
                        <HugeiconsIcon icon={FolderOpenIcon} className="size-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t("home.quickActions.openProject")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("home.quickActions.openProjectDesc")}
                        </p>
                      </div>
                    </button>

                    {/* Examples */}
                    <button
                      onClick={onGoToExamples}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                        "bg-card border border-border/40 hover:border-amber-500/40",
                        "hover:bg-amber-500/5 transition-all duration-200",
                        "hover:shadow-md hover:shadow-amber-500/5"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center",
                          "bg-amber-500/10 text-amber-500",
                          "group-hover:bg-amber-500 group-hover:text-white",
                          "transition-colors duration-200"
                        )}
                      >
                        <HugeiconsIcon icon={BookOpen01Icon} className="size-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t("home.quickActions.examples")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("home.quickActions.examplesDesc")}
                        </p>
                      </div>
                    </button>

                    {/* Import */}
                    <button
                      disabled
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                        "bg-card border border-border/40",
                        "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center",
                          "bg-emerald-500/10 text-emerald-500"
                        )}
                      >
                        <HugeiconsIcon icon={FileImportIcon} className="size-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t("home.quickActions.import")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("home.quickActions.importDesc")}
                        </p>
                      </div>
                      <span className="absolute top-2 right-2 text-[8px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                        {t("createPanel.soon")}
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Folders Section */}
              {hasFolders && (
                <section>
                  <div className="flex items-center gap-1.5 mb-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Folders
                    </h2>
                    <span className="text-xs text-muted-foreground/50">
                      ({foldersWithProjects.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {foldersWithProjects.map(({ folder, projects: folderProjects }) => (
                      <AnimatedFolder
                        key={folder.id}
                        title={folder.name}
                        colorPreset={folder.colorPreset}
                        projects={folderProjects.map((p) => ({
                          id: p.id,
                          name: p.name,
                          thumbnail: p.thumbnail,
                        }))}
                        onProjectOpen={handleFolderProjectOpen}
                        onFolderClick={() => handleFolderClick(folder.id)}
                        onEditFolder={() => handleEditFolder(folder)}
                        onDeleteFolder={() => handleDeleteFolder(folder.id)}
                      />
                    ))}
                    {/* Add folder placeholder */}
                    <button
                      onClick={() => handleCreateNewFolder()}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer",
                        "border-2 border-dashed border-border/40 hover:border-border/60",
                        "bg-transparent hover:bg-muted/30 transition-all duration-200",
                        "min-w-[140px] min-h-[160px] group"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2",
                          "group-hover:bg-muted transition-colors"
                        )}
                      >
                        <HugeiconsIcon
                          icon={FolderAddIcon}
                          className="size-5 text-muted-foreground"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        New Folder
                      </span>
                    </button>
                  </div>
                </section>
              )}

              {/* Unorganized Projects Section */}
              {(hasProjects || (!hasFolders && unfolderedProjects.length > 0)) && (
                <section>
                  <div className="flex items-center gap-1.5 mb-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {hasFolders ? "Unorganized Projects" : "Recent Projects"}
                    </h2>
                    <span className="text-xs text-muted-foreground/50">
                      ({filteredProjects.length})
                    </span>
                  </div>

                  {/* Search empty state */}
                  {searchQuery && !hasProjects && (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground">
                        No projects found matching "{searchQuery}"
                      </p>
                    </div>
                  )}

                  {/* Projects Grid/List */}
                  <div
                    className={cn(
                      viewMode === "grid"
                        ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
                        : "flex flex-col gap-2"
                    )}
                  >
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        viewMode={viewMode}
                        isSelected={selectedProjectId === project.id}
                        isFlying={flyingProjectId === project.id}
                        folders={folders}
                        onSelect={setSelectedProjectId}
                        onDoubleClick={handleProjectOpen}
                        onOpen={handleProjectOpen}
                        onRemove={removeProject}
                        onMoveToFolder={handleMoveToFolder}
                        onRemoveFromFolder={handleRemoveFromFolder}
                        onCreateNewFolder={handleCreateNewFolder}
                        canAddToFolder={canAddToFolder}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* No unfoldered projects but has folders */}
              {hasFolders && unfolderedProjects.length === 0 && (
                <section className="text-center py-6 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    All your projects are organized in folders
                  </p>
                </section>
              )}
            </>
          )}

          {/* ============== FOLDER VIEW (Inside a folder) ============== */}
          {isInFolder && currentFolder && (
            <section>
              {/* Folder header info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
                <div
                  className="size-12 rounded-lg flex items-center justify-center"
                  data-folder-color={currentFolder.colorPreset}
                  style={{
                    backgroundColor: `hsl(var(--folder-${currentFolder.colorPreset}-front, var(--muted)))`,
                  }}
                >
                  <span className="text-lg font-bold text-white">
                    {currentFolder.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-medium">{currentFolder.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {projectsInCurrentFolder.length}{" "}
                    {projectsInCurrentFolder.length === 1 ? "project" : "projects"}
                  </p>
                </div>
              </div>

              {/* Empty folder state */}
              {projectsInCurrentFolder.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <HugeiconsIcon icon={Add01Icon} className="size-6 text-muted-foreground" />
                  </div>
                  <h2 className="text-sm font-medium mb-1">Folder is empty</h2>
                  <p className="text-xs text-muted-foreground mb-3 max-w-xs">
                    Create a new project or drag existing projects into this folder.
                  </p>
                  <Button onClick={onNewProject} size="sm" className="gap-1.5 h-8">
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                    Create New Project
                  </Button>
                </div>
              )}

              {/* Search empty state */}
              {searchQuery && filteredProjects.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    No projects found matching "{searchQuery}"
                  </p>
                </div>
              )}

              {/* Projects Grid/List */}
              {filteredProjects.length > 0 && (
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
                      : "flex flex-col gap-2"
                  )}
                >
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      viewMode={viewMode}
                      isSelected={selectedProjectId === project.id}
                      isFlying={flyingProjectId === project.id}
                      folders={folders}
                      onSelect={setSelectedProjectId}
                      onDoubleClick={handleProjectOpen}
                      onOpen={handleProjectOpen}
                      onRemove={removeProject}
                      onMoveToFolder={handleMoveToFolder}
                      onRemoveFromFolder={handleRemoveFromFolder}
                      onCreateNewFolder={handleCreateNewFolder}
                      canAddToFolder={canAddToFolder}
                      showRemoveFromFolder // Show option to remove from current folder
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreateFolder={handleFolderCreate}
      />

      {/* Edit Folder Dialog */}
      <EditFolderDialog
        open={editFolderOpen}
        onOpenChange={setEditFolderOpen}
        folder={folderToEdit}
        onSave={handleSaveFolder}
        onDelete={handleDeleteFolder}
      />
    </div>
  )
}

export default ProjectsView
