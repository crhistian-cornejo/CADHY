/**
 * Disposable Pattern - CADHY Command Infrastructure
 *
 * Provides resource cleanup patterns for CAD operations.
 * Based on Plasticity's Disposable pattern for managing gizmo lifecycles.
 *
 * @example
 * ```typescript
 * const disposables = new CompositeDisposable();
 *
 * disposables.add(
 *   gizmo1,
 *   gizmo2,
 *   { dispose: () => scene.remove(helper) }
 * );
 *
 * // Later...
 * disposables.dispose(); // Disposes all in reverse order
 * ```
 */

/**
 * Interface for resources that need cleanup
 */
export interface Disposable {
  dispose(): void
}

/**
 * Type guard to check if an object is Disposable
 */
export function isDisposable(obj: unknown): obj is Disposable {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "dispose" in obj &&
    typeof (obj as Disposable).dispose === "function"
  )
}

/**
 * Create a Disposable from a cleanup function
 */
export function toDisposable(cleanup: () => void): Disposable {
  return { dispose: cleanup }
}

/**
 * A collection of disposables that can be disposed together.
 * Disposes in reverse order of addition (LIFO).
 */
export class CompositeDisposable implements Disposable {
  private _disposables: Disposable[] = []
  private _isDisposed = false

  /**
   * Whether this composite has been disposed
   */
  get isDisposed(): boolean {
    return this._isDisposed
  }

  /**
   * Number of disposables in the collection
   */
  get size(): number {
    return this._disposables.length
  }

  /**
   * Add one or more disposables to the collection.
   * If already disposed, immediately disposes the added items.
   */
  add(...disposables: Disposable[]): void {
    if (this._isDisposed) {
      // Already disposed, clean up immediately
      for (const disposable of disposables) {
        disposable.dispose()
      }
      return
    }

    this._disposables.push(...disposables)
  }

  /**
   * Add a cleanup function as a disposable
   */
  addCleanup(cleanup: () => void): void {
    this.add(toDisposable(cleanup))
  }

  /**
   * Remove a specific disposable from the collection.
   * Does not dispose it.
   */
  remove(disposable: Disposable): boolean {
    const index = this._disposables.indexOf(disposable)
    if (index !== -1) {
      this._disposables.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Clear all disposables without disposing them.
   */
  clear(): void {
    this._disposables = []
  }

  /**
   * Dispose all contained disposables in reverse order.
   * Safe to call multiple times.
   */
  dispose(): void {
    if (this._isDisposed) return

    this._isDisposed = true

    // Dispose in reverse order (LIFO)
    const disposables = this._disposables.reverse()
    this._disposables = []

    for (const disposable of disposables) {
      try {
        disposable.dispose()
      } catch (error) {
        console.error("Error disposing resource:", error)
      }
    }
  }
}

/**
 * A disposable that wraps a value and disposes it when disposed.
 * Useful for tracking ownership of resources.
 */
export class DisposableValue<T extends Disposable> implements Disposable {
  private _value: T | null

  constructor(value: T) {
    this._value = value
  }

  /**
   * Get the wrapped value.
   * Returns null if disposed.
   */
  get value(): T | null {
    return this._value
  }

  /**
   * Whether the value has been disposed
   */
  get isDisposed(): boolean {
    return this._value === null
  }

  /**
   * Dispose the wrapped value
   */
  dispose(): void {
    if (this._value) {
      this._value.dispose()
      this._value = null
    }
  }

  /**
   * Transfer ownership of the value.
   * Returns the value and sets internal reference to null.
   */
  take(): T | null {
    const value = this._value
    this._value = null
    return value
  }
}

/**
 * Decorator to add a resource to a command's disposables.
 * Use with commands that extend a base class with `disposables` property.
 */
export function resource(
  target: { disposables: CompositeDisposable },
  disposable: Disposable
): void {
  target.disposables.add(disposable)
}

/**
 * Helper to create a disposable event listener
 */
export function disposableEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): Disposable {
  element.addEventListener(type, listener, options)
  return toDisposable(() => element.removeEventListener(type, listener, options))
}

/**
 * Helper to create a disposable timer
 */
export function disposableTimeout(callback: () => void, ms: number): Disposable {
  const timer = setTimeout(callback, ms)
  return toDisposable(() => clearTimeout(timer))
}

/**
 * Helper to create a disposable interval
 */
export function disposableInterval(callback: () => void, ms: number): Disposable {
  const timer = setInterval(callback, ms)
  return toDisposable(() => clearInterval(timer))
}

/**
 * Create a disposable from an AbortController.
 * Calling dispose() will abort the controller.
 */
export function disposableAbortController(): {
  controller: AbortController
  disposable: Disposable
} {
  const controller = new AbortController()
  return {
    controller,
    disposable: toDisposable(() => controller.abort()),
  }
}

/**
 * Run a function with automatic cleanup.
 * The function receives a CompositeDisposable that is disposed after completion.
 */
export async function withDisposable<T>(
  fn: (disposables: CompositeDisposable) => Promise<T>
): Promise<T> {
  const disposables = new CompositeDisposable()
  try {
    return await fn(disposables)
  } finally {
    disposables.dispose()
  }
}
