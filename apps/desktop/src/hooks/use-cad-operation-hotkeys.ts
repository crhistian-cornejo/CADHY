/**
 * CAD Operation Hotkeys - CADHY
 *
 * Registers hotkeys for CAD operations (Fillet, Chamfer, Shell, etc.)
 * Must be used within CADOperationsProvider to access operation context.
 */

import { toast } from "@cadhy/ui"
import { useCallback } from "react"
import { useCADOperationsContext } from "@/components/modeller/dialogs"
import { useModellerStore } from "@/stores/modeller"
import { useHotkey } from "./use-hotkey"

export function useCADOperationHotkeys() {
  const {
    openOperationDialog,
    executeBooleanUnion,
    executeBooleanSubtract,
    executeBooleanIntersect,
  } = useCADOperationsContext()

  // ========== FILLET ==========
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
      openOperationDialog("fillet")
    }, [openOperationDialog])
  )

  // ========== CHAMFER ==========
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
      openOperationDialog("chamfer")
    }, [openOperationDialog])
  )

  // ========== SHELL ==========
  useHotkey(
    {
      id: "operations.shell",
      name: "Shell",
      description: "Hollow out selected object",
      category: "operations",
      keys: ["H"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id))
      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
        return
      }
      openOperationDialog("shell")
    }, [openOperationDialog])
  )

  // ========== MIRROR (Coming Soon) ==========
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
    }, [])
  )

  // ========== DUPLICATE (Coming Soon) ==========
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
    }, [])
  )

  // ========== EXTRUDE (Coming Soon) ==========
  useHotkey(
    {
      id: "operations.extrude",
      name: "Extrude",
      description: "Extrude selected face or profile",
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
    }, [])
  )

  // ========== LOFT (Coming Soon) ==========
  useHotkey(
    {
      id: "operations.loft",
      name: "Loft",
      description: "Create lofted surface between profiles",
      category: "operations",
      keys: ["L"],
      context: "modeller",
    },
    useCallback(() => {
      toast.info("Loft operation - Coming soon!")
    }, [])
  )

  // ========== OFFSET (Coming Soon) ==========
  useHotkey(
    {
      id: "operations.offset",
      name: "Offset",
      description: "Offset selected face or curve",
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
    }, [])
  )

  // ========== BOOLEAN UNION ==========
  useHotkey(
    {
      id: "operations.union",
      name: "Boolean Union",
      description: "Combine selected objects",
      category: "operations",
      keys: ["U"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter(
        (o) => state.selectedIds.includes(o.id) && o.type === "shape"
      )
      if (selectedObjects.length < 2) {
        toast.error("Selecciona al menos 2 sólidos para unir")
        return
      }
      executeBooleanUnion()
    }, [executeBooleanUnion])
  )

  // ========== BOOLEAN SUBTRACT ==========
  useHotkey(
    {
      id: "operations.subtract",
      name: "Boolean Subtract",
      description: "Subtract one object from another",
      category: "operations",
      keys: ["Shift+S"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter(
        (o) => state.selectedIds.includes(o.id) && o.type === "shape"
      )
      if (selectedObjects.length < 2) {
        toast.error("Selecciona al menos 2 sólidos: el primero es la base, los demás se restarán")
        return
      }
      executeBooleanSubtract()
    }, [executeBooleanSubtract])
  )

  // ========== BOOLEAN INTERSECT ==========
  useHotkey(
    {
      id: "operations.intersect",
      name: "Boolean Intersect",
      description: "Intersect selected objects",
      category: "operations",
      keys: ["I"],
      context: "modeller",
    },
    useCallback(() => {
      const state = useModellerStore.getState()
      const selectedObjects = state.objects.filter(
        (o) => state.selectedIds.includes(o.id) && o.type === "shape"
      )
      if (selectedObjects.length < 2) {
        toast.error("Selecciona al menos 2 sólidos para intersectar")
        return
      }
      executeBooleanIntersect()
    }, [executeBooleanIntersect])
  )
}
