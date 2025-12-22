/**
 * CancellablePromise - CADHY Command Infrastructure
 *
 * A Promise extension that supports cancellation, interruption, and forced completion.
 * Based on Plasticity's CancellablePromise pattern for CAD command lifecycle management.
 *
 * @example
 * ```typescript
 * const promise = new CancellablePromise<number>((resolve, reject) => {
 *   const timer = setTimeout(() => resolve(42), 1000);
 *   return () => clearTimeout(timer); // Cleanup on cancel
 * });
 *
 * // Later...
 * promise.cancel(); // Rejects with CancelError
 * // or
 * promise.finish(100); // Resolves immediately with 100
 * ```
 */

/**
 * Error thrown when a CancellablePromise is cancelled
 */
export class CancelError extends Error {
  readonly name = "CancelError"

  constructor(message = "Operation was cancelled") {
    super(message)
  }
}

/**
 * Error thrown when a CancellablePromise is interrupted
 * Interruption is a soft cancel that allows cleanup
 */
export class InterruptError extends Error {
  readonly name = "InterruptError"

  constructor(message = "Operation was interrupted") {
    super(message)
  }
}

/**
 * Executor function for CancellablePromise
 * Returns an optional cleanup function called on cancel/interrupt
 */
export type CancellableExecutor<T> = (
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: unknown) => void
) => undefined | (() => void)

/**
 * A Promise that can be cancelled, interrupted, or finished early.
 *
 * Lifecycle:
 * - `cancel()`: Immediately rejects with CancelError, calls cleanup
 * - `interrupt()`: Immediately rejects with InterruptError, calls cleanup
 * - `finish(value)`: Immediately resolves with the given value
 *
 * Composition:
 * - `map(fn)`: Transform the resolved value
 * - `rejectOnInterrupt()`: Convert interrupts to rejections
 * - `static resource(promise)`: Create from existing promise with cancel token
 */
export class CancellablePromise<T> extends Promise<T> {
  private _cleanup?: () => void
  private _cancelled = false
  private _interrupted = false
  private _resolved = false
  private _resolveRef?: (value: T | PromiseLike<T>) => void
  private _rejectRef?: (reason?: unknown) => void

  constructor(executor: CancellableExecutor<T>) {
    let resolveRef: (value: T | PromiseLike<T>) => void
    let rejectRef: (reason?: unknown) => void

    super((resolve, reject) => {
      resolveRef = resolve
      rejectRef = reject
    })

    // Store refs after super() completes
    this._resolveRef = resolveRef!
    this._rejectRef = rejectRef!

    // Execute and capture cleanup function
    try {
      const cleanup = executor(
        (value) => {
          if (!this._cancelled && !this._interrupted) {
            this._resolved = true
            this._resolveRef?.(value)
          }
        },
        (reason) => {
          if (!this._cancelled && !this._interrupted) {
            this._rejectRef?.(reason)
          }
        }
      )

      if (typeof cleanup === "function") {
        this._cleanup = cleanup
      }
    } catch (error) {
      this._rejectRef?.(error)
    }
  }

  /**
   * Whether the promise has been cancelled
   */
  get isCancelled(): boolean {
    return this._cancelled
  }

  /**
   * Whether the promise has been interrupted
   */
  get isInterrupted(): boolean {
    return this._interrupted
  }

  /**
   * Whether the promise has been resolved
   */
  get isResolved(): boolean {
    return this._resolved
  }

  /**
   * Cancel the operation.
   * Rejects the promise with CancelError and calls cleanup.
   */
  cancel(): void {
    if (this._cancelled || this._interrupted || this._resolved) return

    this._cancelled = true
    this._cleanup?.()
    this._rejectRef?.(new CancelError())
  }

  /**
   * Interrupt the operation (soft cancel).
   * Rejects the promise with InterruptError and calls cleanup.
   * Use this when you want to allow cleanup but still stop the operation.
   */
  interrupt(): void {
    if (this._cancelled || this._interrupted || this._resolved) return

    this._interrupted = true
    this._cleanup?.()
    this._rejectRef?.(new InterruptError())
  }

  /**
   * Force-finish the promise with a value.
   * Resolves immediately, ignoring any pending async work.
   */
  finish(value: T): void {
    if (this._cancelled || this._interrupted || this._resolved) return

    this._resolved = true
    this._cleanup?.()
    this._resolveRef?.(value)
  }

  /**
   * Transform the resolved value.
   * Propagates cancellation to the returned promise.
   */
  map<U>(fn: (value: T) => U): CancellablePromise<U> {
    const mapped = new CancellablePromise<U>((resolve, reject) => {
      this.then((value) => resolve(fn(value))).catch(reject)

      return () => {
        this.cancel()
      }
    })

    return mapped
  }

  /**
   * Create a new promise that rejects on interrupt instead of silently cancelling.
   * Useful for command chains that need to know when interrupted.
   */
  rejectOnInterrupt(): CancellablePromise<T> {
    return new CancellablePromise<T>((resolve, reject) => {
      this.then(resolve).catch((error) => {
        if (error instanceof InterruptError) {
          reject(error)
        } else {
          reject(error)
        }
      })

      return () => this.interrupt()
    })
  }

  /**
   * Create a CancellablePromise from an existing promise with an AbortController.
   * The abort signal can be used to cancel the underlying operation.
   */
  static fromAbortable<T>(factory: (signal: AbortSignal) => Promise<T>): CancellablePromise<T> {
    const controller = new AbortController()

    return new CancellablePromise<T>((resolve, reject) => {
      factory(controller.signal).then(resolve).catch(reject)

      return () => {
        controller.abort()
      }
    })
  }

  /**
   * Create a CancellablePromise that resolves after a delay.
   * Useful for timeouts and debouncing.
   */
  static delay(ms: number): CancellablePromise<void> {
    return new CancellablePromise<void>((resolve) => {
      const timer = setTimeout(resolve, ms)
      return () => clearTimeout(timer)
    })
  }

  /**
   * Create a CancellablePromise that resolves immediately.
   */
  static resolved<T>(value: T): CancellablePromise<T> {
    return new CancellablePromise<T>((resolve) => {
      resolve(value)
      return undefined
    })
  }

  /**
   * Create a CancellablePromise that rejects immediately.
   */
  static rejected<T = never>(reason: unknown): CancellablePromise<T> {
    return new CancellablePromise<T>((_, reject) => {
      reject(reason)
      return undefined
    })
  }

  /**
   * Race multiple cancellable promises.
   * When one resolves/rejects, cancels all others.
   */
  static race<T>(promises: CancellablePromise<T>[]): CancellablePromise<T> {
    return new CancellablePromise<T>((resolve, reject) => {
      let settled = false

      for (const promise of promises) {
        promise
          .then((value) => {
            if (!settled) {
              settled = true
              // Cancel all other promises
              for (const p of promises) {
                if (p !== promise) p.cancel()
              }
              resolve(value)
            }
          })
          .catch((error) => {
            if (!settled) {
              settled = true
              for (const p of promises) {
                if (p !== promise) p.cancel()
              }
              reject(error)
            }
          })
      }

      return () => {
        for (const promise of promises) {
          promise.cancel()
        }
      }
    })
  }

  /**
   * Wait for all cancellable promises to resolve.
   * Cancels all if any is cancelled.
   */
  static all<T>(promises: CancellablePromise<T>[]): CancellablePromise<T[]> {
    return new CancellablePromise<T[]>((resolve, reject) => {
      Promise.all(promises).then(resolve).catch(reject)

      return () => {
        for (const promise of promises) {
          promise.cancel()
        }
      }
    })
  }
}

/**
 * Type guard to check if an error is a CancelError
 */
export function isCancelError(error: unknown): error is CancelError {
  return error instanceof CancelError
}

/**
 * Type guard to check if an error is an InterruptError
 */
export function isInterruptError(error: unknown): error is InterruptError {
  return error instanceof InterruptError
}

/**
 * Type guard to check if an error is either CancelError or InterruptError
 */
export function isCancellationError(error: unknown): error is CancelError | InterruptError {
  return isCancelError(error) || isInterruptError(error)
}
