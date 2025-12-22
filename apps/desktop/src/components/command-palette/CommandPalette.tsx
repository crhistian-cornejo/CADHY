/**
 * Command Palette - CADHY
 *
 * A powerful command palette inspired by VS Code and GraphCAD.
 * Built with Base UI Autocomplete + Dialog components.
 * Supports multiple modes:
 * - Commands (default): Search and execute commands
 * - > : Add/create mode (channels, shapes, etc.)
 * - @ : Search in project (objects, layers)
 * - # : Go to object by ID/name
 */

import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
  Kbd,
  KbdGroup,
} from "@cadhy/ui"
import {
  AiGenerativeIcon,
  ArrowDown01Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  ArrowUp01Icon,
  Cancel01Icon,
  CircleIcon,
  Copy01Icon,
  CubeIcon,
  Cursor01Icon,
  Delete02Icon,
  Download04Icon,
  EyeIcon,
  File01Icon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GridIcon,
  HelpCircleIcon,
  Home01Icon,
  Layers01Icon,
  LayoutGridIcon,
  Maximize01Icon,
  Moon02Icon,
  Move01Icon,
  ReturnRequestIcon,
  RotateClockwiseIcon,
  Search01Icon,
  Settings02Icon,
  SidebarLeft01Icon,
  Sun03Icon,
  Tick02Icon,
  WaveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useCAD } from "@/hooks/use-cad"
import { usePlatform } from "@/hooks/use-platform"
import { useLayoutStore } from "@/stores/layout-store"
import { useModellerStore } from "@/stores/modeller"
import { useNavigationStore } from "@/stores/navigation-store"
import { useProjectStore } from "@/stores/project-store"
import { useThemeStore } from "@/stores/theme-store"

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
  | "camera"
  | "workspace"
  | "theme"
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

interface GroupedCommands {
  value: CommandCategory
  label: string
  items: CommandItemDef[]
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
  "camera",
  "workspace",
  "theme",
  "tools",
  "help",
]

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  recent: "Recent",
  file: "File",
  edit: "Edit",
  view: "View",
  transform: "Transform",
  camera: "Camera",
  workspace: "Workspace",
  theme: "Theme",
  tools: "Tools",
  help: "Help",
}

// ============================================================================
// COMPONENT
// ============================================================================

// Modeller actions accessed via getState() - stable references
const modellerActions = {
  undo: () => useModellerStore.getState().undo(),
  redo: () => useModellerStore.getState().redo(),
  deleteSelected: () => useModellerStore.getState().deleteSelected(),
  selectAll: () => useModellerStore.getState().selectAll(),
  deselectAll: () => useModellerStore.getState().deselectAll(),
  invertSelection: () => useModellerStore.getState().invertSelection(),
  duplicateSelected: () => useModellerStore.getState().duplicateSelected(),
  setTransformMode: (mode: "none" | "translate" | "rotate" | "scale") =>
    useModellerStore.getState().setTransformMode(mode),
  setViewportSettings: (settings: Record<string, unknown>) =>
    useModellerStore.getState().setViewportSettings(settings),
  setSnapMode: (mode: "none" | "grid" | "object" | "vertex") =>
    useModellerStore.getState().setSnapMode(mode),
  setCameraView: (view: "perspective" | "top" | "front" | "right" | "back" | "left" | "bottom") =>
    useModellerStore.getState().setCameraView(view),
  fitToSelection: () => useModellerStore.getState().fitToSelection(),
  fitToAll: () => useModellerStore.getState().fitToAll(),
  analyzeScene: () => useModellerStore.getState().analyzeScene(),
  toggleNotificationsPanel: () => useModellerStore.getState().toggleNotificationsPanel(),
}

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

  const modKey = isMacOS ? "⌘" : "⌃"
  const shiftKey = "⇧"

  // ========== STORE HOOKS ==========

  // Modeller store
  const objects = useModellerStore((s) => s.objects)
  const selectedIds = useModellerStore((s) => s.selectedIds)
  const viewportSettings = useModellerStore((s) => s.viewportSettings)
  const snapMode = useModellerStore((s) => s.snapMode)

  // Theme store
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  // Layout store
  const { togglePanel, toggleSidebarCollapsed, setPanel } = useLayoutStore()
  const panels = useLayoutStore((s) => s.panels)

  // Navigation store
  const setView = useNavigationStore((s) => s.setView)

  // Project store
  const { saveCurrentProject, closeProject } = useProjectStore()
  const currentProject = useProjectStore((s) => s.currentProject)

  // CAD shape creation functions
  const {
    createBoxShape,
    createCylinderShape,
    createSphereShape,
    createConeShape,
    createTorusShape,
  } = useCAD()

  // ========== MODE DETECTION ==========

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

  const searchQuery = useMemo(() => {
    if (search.startsWith(">") || search.startsWith("@") || search.startsWith("#")) {
      return search.slice(1).trim()
    }
    return search
  }, [search])

  // ========== HELPERS ==========

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
      // ===== FILE =====
      {
        id: "file.new",
        label: t("shortcuts.newProject"),
        description: "Create a new project",
        icon: File01Icon,
        shortcut: `${modKey}N`,
        category: "file",
        keywords: ["new", "create", "project"],
        action: closeAndRun(() => onNewProject?.(), "file.new"),
      },
      {
        id: "file.open",
        label: t("shortcuts.openProject"),
        description: "Open an existing project",
        icon: FolderOpenIcon,
        shortcut: `${modKey}O`,
        category: "file",
        keywords: ["open", "load", "project"],
        action: closeAndRun(() => onOpenProject?.(), "file.open"),
      },
      {
        id: "file.save",
        label: t("shortcuts.save"),
        description: "Save the current project",
        icon: FloppyDiskIcon,
        shortcut: `${modKey}S`,
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
        shortcut: `${modKey}E`,
        category: "file",
        keywords: ["export", "download", "stl", "obj"],
        disabled: true, // TODO: Enable when export is implemented
        action: closeAndRun(() => {}, "file.export"),
      },
      {
        id: "file.close",
        label: t("shortcuts.closeProject"),
        description: "Close the current project",
        icon: Cancel01Icon,
        shortcut: `${modKey}W`,
        category: "file",
        keywords: ["close", "project", "exit"],
        disabled: !currentProject,
        action: closeAndRun(() => closeProject(), "file.close"),
      },

      // ===== EDIT =====
      {
        id: "edit.undo",
        label: t("shortcuts.undo"),
        description: "Undo the last action",
        icon: ArrowTurnBackwardIcon,
        shortcut: `${modKey}Z`,
        category: "edit",
        keywords: ["undo", "back", "revert"],
        action: closeAndRun(() => modellerActions.undo(), "edit.undo"),
      },
      {
        id: "edit.redo",
        label: t("shortcuts.redo"),
        description: "Redo the last undone action",
        icon: ArrowTurnForwardIcon,
        shortcut: `${modKey}${shiftKey}Z`,
        category: "edit",
        keywords: ["redo", "forward"],
        action: closeAndRun(() => modellerActions.redo(), "edit.redo"),
      },
      {
        id: "edit.delete",
        label: t("shortcuts.delete"),
        description: "Delete selected objects",
        icon: Delete02Icon,
        shortcut: "⌫",
        category: "edit",
        keywords: ["delete", "remove", "erase"],
        disabled: selectedIds.length === 0,
        action: closeAndRun(() => modellerActions.deleteSelected(), "edit.delete"),
      },
      {
        id: "edit.duplicate",
        label: "Duplicate",
        description: "Duplicate selected objects",
        icon: Copy01Icon,
        shortcut: `${modKey}D`,
        category: "edit",
        keywords: ["duplicate", "copy", "clone"],
        disabled: selectedIds.length === 0,
        action: closeAndRun(() => modellerActions.duplicateSelected(), "edit.duplicate"),
      },
      {
        id: "edit.selectAll",
        label: t("shortcuts.selectAll"),
        description: "Select all visible objects",
        icon: Layers01Icon,
        shortcut: `${modKey}A`,
        category: "edit",
        keywords: ["select", "all"],
        action: closeAndRun(() => modellerActions.selectAll(), "edit.selectAll"),
      },
      {
        id: "edit.deselectAll",
        label: "Deselect All",
        description: "Clear selection",
        icon: Cancel01Icon,
        shortcut: "⎋",
        category: "edit",
        keywords: ["deselect", "clear", "selection"],
        action: closeAndRun(() => modellerActions.deselectAll(), "edit.deselectAll"),
      },
      {
        id: "edit.invertSelection",
        label: "Invert Selection",
        description: "Select unselected objects",
        icon: Layers01Icon,
        shortcut: `${modKey}I`,
        category: "edit",
        keywords: ["invert", "selection", "toggle"],
        action: closeAndRun(() => modellerActions.invertSelection(), "edit.invertSelection"),
      },

      // ===== VIEW =====
      {
        id: "view.toggleSidebar",
        label: t("shortcuts.toggleSidebar"),
        description: "Show or hide the sidebar",
        icon: SidebarLeft01Icon,
        shortcut: `${modKey}B`,
        category: "view",
        keywords: ["sidebar", "toggle", "panel"],
        action: closeAndRun(() => toggleSidebarCollapsed(), "view.toggleSidebar"),
      },
      {
        id: "view.toggleProperties",
        label: t("shortcuts.toggleProperties"),
        description: "Show or hide properties panel",
        icon: GridIcon,
        shortcut: `${modKey}2`,
        category: "view",
        keywords: ["properties", "toggle", "panel", "inspector"],
        action: closeAndRun(() => togglePanel("properties"), "view.toggleProperties"),
      },
      {
        id: "view.toggleAiChat",
        label: "Toggle AI Chat",
        description: panels.aiChat ? "Hide AI chat panel" : "Show AI chat panel",
        icon: AiGenerativeIcon,
        shortcut: `${modKey}${shiftKey}A`,
        category: "view",
        keywords: ["ai", "chat", "assistant", "copilot"],
        action: closeAndRun(() => togglePanel("aiChat"), "view.toggleAiChat"),
      },
      {
        id: "view.toggleGrid",
        label: viewportSettings.showGrid ? "Hide Grid" : "Show Grid",
        description: "Toggle viewport grid visibility",
        icon: LayoutGridIcon,
        shortcut: `${modKey}G`,
        category: "view",
        keywords: ["grid", "toggle", "show", "hide"],
        action: closeAndRun(
          () => modellerActions.setViewportSettings({ showGrid: !viewportSettings.showGrid }),
          "view.toggleGrid"
        ),
      },
      {
        id: "view.toggleSnap",
        label: snapMode === "none" ? "Enable Grid Snap" : "Disable Snap",
        description: "Toggle snapping mode",
        icon: Tick02Icon,
        shortcut: `${modKey}${shiftKey}S`,
        category: "view",
        keywords: ["snap", "toggle", "grid"],
        action: closeAndRun(
          () => modellerActions.setSnapMode(snapMode === "none" ? "grid" : "none"),
          "view.toggleSnap"
        ),
      },
      {
        id: "view.analyzeScene",
        label: "Analyze Scene",
        description: "Check design for issues and warnings",
        icon: Search01Icon,
        category: "view",
        keywords: ["analyze", "check", "design", "issues", "warnings"],
        action: closeAndRun(() => modellerActions.analyzeScene(), "view.analyzeScene"),
      },
      {
        id: "view.notifications",
        label: "Toggle Notifications",
        description: "Show or hide design notifications",
        icon: HelpCircleIcon,
        category: "view",
        keywords: ["notifications", "warnings", "errors"],
        action: closeAndRun(() => modellerActions.toggleNotificationsPanel(), "view.notifications"),
      },

      // ===== TRANSFORM =====
      {
        id: "transform.select",
        label: "Select Mode",
        description: "Switch to selection mode",
        icon: Cursor01Icon,
        shortcut: "V",
        category: "transform",
        keywords: ["select", "cursor", "mode", "pointer"],
        action: closeAndRun(() => modellerActions.setTransformMode("none"), "transform.select"),
      },
      {
        id: "transform.translate",
        label: "Move Mode",
        description: "Switch to move/translate mode",
        icon: Move01Icon,
        shortcut: "G",
        category: "transform",
        keywords: ["move", "translate", "grab", "position"],
        action: closeAndRun(
          () => modellerActions.setTransformMode("translate"),
          "transform.translate"
        ),
      },
      {
        id: "transform.rotate",
        label: "Rotate Mode",
        description: "Switch to rotation mode",
        icon: RotateClockwiseIcon,
        shortcut: "R",
        category: "transform",
        keywords: ["rotate", "spin", "orientation"],
        action: closeAndRun(() => modellerActions.setTransformMode("rotate"), "transform.rotate"),
      },
      {
        id: "transform.scale",
        label: "Scale Mode",
        description: "Switch to scale mode",
        icon: Maximize01Icon,
        shortcut: "S",
        category: "transform",
        keywords: ["scale", "resize", "size"],
        action: closeAndRun(() => modellerActions.setTransformMode("scale"), "transform.scale"),
      },

      // ===== CAMERA =====
      {
        id: "camera.perspective",
        label: "Perspective View",
        description: "3D perspective camera view",
        icon: CubeIcon,
        shortcut: "Num0",
        category: "camera",
        keywords: ["perspective", "view", "camera", "3d"],
        action: closeAndRun(
          () => modellerActions.setCameraView("perspective"),
          "camera.perspective"
        ),
      },
      {
        id: "camera.top",
        label: "Top View",
        description: "View from above (XZ plane)",
        icon: Home01Icon,
        shortcut: "Num7",
        category: "camera",
        keywords: ["top", "view", "camera", "above", "plan"],
        action: closeAndRun(() => modellerActions.setCameraView("top"), "camera.top"),
      },
      {
        id: "camera.front",
        label: "Front View",
        description: "View from front (XY plane)",
        icon: Home01Icon,
        shortcut: "Num1",
        category: "camera",
        keywords: ["front", "view", "camera", "elevation"],
        action: closeAndRun(() => modellerActions.setCameraView("front"), "camera.front"),
      },
      {
        id: "camera.right",
        label: "Right View",
        description: "View from right side (YZ plane)",
        icon: Home01Icon,
        shortcut: "Num3",
        category: "camera",
        keywords: ["right", "side", "view", "camera"],
        action: closeAndRun(() => modellerActions.setCameraView("right"), "camera.right"),
      },
      {
        id: "camera.back",
        label: "Back View",
        description: "View from behind",
        icon: Home01Icon,
        shortcut: `${modKey}Num1`,
        category: "camera",
        keywords: ["back", "rear", "view", "camera"],
        action: closeAndRun(() => modellerActions.setCameraView("back"), "camera.back"),
      },
      {
        id: "camera.left",
        label: "Left View",
        description: "View from left side",
        icon: Home01Icon,
        shortcut: `${modKey}Num3`,
        category: "camera",
        keywords: ["left", "side", "view", "camera"],
        action: closeAndRun(() => modellerActions.setCameraView("left"), "camera.left"),
      },
      {
        id: "camera.bottom",
        label: "Bottom View",
        description: "View from below",
        icon: Home01Icon,
        shortcut: `${modKey}Num7`,
        category: "camera",
        keywords: ["bottom", "below", "view", "camera"],
        action: closeAndRun(() => modellerActions.setCameraView("bottom"), "camera.bottom"),
      },
      {
        id: "camera.fitSelection",
        label: "Fit to Selection",
        description: "Zoom to fit selected objects",
        icon: EyeIcon,
        shortcut: ".",
        category: "camera",
        keywords: ["fit", "zoom", "selection", "focus"],
        disabled: selectedIds.length === 0,
        action: closeAndRun(() => modellerActions.fitToSelection(), "camera.fitSelection"),
      },
      {
        id: "camera.fitAll",
        label: "Fit All",
        description: "Zoom to fit all objects",
        icon: EyeIcon,
        shortcut: "Home",
        category: "camera",
        keywords: ["fit", "zoom", "all", "scene"],
        action: closeAndRun(() => modellerActions.fitToAll(), "camera.fitAll"),
      },

      // ===== WORKSPACE =====
      {
        id: "workspace.modeller",
        label: t("shortcuts.modeller"),
        description: "Switch to 3D Modeller workspace",
        icon: CubeIcon,
        shortcut: `${modKey}${shiftKey}M`,
        category: "workspace",
        keywords: ["modeller", "3d", "workspace", "cad"],
        action: closeAndRun(() => setView("modeller"), "workspace.modeller"),
      },
      {
        id: "workspace.mesh",
        label: t("shortcuts.mesh"),
        description: "Switch to Mesh workspace",
        icon: GridIcon,
        shortcut: `${modKey}${shiftKey}G`,
        category: "workspace",
        keywords: ["mesh", "workspace", "grid"],
        action: closeAndRun(() => setView("mesh"), "workspace.mesh"),
      },
      {
        id: "workspace.cfd",
        label: t("shortcuts.cfd"),
        description: "Switch to CFD workspace",
        icon: WaveIcon,
        shortcut: `${modKey}${shiftKey}C`,
        category: "workspace",
        keywords: ["cfd", "simulation", "workspace", "fluid"],
        action: closeAndRun(() => setView("cfd"), "workspace.cfd"),
      },
      {
        id: "workspace.results",
        label: t("shortcuts.results"),
        description: "Switch to Results workspace",
        icon: LayoutGridIcon,
        shortcut: `${modKey}${shiftKey}R`,
        category: "workspace",
        keywords: ["results", "analysis", "workspace", "output"],
        action: closeAndRun(() => setView("results"), "workspace.results"),
      },

      // ===== THEME =====
      {
        id: "theme.light",
        label: "Light Theme",
        description: theme === "light" ? "Currently active" : "Switch to light mode",
        icon: Sun03Icon,
        category: "theme",
        keywords: ["light", "theme", "bright", "day"],
        disabled: theme === "light",
        action: closeAndRun(() => setTheme("light"), "theme.light"),
      },
      {
        id: "theme.dark",
        label: "Dark Theme",
        description: theme === "dark" ? "Currently active" : "Switch to dark mode",
        icon: Moon02Icon,
        category: "theme",
        keywords: ["dark", "theme", "night", "mode"],
        disabled: theme === "dark",
        action: closeAndRun(() => setTheme("dark"), "theme.dark"),
      },
      {
        id: "theme.system",
        label: "System Theme",
        description: theme === "system" ? "Currently active" : "Follow system preference",
        icon: Settings02Icon,
        category: "theme",
        keywords: ["system", "theme", "auto", "preference"],
        disabled: theme === "system",
        action: closeAndRun(() => setTheme("system"), "theme.system"),
      },

      // ===== TOOLS =====
      {
        id: "tools.settings",
        label: t("common.settings"),
        description: "Open application settings",
        icon: Settings02Icon,
        shortcut: `${modKey},`,
        category: "tools",
        keywords: ["settings", "preferences", "options", "config"],
        action: closeAndRun(() => onOpenSettings?.(), "tools.settings"),
      },

      // ===== HELP =====
      {
        id: "help.shortcuts",
        label: t("shortcuts.title"),
        description: "View keyboard shortcuts",
        icon: HelpCircleIcon,
        shortcut: `${modKey}/`,
        category: "help",
        keywords: ["shortcuts", "keyboard", "help", "hotkeys"],
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
      theme,
      panels,
      togglePanel,
      toggleSidebarCollapsed,
      setView,
      setTheme,
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
        keywords: ["channel", "hydraulic", "create", "flow"],
        action: closeAndRun(() => {
          setView("modeller")
          setPanel("sidebar", true)
        }, "create.channel"),
      },
      {
        id: "create.box",
        label: "Box",
        description: "Create a box primitive (1m cube)",
        icon: CubeIcon,
        category: "tools",
        keywords: ["box", "cube", "primitive", "shape"],
        action: closeAndRun(async () => {
          setView("modeller")
          await createBoxShape({ width: 1, depth: 1, height: 1, name: "Box" })
        }, "create.box"),
      },
      {
        id: "create.cylinder",
        label: "Cylinder",
        description: "Create a cylinder (r=0.5m, h=1m)",
        icon: CircleIcon,
        category: "tools",
        keywords: ["cylinder", "primitive", "shape", "pipe"],
        action: closeAndRun(async () => {
          setView("modeller")
          await createCylinderShape({ radius: 0.5, height: 1, name: "Cylinder" })
        }, "create.cylinder"),
      },
      {
        id: "create.sphere",
        label: "Sphere",
        description: "Create a sphere (r=0.5m)",
        icon: CircleIcon,
        category: "tools",
        keywords: ["sphere", "ball", "primitive", "shape"],
        action: closeAndRun(async () => {
          setView("modeller")
          await createSphereShape({ radius: 0.5, name: "Sphere" })
        }, "create.sphere"),
      },
      {
        id: "create.cone",
        label: "Cone",
        description: "Create a cone (r=0.5m, h=1m)",
        icon: CubeIcon,
        category: "tools",
        keywords: ["cone", "primitive", "shape"],
        action: closeAndRun(async () => {
          setView("modeller")
          await createConeShape({ radius: 0.5, height: 1, name: "Cone" })
        }, "create.cone"),
      },
      {
        id: "create.torus",
        label: "Torus",
        description: "Create a torus (donut shape)",
        icon: CircleIcon,
        category: "tools",
        keywords: ["torus", "donut", "ring", "primitive", "shape"],
        action: closeAndRun(async () => {
          setView("modeller")
          await createTorusShape({ majorRadius: 0.5, minorRadius: 0.15, name: "Torus" })
        }, "create.torus"),
      },
    ],
    [
      closeAndRun,
      setView,
      setPanel,
      createBoxShape,
      createCylinderShape,
      createSphereShape,
      createConeShape,
      createTorusShape,
    ]
  )

  // ========== GO TO COMMANDS (# mode) ==========

  const gotoCommands: CommandItemDef[] = useMemo(() => {
    return objects.map((obj) => ({
      id: `goto.${obj.id}`,
      label: obj.name,
      description: `${obj.type} - ${obj.id.slice(0, 8)}`,
      icon: obj.type === "channel" ? WaveIcon : CubeIcon,
      category: "camera" as CommandCategory,
      keywords: [obj.id, obj.type, obj.name.toLowerCase()],
      action: closeAndRun(() => {
        useModellerStore.getState().select(obj.id)
        useModellerStore.getState().focusObject(obj.id)
      }),
    }))
  }, [objects, closeAndRun])

  // ========== SEARCH COMMANDS (@ mode) ==========

  const searchCommands: CommandItemDef[] = useMemo(() => {
    return objects.map((obj) => ({
      id: `search.object.${obj.id}`,
      label: obj.name,
      description: `Object: ${obj.type}`,
      icon: obj.type === "channel" ? WaveIcon : CubeIcon,
      category: "camera" as CommandCategory,
      keywords: [obj.name.toLowerCase(), obj.type],
      action: closeAndRun(() => {
        useModellerStore.getState().select(obj.id)
      }),
    }))
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

  const groupedCommands: GroupedCommands[] = useMemo(() => {
    const groups = CATEGORY_ORDER.map((category) => {
      let items: CommandItemDef[]

      if (category === "recent" && mode === "commands" && !searchQuery) {
        items = recentCommands
      } else {
        items = filteredCommands.filter((c) => c.category === category)
      }

      return {
        value: category,
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

  // Custom filter
  const filterItems = useCallback((item: CommandItemDef, query: string) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q)) ||
      false
    )
  }, [])

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandDialogPopup>
        <Command
          filter={filterItems}
          items={groupedCommands}
          itemToStringValue={(item: CommandItemDef) => item.label}
          onValueChange={setSearch}
          value={search}
        >
          <CommandInput placeholder={placeholder} />

          {/* Mode indicator */}
          {mode !== "commands" && (
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 text-muted-foreground text-xs">
              <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                {mode === "create" && "> Add Object"}
                {mode === "goto" && "# Go to Object"}
                {mode === "search" && "@ Search Project"}
              </span>
              <span>Press Escape to clear</span>
            </div>
          )}

          <CommandPanel>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandList>
              {(group: GroupedCommands, index: number) => (
                <React.Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.label}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: CommandItemDef) => (
                        <CommandItem key={item.id} onClick={() => item.action()} value={item}>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {item.icon && (
                              <HugeiconsIcon
                                className="size-4 shrink-0 text-muted-foreground"
                                icon={item.icon}
                              />
                            )}
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate">{item.label}</span>
                              {item.description && (
                                <span className="truncate text-muted-foreground text-xs">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                  {index < groupedCommands.length - 1 && <CommandSeparator />}
                </React.Fragment>
              )}
            </CommandList>
          </CommandPanel>

          <CommandFooter>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <KbdGroup>
                  <Kbd>
                    <HugeiconsIcon className="size-3" icon={ArrowUp01Icon} />
                  </Kbd>
                  <Kbd>
                    <HugeiconsIcon className="size-3" icon={ArrowDown01Icon} />
                  </Kbd>
                </KbdGroup>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <Kbd>
                  <HugeiconsIcon className="size-3" icon={ReturnRequestIcon} />
                </Kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <KbdGroup>
                <Kbd>{modKey}</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
              <span>Close</span>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  // Keyboard shortcut (Ctrl+K) is now handled by useAppHotkeys via hotkeyRegistry
  // This hook only manages the open/close state

  return { open, setOpen }
}
