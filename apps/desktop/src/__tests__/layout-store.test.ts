/**
 * Layout Store Tests - @cadhy/desktop
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { useLayoutStore } from "../stores/layout-store"

describe("Layout Store", () => {
  beforeEach(() => {
    // Reset store before each test
    useLayoutStore.getState().reset()
  })

  describe("Initial State", () => {
    test("should have correct default panel states", () => {
      const state = useLayoutStore.getState()
      expect(state.panels.sidebar).toBe(true)
      expect(state.panels.aiChat).toBe(false)
      expect(state.panels.properties).toBe(true)
      expect(state.panels.results).toBe(false)
    })

    test("should have sidebar not collapsed by default", () => {
      const state = useLayoutStore.getState()
      expect(state.sidebarCollapsed).toBe(false)
    })
  })

  describe("togglePanel", () => {
    test("should toggle sidebar panel", () => {
      const { togglePanel } = useLayoutStore.getState()

      expect(useLayoutStore.getState().panels.sidebar).toBe(true)
      togglePanel("sidebar")
      expect(useLayoutStore.getState().panels.sidebar).toBe(false)
      togglePanel("sidebar")
      expect(useLayoutStore.getState().panels.sidebar).toBe(true)
    })

    test("should toggle aiChat panel", () => {
      const { togglePanel } = useLayoutStore.getState()

      expect(useLayoutStore.getState().panels.aiChat).toBe(false)
      togglePanel("aiChat")
      expect(useLayoutStore.getState().panels.aiChat).toBe(true)
      togglePanel("aiChat")
      expect(useLayoutStore.getState().panels.aiChat).toBe(false)
    })

    test("should toggle properties panel", () => {
      const { togglePanel } = useLayoutStore.getState()

      expect(useLayoutStore.getState().panels.properties).toBe(true)
      togglePanel("properties")
      expect(useLayoutStore.getState().panels.properties).toBe(false)
    })

    test("should toggle results panel", () => {
      const { togglePanel } = useLayoutStore.getState()

      expect(useLayoutStore.getState().panels.results).toBe(false)
      togglePanel("results")
      expect(useLayoutStore.getState().panels.results).toBe(true)
    })
  })

  describe("setPanel", () => {
    test("should set panel to specific value", () => {
      const { setPanel } = useLayoutStore.getState()

      setPanel("aiChat", true)
      expect(useLayoutStore.getState().panels.aiChat).toBe(true)

      setPanel("aiChat", false)
      expect(useLayoutStore.getState().panels.aiChat).toBe(false)
    })

    test("should not affect other panels", () => {
      const { setPanel } = useLayoutStore.getState()

      const initialSidebar = useLayoutStore.getState().panels.sidebar
      setPanel("aiChat", true)
      expect(useLayoutStore.getState().panels.sidebar).toBe(initialSidebar)
    })
  })

  describe("setPanels", () => {
    test("should set multiple panels at once", () => {
      const { setPanels } = useLayoutStore.getState()

      setPanels({ aiChat: true, results: true })

      const state = useLayoutStore.getState()
      expect(state.panels.aiChat).toBe(true)
      expect(state.panels.results).toBe(true)
    })

    test("should preserve unspecified panels", () => {
      const { setPanels } = useLayoutStore.getState()

      const initialSidebar = useLayoutStore.getState().panels.sidebar
      setPanels({ aiChat: true })

      expect(useLayoutStore.getState().panels.sidebar).toBe(initialSidebar)
    })
  })

  describe("Sidebar Collapsed", () => {
    test("should toggle sidebar collapsed state", () => {
      const { toggleSidebarCollapsed } = useLayoutStore.getState()

      expect(useLayoutStore.getState().sidebarCollapsed).toBe(false)
      toggleSidebarCollapsed()
      expect(useLayoutStore.getState().sidebarCollapsed).toBe(true)
      toggleSidebarCollapsed()
      expect(useLayoutStore.getState().sidebarCollapsed).toBe(false)
    })

    test("should set sidebar collapsed to specific value", () => {
      const { setSidebarCollapsed } = useLayoutStore.getState()

      setSidebarCollapsed(true)
      expect(useLayoutStore.getState().sidebarCollapsed).toBe(true)

      setSidebarCollapsed(false)
      expect(useLayoutStore.getState().sidebarCollapsed).toBe(false)
    })
  })

  describe("reset", () => {
    test("should reset to default state", () => {
      const { togglePanel, toggleSidebarCollapsed, reset } = useLayoutStore.getState()

      // Modify state
      togglePanel("sidebar")
      togglePanel("aiChat")
      toggleSidebarCollapsed()

      // Verify state is modified
      expect(useLayoutStore.getState().panels.sidebar).toBe(false)
      expect(useLayoutStore.getState().panels.aiChat).toBe(true)
      expect(useLayoutStore.getState().sidebarCollapsed).toBe(true)

      // Reset
      reset()

      // Verify state is back to defaults
      const state = useLayoutStore.getState()
      expect(state.panels.sidebar).toBe(true)
      expect(state.panels.aiChat).toBe(false)
      expect(state.panels.properties).toBe(true)
      expect(state.panels.results).toBe(false)
      expect(state.sidebarCollapsed).toBe(false)
    })
  })
})
