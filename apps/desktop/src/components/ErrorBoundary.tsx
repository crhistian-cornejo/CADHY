import { logger } from "@cadhy/shared/logger"
import { Button } from "@cadhy/ui/components/button"
import * as React from "react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /**
   * Name of the boundary for debugging
   */
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches React errors
 *
 * Wraps components to prevent full app crashes when errors occur.
 * Displays fallback UI and logs errors.
 *
 * @example
 * ```tsx
 * <ErrorBoundary name="Viewport">
 *   <Viewport3D />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const boundaryName = this.props.name ?? "Unknown"
    logger.error(`[ErrorBoundary:${boundaryName}] Caught error:`, error)
    logger.error("Component stack:", errorInfo.componentStack)

    this.props.onError?.(error, errorInfo)

    // TODO: Send to error reporting service (Sentry, etc.)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="max-w-md space-y-4 rounded-lg border border-destructive bg-destructive/10 p-6">
            <div>
              <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
              {this.props.name && (
                <p className="mt-1 text-sm text-muted-foreground">Error in: {this.props.name}</p>
              )}
            </div>

            {this.state.error && (
              <div className="rounded bg-muted p-3">
                <p className="font-mono text-xs text-muted-foreground">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="default" size="sm">
                Reload App
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
