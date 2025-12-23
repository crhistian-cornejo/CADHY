/**
 * Default Hotkeys Configuration - CADHY
 *
 * Defines all default keyboard shortcuts organized by category.
 * These are the defaults that users can customize.
 */

import type { HotkeyCategory } from "@/stores/hotkey-store"

export interface DefaultHotkey {
  id: string
  name: string
  description: string
  keys: string[]
  context?: "global" | "modeller" | "viewport" | "dialog"
}

export interface DefaultHotkeyCategory {
  category: HotkeyCategory
  label: string
  hotkeys: DefaultHotkey[]
}

/**
 * All default hotkeys organized by category
 */
export const DEFAULT_HOTKEYS: DefaultHotkeyCategory[] = [
  {
    category: "file",
    label: "File",
    hotkeys: [
      {
        id: "file.new",
        name: "New Project",
        description: "Create a new project",
        keys: ["Ctrl+N"],
      },
      {
        id: "file.open",
        name: "Open Project",
        description: "Open an existing project",
        keys: ["Ctrl+O"],
      },
      {
        id: "file.save",
        name: "Save",
        description: "Save the current project",
        keys: ["Ctrl+S"],
      },
      {
        id: "file.saveAs",
        name: "Save As",
        description: "Save the project with a new name",
        keys: ["Ctrl+Shift+S"],
      },
      {
        id: "file.export",
        name: "Export",
        description: "Export the current model",
        keys: ["Ctrl+E"],
      },
      {
        id: "file.close",
        name: "Close Project",
        description: "Close the current project",
        keys: ["Ctrl+W"],
      },
    ],
  },
  {
    category: "edit",
    label: "Edit",
    hotkeys: [
      {
        id: "edit.undo",
        name: "Undo",
        description: "Undo the last action",
        keys: ["Ctrl+Z"],
      },
      {
        id: "edit.redo",
        name: "Redo",
        description: "Redo the last undone action",
        keys: ["Ctrl+Y", "Ctrl+Shift+Z"],
      },
      {
        id: "edit.cut",
        name: "Cut",
        description: "Cut selected objects",
        keys: ["Ctrl+X"],
      },
      {
        id: "edit.copy",
        name: "Copy",
        description: "Copy selected objects",
        keys: ["Ctrl+C"],
      },
      {
        id: "edit.paste",
        name: "Paste",
        description: "Paste copied objects",
        keys: ["Ctrl+V"],
      },
      {
        id: "edit.duplicate",
        name: "Duplicate",
        description: "Duplicate selected objects",
        keys: ["Ctrl+D"],
      },
      {
        id: "edit.delete",
        name: "Delete",
        description: "Delete selected objects",
        keys: ["Delete", "Backspace"],
      },
      {
        id: "edit.selectAll",
        name: "Select All",
        description: "Select all objects",
        keys: ["Ctrl+A"],
      },
      {
        id: "edit.deselectAll",
        name: "Deselect All",
        description: "Deselect all objects",
        keys: ["Escape"],
      },
    ],
  },
  {
    category: "view",
    label: "View",
    hotkeys: [
      {
        id: "view.commandPalette",
        name: "Command Palette",
        description: "Open the command palette",
        keys: ["Ctrl+K"],
      },
      {
        id: "view.toggleSidebar",
        name: "Toggle Sidebar",
        description: "Show or hide the sidebar",
        keys: ["Ctrl+B"],
      },
      {
        id: "view.toggleProperties",
        name: "Toggle Properties",
        description: "Show or hide the properties panel",
        keys: ["Ctrl+2"],
      },
      {
        id: "view.toggleAiChat",
        name: "Toggle AI Chat",
        description: "Show or hide the AI chat panel",
        keys: ["Ctrl+Shift+A"],
      },
      {
        id: "view.settings",
        name: "Settings",
        description: "Open settings",
        keys: ["Ctrl+,"],
      },
      {
        id: "view.shortcuts",
        name: "Keyboard Shortcuts",
        description: "Show keyboard shortcuts",
        keys: ["Ctrl+/"],
      },
      {
        id: "view.fullscreen",
        name: "Fullscreen",
        description: "Toggle fullscreen mode",
        keys: ["F11"],
      },
      {
        id: "view.solidMode",
        name: "Solid View",
        description: "Switch to solid view mode",
        keys: ["1"],
        context: "modeller",
      },
      {
        id: "view.wireframeMode",
        name: "Wireframe View",
        description: "Switch to wireframe view mode",
        keys: ["2"],
        context: "modeller",
      },
      {
        id: "view.xrayMode",
        name: "X-Ray View",
        description: "Switch to x-ray view mode",
        keys: ["3"],
        context: "modeller",
      },
    ],
  },
  {
    category: "selection",
    label: "Selection",
    hotkeys: [
      {
        id: "selection.vertexMode",
        name: "Vertex Selection Mode",
        description: "Switch to vertex selection mode",
        keys: ["Shift+1"],
        context: "modeller",
      },
      {
        id: "selection.edgeMode",
        name: "Edge Selection Mode",
        description: "Switch to edge selection mode",
        keys: ["Shift+2"],
        context: "modeller",
      },
      {
        id: "selection.faceMode",
        name: "Face Selection Mode",
        description: "Switch to face selection mode",
        keys: ["Shift+3"],
        context: "modeller",
      },
      {
        id: "selection.bodyMode",
        name: "Body/Solid Selection Mode",
        description: "Switch to body/solid selection mode",
        keys: ["Shift+4"],
        context: "modeller",
      },
    ],
  },
  {
    category: "transform",
    label: "Transform",
    hotkeys: [
      {
        id: "transform.select",
        name: "Select Mode",
        description: "Switch to selection mode",
        keys: ["V"],
        context: "modeller",
      },
      {
        id: "transform.translate",
        name: "Translate",
        description: "Move selected objects",
        keys: ["G"],
        context: "modeller",
      },
      {
        id: "transform.rotate",
        name: "Rotate",
        description: "Rotate selected objects",
        keys: ["R"],
        context: "modeller",
      },
      {
        id: "transform.scale",
        name: "Scale",
        description: "Scale selected objects",
        keys: ["S"],
        context: "modeller",
      },
      {
        id: "transform.toggleGrid",
        name: "Toggle Grid",
        description: "Show or hide the grid",
        keys: ["Ctrl+G"],
        context: "modeller",
      },
      {
        id: "transform.toggleSnap",
        name: "Toggle Snap",
        description: "Enable or disable snapping",
        keys: ["Ctrl+Shift+S"],
        context: "modeller",
      },
    ],
  },
  {
    category: "navigation",
    label: "Navigation",
    hotkeys: [
      {
        id: "navigation.fitAll",
        name: "Fit All",
        description: "Fit all objects in view",
        keys: ["Home"],
        context: "viewport",
      },
      {
        id: "navigation.fitSelection",
        name: "Fit Selection",
        description: "Fit selected objects in view",
        keys: ["Numpad."],
        context: "viewport",
      },
      {
        id: "navigation.viewTop",
        name: "Top View",
        description: "Switch to top view",
        keys: ["Numpad7"],
        context: "viewport",
      },
      {
        id: "navigation.viewFront",
        name: "Front View",
        description: "Switch to front view",
        keys: ["Numpad1"],
        context: "viewport",
      },
      {
        id: "navigation.viewRight",
        name: "Right View",
        description: "Switch to right view",
        keys: ["Numpad3"],
        context: "viewport",
      },
      {
        id: "navigation.viewPerspective",
        name: "Perspective View",
        description: "Switch to perspective view",
        keys: ["Numpad0"],
        context: "viewport",
      },
    ],
  },
  {
    category: "workspace",
    label: "Workspace",
    hotkeys: [
      {
        id: "workspace.modeller",
        name: "Modeller",
        description: "Switch to Modeller workspace",
        keys: ["Ctrl+Shift+M"],
      },
      {
        id: "workspace.mesh",
        name: "Mesh",
        description: "Switch to Mesh workspace",
        keys: ["Ctrl+Shift+G"],
      },
      {
        id: "workspace.cfd",
        name: "CFD",
        description: "Switch to CFD workspace",
        keys: ["Ctrl+Shift+C"],
      },
      {
        id: "workspace.results",
        name: "Results",
        description: "Switch to Results workspace",
        keys: ["Ctrl+Shift+R"],
      },
    ],
  },
  {
    category: "tools",
    label: "Tools",
    hotkeys: [
      // Primitives
      {
        id: "tools.createBox",
        name: "Create Box",
        description: "Create a box primitive",
        keys: ["Shift+B"],
        context: "modeller",
      },
      {
        id: "tools.createCylinder",
        name: "Create Cylinder",
        description: "Create a cylinder primitive",
        keys: ["Shift+Y"],
        context: "modeller",
      },
      {
        id: "tools.createSphere",
        name: "Create Sphere",
        description: "Create a sphere primitive",
        keys: ["Shift+P"],
        context: "modeller",
      },
      {
        id: "tools.createCone",
        name: "Create Cone",
        description: "Create a cone primitive",
        keys: ["Shift+O"],
        context: "modeller",
      },
      {
        id: "tools.createTorus",
        name: "Create Torus",
        description: "Create a torus primitive",
        keys: ["Shift+U"],
        context: "modeller",
      },
      // Hydraulic Elements
      {
        id: "tools.createChannel",
        name: "Create Channel",
        description: "Open channel creation panel",
        keys: ["Shift+C"],
        context: "modeller",
      },
      {
        id: "tools.createTransition",
        name: "Create Transition",
        description: "Open transition creation panel",
        keys: ["Shift+T"],
        context: "modeller",
      },
      // Panel toggles
      {
        id: "tools.toggleLeftPanel",
        name: "Toggle Left Panel",
        description: "Show or hide the left panel",
        keys: ["P"],
        context: "modeller",
      },
    ],
  },
  {
    category: "operations",
    label: "CAD Operations",
    hotkeys: [
      // Modify Operations
      {
        id: "operations.fillet",
        name: "Fillet",
        description: "Round edges of selected object",
        keys: ["F"],
        context: "modeller",
      },
      {
        id: "operations.chamfer",
        name: "Chamfer",
        description: "Bevel edges of selected object",
        keys: ["C"],
        context: "modeller",
      },
      {
        id: "operations.shell",
        name: "Shell",
        description: "Hollow out selected object",
        keys: ["H"],
        context: "modeller",
      },
      {
        id: "operations.mirror",
        name: "Mirror",
        description: "Mirror selected object",
        keys: ["X"],
        context: "modeller",
      },
      {
        id: "operations.duplicate",
        name: "Duplicate",
        description: "Duplicate selected object",
        keys: ["D"],
        context: "modeller",
      },
      // Advanced Operations
      {
        id: "operations.extrude",
        name: "Extrude",
        description: "Extrude a face or wire",
        keys: ["E"],
        context: "modeller",
      },
      {
        id: "operations.revolve",
        name: "Revolve",
        description: "Revolve a profile around an axis",
        keys: ["Shift+R"],
        context: "modeller",
      },
      {
        id: "operations.loft",
        name: "Loft",
        description: "Create a loft between profiles",
        keys: ["L"],
        context: "modeller",
      },
      {
        id: "operations.pipe",
        name: "Pipe",
        description: "Create a pipe along a path",
        keys: ["Shift+P"],
        context: "modeller",
      },
      {
        id: "operations.offset",
        name: "Offset",
        description: "Offset a face or wire",
        keys: ["O"],
        context: "modeller",
      },
      // Boolean Operations
      {
        id: "operations.union",
        name: "Boolean Union",
        description: "Fuse two objects together",
        keys: ["U"],
        context: "modeller",
      },
      {
        id: "operations.subtract",
        name: "Boolean Subtract",
        description: "Subtract one object from another",
        keys: ["Shift+S"],
        context: "modeller",
      },
      {
        id: "operations.intersect",
        name: "Boolean Intersect",
        description: "Intersect two objects",
        keys: ["I"],
        context: "modeller",
      },
    ],
  },
]

/**
 * Get all hotkeys as a flat array
 */
export function getAllDefaultHotkeys(): DefaultHotkey[] {
  return DEFAULT_HOTKEYS.flatMap((category) => category.hotkeys)
}

/**
 * Get hotkey by ID
 */
export function getDefaultHotkeyById(id: string): DefaultHotkey | undefined {
  return getAllDefaultHotkeys().find((h) => h.id === id)
}

/**
 * Get category label
 */
export function getCategoryLabel(category: HotkeyCategory): string {
  return DEFAULT_HOTKEYS.find((c) => c.category === category)?.label ?? category
}
