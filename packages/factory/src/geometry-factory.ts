/**
 * Geometry Factory - CADHY Factory Infrastructure
 *
 * Base class for CAD operations with preview/commit/cancel lifecycle.
 * Based on Plasticity's GeometryFactory pattern for interactive editing.
 *
 * Lifecycle:
 * 1. Create factory with parameters
 * 2. Call update() to generate preview mesh (non-destructive)
 * 3. Modify parameters and call update() again (live preview)
 * 4. Call commit() to finalize the operation in the CAD engine
 * 5. Or call cancel() to discard changes
 *
 * @example
 * ```typescript
 * const factory = new BoxFactory();
 * factory.width = 10;
 * factory.height = 20;
 * factory.depth = 30;
 *
 * const preview = await factory.update(); // Get preview mesh
 * // Display preview in 3D viewer...
 *
 * factory.width = 15; // User changes parameter
 * const newPreview = await factory.update(); // Update preview
 *
 * await factory.commit(); // Finalize in CAD engine
 * // or
 * factory.cancel(); // Discard
 * ```
 */

import { CancellablePromise, CompositeDisposable, type Disposable } from "@cadhy/command"
import type { MeshData } from "@cadhy/types"

/**
 * Factory state during lifecycle
 */
export type FactoryState = "idle" | "updating" | "committing" | "committed" | "cancelled"

/**
 * Result of a factory operation
 */
export interface FactoryResult {
  /** ID of the created/modified shape in the CAD engine */
  shapeId: string
  /** Mesh data for rendering */
  mesh: MeshData
  /** Whether the operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Options for factory operations
 */
export interface FactoryOptions {
  /** AbortSignal for cancellation */
  signal?: AbortSignal
  /** Skip validation (for performance) */
  skipValidation?: boolean
}

/**
 * Events emitted by the factory
 */
export interface FactoryEvents {
  /** Emitted when parameters change */
  onParameterChange?: (factory: GeometryFactory) => void
  /** Emitted when preview is updated */
  onPreviewUpdate?: (mesh: MeshData) => void
  /** Emitted when factory is committed */
  onCommit?: (result: FactoryResult) => void
  /** Emitted when factory is cancelled */
  onCancel?: () => void
  /** Emitted on error */
  onError?: (error: Error) => void
}

/**
 * Abstract base class for geometry factories.
 * Extend this to create specific factories (BoxFactory, ExtrudeFactory, etc.)
 */
export abstract class GeometryFactory implements Disposable {
  /** Current state of the factory */
  protected _state: FactoryState = "idle"

  /** Cached preview mesh from last update() */
  protected _previewMesh: MeshData | null = null

  /** Result shape ID after commit */
  protected _resultShapeId: string | null = null

  /** Event handlers */
  protected _events: FactoryEvents = {}

  /** Resources to dispose */
  protected _disposables = new CompositeDisposable()

  /** Current update promise (for debouncing) */
  private _updatePromise: CancellablePromise<MeshData> | null = null

  /**
   * Name of the factory (for debugging/UI)
   */
  abstract get name(): string

  /**
   * Whether the factory has valid parameters for preview
   */
  abstract isValid(): boolean

  /**
   * Generate a preview mesh (without committing to CAD engine).
   * Override this in subclasses to call the appropriate Tauri preview command.
   */
  protected abstract generatePreview(options: FactoryOptions): Promise<MeshData>

  /**
   * Commit the operation to the CAD engine.
   * Override this in subclasses to call the appropriate Tauri command.
   */
  protected abstract executeCommit(options: FactoryOptions): Promise<FactoryResult>

  /**
   * Get the current state
   */
  get state(): FactoryState {
    return this._state
  }

  /**
   * Get the cached preview mesh
   */
  get previewMesh(): MeshData | null {
    return this._previewMesh
  }

  /**
   * Get the result shape ID (after commit)
   */
  get resultShapeId(): string | null {
    return this._resultShapeId
  }

  /**
   * Whether the factory can be updated
   */
  get canUpdate(): boolean {
    return this._state === "idle" && this.isValid()
  }

  /**
   * Whether the factory can be committed
   */
  get canCommit(): boolean {
    return (this._state === "idle" || this._state === "updating") && this.isValid()
  }

  /**
   * Set event handlers
   */
  setEvents(events: FactoryEvents): void {
    this._events = { ...this._events, ...events }
  }

  /**
   * Update the preview mesh.
   * This generates a new preview based on current parameters.
   * Cancels any pending update.
   */
  update(options: FactoryOptions = {}): CancellablePromise<MeshData> {
    // Cancel any pending update
    if (this._updatePromise) {
      this._updatePromise.cancel()
    }

    if (!this.isValid()) {
      return CancellablePromise.rejected(new Error("Factory parameters are invalid"))
    }

    this._state = "updating"

    this._updatePromise = new CancellablePromise<MeshData>((resolve, reject) => {
      this.generatePreview(options)
        .then((mesh) => {
          this._previewMesh = mesh
          this._state = "idle"
          this._events.onPreviewUpdate?.(mesh)
          resolve(mesh)
        })
        .catch((error) => {
          this._state = "idle"
          const err = error instanceof Error ? error : new Error(String(error))
          this._events.onError?.(err)
          reject(err)
        })
      return undefined
    })

    return this._updatePromise
  }

  /**
   * Update with caching - only regenerates if parameters changed.
   * Uses a hash of parameters to detect changes.
   */
  protected _lastParamsHash: string | null = null

  updateWithCache(options: FactoryOptions = {}): CancellablePromise<MeshData> {
    const currentHash = this.getParamsHash()

    if (currentHash === this._lastParamsHash && this._previewMesh) {
      return CancellablePromise.resolved(this._previewMesh)
    }

    this._lastParamsHash = currentHash
    return this.update(options)
  }

  /**
   * Get a hash of current parameters for caching.
   * Override in subclasses for custom hashing.
   */
  protected getParamsHash(): string {
    return JSON.stringify(this.toParams())
  }

  /**
   * Convert factory parameters to a plain object.
   * Used for serialization and Tauri command calls.
   */
  abstract toParams(): Record<string, unknown>

  /**
   * Commit the operation to the CAD engine.
   * After commit, the factory cannot be updated again.
   */
  async commit(options: FactoryOptions = {}): Promise<FactoryResult> {
    if (!this.canCommit) {
      throw new Error(`Cannot commit factory in state: ${this._state}`)
    }

    // Cancel any pending update
    if (this._updatePromise) {
      this._updatePromise.cancel()
      this._updatePromise = null
    }

    this._state = "committing"

    try {
      const result = await this.executeCommit(options)
      this._state = "committed"
      this._resultShapeId = result.shapeId
      this._events.onCommit?.(result)
      return result
    } catch (error) {
      this._state = "idle"
      const err = error instanceof Error ? error : new Error(String(error))
      this._events.onError?.(err)
      throw err
    }
  }

  /**
   * Cancel the factory, discarding any changes.
   */
  cancel(): void {
    if (this._updatePromise) {
      this._updatePromise.cancel()
      this._updatePromise = null
    }

    this._state = "cancelled"
    this._previewMesh = null
    this._events.onCancel?.()
  }

  /**
   * Reset the factory to initial state.
   * Can be used to start a new operation.
   */
  reset(): void {
    this.cancel()
    this._state = "idle"
    this._resultShapeId = null
    this._lastParamsHash = null
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cancel()
    this._disposables.dispose()
  }

  /**
   * Notify that a parameter has changed.
   * Call this in parameter setters.
   */
  protected notifyParameterChange(): void {
    this._events.onParameterChange?.(this)
  }
}

/**
 * Abstract factory with position/transform support.
 * Extend this for factories that create positioned geometry.
 */
export abstract class PositionedGeometryFactory extends GeometryFactory {
  private _x = 0
  private _y = 0
  private _z = 0

  get x(): number {
    return this._x
  }
  set x(value: number) {
    this._x = value
    this.notifyParameterChange()
  }

  get y(): number {
    return this._y
  }
  set y(value: number) {
    this._y = value
    this.notifyParameterChange()
  }

  get z(): number {
    return this._z
  }
  set z(value: number) {
    this._z = value
    this.notifyParameterChange()
  }

  setPosition(x: number, y: number, z: number): void {
    this._x = x
    this._y = y
    this._z = z
    this.notifyParameterChange()
  }

  override toParams(): Record<string, unknown> {
    return {
      x: this._x,
      y: this._y,
      z: this._z,
    }
  }
}
