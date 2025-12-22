/**
 * Temporary Objects Slice - CADHY
 *
 * Manages temporary objects for operation previews (like boolean operations,
 * transformations, etc.). These are rendered in a separate scene for better
 * performance, following Plasticity's pattern.
 */

import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { SceneObject, TemporaryObject } from "./types"

export interface TemporarySlice {
  // State
  temporaryObjects: Map<string, TemporaryObject>

  // Actions
  addTemporaryObject: (object: SceneObject, ancestorId?: string) => string
  removeTemporaryObject: (id: string) => void
  clearTemporaryObjects: () => void
  getTemporaryObject: (id: string) => TemporaryObject | undefined
  showTemporaryObject: (id: string) => void
  hideTemporaryObject: (id: string) => void
}

export const createTemporarySlice: StateCreator<
  ModellerStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  TemporarySlice
> = (set, get) => ({
  // State
  temporaryObjects: new Map(),

  // Actions
  addTemporaryObject: (object, ancestorId) => {
    const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const tempObject: TemporaryObject = {
      id,
      object: {
        ...object,
        id,
        visible: false, // Start hidden
      },
      ancestorId,
      createdAt: Date.now(),
    }

    set((state) => {
      state.temporaryObjects.set(id, tempObject)
    })

    return id
  },

  removeTemporaryObject: (id) => {
    set((state) => {
      state.temporaryObjects.delete(id)
      // If this was previewing an ancestor, show the ancestor again
      const temp = get().temporaryObjects.get(id)
      if (temp?.ancestorId) {
        const ancestor = state.objects.find((obj) => obj.id === temp.ancestorId)
        if (ancestor) {
          ancestor.visible = true
        }
      }
    })
  },

  clearTemporaryObjects: () => {
    const { temporaryObjects } = get()

    set((state) => {
      // Restore visibility of all ancestors
      temporaryObjects.forEach((temp) => {
        if (temp.ancestorId) {
          const ancestor = state.objects.find((obj) => obj.id === temp.ancestorId)
          if (ancestor) {
            ancestor.visible = true
          }
        }
      })
      state.temporaryObjects.clear()
    })
  },

  getTemporaryObject: (id) => {
    return get().temporaryObjects.get(id)
  },

  showTemporaryObject: (id) => {
    set((state) => {
      const temp = state.temporaryObjects.get(id)
      if (temp) {
        temp.object.visible = true
        // Hide ancestor if exists
        if (temp.ancestorId) {
          const ancestor = state.objects.find((obj) => obj.id === temp.ancestorId)
          if (ancestor) {
            ancestor.visible = false
          }
        }
      }
    })
  },

  hideTemporaryObject: (id) => {
    set((state) => {
      const temp = state.temporaryObjects.get(id)
      if (temp) {
        temp.object.visible = false
        // Show ancestor if exists
        if (temp.ancestorId) {
          const ancestor = state.objects.find((obj) => obj.id === temp.ancestorId)
          if (ancestor) {
            ancestor.visible = true
          }
        }
      }
    })
  },
})
