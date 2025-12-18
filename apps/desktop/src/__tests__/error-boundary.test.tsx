/**
 * Error Boundary Tests - @cadhy/desktop
 *
 * Tests for the ErrorBoundary component including:
 * - Rendering children when no error
 * - Catching and displaying errors
 * - Reset functionality
 * - Different variants
 * - Specialized error boundaries
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import {
  AppErrorBoundary,
  ChatErrorBoundary,
  ErrorBoundary,
  PanelErrorBoundary,
  ViewerErrorBoundary,
} from "../components/common/ErrorBoundary"

// Simple children that don't throw
function SafeChild() {
  return <div data-testid="child">Child content</div>
}

// Component that always throws
function ThrowingChild() {
  throw new Error("Test error message")
}

// Suppress console.error during tests since we're testing error handling
const originalConsoleError = console.error

beforeEach(() => {
  console.error = mock(() => {})
  cleanup()
})

afterEach(() => {
  console.error = originalConsoleError
  cleanup()
})

describe("ErrorBoundary", () => {
  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  describe("Basic Rendering", () => {
    test("should render children when no error", () => {
      render(
        <ErrorBoundary>
          <SafeChild />
        </ErrorBoundary>
      )

      expect(screen.getByTestId("child")).toBeTruthy()
      expect(screen.getByText("Child content")).toBeTruthy()
    })

    test("should render fallback when error is thrown", () => {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      )

      // Should not render child
      expect(screen.queryByTestId("child")).toBeNull()
      // Should show error UI
      expect(screen.getByText("Try Again")).toBeTruthy()
    })

    test("should render custom fallback when provided", () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(screen.getByTestId("custom-fallback")).toBeTruthy()
      expect(screen.getByText("Custom Error")).toBeTruthy()
    })
  })

  // ============================================================
  // Error Callback Tests
  // ============================================================

  describe("Error Callback", () => {
    test("should call onError callback when error occurs", () => {
      const onError = mock(() => {})

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalled()
    })

    test("should pass error and errorInfo to callback", () => {
      const onError = mock(() => {})

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingChild />
        </ErrorBoundary>
      )

      const [error, errorInfo] = onError.mock.calls[0]
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe("Test error message")
      expect(errorInfo).toBeDefined()
    })
  })

  // ============================================================
  // Variant Tests
  // ============================================================

  describe("Variants", () => {
    test("default variant should show full error UI", () => {
      render(
        <ErrorBoundary variant="default" context="Test Component">
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(screen.getByText("Test Component Error")).toBeTruthy()
      expect(screen.getByText("Try Again")).toBeTruthy()
    })

    test("minimal variant should show compact error UI", () => {
      render(
        <ErrorBoundary variant="minimal" context="Widget">
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(screen.getByText("Failed to load widget")).toBeTruthy()
      expect(screen.getByText("Retry")).toBeTruthy()
    })

    test("fullscreen variant should show large error UI", () => {
      render(
        <ErrorBoundary variant="fullscreen" context="Application">
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeTruthy()
      expect(screen.getByText("Try Again")).toBeTruthy()
      expect(screen.getByText("Reload App")).toBeTruthy()
    })
  })

  // ============================================================
  // Error Message Display Tests
  // ============================================================

  describe("Error Message Display", () => {
    test("should display error message in default variant", () => {
      render(
        <ErrorBoundary variant="default">
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(screen.getByText("Test error message")).toBeTruthy()
    })

    test("should display error message in fullscreen variant", () => {
      render(
        <ErrorBoundary variant="fullscreen">
          <ThrowingChild />
        </ErrorBoundary>
      )

      expect(screen.getByText("Test error message")).toBeTruthy()
    })
  })
})

// ============================================================
// Specialized Error Boundary Tests
// ============================================================

describe("Specialized Error Boundaries", () => {
  describe("ViewerErrorBoundary", () => {
    test("should render children when no error", () => {
      render(
        <ViewerErrorBoundary>
          <div data-testid="viewer">Viewer Content</div>
        </ViewerErrorBoundary>
      )

      expect(screen.getByTestId("viewer")).toBeTruthy()
    })

    test("should catch errors and show fallback", () => {
      render(
        <ViewerErrorBoundary>
          <ThrowingChild />
        </ViewerErrorBoundary>
      )

      expect(screen.getByText("3D Viewer Error")).toBeTruthy()
    })
  })

  describe("ChatErrorBoundary", () => {
    test("should render children when no error", () => {
      render(
        <ChatErrorBoundary>
          <div data-testid="chat">Chat Content</div>
        </ChatErrorBoundary>
      )

      expect(screen.getByTestId("chat")).toBeTruthy()
    })

    test("should use minimal variant for errors", () => {
      render(
        <ChatErrorBoundary>
          <ThrowingChild />
        </ChatErrorBoundary>
      )

      // Minimal variant shows "Failed to load" and "Retry"
      expect(screen.getByText("Failed to load ai chat")).toBeTruthy()
      expect(screen.getByText("Retry")).toBeTruthy()
    })
  })

  describe("PanelErrorBoundary", () => {
    test("should render children when no error", () => {
      render(
        <PanelErrorBoundary context="Properties">
          <div data-testid="panel">Panel Content</div>
        </PanelErrorBoundary>
      )

      expect(screen.getByTestId("panel")).toBeTruthy()
    })

    test("should use minimal variant with custom context", () => {
      render(
        <PanelErrorBoundary context="Layers">
          <ThrowingChild />
        </PanelErrorBoundary>
      )

      expect(screen.getByText("Failed to load layers")).toBeTruthy()
    })
  })

  describe("AppErrorBoundary", () => {
    test("should render children when no error", () => {
      render(
        <AppErrorBoundary>
          <div data-testid="app">App Content</div>
        </AppErrorBoundary>
      )

      expect(screen.getByTestId("app")).toBeTruthy()
    })

    test("should use fullscreen variant for errors", () => {
      render(
        <AppErrorBoundary>
          <ThrowingChild />
        </AppErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeTruthy()
      expect(screen.getByText("Reload App")).toBeTruthy()
    })
  })
})
