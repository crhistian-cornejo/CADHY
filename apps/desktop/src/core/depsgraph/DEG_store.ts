/**
 * @fileoverview Dependency Graph Store
 * @module core/depsgraph
 *
 * Zustand store for managing the dependency graph.
 * Integrates with modeller store to track object changes.
 */

import { useEffect, useRef } from "react"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import {
  addObjectDependency,
  addObjectNode,
  clearNodeDirty,
  getDirtyNodesOrdered,
  getGraphStats,
  removeObjectNode,
  tagObjectDirty,
} from "./DEG_graph"
import {
  createDepGraph,
  type DepEvalContext,
  type DepEvalResult,
  type DepGraph,
  DepTag,
} from "./DEG_types"

// ============================================================================
// TYPES
// ============================================================================

interface DepGraphStoreState {
  /** The dependency graph */
  graph: DepGraph
  /** Last evaluation result */
  lastEvalResult: DepEvalResult | null
  /** Is continuous evaluation enabled */
  continuousEval: boolean
}

interface DepGraphStoreActions {
  // Object management
  /** Add object to graph */
  addObject: (objectId: string, hasModifiers?: boolean) => void
  /** Remove object from graph */
  removeObject: (objectId: string) => void
  /** Add dependency between objects */
  addDependency: (sourceId: string, targetId: string, description?: string) => void

  // Dirty tagging
  /** Mark object transform as dirty */
  markTransformDirty: (objectId: string) => void
  /** Mark object geometry as dirty */
  markGeometryDirty: (objectId: string) => void
  /** Mark object modifiers as dirty */
  markModifiersDirty: (objectId: string) => void
  /** Mark object as dirty with specific tags */
  markDirty: (objectId: string, tags: DepTag) => void

  // Evaluation
  /** Evaluate all dirty nodes */
  evaluate: (ctx?: Partial<DepEvalContext>) => Promise<DepEvalResult>
  /** Evaluate single node */
  evaluateNode: (nodeId: string) => Promise<boolean>

  // Settings
  /** Toggle continuous evaluation */
  setContinuousEval: (enabled: boolean) => void

  // Debug
  /** Get graph statistics */
  getStats: () => ReturnType<typeof getGraphStats>
  /** Reset graph */
  reset: () => void
}

type DepGraphStore = DepGraphStoreState & DepGraphStoreActions

// ============================================================================
// STORE
// ============================================================================

export const useDepGraphStore = create<DepGraphStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    graph: createDepGraph(),
    lastEvalResult: null,
    continuousEval: true,

    // Object management
    addObject: (objectId, hasModifiers = false) => {
      set((state) => {
        addObjectNode(state.graph, objectId, { hasModifiers })
        return { graph: state.graph }
      })
    },

    removeObject: (objectId) => {
      set((state) => {
        removeObjectNode(state.graph, objectId)
        return { graph: state.graph }
      })
    },

    addDependency: (sourceId, targetId, description) => {
      set((state) => {
        addObjectDependency(
          state.graph,
          sourceId,
          targetId,
          "depends_on",
          DepTag.GEOMETRY,
          description
        )
        return { graph: state.graph }
      })
    },

    // Dirty tagging
    markTransformDirty: (objectId) => {
      set((state) => {
        tagObjectDirty(state.graph, objectId, DepTag.TRANSFORM)
        return { graph: state.graph }
      })
    },

    markGeometryDirty: (objectId) => {
      set((state) => {
        tagObjectDirty(state.graph, objectId, DepTag.GEOMETRY)
        return { graph: state.graph }
      })
    },

    markModifiersDirty: (objectId) => {
      set((state) => {
        tagObjectDirty(state.graph, objectId, DepTag.MODIFIERS)
        return { graph: state.graph }
      })
    },

    markDirty: (objectId, tags) => {
      set((state) => {
        tagObjectDirty(state.graph, objectId, tags)
        return { graph: state.graph }
      })
    },

    // Evaluation
    evaluate: async (ctx = {}) => {
      const { graph } = get()
      const startTime = performance.now()

      const evalContext: DepEvalContext = {
        time: Date.now(),
        forRender: false,
        maxNodesPerFrame: 10,
        ...ctx,
      }

      // Get dirty nodes in order
      const dirtyNodes = getDirtyNodesOrdered(graph)

      if (dirtyNodes.length === 0) {
        const result: DepEvalResult = {
          complete: true,
          nodesEvaluated: 0,
          nodesRemaining: 0,
          totalTimeMs: 0,
          nodeTiming: new Map(),
          errors: new Map(),
        }
        set({ lastEvalResult: result })
        return result
      }

      const nodeTiming = new Map<string, number>()
      const errors = new Map<string, string>()
      let nodesEvaluated = 0

      // Evaluate up to maxNodesPerFrame
      const nodesToEval = dirtyNodes.slice(0, evalContext.maxNodesPerFrame)

      for (const nodeId of nodesToEval) {
        const nodeStart = performance.now()

        evalContext.onNodeStart?.(nodeId)

        try {
          // For now, just clear the dirty flag
          // Actual evaluation would call the modifiers system
          clearNodeDirty(graph, nodeId)
          nodesEvaluated++

          evalContext.onNodeComplete?.(nodeId, true, performance.now() - nodeStart)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          errors.set(nodeId, errorMsg)

          const node = graph.nodes.get(nodeId)
          if (node) {
            node.state = "error"
            node.error = errorMsg
          }

          evalContext.onNodeComplete?.(nodeId, false, performance.now() - nodeStart)
        }

        nodeTiming.set(nodeId, performance.now() - nodeStart)
      }

      const result: DepEvalResult = {
        complete: dirtyNodes.length <= evalContext.maxNodesPerFrame,
        nodesEvaluated,
        nodesRemaining: Math.max(0, dirtyNodes.length - evalContext.maxNodesPerFrame),
        totalTimeMs: performance.now() - startTime,
        nodeTiming,
        errors,
      }

      set({ lastEvalResult: result, graph })
      return result
    },

    evaluateNode: async (nodeId) => {
      const { graph } = get()
      const node = graph.nodes.get(nodeId)
      if (!node) return false

      try {
        clearNodeDirty(graph, nodeId)
        set({ graph })
        return true
      } catch {
        return false
      }
    },

    // Settings
    setContinuousEval: (enabled) => {
      set({ continuousEval: enabled })
    },

    // Debug
    getStats: () => {
      return getGraphStats(get().graph)
    },

    reset: () => {
      set({
        graph: createDepGraph(),
        lastEvalResult: null,
      })
    },
  }))
)

// ============================================================================
// SELECTORS
// ============================================================================

export const useDepGraph = () => useDepGraphStore((state) => state.graph)
export const useDepGraphStats = () => useDepGraphStore((state) => getGraphStats(state.graph))
export const useLastEvalResult = () => useDepGraphStore((state) => state.lastEvalResult)
export const useContinuousEval = () => useDepGraphStore((state) => state.continuousEval)

// ============================================================================
// INTEGRATION HOOKS
// ============================================================================

/**
 * Hook to register an object with the dependency graph.
 * Automatically adds the object on mount and removes it on unmount.
 *
 * @param objectId - The object ID to register (undefined to skip registration)
 * @param hasModifiers - Whether the object has modifiers
 * @returns Object with markDirty function to manually trigger updates
 */
export function useRegisterObject(objectId: string | undefined, hasModifiers = false) {
  const addObject = useDepGraphStore((state) => state.addObject)
  const removeObject = useDepGraphStore((state) => state.removeObject)

  // Track previous objectId to handle changes
  const prevObjectIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Remove previous object if it changed
    if (prevObjectIdRef.current && prevObjectIdRef.current !== objectId) {
      removeObject(prevObjectIdRef.current)
    }

    // Add new object
    if (objectId) {
      addObject(objectId, hasModifiers)
      prevObjectIdRef.current = objectId
    }

    // Cleanup on unmount
    return () => {
      if (objectId) {
        removeObject(objectId)
      }
    }
  }, [objectId, hasModifiers, addObject, removeObject])

  return {
    markDirty: (tags: DepTag) => {
      if (objectId) {
        useDepGraphStore.getState().markDirty(objectId, tags)
      }
    },
  }
}
