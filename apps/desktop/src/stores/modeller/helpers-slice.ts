/**
 * Helpers Slice - CADHY
 *
 * Manages helper objects for visual aids (gizmos, grids, axes, measurements, etc.).
 * These are rendered in a separate scene for better performance and independent control,
 * following Plasticity's pattern.
 */

import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { HelperObject } from "./types"

export interface HelpersSlice {
  // State
  helperObjects: Map<string, HelperObject>

  // Actions
  addHelper: (type: HelperObject["type"], userData?: Record<string, unknown>) => string
  removeHelper: (id: string) => void
  clearHelpers: (type?: HelperObject["type"]) => void
  getHelper: (id: string) => HelperObject | undefined
  showHelper: (id: string) => void
  hideHelper: (id: string) => void
  toggleHelper: (id: string) => void
  setHelperVisibility: (type: HelperObject["type"], visible: boolean) => void
}

export const createHelpersSlice: StateCreator<
  ModellerStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  HelpersSlice
> = (set, get) => ({
  // State
  helperObjects: new Map(),

  // Actions
  addHelper: (type, userData) => {
    const id = `helper-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const helper: HelperObject = {
      id,
      type,
      visible: true,
      userData,
    }

    set((state) => {
      state.helperObjects.set(id, helper)
    })

    return id
  },

  removeHelper: (id) => {
    set((state) => {
      state.helperObjects.delete(id)
    })
  },

  clearHelpers: (type) => {
    set((state) => {
      if (type) {
        // Clear only helpers of specific type
        const toDelete: string[] = []
        state.helperObjects.forEach((helper, id) => {
          if (helper.type === type) {
            toDelete.push(id)
          }
        })
        toDelete.forEach((id) => state.helperObjects.delete(id))
      } else {
        // Clear all helpers
        state.helperObjects.clear()
      }
    })
  },

  getHelper: (id) => {
    return get().helperObjects.get(id)
  },

  showHelper: (id) => {
    set((state) => {
      const helper = state.helperObjects.get(id)
      if (helper) {
        helper.visible = true
      }
    })
  },

  hideHelper: (id) => {
    set((state) => {
      const helper = state.helperObjects.get(id)
      if (helper) {
        helper.visible = false
      }
    })
  },

  toggleHelper: (id) => {
    set((state) => {
      const helper = state.helperObjects.get(id)
      if (helper) {
        helper.visible = !helper.visible
      }
    })
  },

  setHelperVisibility: (type, visible) => {
    set((state) => {
      state.helperObjects.forEach((helper) => {
        if (helper.type === type) {
          helper.visible = visible
        }
      })
    })
  },
})
