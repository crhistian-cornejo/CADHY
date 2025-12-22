/**
 * Application Hotkeys - CADHY
 *
 * Central hook that registers all global keyboard shortcuts for the app.
 * Uses the hotkey registry system for consistent, customizable shortcuts.
 */

import { toast } from "@cadhy/ui"
import { useCallback } from "react"
import { useHotkey } from "@/hooks/use-hotkey"
import { useLayoutStore } from "@/stores/layout-store"
import { useModellerStore } from "@/stores/modeller"
import { useNavigationStore } from "@/stores/navigation-store"
import { useProjectStore } from "@/stores/project-store"
import { useThemeStore } from "@/stores/theme-store"

// ============================================================================
// TYPES
// ============================================================================

interface UseAppHotkeysOptions {
  onOpenCommandPalette?: () => void
  onOpenSettings?: () => void
  onOpenShortcuts?: () => void
  onNewProject?: () => void
  onOpenProject?: () => void
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Register all application-wide keyboard shortcuts
 */
export function useAppHotkeys(options: UseAppHotkeysOptions = {}) {
  const { onOpenCommandPalette, onOpenSettings, onOpenShortcuts, onNewProject, onOpenProject } =
    options

  // ========== VIEW HOTKEYS ==========

  useHotkey(
    {
      id: "view.commandPalette",
      name: "Command Palette",
      description: "Open the command palette",
      category: "view",
      keys: ["Ctrl+K"],
    },
    useCallback(() => onOpenCommandPalette?.(), [onOpenCommandPalette])
  )

  useHotkey(
    {
      id: "view.toggleSidebar",
      name: "Toggle Sidebar",
      description: "Show or hide the sidebar",
      category: "view",
      keys: ["Ctrl+B"],
    },
    useCallback(() => useLayoutStore.getState().toggleSidebarCollapsed(), [])
  )

  useHotkey(
    {
      id: "view.toggleProperties",
      name: "Toggle Properties",
      description: "Show or hide the properties panel",
      category: "view",
      keys: ["Ctrl+2"],
    },
    useCallback(() => useLayoutStore.getState().togglePanel("properties"), [])
  )

  useHotkey(
    {
      id: "view.toggleAiChat",
      name: "Toggle AI Chat",
      description: "Show or hide the AI chat panel",
      category: "view",
      keys: ["Ctrl+Shift+A"],
    },
    useCallback(() => useLayoutStore.getState().togglePanel("aiChat"), [])
  )

  useHotkey(
    {
      id: "view.settings",
      name: "Settings",
      description: "Open settings",
      category: "view",
      keys: ["Ctrl+,"],
    },
    useCallback(() => onOpenSettings?.(), [onOpenSettings])
  )

  useHotkey(
    {
      id: "view.shortcuts",
      name: "Keyboard Shortcuts",
      description: "Show keyboard shortcuts",
      category: "view",
      keys: ["Ctrl+/"],
    },
    useCallback(() => onOpenShortcuts?.(), [onOpenShortcuts])
  )

  useHotkey(
    {
      id: "view.toggleGrid",
      name: "Toggle Grid",
      description: "Show or hide the viewport grid",
      category: "view",
      keys: ["Ctrl+G"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      state.setViewportSettings({ showGrid: !state.viewportSettings.showGrid })
    }, [])
  )

  useHotkey(
    {
      id: "view.toggleSnap",
      name: "Toggle Snap",
      description: "Enable or disable snapping",
      category: "view",
      keys: ["Ctrl+Shift+S"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      state.setSnapMode(state.snapMode === "none" ? "grid" : "none")
    }, [])
  )

  // ========== VIEW MODE HOTKEYS ==========

  useHotkey(
    {
      id: "view.solidMode",
      name: "Solid View",
      description: "Switch to solid view mode",
      category: "view",
      keys: ["Option+1"],
      context: "modeller",
    },
    useCallback(() => {
      useModellerStore.getState().setViewportSettings({ viewMode: "solid" })
    }, [])
  )

  useHotkey(
    {
      id: "view.wireframeMode",
      name: "Wireframe View",
      description: "Switch to wireframe view mode",
      category: "view",
      keys: ["Option+2"],
      context: "modeller",
    },
    useCallback(() => {
      useModellerStore.getState().setViewportSettings({ viewMode: "wireframe" })
    }, [])
  )

  useHotkey(
    {
      id: "view.xrayMode",
      name: "X-Ray View",
      description: "Switch to x-ray view mode",
      category: "view",
      keys: ["Option+3"],
      context: "modeller",
    },
    useCallback(() => {
      useModellerStore.getState().setViewportSettings({ viewMode: "xray" })
    }, [])
  )

  // ========== FILE HOTKEYS ==========

  useHotkey(
    {
      id: "file.new",
      name: "New Project",
      description: "Create a new project",
      category: "file",
      keys: ["Ctrl+N"],
    },
    useCallback(() => onNewProject?.(), [onNewProject])
  )

  useHotkey(
    {
      id: "file.open",
      name: "Open Project",
      description: "Open an existing project",
      category: "file",
      keys: ["Ctrl+O"],
    },
    useCallback(() => onOpenProject?.(), [onOpenProject])
  )

  useHotkey(
    {
      id: "file.save",
      name: "Save",
      description: "Save the current project",
      category: "file",
      keys: ["Ctrl+S"],
    },
    useCallback(() => {
      const state = useProjectStore.getState()
      if (state.currentProject) {
        state.saveCurrentProject()
      }
    }, [])
  )

  useHotkey(
    {
      id: "file.close",
      name: "Close Project",
      description: "Close the current project",
      category: "file",
      keys: ["Ctrl+W"],
    },
    useCallback(() => useProjectStore.getState().closeProject(), [])
  )

  // ========== EDIT HOTKEYS ==========

  useHotkey(
    {
      id: "edit.undo",
      name: "Undo",
      description: "Undo the last action",
      category: "edit",
      keys: ["Ctrl+Z"],
    },
    useCallback(() => useModellerStore.getState().undo(), [])
  )

  useHotkey(
    {
      id: "edit.redo",
      name: "Redo",
      description: "Redo the last undone action",
      category: "edit",
      keys: ["Ctrl+Y", "Ctrl+Shift+Z"],
    },
    useCallback(() => useModellerStore.getState().redo(), [])
  )

  useHotkey(
    {
      id: "edit.delete",
      name: "Delete",
      description: "Delete selected objects",
      category: "edit",
      keys: ["Delete", "Backspace"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().deleteSelected(), [])
  )

  useHotkey(
    {
      id: "edit.duplicate",
      name: "Duplicate",
      description: "Duplicate selected objects",
      category: "edit",
      keys: ["Ctrl+D"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().duplicateSelected(), [])
  )

  useHotkey(
    {
      id: "edit.selectAll",
      name: "Select All",
      description: "Select all objects",
      category: "edit",
      keys: ["Ctrl+A"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().selectAll(), [])
  )

  useHotkey(
    {
      id: "edit.deselectAll",
      name: "Deselect All",
      description: "Deselect all objects",
      category: "edit",
      keys: ["Escape"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().deselectAll(), [])
  )

  // ========== SELECTION MODE HOTKEYS (Plasticity-style) ==========

  useHotkey(
    {
      id: "selection.vertex",
      name: "Vertex Selection",
      description: "Switch to vertex selection mode",
      category: "selection",
      keys: ["1"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setSelectionMode("vertex"), [])
  )

  useHotkey(
    {
      id: "selection.edge",
      name: "Edge Selection",
      description: "Switch to edge selection mode",
      category: "selection",
      keys: ["2"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setSelectionMode("edge"), [])
  )

  useHotkey(
    {
      id: "selection.face",
      name: "Face Selection",
      description: "Switch to face selection mode",
      category: "selection",
      keys: ["3"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setSelectionMode("face"), [])
  )

  useHotkey(
    {
      id: "selection.body",
      name: "Body Selection",
      description: "Switch to body selection mode",
      category: "selection",
      keys: ["4"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setSelectionMode("body"), [])
  )

  useHotkey(
    {
      id: "edit.invertSelection",
      name: "Invert Selection",
      description: "Select unselected objects",
      category: "edit",
      keys: ["Ctrl+I"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().invertSelection(), [])
  )

  // ========== TRANSFORM HOTKEYS ==========

  useHotkey(
    {
      id: "transform.select",
      name: "Select Mode",
      description: "Switch to selection mode",
      category: "transform",
      keys: ["V"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setTransformMode("none"), [])
  )

  useHotkey(
    {
      id: "transform.translate",
      name: "Translate",
      description: "Move selected objects",
      category: "transform",
      keys: ["G"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setTransformMode("translate"), [])
  )

  useHotkey(
    {
      id: "transform.rotate",
      name: "Rotate",
      description: "Rotate selected objects",
      category: "transform",
      keys: ["R"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setTransformMode("rotate"), [])
  )

  useHotkey(
    {
      id: "transform.scale",
      name: "Scale",
      description: "Scale selected objects",
      category: "transform",
      keys: ["S"],
      context: "modeller",
    },
    useCallback(() => useModellerStore.getState().setTransformMode("scale"), [])
  )

  // ========== NAVIGATION/CAMERA HOTKEYS ==========

  useHotkey(
    {
      id: "navigation.viewPerspective",
      name: "Perspective View",
      description: "Switch to perspective view",
      category: "navigation",
      keys: ["Numpad0"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("perspective"), [])
  )

  useHotkey(
    {
      id: "navigation.viewTop",
      name: "Top View",
      description: "Switch to top view",
      category: "navigation",
      keys: ["Numpad7"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("top"), [])
  )

  useHotkey(
    {
      id: "navigation.viewFront",
      name: "Front View",
      description: "Switch to front view",
      category: "navigation",
      keys: ["Numpad1"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("front"), [])
  )

  useHotkey(
    {
      id: "navigation.viewRight",
      name: "Right View",
      description: "Switch to right view",
      category: "navigation",
      keys: ["Numpad3"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("right"), [])
  )

  useHotkey(
    {
      id: "navigation.viewBack",
      name: "Back View",
      description: "Switch to back view",
      category: "navigation",
      keys: ["Ctrl+Numpad1"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("back"), [])
  )

  useHotkey(
    {
      id: "navigation.viewLeft",
      name: "Left View",
      description: "Switch to left view",
      category: "navigation",
      keys: ["Ctrl+Numpad3"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("left"), [])
  )

  useHotkey(
    {
      id: "navigation.viewBottom",
      name: "Bottom View",
      description: "Switch to bottom view",
      category: "navigation",
      keys: ["Ctrl+Numpad7"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().setCameraView("bottom"), [])
  )

  useHotkey(
    {
      id: "navigation.fitAll",
      name: "Fit All",
      description: "Fit all objects in view",
      category: "navigation",
      keys: ["Home"],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().fitToAll(), [])
  )

  useHotkey(
    {
      id: "navigation.fitSelection",
      name: "Fit Selection",
      description: "Fit selected objects in view",
      category: "navigation",
      keys: ["Numpad."],
      context: "viewport",
    },
    useCallback(() => useModellerStore.getState().fitToSelection(), [])
  )

  // ========== WORKSPACE HOTKEYS ==========

  useHotkey(
    {
      id: "workspace.modeller",
      name: "Modeller",
      description: "Switch to Modeller workspace",
      category: "workspace",
      keys: ["Ctrl+Shift+M"],
    },
    useCallback(() => useNavigationStore.getState().setView("modeller"), [])
  )

  useHotkey(
    {
      id: "workspace.mesh",
      name: "Mesh",
      description: "Switch to Mesh workspace",
      category: "workspace",
      keys: ["Ctrl+Shift+E"],
    },
    useCallback(() => useNavigationStore.getState().setView("mesh"), [])
  )

  useHotkey(
    {
      id: "workspace.cfd",
      name: "CFD",
      description: "Switch to CFD workspace",
      category: "workspace",
      keys: ["Ctrl+Shift+C"],
    },
    useCallback(() => useNavigationStore.getState().setView("cfd"), [])
  )

  useHotkey(
    {
      id: "workspace.results",
      name: "Results",
      description: "Switch to Results workspace",
      category: "workspace",
      keys: ["Ctrl+Shift+R"],
    },
    useCallback(() => useNavigationStore.getState().setView("results"), [])
  )

  // ========== CAD OPERATIONS HOTKEYS ==========

  useHotkey(
    {
      id: "operations.fillet",
      name: "Fillet",
      description: "Round edges of selected object",
      category: "operations",
      keys: ["F"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      toast.info("Fillet operation - Coming soon!")
      // TODO: Implement fillet operation
    }, [])
  )

  useHotkey(
    {
      id: "operations.chamfer",
      name: "Chamfer",
      description: "Bevel edges of selected object",
      category: "operations",
      keys: ["C"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      toast.info("Chamfer operation - Coming soon!")
      // TODO: Implement chamfer operation
    }, [])
  )

  useHotkey(
    {
      id: "operations.mirror",
      name: "Mirror",
      description: "Mirror selected object",
      category: "operations",
      keys: ["X"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      toast.info("Mirror operation - Coming soon!")
      // TODO: Implement mirror operation
    }, [])
  )

  useHotkey(
    {
      id: "operations.duplicate",
      name: "Duplicate",
      description: "Duplicate selected object",
      category: "operations",
      keys: ["D"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      toast.info("Duplicate operation - Coming soon!")
      // TODO: Use modellerStore.duplicateSelected() when implemented
    }, [])
  )

  useHotkey(
    {
      id: "operations.extrude",
      name: "Extrude",
      description: "Extrude a face or wire",
      category: "operations",
      keys: ["E"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      toast.info("Extrude operation - Coming soon!")
      // TODO: Implement extrude operation
    }, [])
  )

  useHotkey(
    {
      id: "operations.loft",
      name: "Loft",
      description: "Create a loft between profiles",
      category: "operations",
      keys: ["L"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length < 2) {
        toast.error("Select at least 2 objects to create a loft.")
        return
      }
      toast.info("Loft operation - Coming soon!")
      // TODO: Implement loft operation
    }, [])
  )

  useHotkey(
    {
      id: "operations.offset",
      name: "Offset",
      description: "Offset a face or wire",
      category: "operations",
      keys: ["O"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      toast.info("Offset operation - Coming soon!")
      // TODO: Implement offset operation
    }, [])
  )

  // ========== THEME HOTKEYS ==========

  useHotkey(
    {
      id: "theme.toggleDark",
      name: "Toggle Dark Mode",
      description: "Toggle between light and dark themes",
      category: "view",
      keys: ["Ctrl+Shift+L"],
    },
    useCallback(() => {
      const state = useThemeStore.getState()
      state.setTheme(state.theme === "dark" ? "light" : "dark")
    }, [])
  )
}
