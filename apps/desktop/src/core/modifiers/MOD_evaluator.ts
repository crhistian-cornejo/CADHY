/**
 * @fileoverview Modifier Evaluator - Evaluates modifier stacks using C++ backend
 * @module core/modifiers
 *
 * Handles the evaluation of modifier stacks, calling the appropriate
 * Rust/C++ backend functions for each modifier type.
 */

import { invoke } from "@tauri-apps/api/core"
import type {
  Modifier,
  ModifierArray,
  ModifierBevel,
  ModifierBoolean,
  ModifierEvalContext,
  ModifierEvalResult,
  ModifierMirror,
  ModifierShell,
  ModifierSolidify,
  ModifierStack,
} from "./MOD_types"

// ============================================================================
// TYPES
// ============================================================================

interface ShapeResult {
  id: string
  success: boolean
  error?: string
}

// ============================================================================
// INDIVIDUAL MODIFIER EVALUATORS
// ============================================================================

/**
 * Evaluate Array modifier
 */
async function evaluateArray(
  shapeId: string,
  mod: ModifierArray,
  _ctx: ModifierEvalContext
): Promise<ShapeResult> {
  try {
    // For each copy, translate and combine
    const shapes: string[] = [shapeId]

    for (let i = 1; i < mod.count; i++) {
      // Calculate offset for this copy
      let offsetX = 0
      let offsetY = 0
      let offsetZ = 0

      if (mod.useRelativeOffset) {
        // Get bounding box to calculate relative offset
        const bbox = await invoke<{ min: number[]; max: number[] }>("get_shape_bbox", {
          shapeId,
        })
        const sizeX = bbox.max[0] - bbox.min[0]
        const sizeY = bbox.max[1] - bbox.min[1]
        const sizeZ = bbox.max[2] - bbox.min[2]

        offsetX += mod.relativeOffset.x * sizeX * i
        offsetY += mod.relativeOffset.y * sizeY * i
        offsetZ += mod.relativeOffset.z * sizeZ * i
      }

      if (mod.useConstantOffset) {
        offsetX += mod.constantOffset.x * i
        offsetY += mod.constantOffset.y * i
        offsetZ += mod.constantOffset.z * i
      }

      // Create translated copy
      const copyResult = await invoke<{ id: string }>("translate_shape", {
        shapeId,
        dx: offsetX,
        dy: offsetY,
        dz: offsetZ,
      })

      shapes.push(copyResult.id)
    }

    // Fuse all shapes together
    let resultId = shapes[0]
    for (let i = 1; i < shapes.length; i++) {
      const fuseResult = await invoke<{ id: string }>("boolean_fuse", {
        shape1Id: resultId,
        shape2Id: shapes[i],
      })
      resultId = fuseResult.id
    }

    return { id: resultId, success: true }
  } catch (error) {
    return {
      id: shapeId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate Mirror modifier
 */
async function evaluateMirror(
  shapeId: string,
  mod: ModifierMirror,
  _ctx: ModifierEvalContext
): Promise<ShapeResult> {
  try {
    let resultId = shapeId

    // Mirror on each enabled axis
    const axes: Array<{ enabled: boolean; nx: number; ny: number; nz: number }> = [
      { enabled: mod.axisX, nx: 1, ny: 0, nz: 0 },
      { enabled: mod.axisY, nx: 0, ny: 1, nz: 0 },
      { enabled: mod.axisZ, nx: 0, ny: 0, nz: 1 },
    ]

    for (const axis of axes) {
      if (!axis.enabled) continue

      // Create mirrored copy
      const mirrorResult = await invoke<{ id: string }>("mirror_shape", {
        shapeId: resultId,
        ox: 0,
        oy: 0,
        oz: 0,
        nx: axis.nx,
        ny: axis.ny,
        nz: axis.nz,
      })

      // Fuse with original
      const fuseResult = await invoke<{ id: string }>("boolean_fuse", {
        shape1Id: resultId,
        shape2Id: mirrorResult.id,
      })

      resultId = fuseResult.id
    }

    return { id: resultId, success: true }
  } catch (error) {
    return {
      id: shapeId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate Boolean modifier
 */
async function evaluateBoolean(
  shapeId: string,
  mod: ModifierBoolean,
  ctx: ModifierEvalContext
): Promise<ShapeResult> {
  try {
    // Get the target object's shape ID
    const targetObj = ctx.sceneObjects.get(mod.objectId)
    if (!targetObj) {
      return {
        id: shapeId,
        success: false,
        error: `Boolean target object not found: ${mod.objectId}`,
      }
    }

    // Call appropriate boolean operation
    const commandMap = {
      union: "boolean_fuse",
      difference: "boolean_cut",
      intersect: "boolean_common",
    }

    const result = await invoke<{ id: string }>(commandMap[mod.operation], {
      shape1Id: shapeId,
      shape2Id: targetObj.shapeId,
    })

    return { id: result.id, success: true }
  } catch (error) {
    return {
      id: shapeId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate Bevel modifier
 */
async function evaluateBevel(
  shapeId: string,
  mod: ModifierBevel,
  _ctx: ModifierEvalContext
): Promise<ShapeResult> {
  try {
    // Use the fillet_all_edges or chamfer_all_edges functions
    // For more advanced bevel, we could use fillet_edges with edge selection

    const result = await invoke<{ id: string }>("fillet_all_edges", {
      shapeId,
      radius: mod.width,
    })

    return { id: result.id, success: true }
  } catch (error) {
    return {
      id: shapeId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate Solidify modifier
 */
async function evaluateSolidify(
  shapeId: string,
  mod: ModifierSolidify,
  _ctx: ModifierEvalContext
): Promise<ShapeResult> {
  try {
    // Use offset_solid for simple solidify
    const thickness = mod.thickness * (mod.offset + 1)

    const result = await invoke<{ id: string }>("offset_solid", {
      shapeId,
      offset: thickness,
    })

    return { id: result.id, success: true }
  } catch (error) {
    return {
      id: shapeId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate Shell modifier (CADHY-specific)
 */
async function evaluateShell(
  shapeId: string,
  mod: ModifierShell,
  _ctx: ModifierEvalContext
): Promise<ShapeResult> {
  try {
    const result = await invoke<{ id: string }>("make_shell", {
      shapeId,
      thickness: mod.thickness * mod.offsetDirection,
      openFaces: mod.openFaces,
    })

    return { id: result.id, success: true }
  } catch (error) {
    return {
      id: shapeId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ============================================================================
// MAIN EVALUATOR
// ============================================================================

/**
 * Evaluate a single modifier
 */
async function evaluateModifier(
  shapeId: string,
  modifier: Modifier,
  ctx: ModifierEvalContext
): Promise<ShapeResult> {
  if (!modifier.enabled) {
    return { id: shapeId, success: true }
  }

  switch (modifier.type) {
    case "array":
      return evaluateArray(shapeId, modifier, ctx)
    case "mirror":
      return evaluateMirror(shapeId, modifier, ctx)
    case "boolean":
      return evaluateBoolean(shapeId, modifier, ctx)
    case "bevel":
      return evaluateBevel(shapeId, modifier, ctx)
    case "solidify":
      return evaluateSolidify(shapeId, modifier, ctx)
    case "shell":
      return evaluateShell(shapeId, modifier, ctx)
    case "subdivision":
    case "decimate":
    case "remesh":
      // These require mesh-level operations not yet in C++ bridge
      console.warn(`[MOD] Modifier type ${modifier.type} not yet implemented in C++ backend`)
      return { id: shapeId, success: true }
    default:
      return {
        id: shapeId,
        success: false,
        error: `Unknown modifier type: ${(modifier as Modifier).type}`,
      }
  }
}

/**
 * Evaluate an entire modifier stack
 */
export async function evaluateModifierStack(
  stack: ModifierStack,
  ctx: ModifierEvalContext
): Promise<ModifierEvalResult> {
  const startTime = performance.now()
  const modifierTiming: { id: string; timeMs: number }[] = []

  let currentShapeId = ctx.baseShapeId

  // Sort modifiers by order
  const sortedModifiers = [...stack.modifiers].sort((a, b) => a.order - b.order)

  for (const modifier of sortedModifiers) {
    if (!modifier.enabled) continue

    // Check visibility
    if (!ctx.forRender && !modifier.visibility.viewport) continue
    if (ctx.forRender && !modifier.visibility.render) continue

    const modStart = performance.now()

    const result = await evaluateModifier(currentShapeId, modifier, ctx)

    const modTime = performance.now() - modStart
    modifierTiming.push({ id: modifier.id, timeMs: modTime })

    if (!result.success) {
      return {
        success: false,
        error: `Modifier "${modifier.name}" failed: ${result.error}`,
        evalTimeMs: performance.now() - startTime,
        modifierTiming,
      }
    }

    currentShapeId = result.id
  }

  return {
    success: true,
    resultShapeId: currentShapeId,
    evalTimeMs: performance.now() - startTime,
    modifierTiming,
  }
}

/**
 * Preview a modifier without applying to the stack
 * Useful for interactive parameter adjustment
 */
export async function previewModifier(
  baseShapeId: string,
  modifier: Modifier,
  ctx: ModifierEvalContext
): Promise<ShapeResult> {
  return evaluateModifier(baseShapeId, modifier, ctx)
}

/**
 * Check if a modifier can be evaluated
 * Returns validation errors if any
 */
export function validateModifier(modifier: Modifier, ctx: ModifierEvalContext): string[] {
  const errors: string[] = []

  switch (modifier.type) {
    case "boolean":
      if (!modifier.objectId) {
        errors.push("Boolean modifier requires a target object")
      } else if (!ctx.sceneObjects.has(modifier.objectId)) {
        errors.push(`Boolean target object not found: ${modifier.objectId}`)
      }
      break

    case "array":
      if (modifier.count < 1) {
        errors.push("Array count must be at least 1")
      }
      if (modifier.fitType === "fit_curve" && !modifier.curveId) {
        errors.push("Fit to curve requires a curve object")
      }
      break

    case "bevel":
      if (modifier.width <= 0) {
        errors.push("Bevel width must be positive")
      }
      if (modifier.segments < 1) {
        errors.push("Bevel segments must be at least 1")
      }
      break

    case "solidify":
      if (modifier.thickness <= 0) {
        errors.push("Solidify thickness must be positive")
      }
      break

    case "shell":
      if (modifier.thickness <= 0) {
        errors.push("Shell thickness must be positive")
      }
      break
  }

  return errors
}
