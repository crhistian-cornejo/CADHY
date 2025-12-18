/**
 * Command Palette - CADHY
 *
 * A powerful command palette inspired by VS Code and GraphCAD.
 * Supports multiple modes:
 * - Commands (default): Search and execute commands
 * - > : Add/create mode (channels, shapes, etc.)
 * - @ : Search in project (objects, layers)
 * - # : Go to object by ID/name
 */

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@cadhy/ui"
import {
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  Cancel01Icon,
  Copy01Icon,
  CubeIcon,
  Cursor01Icon,
  Delete02Icon,
  Download04Icon,
  File01Icon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GridIcon,
  HelpCircleIcon,
  Home01Icon,
  Layers01Icon,
  LayoutGridIcon,
  Maximize01Icon,
  Move01Icon,
  RotateClockwiseIcon,
  Settings02Icon,
  SidebarLeft01Icon,
  Tick02Icon,
  WaveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { usePlatform } from "@/hooks/use-platform"
import { useCAD } from "@/hooks/useCAD"
import { useLayoutStore } from "@/stores/layout-store"
import { useModellerStore } from "@/stores/modeller-store"
import { useNavigationStore } from "@/stores/navigation-store"
import { useProjectStore } from "@/stores/project-store"

// ============================================================================
// TYPES
// ============================================================================

type PaletteMode = "commands" | "create" | "search" | "goto"

type CommandCategory =
  | "recent"
  | "file"
  | "edit"
  | "view"
  | "transform"
  | "navigation"
  | "workspace"
  | "tools"
  | "help"

interface CommandItemDef {
  id: string
  label: string
  description?: string
  icon?: typeof File01Icon
  shortcut?: string
  action: () => void | Promise<void>
  category: CommandCategory
  keywords?: string[]
  disabled?: boolean
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings?: () => void
  onOpenShortcuts?: () => void
  onNewProject?: () => void
  onOpenProject?: () => void
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_ORDER: CommandCategory[] = [
  "recent",
  "file",
  "edit",
  "view",
  "transform",
  "navigation",
  "workspace",
  "tools",
  "help",
]

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  recent: "Recent",
  file: "File",
  edit: "Edit",
  view: "View",
  transform: "Transform",
  navigation: "Navigation",
  workspace: "Workspace",
  tools: "Tools",
  help: "Help",
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette({
  open,
  onOpenChange,
  onOpenSettings,
  onOpenShortcuts,
  onNewProject,
  onOpenProject,
}: CommandPaletteProps) {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()

  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<PaletteMode>("commands")
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([])

  const modKey = isMacOS ? "Cmd" : "Ctrl"

  // Store actions
  const {
    objects,
    undo,
    redo,
    deleteSelected,
    selectAll,
    deselectAll,
    duplicateSelected,
    setTransformMode,
    setViewportSettings,
    setSnapMode,
    setCameraView,
  } = useModellerStore()

  const viewportSettings = useModellerStore((s) => s.viewportSettings)
  const snapMode = useModellerStore((s) => s.snapMode)
  const selectedIds = useModellerStore((s) => s.selectedIds)

  const { togglePanel, toggleSidebarCollapsed } = useLayoutStore()
  const _panels = useLayoutStore((s) => s.panels)

  const { navigateTo } = useNavigationStore()
  const _currentWorkspace = useNavigationStore((s) => s.currentPage)

  const { saveCurrentProject, closeProject } = useProjectStore()
  const currentProject = useProjectStore((s) => s.currentProject)

  // CAD shape creation functions
  const { createBoxShape, createCylinderShape, createSphereShape } = useCAD()

  // Detect mode from search prefix
  useEffect(() => {
    if (search.startsWith(">")) {
      setMode("create")
    } else if (search.startsWith("@")) {
      setMode("search")
    } else if (search.startsWith("#")) {
      setMode("goto")
    } else {
      setMode("commands")
    }
  }, [search])

  // Extract query without prefix
  const searchQuery = useMemo(() => {
    if (search.startsWith(">") || search.startsWith("@") || search.startsWith("#")) {
      return search.slice(1).trim()
    }
    return search
  }, [search])

  // Close and run helper
  const closeAndRun = useCallback(
    (action: () => void | Promise<void>, commandId?: string) => {
      return () => {
        onOpenChange(false)
        setSearch("")
        setMode("commands")
        if (commandId) {
          setRecentCommandIds((prev) => {
            const filtered = prev.filter((id) => id !== commandId)
            return [commandId, ...filtered].slice(0, 5)
          })
        }
        action()
      }
    },
    [onOpenChange]
  )

  // ========== COMMANDS ==========

  const commands: CommandItemDef[] = useMemo(
    () => [
      // File commands
      {
        id: "file.new",
        label: t("shortcuts.newProject"),
        description: "Create a new project",
        icon: File01Icon,
        shortcut: `${modKey}+N`,
        category: "file",
        keywords: ["new", "create", "project"],
        action: closeAndRun(() => onNewProject?.(), "file.new"),
      },
      {
        id: "file.open",
        label: t("shortcuts.openProject"),
        description: "Open an existing project",
        icon: FolderOpenIcon,
        shortcut: `${modKey}+O`,
        category: "file",
        keywords: ["open", "load", "project"],
        action: closeAndRun(() => onOpenProject?.(), "file.open"),
      },
      {
        id: "file.save",
        label: t("shortcuts.save"),
        description: "Save the current project",
        icon: FloppyDiskIcon,
        shortcut: `${modKey}+S`,
        category: "file",
        keywords: ["save", "store"],
        disabled: !currentProject,
        action: closeAndRun(async () => {
          if (currentProject) await saveCurrentProject()
        }, "file.save"),
      },
      {
        id: "file.export",
        label: t("shortcuts.export"),
        description: "Export model to file",
        icon: Download04Icon,
        shortcut: `${modKey}+E`,
        category: "file",
        keywords: ["export", "download", "stl", "obj"],
        disabled: true,
        action: closeAndRun(() => {}, "file.export"),
      },
      {
        id: "file.close",
        label: t("shortcuts.closeProject"),
        description: "Close the current project",
        icon: Cancel01Icon,
        shortcut: `${modKey}+W`,
        category: "file",
        keywords: ["close", "project", "exit"],
        disabled: !currentProject,
        action: closeAndRun(() => closeProject(), "file.close"),
      },

      // Edit commands
      {
        id: "edit.undo",
        label: t("shortcuts.undo"),
        description: "Undo the last action",
        icon: ArrowTurnBackwardIcon,
        shortcut: `${modKey}+Z`,
        category: "edit",
        keywords: ["undo", "back", "revert"],
        action: closeAndRun(() => undo(), "edit.undo"),
      },
      {
        id: "edit.redo",
        label: t("shortcuts.redo"),
        description: "Redo the last undone action",
        icon: ArrowTurnForwardIcon,
        shortcut: `${modKey}+Y`,
        category: "edit",
        keywords: ["redo", "forward"],
        action: closeAndRun(() => redo(), "edit.redo"),
      },
      {
        id: "edit.delete",
        label: t("shortcuts.delete"),
        description: "Delete selected objects",
        icon: Delete02Icon,
        shortcut: "Del",
        category: "edit",
        keywords: ["delete", "remove", "erase"],
        disabled: selectedIds.length === 0,
        action: closeAndRun(() => deleteSelected(), "edit.delete"),
      },
      {
        id: "edit.duplicate",
        label: "Duplicate",
        description: "Duplicate selected objects",
        icon: Copy01Icon,
        shortcut: `${modKey}+D`,
        category: "edit",
        keywords: ["duplicate", "copy", "clone"],
        disabled: selectedIds.length === 0,
        action: closeAndRun(() => duplicateSelected(), "edit.duplicate"),
      },
      {
        id: "edit.selectAll",
        label: t("shortcuts.selectAll"),
        description: "Select all objects",
        icon: Layers01Icon,
        shortcut: `${modKey}+A`,
        category: "edit",
        keywords: ["select", "all"],
        action: closeAndRun(() => selectAll(), "edit.selectAll"),
      },
      {
        id: "edit.deselectAll",
        label: "Deselect All",
        description: "Deselect all objects",
        icon: Cancel01Icon,
        shortcut: "Esc",
        category: "edit",
        keywords: ["deselect", "clear", "selection"],
        action: closeAndRun(() => deselectAll(), "edit.deselectAll"),
      },

      // View commands
      {
        id: "view.toggleSidebar",
        label: t("shortcuts.toggleSidebar"),
        description: "Show or hide the sidebar",
        icon: SidebarLeft01Icon,
        shortcut: `${modKey}+B`,
        category: "view",
        keywords: ["sidebar", "toggle", "panel"],
        action: closeAndRun(() => toggleSidebarCollapsed(), "view.toggleSidebar"),
      },
      {
        id: "view.toggleProperties",
        label: t("shortcuts.toggleProperties"),
        description: "Show or hide properties panel",
        icon: GridIcon,
        shortcut: `${modKey}+2`,
        category: "view",
        keywords: ["properties", "toggle", "panel"],
        action: closeAndRun(() => togglePanel("properties"), "view.toggleProperties"),
      },
      {
        id: "view.toggleAiChat",
        label: "Toggle AI Chat",
        description: "Show or hide AI chat panel",
        icon: HelpCircleIcon,
        shortcut: `${modKey}+Shift+A`,
        category: "view",
        keywords: ["ai", "chat", "assistant"],
        action: closeAndRun(() => togglePanel("aiChat"), "view.toggleAiChat"),
      },
      {
        id: "view.toggleGrid",
        label: "Toggle Grid",
        description: "Show or hide the grid",
        icon: LayoutGridIcon,
        shortcut: `${modKey}+G`,
        category: "view",
        keywords: ["grid", "toggle"],
        action: closeAndRun(
          () => setViewportSettings({ showGrid: !viewportSettings.showGrid }),
          "view.toggleGrid"
        ),
      },
      {
        id: "view.toggleSnap",
        label: "Toggle Snap",
        description: "Enable or disable snapping",
        icon: Tick02Icon,
        shortcut: `${modKey}+Shift+S`,
        category: "view",
        keywords: ["snap", "toggle", "grid"],
        action: closeAndRun(
          () => setSnapMode(snapMode === "none" ? "grid" : "none"),
          "view.toggleSnap"
        ),
      },

      // Transform commands
      {
        id: "transform.select",
        label: "Select Mode",
        description: "Switch to selection mode",
        icon: Cursor01Icon,
        shortcut: "V",
        category: "transform",
        keywords: ["select", "cursor", "mode"],
        action: closeAndRun(() => setTransformMode("none"), "transform.select"),
      },
      {
        id: "transform.translate",
        label: "Move Mode",
        description: "Switch to move/translate mode",
        icon: Move01Icon,
        shortcut: "G",
        category: "transform",
        keywords: ["move", "translate", "grab"],
        action: closeAndRun(() => setTransformMode("translate"), "transform.translate"),
      },
      {
        id: "transform.rotate",
        label: "Rotate Mode",
        description: "Switch to rotation mode",
        icon: RotateClockwiseIcon,
        shortcut: "R",
        category: "transform",
        keywords: ["rotate", "spin"],
        action: closeAndRun(() => setTransformMode("rotate"), "transform.rotate"),
      },
      {
        id: "transform.scale",
        label: "Scale Mode",
        description: "Switch to scale mode",
        icon: Maximize01Icon,
        shortcut: "S",
        category: "transform",
        keywords: ["scale", "resize"],
        action: closeAndRun(() => setTransformMode("scale"), "transform.scale"),
      },

      // Navigation commands
      {
        id: "navigation.viewTop",
        label: "Top View",
        description: "Switch to top view",
        icon: Home01Icon,
        shortcut: "Num7",
        category: "navigation",
        keywords: ["top", "view", "camera"],
        action: closeAndRun(() => setCameraView("top"), "navigation.viewTop"),
      },
      {
        id: "navigation.viewFront",
        label: "Front View",
        description: "Switch to front view",
        icon: Home01Icon,
        shortcut: "Num1",
        category: "navigation",
        keywords: ["front", "view", "camera"],
        action: closeAndRun(() => setCameraView("front"), "navigation.viewFront"),
      },
      {
        id: "navigation.viewRight",
        label: "Right View",
        description: "Switch to right view",
        icon: Home01Icon,
        shortcut: "Num3",
        category: "navigation",
        keywords: ["right", "view", "camera"],
        action: closeAndRun(() => setCameraView("right"), "navigation.viewRight"),
      },
      {
        id: "navigation.viewPerspective",
        label: "Perspective View",
        description: "Switch to perspective view",
        icon: Home01Icon,
        shortcut: "Num0",
        category: "navigation",
        keywords: ["perspective", "view", "camera", "3d"],
        action: closeAndRun(() => setCameraView("perspective"), "navigation.viewPerspective"),
      },

      // Workspace commands
      {
        id: "workspace.modeller",
        label: t("shortcuts.modeller"),
        description: "Switch to 3D Modeller workspace",
        icon: CubeIcon,
        shortcut: `${modKey}+Shift+M`,
        category: "workspace",
        keywords: ["modeller", "3d", "workspace"],
        action: closeAndRun(() => navigateTo("modeller"), "workspace.modeller"),
      },
      {
        id: "workspace.mesh",
        label: t("shortcuts.mesh"),
        description: "Switch to Mesh workspace",
        icon: GridIcon,
        shortcut: `${modKey}+Shift+G`,
        category: "workspace",
        keywords: ["mesh", "workspace"],
        action: closeAndRun(() => navigateTo("mesh"), "workspace.mesh"),
      },
      {
        id: "workspace.cfd",
        label: t("shortcuts.cfd"),
        description: "Switch to CFD workspace",
        icon: WaveIcon,
        shortcut: `${modKey}+Shift+C`,
        category: "workspace",
        keywords: ["cfd", "simulation", "workspace"],
        action: closeAndRun(() => navigateTo("cfd"), "workspace.cfd"),
      },
      {
        id: "workspace.results",
        label: t("shortcuts.results"),
        description: "Switch to Results workspace",
        icon: LayoutGridIcon,
        shortcut: `${modKey}+Shift+R`,
        category: "workspace",
        keywords: ["results", "analysis", "workspace"],
        action: closeAndRun(() => navigateTo("results"), "workspace.results"),
      },

      // Tools/Help commands
      {
        id: "tools.settings",
        label: t("common.settings"),
        description: "Open application settings",
        icon: Settings02Icon,
        shortcut: `${modKey}+,`,
        category: "tools",
        keywords: ["settings", "preferences", "options"],
        action: closeAndRun(() => onOpenSettings?.(), "tools.settings"),
      },
      {
        id: "help.shortcuts",
        label: t("shortcuts.title"),
        description: "View keyboard shortcuts",
        icon: HelpCircleIcon,
        shortcut: `${modKey}+/`,
        category: "help",
        keywords: ["shortcuts", "keyboard", "help"],
        action: closeAndRun(() => onOpenShortcuts?.(), "help.shortcuts"),
      },
    ],
    [
      t,
      modKey,
      closeAndRun,
      currentProject,
      selectedIds,
      viewportSettings,
      snapMode,
      undo,
      redo,
      deleteSelected,
      selectAll,
      deselectAll,
      duplicateSelected,
      setTransformMode,
      setViewportSettings,
      setSnapMode,
      setCameraView,
      togglePanel,
      toggleSidebarCollapsed,
      navigateTo,
      saveCurrentProject,
      onNewProject,
      onOpenProject,
      onOpenSettings,
      onOpenShortcuts,
      closeProject,
    ]
  )

  // ========== CREATE COMMANDS (> mode) ==========

  const createCommands: CommandItemDef[] = useMemo(
    () => [
      {
        id: "create.channel",
        label: "Channel",
        description: "Create a hydraulic channel",
        icon: WaveIcon,
        category: "tools",
        keywords: ["channel", "hydraulic", "create"],
        action: closeAndRun(() => {
          // Navigate to modeller and ensure sidebar is visible
          useNavigationStore.getState().setView("modeller")
          useLayoutStore.getState().setPanel("sidebar", true)
        }, "create.channel"),
      },
      {
        id: "create.box",
        label: "Box",
        description: "Create a 1m box primitive",
        icon: CubeIcon,
        category: "tools",
        keywords: ["box", "cube", "primitive"],
        action: closeAndRun(async () => {
          useNavigationStore.getState().setView("modeller")
          await createBoxShape({ width: 1, depth: 1, height: 1, name: "Box" })
        }, "create.box"),
      },
      {
        id: "create.cylinder",
        label: "Cylinder",
        description: "Create a cylinder (r=0.5m, h=1m)",
        icon: CubeIcon,
        category: "tools",
        keywords: ["cylinder", "primitive"],
        action: closeAndRun(async () => {
          useNavigationStore.getState().setView("modeller")
          await createCylinderShape({ radius: 0.5, height: 1, name: "Cylinder" })
        }, "create.cylinder"),
      },
      {
        id: "create.sphere",
        label: "Sphere",
        description: "Create a sphere (r=0.5m)",
        icon: CubeIcon,
        category: "tools",
        keywords: ["sphere", "ball", "primitive"],
        action: closeAndRun(async () => {
          useNavigationStore.getState().setView("modeller")
          await createSphereShape({ radius: 0.5, name: "Sphere" })
        }, "create.sphere"),
      },
    ],
    [closeAndRun, createBoxShape, createCylinderShape, createSphereShape]
  )

  // ========== GO TO COMMANDS (# mode) ==========

  const gotoCommands: CommandItemDef[] = useMemo(() => {
    return objects.map((obj) => ({
      id: `goto.${obj.id}`,
      label: obj.name,
      description: `${obj.type} - ${obj.id.slice(0, 8)}`,
      icon: obj.type === "channel" ? WaveIcon : CubeIcon,
      category: "navigation" as CommandCategory,
      keywords: [obj.id, obj.type, obj.name.toLowerCase()],
      action: closeAndRun(() => {
        useModellerStore.getState().select(obj.id)
        useModellerStore.getState().focusObject(obj.id)
      }),
    }))
  }, [objects, closeAndRun])

  // ========== SEARCH COMMANDS (@ mode) ==========

  const searchCommands: CommandItemDef[] = useMemo(() => {
    // Combine objects and layers for search
    const objectCommands = objects.map((obj) => ({
      id: `search.object.${obj.id}`,
      label: obj.name,
      description: `Object: ${obj.type}`,
      icon: obj.type === "channel" ? WaveIcon : CubeIcon,
      category: "navigation" as CommandCategory,
      keywords: [obj.name.toLowerCase(), obj.type],
      action: closeAndRun(() => {
        useModellerStore.getState().select(obj.id)
      }),
    }))

    return objectCommands
  }, [objects, closeAndRun])

  // ========== RECENT COMMANDS ==========

  const recentCommands = useMemo(() => {
    const allCommands = [...commands, ...createCommands]
    return recentCommandIds
      .map((id) => allCommands.find((c) => c.id === id))
      .filter((c): c is CommandItemDef => c !== undefined && !c.disabled)
      .slice(0, 5)
  }, [recentCommandIds, commands, createCommands])

  // ========== FILTERED COMMANDS ==========

  const filteredCommands = useMemo(() => {
    let sourceCommands: CommandItemDef[]

    switch (mode) {
      case "create":
        sourceCommands = createCommands
        break
      case "goto":
        sourceCommands = gotoCommands
        break
      case "search":
        sourceCommands = searchCommands
        break
      default:
        sourceCommands = commands
    }

    if (!searchQuery) {
      return sourceCommands.filter((c) => !c.disabled)
    }

    const query = searchQuery.toLowerCase()
    return sourceCommands.filter(
      (c) =>
        !c.disabled &&
        (c.label.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.keywords?.some((k) => k.includes(query)))
    )
  }, [mode, searchQuery, commands, createCommands, gotoCommands, searchCommands])

  // ========== GROUPED COMMANDS ==========

  const groupedCommands = useMemo(() => {
    const groups = CATEGORY_ORDER.map((category) => {
      let items: CommandItemDef[]

      if (category === "recent" && mode === "commands" && !searchQuery) {
        items = recentCommands
      } else {
        items = filteredCommands.filter((c) => c.category === category)
      }

      return {
        category,
        label: CATEGORY_LABELS[category],
        items,
      }
    }).filter((group) => group.items.length > 0)

    return groups
  }, [filteredCommands, recentCommands, mode, searchQuery])

  // ========== PLACEHOLDER ==========

  const placeholder = useMemo(() => {
    switch (mode) {
      case "create":
        return "Add an object..."
      case "goto":
        return "Go to object..."
      case "search":
        return "Search in project..."
      default:
        return t("titlebar.search")
    }
  }, [mode, t])

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("")
      setMode("commands")
    }
  }, [open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("shortcuts.commandPalette")}
      description="Search for commands, objects, or actions"
    >
      <Command className="rounded-lg border shadow-md" loop>
        <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />

        {/* Mode indicator */}
        {mode !== "commands" && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border/50 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium">
              {mode === "create" && "> Add Object"}
              {mode === "goto" && "# Go to Object"}
              {mode === "search" && "@ Search Project"}
            </span>
            <span>Press Escape to clear</span>
          </div>
        )}

        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {groupedCommands.map((group, groupIndex) => (
            <div key={group.category}>
              {groupIndex > 0 && <CommandSeparator />}
              <CommandGroup heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.description || ""} ${item.keywords?.join(" ") || ""}`}
                    onSelect={item.action}
                    disabled={item.disabled}
                  >
                    {item.icon && (
                      <HugeiconsIcon icon={item.icon} className="size-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return { open, setOpen }
}
