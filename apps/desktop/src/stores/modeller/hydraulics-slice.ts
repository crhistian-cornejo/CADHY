/**
 * Hydraulics Slice - CADHY Modeller Store
 *
 * Handles hydraulic connections and chain propagation:
 * - connectElements, disconnectElement
 * - propagatePositions, recalculateHydraulicChain
 * - syncTransitionsWithChannel
 */

import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { ChannelObject, ChuteObject, TransitionObject, TransitionSection } from "./types"

// ============================================================================
// SLICE ACTIONS
// ============================================================================

export interface HydraulicsSliceActions {
  connectElements: (upstreamId: string, downstreamId: string) => void
  disconnectElement: (id: string, direction: "upstream" | "downstream") => void
  propagatePositions: (startId: string) => void
  propagatePositionsUpstream: (startId: string) => void
  recalculateHydraulicChain: () => void
  syncTransitionsWithChannel: (channelId: string) => void
  syncTransitionElevationsFromDownstream: (channelId: string) => void
}

export type HydraulicsSlice = HydraulicsSliceActions

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createHydraulicsSlice: StateCreator<ModellerStore, [], [], HydraulicsSlice> = (
  set,
  get
) => ({
  connectElements: (upstreamId, downstreamId) => {
    const { objects, updateObject } = get()
    const upstream = objects.find((o) => o.id === upstreamId)
    const downstream = objects.find((o) => o.id === downstreamId)

    if (!upstream || !downstream) return

    // Update connection references
    updateObject(upstreamId, { downstreamChannelId: downstreamId })
    updateObject(downstreamId, { upstreamChannelId: upstreamId })

    // Propagate positions from upstream to downstream
    get().propagatePositions(upstreamId)
  },

  disconnectElement: (id, direction) => {
    const { objects, updateObject } = get()
    const element = objects.find((o) => o.id === id) as ChannelObject | TransitionObject | undefined

    if (!element) return

    if (direction === "upstream" && element.upstreamChannelId) {
      const upstream = objects.find((o) => o.id === element.upstreamChannelId)
      if (upstream) {
        updateObject(upstream.id, { downstreamChannelId: null })
      }
      updateObject(id, { upstreamChannelId: null })
    } else if (direction === "downstream" && element.downstreamChannelId) {
      const downstream = objects.find((o) => o.id === element.downstreamChannelId)
      if (downstream) {
        updateObject(downstream.id, { upstreamChannelId: null })
      }
      updateObject(id, { downstreamChannelId: null })
    }
  },

  propagatePositions: (startId) => {
    const { objects } = get()
    const startElement = objects.find((o) => o.id === startId) as
      | ChannelObject
      | TransitionObject
      | ChuteObject
      | undefined

    if (!startElement) return

    // Get end position of the start element
    let currentEndStation: number
    let currentEndElevation: number

    if (startElement.type === "channel") {
      const channel = startElement as ChannelObject
      currentEndStation = channel.endStation ?? channel.startStation + channel.length
      currentEndElevation =
        channel.endElevation ?? channel.startElevation - channel.length * channel.slope
    } else if (startElement.type === "transition") {
      const transition = startElement as TransitionObject
      currentEndStation = transition.endStation
      currentEndElevation = transition.endElevation
    } else if (startElement.type === "chute") {
      const chute = startElement as ChuteObject
      currentEndStation = chute.endStation ?? chute.startStation + chute.length
      currentEndElevation = chute.endElevation ?? chute.startElevation - chute.drop
    } else {
      return
    }

    // Find and update downstream element
    const downstreamId = (startElement as ChannelObject | TransitionObject | ChuteObject)
      .downstreamChannelId
    if (!downstreamId) return

    const downstream = objects.find((o) => o.id === downstreamId) as
      | ChannelObject
      | TransitionObject
      | ChuteObject
      | undefined
    if (!downstream) return

    // Calculate new positions for downstream element
    if (downstream.type === "channel") {
      const channel = downstream as ChannelObject
      const newEndStation = currentEndStation + channel.length
      const newEndElevation = currentEndElevation - channel.length * channel.slope

      set((state) => ({
        objects: state.objects.map((obj) =>
          obj.id === downstreamId
            ? {
                ...obj,
                startStation: currentEndStation,
                startElevation: currentEndElevation,
                endStation: newEndStation,
                endElevation: newEndElevation,
                transform: {
                  ...obj.transform,
                  position: { x: currentEndStation, y: 0, z: currentEndElevation },
                },
                updatedAt: Date.now(),
              }
            : obj
        ),
      }))

      // Continue propagation
      get().propagatePositions(downstreamId)
    } else if (downstream.type === "transition") {
      const transition = downstream as TransitionObject
      const newEndStation = currentEndStation + transition.length
      // For transitions, calculate end elevation based on a default slope or keep original
      const transitionSlope =
        (transition.startElevation - transition.endElevation) / transition.length || 0.005
      const newEndElevation = currentEndElevation - transition.length * transitionSlope

      set((state) => ({
        objects: state.objects.map((obj) =>
          obj.id === downstreamId
            ? {
                ...obj,
                startStation: currentEndStation,
                startElevation: currentEndElevation,
                endStation: newEndStation,
                endElevation: newEndElevation,
                transform: {
                  ...obj.transform,
                  position: { x: currentEndStation, y: 0, z: currentEndElevation },
                },
                updatedAt: Date.now(),
              }
            : obj
        ),
      }))

      // Continue propagation
      get().propagatePositions(downstreamId)
    } else if (downstream.type === "chute") {
      const chute = downstream as ChuteObject
      const newEndStation = currentEndStation + chute.length
      const newEndElevation = currentEndElevation - chute.drop

      set((state) => ({
        objects: state.objects.map((obj) =>
          obj.id === downstreamId
            ? {
                ...obj,
                startStation: currentEndStation,
                startElevation: currentEndElevation,
                endStation: newEndStation,
                endElevation: newEndElevation,
                slope: chute.drop / chute.length,
                transform: {
                  ...obj.transform,
                  position: { x: currentEndStation, y: 0, z: currentEndElevation },
                },
                updatedAt: Date.now(),
              }
            : obj
        ),
      }))

      // Continue propagation
      get().propagatePositions(downstreamId)
    }
  },

  recalculateHydraulicChain: () => {
    const { objects, propagatePositions } = get()

    // Find all root elements (elements with no upstream connection)
    const rootElements = objects.filter((obj) => {
      if (obj.type === "channel" || obj.type === "transition" || obj.type === "chute") {
        const element = obj as ChannelObject | TransitionObject | ChuteObject
        return !element.upstreamChannelId
      }
      return false
    })

    // Propagate from each root
    rootElements.forEach((root) => {
      propagatePositions(root.id)
    })
  },

  /**
   * Propagate position changes UPSTREAM (from downstream element to upstream elements)
   * This is used when you edit the downstream channel and want the transition to adapt
   */
  propagatePositionsUpstream: (startId) => {
    const { objects } = get()
    const startElement = objects.find((o) => o.id === startId) as
      | ChannelObject
      | TransitionObject
      | undefined

    if (!startElement) return

    // Get start position of this element
    const currentStartStation = startElement.startStation
    const currentStartElevation = startElement.startElevation

    // Find upstream element
    const upstreamId = startElement.upstreamChannelId
    if (!upstreamId) return

    const upstream = objects.find((o) => o.id === upstreamId) as
      | ChannelObject
      | TransitionObject
      | undefined
    if (!upstream) return

    // If upstream is a transition, update its endElevation to match this element's startElevation
    // The transition adapts its slope to connect both channels smoothly
    if (upstream.type === "transition") {
      // Update transition's end position to match this element's start
      set((state) => ({
        objects: state.objects.map((obj) =>
          obj.id === upstreamId
            ? {
                ...obj,
                endStation: currentStartStation,
                endElevation: currentStartElevation,
                updatedAt: Date.now(),
              }
            : obj
        ),
      }))

      // Continue propagating upstream if there are more elements
      // Note: We need to re-fetch the upstream element's upstreamChannelId
      const transitionUpstream = upstream as TransitionObject
      if (transitionUpstream.upstreamChannelId) {
        // The transition's upstream is a channel - we don't change its elevation
        // but we could continue if needed
      }
    }
  },

  /**
   * When a channel's startElevation changes, update the connected upstream transition's endElevation
   * This ensures smooth connection between elements
   */
  syncTransitionElevationsFromDownstream: (channelId) => {
    const { objects } = get()
    const channel = objects.find((o) => o.id === channelId) as ChannelObject | undefined

    if (!channel) return

    // Find if there's a transition upstream of this channel
    const upstreamId = channel.upstreamChannelId
    if (!upstreamId) return

    const upstream = objects.find((o) => o.id === upstreamId)
    if (!upstream || upstream.type !== "transition") return

    // Update the transition's endElevation to match this channel's startElevation
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === upstreamId
          ? {
              ...obj,
              endStation: channel.startStation,
              endElevation: channel.startElevation,
              updatedAt: Date.now(),
            }
          : obj
      ),
    }))
  },

  syncTransitionsWithChannel: (channelId) => {
    const { objects } = get()
    const channel = objects.find((o) => o.id === channelId) as ChannelObject | undefined

    if (!channel) return

    // Helper to convert channel section to transition section
    const channelToTransitionSection = (ch: ChannelObject): TransitionSection => {
      const section = ch.section
      const thickness = ch.thickness ?? 0.15

      switch (section.type) {
        case "rectangular":
          return {
            sectionType: "rectangular",
            width: (section as { type: "rectangular"; width: number; depth: number }).width,
            depth: section.depth,
            sideSlope: 0,
            wallThickness: thickness,
            floorThickness: thickness,
          }
        case "trapezoidal":
          return {
            sectionType: "trapezoidal",
            width: (
              section as {
                type: "trapezoidal"
                bottomWidth: number
                depth: number
                sideSlope: number
              }
            ).bottomWidth,
            depth: section.depth,
            sideSlope: (
              section as {
                type: "trapezoidal"
                bottomWidth: number
                depth: number
                sideSlope: number
              }
            ).sideSlope,
            wallThickness: thickness,
            floorThickness: thickness,
          }
        case "triangular":
          return {
            sectionType: "triangular",
            width: 0,
            depth: section.depth,
            sideSlope: (section as { type: "triangular"; depth: number; sideSlope: number })
              .sideSlope,
            wallThickness: thickness,
            floorThickness: thickness,
          }
        default:
          return {
            sectionType: "trapezoidal",
            width: 2,
            depth: 1.5,
            sideSlope: 1.5,
            wallThickness: thickness,
            floorThickness: thickness,
          }
      }
    }

    const newSection = channelToTransitionSection(channel)

    // Find transitions connected to this channel
    // If channel is upstream of a transition, update transition's inlet
    // If channel is downstream of a transition, update transition's outlet
    const updatedObjects = objects.map((obj) => {
      if (obj.type === "transition") {
        const transition = obj as TransitionObject

        // This channel is upstream of the transition (transition's inlet should match)
        if (transition.upstreamChannelId === channelId) {
          return {
            ...transition,
            inlet: newSection,
            updatedAt: Date.now(),
          }
        }

        // This channel is downstream of the transition (transition's outlet should match)
        if (transition.downstreamChannelId === channelId) {
          return {
            ...transition,
            outlet: newSection,
            updatedAt: Date.now(),
          }
        }
      }
      return obj
    })

    set({ objects: updatedObjects })
  },
})
