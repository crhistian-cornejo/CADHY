/**
 * Navigation Store Tests - @cadhy/desktop
 *
 * Tests for the navigation store:
 * - View navigation
 * - Reset functionality
 * - Default values
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { useNavigationStore, type ViewId } from "../core/stores/ST_navigation"

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  // Reset the store before each test
  useNavigationStore.setState({ currentView: "modeller" })
})

// ============================================================================
// INITIAL STATE
// ============================================================================

describe("Initial State", () => {
  test("default view is modeller", () => {
    const state = useNavigationStore.getState()
    expect(state.currentView).toBe("modeller")
  })
})

// ============================================================================
// NAVIGATION
// ============================================================================

describe("Navigation", () => {
  test("setView changes current view", () => {
    const store = useNavigationStore.getState()

    store.setView("projects")

    expect(useNavigationStore.getState().currentView).toBe("projects")
  })

  test("navigateTo changes current view (deprecated alias)", () => {
    const store = useNavigationStore.getState()

    store.navigateTo("drawings")

    expect(useNavigationStore.getState().currentView).toBe("drawings")
  })

  test("can navigate to all valid views", () => {
    const views: ViewId[] = [
      "projects",
      "new-project",
      "open",
      "examples",
      "gallery",
      "modeller",
      "drawings",
      "node-editor",
      "file-browser",
      "mesh",
      "cadras",
      "cfd",
      "results",
    ]

    const store = useNavigationStore.getState()

    for (const view of views) {
      store.setView(view)
      expect(useNavigationStore.getState().currentView).toBe(view)
    }
  })
})

// ============================================================================
// RESET
// ============================================================================

describe("Reset", () => {
  test("reset returns to default view", () => {
    const store = useNavigationStore.getState()
    store.setView("drawings")

    store.reset()

    expect(useNavigationStore.getState().currentView).toBe("modeller")
  })
})
