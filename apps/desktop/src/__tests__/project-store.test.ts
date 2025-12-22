/**
 * Project Store Tests - @cadhy/desktop
 *
 * Tests for the project store synchronous operations:
 * - Settings management
 * - Error handling
 * - Loading state
 * - Close project
 *
 * NOTE: Recent projects are now managed by recent-projects-store.
 * See recent-projects-store.test.ts for those tests.
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { useProjectStore } from "../stores/project-store"

// Mock external services to isolate store tests
mock.module("@/services/project-service", () => ({
  createProject: mock(() => Promise.resolve({ id: "test-id", name: "Test", path: "/test/path" })),
  openProject: mock(() =>
    Promise.resolve({
      info: { id: "test-id", name: "Test", path: "/test/path" },
      settings: {},
      scene: { objects: [], layers: [] },
    })
  ),
  saveProject: mock(() => Promise.resolve({ id: "test-id", name: "Test", path: "/test/path" })),
  saveProjectAs: mock(() => Promise.resolve({ id: "test-id", name: "Test", path: "/test/path" })),
  updateProjectSettings: mock(() => Promise.resolve()),
}))

mock.module("@/services/thumbnail-service", () => ({
  captureViewportThumbnailDelayed: mock(() => Promise.resolve(null)),
}))

// NOTE: We don't mock @/stores/modeller because mock.module persists
// across test files in bun, which would break modeller-store.test.ts.
// Instead, we rely on the real modeller-store but mock its external dependencies.
// The modeller-store itself is safe to use in tests since it has localStorage mocked via setup.ts.

// NOTE: We don't mock stores because mock.module persists across test files in bun,
// which would break other store tests. The real stores with localStorage mocked via setup.ts
// work fine for isolated tests.

// NOTE: We don't mock @/stores/chat-store because it has dynamic import handling
// that works with the real store. The chat-store tests handle their own mocking.

describe("Project Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    useProjectStore.setState({
      currentProject: null,
      currentSettings: {
        units: { length: "m", angle: "deg" },
        precision: 4,
        theme: "system",
        autoSave: true,
        autoSaveInterval: 300,
      },
      isLoading: false,
      error: null,
    })
  })

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe("Initial State", () => {
    test("should have null current project", () => {
      const state = useProjectStore.getState()
      expect(state.currentProject).toBeNull()
    })

    test("should have default settings", () => {
      const state = useProjectStore.getState()
      expect(state.currentSettings.units.length).toBe("m")
      expect(state.currentSettings.precision).toBe(4)
      expect(state.currentSettings.autoSave).toBe(true)
    })

    test("should not be loading", () => {
      const state = useProjectStore.getState()
      expect(state.isLoading).toBe(false)
    })

    test("should have no error", () => {
      const state = useProjectStore.getState()
      expect(state.error).toBeNull()
    })
  })

  // ============================================================
  // Loading State Tests
  // ============================================================

  describe("Loading State", () => {
    test("should set loading state", () => {
      const { setLoading } = useProjectStore.getState()

      setLoading(true)
      expect(useProjectStore.getState().isLoading).toBe(true)

      setLoading(false)
      expect(useProjectStore.getState().isLoading).toBe(false)
    })
  })

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe("Error Handling", () => {
    test("should set error", () => {
      const { setError } = useProjectStore.getState()

      setError("Test error message")

      expect(useProjectStore.getState().error).toBe("Test error message")
    })

    test("should clear error", () => {
      const { setError, clearError } = useProjectStore.getState()
      setError("Test error")

      clearError()

      expect(useProjectStore.getState().error).toBeNull()
    })
  })

  // ============================================================
  // Close Project Tests
  // ============================================================

  describe("Close Project", () => {
    test("should clear current project", async () => {
      // Manually set a project
      useProjectStore.setState({
        currentProject: { id: "test", name: "Test", path: "/test" },
      })

      const { closeProject } = useProjectStore.getState()
      await closeProject()

      expect(useProjectStore.getState().currentProject).toBeNull()
    })

    test("should reset settings to default", async () => {
      useProjectStore.setState({
        currentSettings: {
          units: { length: "ft", angle: "rad" },
          precision: 2,
          theme: "dark",
          autoSave: false,
          autoSaveInterval: 60,
        },
      })

      const { closeProject } = useProjectStore.getState()
      await closeProject()

      const state = useProjectStore.getState()
      expect(state.currentSettings.units.length).toBe("m")
      expect(state.currentSettings.precision).toBe(4)
      expect(state.currentSettings.autoSave).toBe(true)
    })
  })

  // ============================================================
  // Settings Tests
  // ============================================================

  describe("Settings", () => {
    test("should update partial settings", async () => {
      const { updateSettings } = useProjectStore.getState()

      await updateSettings({ precision: 6 })

      const state = useProjectStore.getState()
      expect(state.currentSettings.precision).toBe(6)
      // Other settings should remain unchanged
      expect(state.currentSettings.units.length).toBe("m")
    })

    test("should update multiple settings", async () => {
      const { updateSettings } = useProjectStore.getState()

      await updateSettings({
        precision: 3,
        theme: "dark",
        autoSave: false,
      })

      const state = useProjectStore.getState()
      expect(state.currentSettings.precision).toBe(3)
      expect(state.currentSettings.theme).toBe("dark")
      expect(state.currentSettings.autoSave).toBe(false)
    })
  })
})
