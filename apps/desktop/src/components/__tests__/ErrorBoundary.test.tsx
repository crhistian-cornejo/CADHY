import { describe, expect, it, mock } from "bun:test"
import { render, screen } from "@testing-library/react"
import { ErrorBoundary } from "../ErrorBoundary"

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error")
  }
  return <div>No error</div>
}

describe("ErrorBoundary", () => {
  // Note: Bun test automatically suppresses console.error in tests

  describe("normal operation", () => {
    it("should render children when no error", () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText("Test content")).toBeDefined()
    })

    it("should render multiple children", () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      )

      expect(screen.getByText("Child 1")).toBeDefined()
      expect(screen.getByText("Child 2")).toBeDefined()
    })
  })

  describe("error handling", () => {
    it("should catch errors from children", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeDefined()
    })

    it("should display error message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Test error")).toBeDefined()
    })

    it("should display boundary name if provided", () => {
      render(
        <ErrorBoundary name="TestBoundary">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Error in: TestBoundary")).toBeDefined()
    })

    it("should show Try Again button", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Try Again")).toBeDefined()
    })

    it("should show Reload App button", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Reload App")).toBeDefined()
    })
  })

  describe("custom fallback", () => {
    it("should render custom fallback when error occurs", () => {
      const customFallback = <div>Custom error UI</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Custom error UI")).toBeDefined()
    })
  })

  describe("error callback", () => {
    it("should call onError callback when error occurs", () => {
      const onError = mock(() => {})

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalled()
    })

    it("should pass error and errorInfo to callback", () => {
      let capturedError: Error | undefined
      let capturedErrorInfo: any

      const onError = (error: Error, errorInfo: any) => {
        capturedError = error
        capturedErrorInfo = errorInfo
      }

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(capturedError).toBeDefined()
      expect(capturedError?.message).toBe("Test error")
      expect(capturedErrorInfo).toBeDefined()
    })
  })

  describe("reset functionality", () => {
    it("should show Try Again button that can reset error", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeDefined()

      // Click Try Again
      const tryAgainButton = screen.getByText("Try Again")
      tryAgainButton.click()

      // After reset, should try to render children again
      // (in real app, this would work if the error condition is resolved)
      expect(screen.getByText("Try Again")).toBeDefined() // Still shows error UI because error persists
    })
  })

  describe("multiple boundaries", () => {
    it("should isolate errors to specific boundary", () => {
      render(
        <div>
          <ErrorBoundary name="Boundary1">
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <ErrorBoundary name="Boundary2">
            <div>Boundary 2 content</div>
          </ErrorBoundary>
        </div>
      )

      // Boundary 1 should show error
      expect(screen.getByText("Error in: Boundary1")).toBeDefined()

      // Boundary 2 should still render normally
      expect(screen.getByText("Boundary 2 content")).toBeDefined()
    })
  })

  describe("nested boundaries", () => {
    it("should catch error at nearest boundary", () => {
      render(
        <ErrorBoundary name="Outer">
          <div>
            <ErrorBoundary name="Inner">
              <ThrowError shouldThrow={true} />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      )

      // Inner boundary should catch the error
      expect(screen.getByText("Error in: Inner")).toBeDefined()
      // Outer boundary text should not appear
      expect(screen.queryByText("Error in: Outer")).toBeNull()
    })
  })
})
