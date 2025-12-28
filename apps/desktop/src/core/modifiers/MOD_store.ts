/**
 * @fileoverview Modifier Store - Zustand store for modifier management
 * @module core/modifiers
 *
 * Manages modifier stacks for all objects in the scene.
 * Handles CRUD operations, reordering, and evaluation triggers.
 */

import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { Modifier, ModifierStack, ModifierType } from "./MOD_types"
import { cloneModifier, createModifier } from "./MOD_types"

// ============================================================================
// TYPES
// ============================================================================

interface ModifierStoreState {
  /** Modifier stacks by object ID */
  stacks: Map<string, ModifierStack>

  /** Currently selected modifier ID */
  selectedModifierId: string | null

  /** Is modifier panel open */
  isPanelOpen: boolean
}

interface ModifierStoreActions {
  // Stack management
  /** Get or create stack for object */
  getOrCreateStack: (objectId: string) => ModifierStack

  /** Get stack for object */
  getStack: (objectId: string) => ModifierStack | undefined

  /** Clear stack for object */
  clearStack: (objectId: string) => void

  // Modifier CRUD
  /** Add modifier to object's stack */
  addModifier: (objectId: string, type: ModifierType, name?: string) => Modifier

  /** Remove modifier from stack */
  removeModifier: (objectId: string, modifierId: string) => void

  /** Update modifier properties */
  updateModifier: (objectId: string, modifierId: string, updates: Partial<Modifier>) => void

  /** Duplicate modifier */
  duplicateModifier: (objectId: string, modifierId: string) => Modifier | null

  // Ordering
  /** Move modifier up in stack */
  moveModifierUp: (objectId: string, modifierId: string) => void

  /** Move modifier down in stack */
  moveModifierDown: (objectId: string, modifierId: string) => void

  /** Set modifier order directly */
  setModifierOrder: (objectId: string, modifierId: string, order: number) => void

  // Selection
  /** Select a modifier */
  selectModifier: (modifierId: string | null) => void

  /** Get selected modifier */
  getSelectedModifier: () => { objectId: string; modifier: Modifier } | null

  // Panel
  /** Toggle modifier panel */
  togglePanel: () => void

  /** Set panel open state */
  setPanelOpen: (open: boolean) => void

  // Cache management
  /** Invalidate cache for object */
  invalidateCache: (objectId: string) => void

  /** Mark evaluation complete */
  markEvaluated: (objectId: string, resultShapeId: string, evalTimeMs: number) => void

  /** Set modifier error */
  setModifierError: (objectId: string, modifierId: string, error: string | undefined) => void
}

type ModifierStore = ModifierStoreState & ModifierStoreActions

// ============================================================================
// STORE
// ============================================================================

export const useModifierStore = create<ModifierStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    stacks: new Map(),
    selectedModifierId: null,
    isPanelOpen: false,

    // Stack management
    getOrCreateStack: (objectId) => {
      const existing = get().stacks.get(objectId)
      if (existing) return existing

      const newStack: ModifierStack = {
        objectId,
        modifiers: [],
        isEvaluating: false,
        cacheValid: false,
      }

      set((state) => {
        const stacks = new Map(state.stacks)
        stacks.set(objectId, newStack)
        return { stacks }
      })

      return newStack
    },

    getStack: (objectId) => get().stacks.get(objectId),

    clearStack: (objectId) => {
      set((state) => {
        const stacks = new Map(state.stacks)
        stacks.delete(objectId)
        return { stacks }
      })
    },

    // Modifier CRUD
    addModifier: (objectId, type, name) => {
      const stack = get().getOrCreateStack(objectId)
      const modifier = createModifier(type, name)

      // Set order to be last
      modifier.order = stack.modifiers.length

      set((state) => {
        const stacks = new Map(state.stacks)
        const updatedStack: ModifierStack = {
          ...stack,
          modifiers: [...stack.modifiers, modifier],
          cacheValid: false,
        }
        stacks.set(objectId, updatedStack)
        return { stacks }
      })

      return modifier
    },

    removeModifier: (objectId, modifierId) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      set((state) => {
        const stacks = new Map(state.stacks)
        const modifiers = stack.modifiers.filter((m) => m.id !== modifierId)

        // Reorder remaining modifiers
        modifiers.forEach((m, i) => {
          m.order = i
        })

        stacks.set(objectId, {
          ...stack,
          modifiers,
          cacheValid: false,
        })

        // Clear selection if removed modifier was selected
        const selectedModifierId =
          state.selectedModifierId === modifierId ? null : state.selectedModifierId

        return { stacks, selectedModifierId }
      })
    },

    updateModifier: (objectId, modifierId, updates) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      set((state) => {
        const stacks = new Map(state.stacks)
        const modifiers = stack.modifiers.map((m) =>
          m.id === modifierId ? { ...m, ...updates } : m
        )

        stacks.set(objectId, {
          ...stack,
          modifiers,
          cacheValid: false,
        })

        return { stacks }
      })
    },

    duplicateModifier: (objectId, modifierId) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return null

      const original = stack.modifiers.find((m) => m.id === modifierId)
      if (!original) return null

      const duplicate = cloneModifier(original)
      duplicate.order = stack.modifiers.length

      set((state) => {
        const stacks = new Map(state.stacks)
        stacks.set(objectId, {
          ...stack,
          modifiers: [...stack.modifiers, duplicate],
          cacheValid: false,
        })
        return { stacks }
      })

      return duplicate
    },

    // Ordering
    moveModifierUp: (objectId, modifierId) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      const index = stack.modifiers.findIndex((m) => m.id === modifierId)
      if (index <= 0) return

      set((state) => {
        const stacks = new Map(state.stacks)
        const modifiers = [...stack.modifiers]

        // Swap with previous
        const temp = modifiers[index - 1]
        modifiers[index - 1] = modifiers[index]
        modifiers[index] = temp

        // Update orders
        modifiers.forEach((m, i) => {
          m.order = i
        })

        stacks.set(objectId, {
          ...stack,
          modifiers,
          cacheValid: false,
        })

        return { stacks }
      })
    },

    moveModifierDown: (objectId, modifierId) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      const index = stack.modifiers.findIndex((m) => m.id === modifierId)
      if (index < 0 || index >= stack.modifiers.length - 1) return

      set((state) => {
        const stacks = new Map(state.stacks)
        const modifiers = [...stack.modifiers]

        // Swap with next
        const temp = modifiers[index + 1]
        modifiers[index + 1] = modifiers[index]
        modifiers[index] = temp

        // Update orders
        modifiers.forEach((m, i) => {
          m.order = i
        })

        stacks.set(objectId, {
          ...stack,
          modifiers,
          cacheValid: false,
        })

        return { stacks }
      })
    },

    setModifierOrder: (objectId, modifierId, order) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      const modifier = stack.modifiers.find((m) => m.id === modifierId)
      if (!modifier) return

      get().updateModifier(objectId, modifierId, { order })
    },

    // Selection
    selectModifier: (modifierId) => {
      set({ selectedModifierId: modifierId })
    },

    getSelectedModifier: () => {
      const { stacks, selectedModifierId } = get()
      if (!selectedModifierId) return null

      for (const [objectId, stack] of stacks) {
        const modifier = stack.modifiers.find((m) => m.id === selectedModifierId)
        if (modifier) {
          return { objectId, modifier }
        }
      }

      return null
    },

    // Panel
    togglePanel: () => {
      set((state) => ({ isPanelOpen: !state.isPanelOpen }))
    },

    setPanelOpen: (open) => {
      set({ isPanelOpen: open })
    },

    // Cache management
    invalidateCache: (objectId) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      set((state) => {
        const stacks = new Map(state.stacks)
        stacks.set(objectId, {
          ...stack,
          cacheValid: false,
          cachedResultId: undefined,
        })
        return { stacks }
      })
    },

    markEvaluated: (objectId, resultShapeId, evalTimeMs) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      set((state) => {
        const stacks = new Map(state.stacks)
        stacks.set(objectId, {
          ...stack,
          isEvaluating: false,
          cacheValid: true,
          cachedResultId: resultShapeId,
          lastEvalTime: evalTimeMs,
        })
        return { stacks }
      })
    },

    setModifierError: (objectId, modifierId, error) => {
      const stack = get().stacks.get(objectId)
      if (!stack) return

      set((state) => {
        const stacks = new Map(state.stacks)
        const modifiers = stack.modifiers.map((m) => (m.id === modifierId ? { ...m, error } : m))

        stacks.set(objectId, { ...stack, modifiers })
        return { stacks }
      })
    },
  }))
)

// ============================================================================
// SELECTORS
// ============================================================================

export const useModifierStack = (objectId: string) =>
  useModifierStore((state) => state.stacks.get(objectId))

export const useModifiers = (objectId: string) =>
  useModifierStore((state) => state.stacks.get(objectId)?.modifiers ?? [])

export const useSelectedModifier = () => useModifierStore((state) => state.getSelectedModifier())

export const useModifierPanelOpen = () => useModifierStore((state) => state.isPanelOpen)
