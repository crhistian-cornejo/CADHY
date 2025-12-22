/**
 * Multi Factory - CADHY Factory Infrastructure
 *
 * Factory for managing multiple sub-factories as a single operation.
 * Useful for operations that affect multiple objects simultaneously.
 *
 * Based on Plasticity's MultiGeometryFactory pattern with delegation decorators.
 *
 * @example
 * ```typescript
 * // Fillet multiple edges at once
 * const factory = new MultiFilletFactory();
 * factory.addEdge(edge1);
 * factory.addEdge(edge2);
 * factory.distance = 0.5; // Applies to all sub-factories
 *
 * const preview = await factory.update();
 * await factory.commit();
 * ```
 */

import { CancellablePromise, CompositeDisposable, type Disposable } from "@cadhy/command"
import type { MeshData } from "@cadhy/types"
import type { FactoryOptions, FactoryResult, FactoryState } from "./geometry-factory"

// =============================================================================
// MULTI FACTORY BASE
// =============================================================================

/**
 * Interface for factories that can be composed in a MultiGeometryFactory.
 * Extends GeometryFactory with additional properties for delegation.
 */
export interface ComposableFactory extends Disposable {
  /** Name of the factory */
  readonly name: string

  /** Current state */
  readonly state: FactoryState

  /** Whether parameters are valid */
  isValid(): boolean

  /** Update preview with caching */
  updateWithCache(options?: FactoryOptions): CancellablePromise<MeshData>

  /** Get parameters as plain object */
  toParams(): Record<string, unknown>

  /** Commit the operation */
  commit(options?: FactoryOptions): Promise<FactoryResult>

  /** Cancel the operation */
  cancel(): void
}

/**
 * Result of a multi-factory operation
 */
export interface MultiFactoryResult {
  /** Individual results from each sub-factory */
  results: FactoryResult[]

  /** Whether all operations succeeded */
  success: boolean

  /** Error message if any operation failed */
  error?: string
}

/**
 * Combined mesh data from multiple factories
 */
export interface CombinedMeshData {
  /** Meshes from each sub-factory */
  meshes: MeshData[]

  /** Factory indices for each mesh (for identifying which factory produced which mesh) */
  factoryIndices: number[]
}

/**
 * Abstract base class for multi-factory operations.
 * Manages a collection of sub-factories and delegates operations to them.
 *
 * Subclasses should:
 * 1. Define sub-factory type via generic parameter
 * 2. Implement factory creation logic
 * 3. Define delegated properties
 */
export abstract class MultiGeometryFactory<T extends ComposableFactory> implements Disposable {
  /** Collection of sub-factories */
  protected _factories: T[] = []

  /** Current state */
  protected _state: FactoryState = "idle"

  /** Event handlers */
  protected _onUpdate?: (meshes: CombinedMeshData) => void
  protected _onCommit?: (result: MultiFactoryResult) => void
  protected _onError?: (error: Error) => void

  /** Resources to dispose */
  protected _disposables = new CompositeDisposable()

  /**
   * Name of the multi-factory (for debugging/UI)
   */
  abstract get name(): string

  /**
   * Get the sub-factories
   */
  get factories(): readonly T[] {
    return this._factories
  }

  /**
   * Get the current state
   */
  get state(): FactoryState {
    return this._state
  }

  /**
   * Number of sub-factories
   */
  get count(): number {
    return this._factories.length
  }

  /**
   * Whether any factories exist
   */
  get isEmpty(): boolean {
    return this._factories.length === 0
  }

  /**
   * Whether all sub-factories are valid
   */
  isValid(): boolean {
    return this._factories.length > 0 && this._factories.every((f) => f.isValid())
  }

  /**
   * Add a sub-factory
   */
  protected addFactory(factory: T): void {
    this._factories.push(factory)
    this._disposables.add(factory)
  }

  /**
   * Remove a sub-factory
   */
  protected removeFactory(factory: T): void {
    const index = this._factories.indexOf(factory)
    if (index !== -1) {
      this._factories.splice(index, 1)
      factory.dispose()
    }
  }

  /**
   * Clear all sub-factories
   */
  protected clearFactories(): void {
    for (const factory of this._factories) {
      factory.dispose()
    }
    this._factories = []
  }

  /**
   * Set event handlers
   */
  setEvents(events: {
    onUpdate?: (meshes: CombinedMeshData) => void
    onCommit?: (result: MultiFactoryResult) => void
    onError?: (error: Error) => void
  }): void {
    this._onUpdate = events.onUpdate
    this._onCommit = events.onCommit
    this._onError = events.onError
  }

  /**
   * Update all sub-factories and get combined preview.
   * Updates are performed in parallel.
   */
  update(options: FactoryOptions = {}): CancellablePromise<CombinedMeshData> {
    if (!this.isValid()) {
      return CancellablePromise.rejected(new Error("Multi-factory is not valid"))
    }

    this._state = "updating"

    return new CancellablePromise<CombinedMeshData>((resolve, reject) => {
      const promises = this._factories.map((f) => f.updateWithCache(options))
      Promise.all(promises)
        .then((meshes) => {
          const result: CombinedMeshData = {
            meshes,
            factoryIndices: meshes.map((_, i) => i),
          }

          this._state = "idle"
          this._onUpdate?.(result)
          resolve(result)
        })
        .catch((error) => {
          this._state = "idle"
          const err = error instanceof Error ? error : new Error(String(error))
          this._onError?.(err)
          reject(err)
        })
      return undefined
    })
  }

  /**
   * Commit all sub-factories.
   * Commits are performed in sequence to maintain consistency.
   */
  async commit(options: FactoryOptions = {}): Promise<MultiFactoryResult> {
    if (!this.isValid()) {
      throw new Error("Multi-factory is not valid")
    }

    this._state = "committing"

    const results: FactoryResult[] = []
    let hasError = false
    let errorMessage: string | undefined

    try {
      for (const factory of this._factories) {
        const result = await factory.commit(options)
        results.push(result)
        if (!result.success) {
          hasError = true
          errorMessage = result.error
          break
        }
      }

      const multiResult: MultiFactoryResult = {
        results,
        success: !hasError,
        error: errorMessage,
      }

      this._state = "committed"
      this._onCommit?.(multiResult)
      return multiResult
    } catch (error) {
      this._state = "idle"
      const err = error instanceof Error ? error : new Error(String(error))
      this._onError?.(err)
      throw err
    }
  }

  /**
   * Cancel all sub-factories
   */
  cancel(): void {
    for (const factory of this._factories) {
      factory.cancel()
    }
    this._state = "cancelled"
  }

  /**
   * Get parameters from all sub-factories
   */
  toParams(): Record<string, unknown>[] {
    return this._factories.map((f) => f.toParams())
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clearFactories()
    this._disposables.dispose()
  }
}

// =============================================================================
// PROPERTY DELEGATION UTILITIES
// =============================================================================

/**
 * Options for property delegation
 */
export interface DelegationOptions<T, V> {
  /** Get the value from a sub-factory */
  get?: (factory: T) => V

  /** Set the value on a sub-factory */
  set?: (factory: T, value: V) => void

  /** Reduce values from all sub-factories */
  reduce?: (values: V[]) => V
}

/**
 * Create a delegated property getter.
 * The getter retrieves values from all sub-factories and reduces them.
 *
 * @example
 * ```typescript
 * class MultiFilletFactory extends MultiGeometryFactory<FilletFactory> {
 *   get maxDistance(): number {
 *     return delegatedGetter(this.factories, f => f.maxDistance, Math.min);
 *   }
 * }
 * ```
 */
export function delegatedGetter<T, V>(
  factories: readonly T[],
  getter: (factory: T) => V,
  reducer: (values: V[]) => V
): V {
  const values = factories.map(getter)
  return reducer(values)
}

/**
 * Create a delegated property setter.
 * The setter applies the value to all sub-factories.
 *
 * @example
 * ```typescript
 * class MultiFilletFactory extends MultiGeometryFactory<FilletFactory> {
 *   set distance(value: number) {
 *     delegatedSetter(this.factories, f => f.distance = value);
 *   }
 * }
 * ```
 */
export function delegatedSetter<T, V>(
  factories: T[],
  setter: (factory: T, value: V) => void,
  value: V
): void {
  for (const factory of factories) {
    setter(factory, value)
  }
}

// =============================================================================
// COMMON REDUCERS
// =============================================================================

/**
 * Common reducer functions for delegated properties
 */
export const Reducers = {
  /** Return the first value */
  first: <T>(values: T[]): T => values[0],

  /** Return the last value */
  last: <T>(values: T[]): T => values[values.length - 1],

  /** Return the minimum value */
  min: (values: number[]): number => Math.min(...values),

  /** Return the maximum value */
  max: (values: number[]): number => Math.max(...values),

  /** Return the sum of all values */
  sum: (values: number[]): number => values.reduce((a, b) => a + b, 0),

  /** Return the average of all values */
  average: (values: number[]): number =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,

  /** Return true if all values are true */
  all: (values: boolean[]): boolean => values.every(Boolean),

  /** Return true if any value is true */
  any: (values: boolean[]): boolean => values.some(Boolean),

  /** Flatten arrays */
  flatten: <T>(values: T[][]): T[] => values.flat(),
}
