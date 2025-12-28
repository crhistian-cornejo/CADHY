/**
 * Drawing Sync Hook - CADHY
 *
 * Subscribes to modeller store changes and triggers automatic
 * regeneration of drawing views when 3D models change.
 *
 * This implements the "dependent views" feature where drawing views
 * automatically update when their source 3D geometry is modified.
 *
 * @module lib/hooks/use-drawing-sync
 */

import { useEffect, useRef } from "react"
import { useDrawingStore } from "@/core/stores/drawing-store"
import type { AnySceneObject, ShapeObject } from "@/core/stores/modeller"
import { useModellerStore } from "@/core/stores/modeller"

// PERFORMANCE: Shallow vec3 comparison (~100x faster than JSON.stringify)
function vec3Equal(
  a: { x: number; y: number; z: number } | undefined,
  b: { x: number; y: number; z: number } | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.z === b.z
}

// =============================================================================
// TYPES
// =============================================================================

/** Configuration for the drawing sync subscription */
interface DrawingSyncConfig {
  /** Enable/disable automatic sync (default: true) */
  enabled?: boolean
  /** Debounce time in ms before triggering regeneration (default: 500) */
  debounceMs?: number
  /** Show console logs for debugging (default: false) */
  debug?: boolean
}

const DEFAULT_CONFIG: Required<DrawingSyncConfig> = {
  enabled: true,
  debounceMs: 500,
  debug: false,
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook that sets up automatic synchronization between the modeller store
 * and drawing store. When 3D shapes change, affected drawing views are
 * automatically regenerated.
 *
 * @example
 * ```tsx
 * // In App.tsx or a high-level component
 * function App() {
 *   useDrawingSync({ enabled: true, debounceMs: 500 })
 *   return <MainContent />
 * }
 * ```
 */
export function useDrawingSync(config: DrawingSyncConfig = {}): void {
  const { enabled, debounceMs, debug } = { ...DEFAULT_CONFIG, ...config }

  // Keep track of previous objects state for comparison
  const prevObjectsRef = useRef<AnySceneObject[]>([])
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs for the regeneration functions to avoid stale closures
  const onModelChangedRef = useRef(useDrawingStore.getState().onModelChanged)

  // Keep the ref updated
  useEffect(() => {
    onModelChangedRef.current = useDrawingStore.getState().onModelChanged
  })

  useEffect(() => {
    if (!enabled) {
      if (debug) console.log("[drawing-sync] Sync disabled")
      return
    }

    if (debug) console.log("[drawing-sync] Setting up modeller store subscription")

    // Subscribe to modeller store changes
    const unsubscribe = useModellerStore.subscribe((state, prevState) => {
      // Only react to object changes
      if (state.objects === prevState.objects) return

      // Find changed shape objects
      const changedShapeIds = findChangedShapes(prevState.objects, state.objects, debug)

      if (changedShapeIds.length === 0) return

      // Clear previous debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Debounce the regeneration to avoid excessive updates during rapid edits
      debounceTimeoutRef.current = setTimeout(async () => {
        if (debug) {
          // PERF: console.log("[drawing-sync] Triggering regeneration for shapes:", changedShapeIds)
        }

        // Trigger regeneration for each changed shape
        for (const shapeId of changedShapeIds) {
          try {
            const count = await onModelChangedRef.current(shapeId)
            if (debug && count > 0) {
              // PERF: console.log(`[drawing-sync] Regenerated ${count} views for shape ${shapeId}`)
            }
          } catch (err) {
            console.error(`[drawing-sync] Error regenerating views for shape ${shapeId}:`, err)
          }
        }
      }, debounceMs)
    })

    // Initialize previous objects ref
    prevObjectsRef.current = useModellerStore.getState().objects

    // Cleanup
    return () => {
      if (debug) console.log("[drawing-sync] Cleaning up subscription")
      unsubscribe()
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [enabled, debounceMs, debug])
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Find shape objects that have changed between two states.
 * Returns the backend shape IDs (from shapeIdMap) of changed shapes.
 */
function findChangedShapes(
  prevObjects: AnySceneObject[],
  currObjects: AnySceneObject[],
  debug = false
): string[] {
  const changedIds: string[] = []

  // Create maps for efficient lookup
  const prevMap = new Map(prevObjects.map((o) => [o.id, o]))
  const currMap = new Map(currObjects.map((o) => [o.id, o]))

  // Check for modified or new shapes
  for (const curr of currObjects) {
    if (curr.type !== "shape") continue

    const prev = prevMap.get(curr.id)

    if (!prev) {
      // New shape added
      const shapeObj = curr as ShapeObject
      if (shapeObj.backendShapeId) {
        changedIds.push(shapeObj.backendShapeId)
        if (debug) console.log("[drawing-sync] New shape:", curr.id)
      }
    } else if (hasShapeChanged(prev as ShapeObject, curr as ShapeObject)) {
      // Existing shape modified
      const shapeObj = curr as ShapeObject
      if (shapeObj.backendShapeId) {
        changedIds.push(shapeObj.backendShapeId)
        if (debug) console.log("[drawing-sync] Modified shape:", curr.id)
      }
    }
  }

  // Check for deleted shapes (they may have affected views that need updating)
  for (const prev of prevObjects) {
    if (prev.type !== "shape") continue
    if (!currMap.has(prev.id)) {
      const shapeObj = prev as ShapeObject
      if (shapeObj.backendShapeId) {
        // Note: Deleted shapes might need special handling
        // For now, we don't regenerate for deletions as the shape no longer exists
        if (debug) console.log("[drawing-sync] Deleted shape:", prev.id)
      }
    }
  }

  return changedIds
}

/**
 * Check if a shape object has changed in a way that affects its geometry.
 */
function hasShapeChanged(prev: ShapeObject, curr: ShapeObject): boolean {
  // Check updatedAt timestamp
  if (prev.updatedAt !== curr.updatedAt) {
    return true
  }

  // Check mesh data (if using buffers)
  if (prev.mesh && curr.mesh) {
    if (prev.mesh.vertices?.length !== curr.mesh.vertices?.length) {
      return true
    }
    if (prev.mesh.indices?.length !== curr.mesh.indices?.length) {
      return true
    }
  }

  // Check position/rotation/scale transforms (shallow compare - faster than JSON.stringify)
  if (!vec3Equal(prev.position, curr.position)) {
    return true
  }
  if (!vec3Equal(prev.rotation, curr.rotation)) {
    return true
  }
  if (!vec3Equal(prev.scale, curr.scale)) {
    return true
  }

  return false
}

// =============================================================================
// IMPERATIVE API
// =============================================================================

/**
 * Manually trigger regeneration for a specific shape.
 * Use this when you need programmatic control over regeneration.
 */
export async function triggerDrawingRegeneration(shapeId: string): Promise<number> {
  return useDrawingStore.getState().onModelChanged(shapeId)
}

/**
 * Manually trigger regeneration for all views in a specific drawing.
 */
export async function regenerateAllDrawingViews(drawingId: string): Promise<number> {
  return useDrawingStore.getState().regenerateAllViews(drawingId)
}
