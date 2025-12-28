/**
 * Modifiers System Tests - @cadhy/desktop
 *
 * Tests for the modifier types and store:
 * - Modifier factory functions (createModifier, cloneModifier)
 * - Modifier store (CRUD, ordering, selection)
 * - Modifier validation
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { validateModifier } from "../core/modifiers/MOD_evaluator"
import { useModifierStore } from "../core/modifiers/MOD_store"
import {
  cloneModifier,
  createModifier,
  type Modifier,
  type ModifierArray,
  type ModifierBevel,
  type ModifierBoolean,
  type ModifierMirror,
  type ModifierShell,
  type ModifierSolidify,
} from "../core/modifiers/MOD_types"

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  // Reset the store before each test
  useModifierStore.setState({
    stacks: new Map(),
    selectedModifierId: null,
    isPanelOpen: false,
  })
})

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

describe("createModifier", () => {
  test("creates array modifier with default values", () => {
    const mod = createModifier("array") as ModifierArray

    expect(mod.type).toBe("array")
    expect(mod.name).toBe("Array")
    expect(mod.enabled).toBe(true)
    expect(mod.count).toBe(2)
    expect(mod.fitType).toBe("fixed_count")
    expect(mod.useRelativeOffset).toBe(true)
    expect(mod.relativeOffset).toEqual({ x: 1, y: 0, z: 0 })
    expect(mod.id).toBeDefined()
  })

  test("creates mirror modifier with default values", () => {
    const mod = createModifier("mirror") as ModifierMirror

    expect(mod.type).toBe("mirror")
    expect(mod.axisX).toBe(true)
    expect(mod.axisY).toBe(false)
    expect(mod.axisZ).toBe(false)
    expect(mod.merge).toBe(true)
    expect(mod.mergeThreshold).toBe(0.001)
  })

  test("creates boolean modifier with default values", () => {
    const mod = createModifier("boolean") as ModifierBoolean

    expect(mod.type).toBe("boolean")
    expect(mod.operation).toBe("difference")
    expect(mod.solver).toBe("exact")
    expect(mod.objectId).toBe("")
  })

  test("creates bevel modifier with default values", () => {
    const mod = createModifier("bevel") as ModifierBevel

    expect(mod.type).toBe("bevel")
    expect(mod.affect).toBe("edges")
    expect(mod.width).toBe(0.1)
    expect(mod.segments).toBe(3)
    expect(mod.profile).toBe(0.5)
  })

  test("creates solidify modifier with default values", () => {
    const mod = createModifier("solidify") as ModifierSolidify

    expect(mod.type).toBe("solidify")
    expect(mod.thickness).toBe(0.1)
    expect(mod.offset).toBe(0)
    expect(mod.mode).toBe("simple")
  })

  test("creates shell modifier with default values", () => {
    const mod = createModifier("shell") as ModifierShell

    expect(mod.type).toBe("shell")
    expect(mod.thickness).toBe(0.1)
    expect(mod.openFaces).toEqual([])
    expect(mod.offsetDirection).toBe(-1)
  })

  test("creates subdivision modifier with default values", () => {
    const mod = createModifier("subdivision")

    expect(mod.type).toBe("subdivision")
    expect(mod.levelsViewport).toBe(1)
    expect(mod.levelsRender).toBe(2)
  })

  test("creates decimate modifier with default values", () => {
    const mod = createModifier("decimate")

    expect(mod.type).toBe("decimate")
    expect(mod.decimateMode).toBe("collapse")
    expect(mod.ratio).toBe(0.5)
  })

  test("creates remesh modifier with default values", () => {
    const mod = createModifier("remesh")

    expect(mod.type).toBe("remesh")
    expect(mod.remeshMode).toBe("voxel")
    expect(mod.voxelSize).toBe(0.1)
  })

  test("accepts custom name", () => {
    const mod = createModifier("array", "My Custom Array")
    expect(mod.name).toBe("My Custom Array")
  })

  test("generates unique IDs", () => {
    const mod1 = createModifier("array")
    const mod2 = createModifier("array")

    expect(mod1.id).not.toBe(mod2.id)
  })

  test("all modifiers have visibility settings", () => {
    const types = [
      "array",
      "mirror",
      "boolean",
      "bevel",
      "solidify",
      "shell",
      "subdivision",
      "decimate",
      "remesh",
    ] as const

    for (const type of types) {
      const mod = createModifier(type)
      expect(mod.visibility).toEqual({
        viewport: true,
        render: true,
        editMode: false,
      })
    }
  })
})

describe("cloneModifier", () => {
  test("creates a deep copy with new ID", () => {
    const original = createModifier("array") as ModifierArray
    original.count = 5
    original.name = "Original Array"

    const clone = cloneModifier(original) as ModifierArray

    expect(clone.id).not.toBe(original.id)
    expect(clone.count).toBe(5)
    expect(clone.name).toBe("Original Array Copy")
    expect(clone.type).toBe("array")
  })

  test("clone modifications don't affect original", () => {
    const original = createModifier("mirror") as ModifierMirror
    const clone = cloneModifier(original) as ModifierMirror

    clone.axisX = false
    clone.axisY = true

    expect(original.axisX).toBe(true)
    expect(original.axisY).toBe(false)
  })
})

// ============================================================================
// MODIFIER STORE - STACK MANAGEMENT
// ============================================================================

describe("ModifierStore - Stack Management", () => {
  test("getOrCreateStack creates new stack", () => {
    const store = useModifierStore.getState()
    const stack = store.getOrCreateStack("obj-1")

    expect(stack.objectId).toBe("obj-1")
    expect(stack.modifiers).toEqual([])
    expect(stack.isEvaluating).toBe(false)
    expect(stack.cacheValid).toBe(false)
  })

  test("getOrCreateStack returns existing stack", () => {
    const store = useModifierStore.getState()
    const stack1 = store.getOrCreateStack("obj-1")
    store.addModifier("obj-1", "array")

    const stack2 = store.getOrCreateStack("obj-1")
    expect(stack2.modifiers.length).toBe(1)
  })

  test("getStack returns undefined for non-existent", () => {
    const store = useModifierStore.getState()
    const stack = store.getStack("non-existent")
    expect(stack).toBeUndefined()
  })

  test("clearStack removes stack", () => {
    const store = useModifierStore.getState()
    store.getOrCreateStack("obj-1")
    store.addModifier("obj-1", "array")

    store.clearStack("obj-1")

    expect(store.getStack("obj-1")).toBeUndefined()
  })
})

// ============================================================================
// MODIFIER STORE - CRUD
// ============================================================================

describe("ModifierStore - CRUD", () => {
  test("addModifier adds modifier to stack", () => {
    const store = useModifierStore.getState()
    const modifier = store.addModifier("obj-1", "array", "Test Array")

    expect(modifier.type).toBe("array")
    expect(modifier.name).toBe("Test Array")

    const stack = store.getStack("obj-1")
    expect(stack?.modifiers.length).toBe(1)
    expect(stack?.cacheValid).toBe(false)
  })

  test("addModifier assigns correct order", () => {
    const store = useModifierStore.getState()
    store.addModifier("obj-1", "array")
    store.addModifier("obj-1", "mirror")
    store.addModifier("obj-1", "bevel")

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[0].order).toBe(0)
    expect(stack.modifiers[1].order).toBe(1)
    expect(stack.modifiers[2].order).toBe(2)
  })

  test("removeModifier removes from stack", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")
    store.addModifier("obj-1", "mirror")

    store.removeModifier("obj-1", mod.id)

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers.length).toBe(1)
    expect(stack.modifiers[0].type).toBe("mirror")
    expect(stack.modifiers[0].order).toBe(0) // Reordered
  })

  test("removeModifier clears selection if removed was selected", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")
    store.selectModifier(mod.id)

    store.removeModifier("obj-1", mod.id)

    expect(useModifierStore.getState().selectedModifierId).toBeNull()
  })

  test("updateModifier updates properties", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")

    store.updateModifier("obj-1", mod.id, { name: "Updated Name", enabled: false })

    const stack = store.getStack("obj-1")!
    const updated = stack.modifiers[0]
    expect(updated.name).toBe("Updated Name")
    expect(updated.enabled).toBe(false)
    expect(stack.cacheValid).toBe(false)
  })

  test("duplicateModifier creates copy", () => {
    const store = useModifierStore.getState()
    const original = store.addModifier("obj-1", "mirror")
    store.updateModifier("obj-1", original.id, { name: "Original Mirror" })

    const duplicate = store.duplicateModifier("obj-1", original.id)!

    expect(duplicate.id).not.toBe(original.id)
    expect(duplicate.name).toBe("Original Mirror Copy")
    expect(duplicate.type).toBe("mirror")

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers.length).toBe(2)
  })
})

// ============================================================================
// MODIFIER STORE - ORDERING
// ============================================================================

describe("ModifierStore - Ordering", () => {
  test("moveModifierUp swaps with previous", () => {
    const store = useModifierStore.getState()
    const mod1 = store.addModifier("obj-1", "array")
    const mod2 = store.addModifier("obj-1", "mirror")

    store.moveModifierUp("obj-1", mod2.id)

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[0].id).toBe(mod2.id)
    expect(stack.modifiers[1].id).toBe(mod1.id)
    expect(stack.modifiers[0].order).toBe(0)
    expect(stack.modifiers[1].order).toBe(1)
  })

  test("moveModifierUp does nothing for first item", () => {
    const store = useModifierStore.getState()
    const mod1 = store.addModifier("obj-1", "array")
    store.addModifier("obj-1", "mirror")

    store.moveModifierUp("obj-1", mod1.id)

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[0].id).toBe(mod1.id)
  })

  test("moveModifierDown swaps with next", () => {
    const store = useModifierStore.getState()
    const mod1 = store.addModifier("obj-1", "array")
    const mod2 = store.addModifier("obj-1", "mirror")

    store.moveModifierDown("obj-1", mod1.id)

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[0].id).toBe(mod2.id)
    expect(stack.modifiers[1].id).toBe(mod1.id)
  })

  test("moveModifierDown does nothing for last item", () => {
    const store = useModifierStore.getState()
    store.addModifier("obj-1", "array")
    const mod2 = store.addModifier("obj-1", "mirror")

    store.moveModifierDown("obj-1", mod2.id)

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[1].id).toBe(mod2.id)
  })
})

// ============================================================================
// MODIFIER STORE - SELECTION
// ============================================================================

describe("ModifierStore - Selection", () => {
  test("selectModifier sets selected ID", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")

    store.selectModifier(mod.id)

    expect(useModifierStore.getState().selectedModifierId).toBe(mod.id)
  })

  test("selectModifier with null clears selection", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")
    store.selectModifier(mod.id)

    store.selectModifier(null)

    expect(useModifierStore.getState().selectedModifierId).toBeNull()
  })

  test("getSelectedModifier returns modifier and objectId", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")
    store.selectModifier(mod.id)

    const selected = store.getSelectedModifier()

    expect(selected?.objectId).toBe("obj-1")
    expect(selected?.modifier.id).toBe(mod.id)
  })

  test("getSelectedModifier returns null when nothing selected", () => {
    const store = useModifierStore.getState()
    expect(store.getSelectedModifier()).toBeNull()
  })
})

// ============================================================================
// MODIFIER STORE - PANEL
// ============================================================================

describe("ModifierStore - Panel", () => {
  test("togglePanel toggles state", () => {
    const store = useModifierStore.getState()
    expect(useModifierStore.getState().isPanelOpen).toBe(false)

    store.togglePanel()
    expect(useModifierStore.getState().isPanelOpen).toBe(true)

    store.togglePanel()
    expect(useModifierStore.getState().isPanelOpen).toBe(false)
  })

  test("setPanelOpen sets state directly", () => {
    const store = useModifierStore.getState()

    store.setPanelOpen(true)
    expect(useModifierStore.getState().isPanelOpen).toBe(true)

    store.setPanelOpen(false)
    expect(useModifierStore.getState().isPanelOpen).toBe(false)
  })
})

// ============================================================================
// MODIFIER STORE - CACHE
// ============================================================================

describe("ModifierStore - Cache", () => {
  test("invalidateCache sets cacheValid to false", () => {
    const store = useModifierStore.getState()
    store.addModifier("obj-1", "array")
    store.markEvaluated("obj-1", "result-123", 50)

    expect(store.getStack("obj-1")?.cacheValid).toBe(true)

    store.invalidateCache("obj-1")

    expect(store.getStack("obj-1")?.cacheValid).toBe(false)
    expect(store.getStack("obj-1")?.cachedResultId).toBeUndefined()
  })

  test("markEvaluated updates cache state", () => {
    const store = useModifierStore.getState()
    store.addModifier("obj-1", "array")

    store.markEvaluated("obj-1", "result-456", 100)

    const stack = store.getStack("obj-1")!
    expect(stack.cacheValid).toBe(true)
    expect(stack.cachedResultId).toBe("result-456")
    expect(stack.lastEvalTime).toBe(100)
    expect(stack.isEvaluating).toBe(false)
  })

  test("setModifierError sets error on modifier", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")

    store.setModifierError("obj-1", mod.id, "Test error message")

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[0].error).toBe("Test error message")
  })

  test("setModifierError clears error with undefined", () => {
    const store = useModifierStore.getState()
    const mod = store.addModifier("obj-1", "array")
    store.setModifierError("obj-1", mod.id, "Error")

    store.setModifierError("obj-1", mod.id, undefined)

    const stack = store.getStack("obj-1")!
    expect(stack.modifiers[0].error).toBeUndefined()
  })
})

// ============================================================================
// MODIFIER VALIDATION
// ============================================================================

describe("validateModifier", () => {
  const mockContext = {
    baseShapeId: "base-123",
    sceneObjects: new Map([["target-obj", { shapeId: "shape-456" }]]),
    deflection: 0.1,
    forRender: false,
  }

  test("boolean requires objectId", () => {
    const mod = createModifier("boolean") as ModifierBoolean
    mod.objectId = ""

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Boolean modifier requires a target object")
  })

  test("boolean validates target exists", () => {
    const mod = createModifier("boolean") as ModifierBoolean
    mod.objectId = "non-existent"

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Boolean target object not found: non-existent")
  })

  test("boolean passes with valid target", () => {
    const mod = createModifier("boolean") as ModifierBoolean
    mod.objectId = "target-obj"

    const errors = validateModifier(mod, mockContext)
    expect(errors).toHaveLength(0)
  })

  test("array validates count", () => {
    const mod = createModifier("array") as ModifierArray
    mod.count = 0

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Array count must be at least 1")
  })

  test("array validates curve for fit_curve", () => {
    const mod = createModifier("array") as ModifierArray
    mod.fitType = "fit_curve"
    mod.curveId = undefined

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Fit to curve requires a curve object")
  })

  test("bevel validates width", () => {
    const mod = createModifier("bevel") as ModifierBevel
    mod.width = 0

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Bevel width must be positive")
  })

  test("bevel validates segments", () => {
    const mod = createModifier("bevel") as ModifierBevel
    mod.segments = 0

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Bevel segments must be at least 1")
  })

  test("solidify validates thickness", () => {
    const mod = createModifier("solidify") as ModifierSolidify
    mod.thickness = -1

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Solidify thickness must be positive")
  })

  test("shell validates thickness", () => {
    const mod = createModifier("shell") as ModifierShell
    mod.thickness = 0

    const errors = validateModifier(mod, mockContext)
    expect(errors).toContain("Shell thickness must be positive")
  })
})
