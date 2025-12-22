/**
 * Value State Machines - CADHY Command Infrastructure
 *
 * State machines for tracking gizmo values with rollback support.
 * Based on Plasticity's MagnitudeStateMachine, VectorStateMachine, and QuaternionStateMachine.
 *
 * These are used by gizmos to:
 * - Track the current value during interaction
 * - Store the original value for rollback on cancel
 * - Push commits when the user finalizes an operation
 *
 * @example
 * ```typescript
 * const state = new MagnitudeStateMachine(10);
 * state.start();
 * state.current = 15;  // User drags
 * state.current = 20;  // User drags more
 * state.revert();      // Rollback to 10
 * // or
 * state.push();        // Commit 20 as new original
 * ```
 */

/**
 * Abstract base class for value state machines.
 * Tracks a current value and an original value for rollback.
 */
export abstract class AbstractValueStateMachine<T> {
  protected _current: T
  protected _original: T
  protected _isInteracting = false

  constructor(initialValue: T) {
    this._current = this.clone(initialValue)
    this._original = this.clone(initialValue)
  }

  /**
   * Clone the value (must be implemented for each type)
   */
  protected abstract clone(value: T): T

  /**
   * Compare two values for equality
   */
  protected abstract equals(a: T, b: T): boolean

  /**
   * Get the original value (before interaction started)
   */
  get original(): T {
    return this._original
  }

  /**
   * Set the original value. Also sets current to the same value.
   */
  set original(value: T) {
    this._original = this.clone(value)
    this._current = this.clone(value)
  }

  /**
   * Get the current value
   */
  get current(): T {
    return this._current
  }

  /**
   * Set the current value
   */
  set current(value: T) {
    this._current = this.clone(value)
  }

  /**
   * Whether the state machine is currently in an interaction
   */
  get isInteracting(): boolean {
    return this._isInteracting
  }

  /**
   * Whether the current value differs from the original
   */
  get hasChanged(): boolean {
    return !this.equals(this._current, this._original)
  }

  /**
   * Start an interaction. Stores the current value as the new original.
   */
  start(): void {
    this._isInteracting = true
    this._original = this.clone(this._current)
  }

  /**
   * Push the current value as the new original.
   * Call this when the user commits a change.
   */
  push(): void {
    this._original = this.clone(this._current)
    this._isInteracting = false
  }

  /**
   * Revert the current value to the original.
   * Call this when the user cancels.
   */
  revert(): void {
    this._current = this.clone(this._original)
    this._isInteracting = false
  }

  /**
   * Interrupt the interaction. By default, reverts the value.
   * Override in subclasses if different behavior is needed.
   */
  interrupt(): void {
    this.revert()
  }

  /**
   * Reset to a new value, clearing both current and original.
   */
  reset(value: T): void {
    this._current = this.clone(value)
    this._original = this.clone(value)
    this._isInteracting = false
  }
}

/**
 * State machine for scalar magnitude values (numbers).
 * Supports optional min/max constraints.
 */
export class MagnitudeStateMachine extends AbstractValueStateMachine<number> {
  /** Minimum allowed value */
  min = Number.NEGATIVE_INFINITY

  /** Maximum allowed value */
  max = Number.POSITIVE_INFINITY

  constructor(initialValue = 0) {
    super(initialValue)
  }

  protected clone(value: number): number {
    return value
  }

  protected equals(a: number, b: number): boolean {
    return a === b
  }

  /**
   * Get the current value, clamped to min/max
   */
  override get current(): number {
    return Math.max(this.min, Math.min(this.max, this._current))
  }

  /**
   * Set the current value
   */
  override set current(value: number) {
    this._current = value
  }

  /**
   * Get the delta between current and original
   */
  get delta(): number {
    return this.current - this._original
  }

  /**
   * Add a delta to the current value
   */
  add(delta: number): void {
    this.current = this._current + delta
  }

  /**
   * Multiply the current value by a factor
   */
  multiply(factor: number): void {
    this.current = this._current * factor
  }
}

/**
 * 3D Vector type for VectorStateMachine
 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * State machine for 3D vector values.
 */
export class VectorStateMachine extends AbstractValueStateMachine<Vec3> {
  constructor(initialValue: Vec3 = { x: 0, y: 0, z: 0 }) {
    super(initialValue)
  }

  protected clone(value: Vec3): Vec3 {
    return { x: value.x, y: value.y, z: value.z }
  }

  protected equals(a: Vec3, b: Vec3): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z
  }

  /**
   * Get the delta vector between current and original
   */
  get delta(): Vec3 {
    return {
      x: this._current.x - this._original.x,
      y: this._current.y - this._original.y,
      z: this._current.z - this._original.z,
    }
  }

  /**
   * Get the magnitude of the delta vector
   */
  get deltaMagnitude(): number {
    const d = this.delta
    return Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z)
  }

  /**
   * Add a delta vector to the current value
   */
  add(delta: Vec3): void {
    this.current = {
      x: this._current.x + delta.x,
      y: this._current.y + delta.y,
      z: this._current.z + delta.z,
    }
  }

  /**
   * Set a specific component
   */
  setComponent(component: "x" | "y" | "z", value: number): void {
    this.current = { ...this._current, [component]: value }
  }

  /**
   * Scale the current value by a factor
   */
  scale(factor: number): void {
    this.current = {
      x: this._current.x * factor,
      y: this._current.y * factor,
      z: this._current.z * factor,
    }
  }
}

/**
 * Quaternion type for QuaternionStateMachine
 */
export interface Quat {
  x: number
  y: number
  z: number
  w: number
}

/**
 * State machine for quaternion rotation values.
 */
export class QuaternionStateMachine extends AbstractValueStateMachine<Quat> {
  constructor(initialValue: Quat = { x: 0, y: 0, z: 0, w: 1 }) {
    super(initialValue)
  }

  protected clone(value: Quat): Quat {
    return { x: value.x, y: value.y, z: value.z, w: value.w }
  }

  protected equals(a: Quat, b: Quat): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w
  }

  /**
   * Get the angle of rotation (in radians) represented by the quaternion
   */
  get angle(): number {
    const q = this._current
    return 2 * Math.acos(Math.min(1, Math.max(-1, q.w)))
  }

  /**
   * Get the rotation axis
   */
  get axis(): Vec3 {
    const q = this._current
    const sinHalfAngle = Math.sqrt(1 - q.w * q.w)

    if (sinHalfAngle < 0.0001) {
      return { x: 1, y: 0, z: 0 }
    }

    return {
      x: q.x / sinHalfAngle,
      y: q.y / sinHalfAngle,
      z: q.z / sinHalfAngle,
    }
  }

  /**
   * Create a quaternion from axis-angle representation
   */
  setFromAxisAngle(axis: Vec3, angle: number): void {
    const halfAngle = angle / 2
    const s = Math.sin(halfAngle)

    // Normalize axis
    const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z)
    const nx = axis.x / len
    const ny = axis.y / len
    const nz = axis.z / len

    this.current = {
      x: nx * s,
      y: ny * s,
      z: nz * s,
      w: Math.cos(halfAngle),
    }
  }

  /**
   * Multiply the current quaternion by another (composition)
   */
  multiply(q: Quat): void {
    const a = this._current
    const b = q

    this.current = {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    }
  }

  /**
   * Set to identity rotation
   */
  setIdentity(): void {
    this.current = { x: 0, y: 0, z: 0, w: 1 }
  }
}

/**
 * State machine for angle values (in radians).
 * Extends MagnitudeStateMachine with angle-specific utilities.
 */
export class AngleStateMachine extends MagnitudeStateMachine {
  constructor(initialValue = 0) {
    super(initialValue)
  }

  /**
   * Get the current angle in degrees
   */
  get degrees(): number {
    return (this.current * 180) / Math.PI
  }

  /**
   * Set the current angle in degrees
   */
  set degrees(value: number) {
    this.current = (value * Math.PI) / 180
  }

  /**
   * Normalize the angle to the range [-π, π]
   */
  normalize(): void {
    let angle = this._current
    while (angle > Math.PI) angle -= 2 * Math.PI
    while (angle < -Math.PI) angle += 2 * Math.PI
    this._current = angle
  }

  /**
   * Add an angle delta
   */
  addDegrees(delta: number): void {
    this.add((delta * Math.PI) / 180)
  }
}

/**
 * Factory function to create the appropriate state machine for a value type
 */
export function createStateMachine(value: number): MagnitudeStateMachine
export function createStateMachine(value: Vec3): VectorStateMachine
export function createStateMachine(value: Quat): QuaternionStateMachine
export function createStateMachine(
  value: number | Vec3 | Quat
): MagnitudeStateMachine | VectorStateMachine | QuaternionStateMachine {
  if (typeof value === "number") {
    return new MagnitudeStateMachine(value)
  }

  if ("w" in value) {
    return new QuaternionStateMachine(value)
  }

  return new VectorStateMachine(value)
}
