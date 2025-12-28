/**
 * Dimensioning Store Tests - @cadhy/desktop
 *
 * Tests for the dimensioning tool store:
 * - Tool selection
 * - Dimension selection
 * - Clear selection
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { useDimensioningStore } from "../core/stores/ST_dimensioning"

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  // Reset the store before each test
  useDimensioningStore.setState({
    activeTool: null,
    selectedDimensionIndex: null,
  })
})

// ============================================================================
// INITIAL STATE
// ============================================================================

describe("Initial State", () => {
  test("has null active tool", () => {
    const state = useDimensioningStore.getState()
    expect(state.activeTool).toBeNull()
  })

  test("has null selected dimension index", () => {
    const state = useDimensioningStore.getState()
    expect(state.selectedDimensionIndex).toBeNull()
  })
})

// ============================================================================
// TOOL SELECTION
// ============================================================================

describe("Tool Selection", () => {
  test("setActiveTool sets the tool", () => {
    const store = useDimensioningStore.getState()

    store.setActiveTool("linear")

    expect(useDimensioningStore.getState().activeTool).toBe("linear")
  })

  test("setActiveTool clears dimension selection", () => {
    // First set a dimension selection
    useDimensioningStore.setState({ selectedDimensionIndex: 5 })

    // Then change tool
    useDimensioningStore.getState().setActiveTool("angular")

    expect(useDimensioningStore.getState().selectedDimensionIndex).toBeNull()
  })

  test("setActiveTool with null clears tool", () => {
    useDimensioningStore.setState({ activeTool: "linear" })

    useDimensioningStore.getState().setActiveTool(null)

    expect(useDimensioningStore.getState().activeTool).toBeNull()
  })
})

// ============================================================================
// DIMENSION SELECTION
// ============================================================================

describe("Dimension Selection", () => {
  test("setSelectedDimensionIndex sets the index", () => {
    const store = useDimensioningStore.getState()

    store.setSelectedDimensionIndex(3)

    expect(useDimensioningStore.getState().selectedDimensionIndex).toBe(3)
  })

  test("setSelectedDimensionIndex with null clears selection", () => {
    useDimensioningStore.setState({ selectedDimensionIndex: 5 })

    useDimensioningStore.getState().setSelectedDimensionIndex(null)

    expect(useDimensioningStore.getState().selectedDimensionIndex).toBeNull()
  })

  test("clearSelection clears the selection", () => {
    useDimensioningStore.setState({ selectedDimensionIndex: 10 })

    useDimensioningStore.getState().clearSelection()

    expect(useDimensioningStore.getState().selectedDimensionIndex).toBeNull()
  })
})
