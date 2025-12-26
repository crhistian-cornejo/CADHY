/**
 * CAD Operation Hotkeys - CADHY
 *
 * Registers hotkeys for CAD operations (Fillet, Chamfer, Shell, etc.)
 * Must be used within CADOperationsProvider to access operation context.
 *
 * REFACTORED: Uses centralized validation from utils/cad-validation
 */

import { toast } from "@cadhy/ui"
import { useCallback } from "react"
import { useCADOperationsContext } from "@/components/modeller/dialogs"
import {
  requireSelection,
  validateBooleanIntersect,
  validateBooleanSubtract,
  validateBooleanUnion,
} from "@/utils/cad-validation"
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
      if (!requireSelection()) return
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
      if (!requireSelection()) return
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
      if (!requireSelection()) return
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
      if (!requireSelection()) return
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
      if (!requireSelection()) return
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
      if (!requireSelection()) return
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
      if (!requireSelection()) return
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
      if (!validateBooleanUnion(true)) return
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
      if (!validateBooleanSubtract(true)) return
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
      if (!validateBooleanIntersect(true)) return
      executeBooleanIntersect()
    }, [executeBooleanIntersect])
  )
}
