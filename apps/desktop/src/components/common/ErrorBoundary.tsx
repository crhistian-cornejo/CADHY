/**
 * Error Boundary Component - CADHY
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * Features:
 * - Customizable fallback UI
 * - Error reporting callback
 * - Reset functionality
 * - Different variants for different contexts
 */

import { Button } from "@cadhy/ui"
import { AlertCircleIcon, Home01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Component, type ErrorInfo, type ReactNode } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Custom fallback UI to show on error */
  fallback?: ReactNode
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Reset key - changing this will reset the error boundary */
  resetKey?: string | number
  /** Variant for styling */
  variant?: "default" | "minimal" | "fullscreen"
  /** Context name for error messages */
  context?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)

    // Update state with error info
    this.setState({ errorInfo })

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.resetError()
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, variant = "default", context } = this.props

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Default fallback based on variant
      return (
        <ErrorFallback
          error={error}
          onReset={this.resetError}
          variant={variant}
          context={context}
        />
      )
    }

    return children
  }
}

// ============================================================================
// ERROR FALLBACK COMPONENT
// ============================================================================

interface ErrorFallbackProps {
  error: Error | null
  onReset: () => void
  variant: "default" | "minimal" | "fullscreen"
  context?: string
}

function ErrorFallback({ error, onReset, variant, context }: ErrorFallbackProps) {
  const contextName = context || "Component"

  if (variant === "minimal") {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-center">
          <HugeiconsIcon icon={AlertCircleIcon} className="h-6 w-6 text-destructive" />
          <p className="text-sm">Failed to load {contextName.toLowerCase()}</p>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <HugeiconsIcon icon={RefreshIcon} className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (variant === "fullscreen") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-8">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <HugeiconsIcon icon={AlertCircleIcon} className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              {contextName} encountered an unexpected error. Please try again or reload the
              application.
            </p>
          </div>
          {error && (
            <pre className="max-h-32 w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onReset}>
              <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()}>
              <HugeiconsIcon icon={Home01Icon} className="mr-2 h-4 w-4" />
              Reload App
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <HugeiconsIcon icon={AlertCircleIcon} className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{contextName} Error</h2>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading this component.
          </p>
        </div>
        {error && (
          <pre className="max-h-24 w-full overflow-auto rounded-md bg-muted p-2 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <Button variant="outline" size="sm" onClick={onReset}>
          <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// SPECIALIZED ERROR BOUNDARIES
// ============================================================================

/**
 * Error boundary for the 3D Viewer
 */
export function ViewerErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="3D Viewer"
      variant="default"
      onError={(error, info) => {
        console.error("[Viewer Error]", error, info)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Error boundary for the AI Chat Panel
 */
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="AI Chat"
      variant="minimal"
      onError={(error, info) => {
        console.error("[Chat Error]", error, info)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Error boundary for panels (properties, layers, etc.)
 */
export function PanelErrorBoundary({
  children,
  context = "Panel",
}: {
  children: ReactNode
  context?: string
}) {
  return (
    <ErrorBoundary
      context={context}
      variant="minimal"
      onError={(error, info) => {
        console.error(`[${context} Error]`, error, info)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Global error boundary for the entire app
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="Application"
      variant="fullscreen"
      onError={(error, info) => {
        console.error("[App Error]", error, info)
        // In production, you might want to send this to an error tracking service
        // sendToErrorTracker(error, info);
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
