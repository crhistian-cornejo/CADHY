/**
 * Test Setup - CADHY Desktop
 *
 * This file provides test environment setup for bun test.
 * It mocks localStorage and other browser APIs needed by Zustand persist.
 * Also configures happy-dom for React component testing.
 */

import { Window } from "happy-dom"

// Create a window instance for DOM testing
const window = new Window({
  url: "https://localhost:3000",
  width: 1920,
  height: 1080,
})

// Register DOM globals
globalThis.window = window as unknown as Window & typeof globalThis
globalThis.document = window.document as unknown as Document
globalThis.navigator = window.navigator as unknown as Navigator
globalThis.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement
globalThis.Element = window.Element as unknown as typeof Element
globalThis.Node = window.Node as unknown as typeof Node
globalThis.DocumentFragment = window.DocumentFragment as unknown as typeof DocumentFragment
globalThis.Event = window.Event as unknown as typeof Event
globalThis.CustomEvent = window.CustomEvent as unknown as typeof CustomEvent
globalThis.MouseEvent = window.MouseEvent as unknown as typeof MouseEvent
globalThis.KeyboardEvent = window.KeyboardEvent as unknown as typeof KeyboardEvent

// Simple localStorage mock for test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

// @ts-expect-error - Setting global for test environment
globalThis.localStorage = localStorageMock

// Try to set window.localStorage (happy-dom may have its own)
try {
  if (typeof globalThis.window !== "undefined" && globalThis.window.localStorage === undefined) {
    // @ts-expect-error - Setting window.localStorage for test environment
    Object.defineProperty(globalThis.window, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
  }
} catch {
  // happy-dom may have its own localStorage, which is fine
}

// Export for test files that need to access it directly
export { localStorageMock }

// Clear localStorage before each test run
export function clearTestStorage() {
  localStorageMock.clear()
}
