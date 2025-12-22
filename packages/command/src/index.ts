/**
 * @cadhy/command - Command Infrastructure for CADHY
 *
 * This package provides the core infrastructure for CAD commands, gizmos, and pickers.
 * Based on patterns from Plasticity's command system.
 *
 * ## Core Components
 *
 * ### CancellablePromise
 * A Promise extension that supports cancellation, interruption, and forced completion.
 * Use for all async CAD operations that the user can cancel.
 *
 * ### Value State Machines
 * Track gizmo values with rollback support:
 * - `MagnitudeStateMachine` - Scalar values (distances, angles)
 * - `VectorStateMachine` - 3D positions
 * - `QuaternionStateMachine` - Rotations
 * - `AngleStateMachine` - Angle values with degree/radian conversion
 *
 * ### Executable Pattern
 * Interface for operations that report progress via callback and return a final result.
 *
 * ### Disposable Pattern
 * Resource cleanup for gizmos, helpers, and subscriptions.
 *
 * @example
 * ```typescript
 * import {
 *   CancellablePromise,
 *   MagnitudeStateMachine,
 *   CompositeDisposable,
 * } from '@cadhy/command';
 *
 * // Create a cancellable operation
 * const promise = new CancellablePromise<number>((resolve) => {
 *   const timer = setTimeout(() => resolve(42), 1000);
 *   return () => clearTimeout(timer);
 * });
 *
 * // Track a gizmo value
 * const state = new MagnitudeStateMachine(10);
 * state.start();
 * state.current = 15;
 * state.push(); // Commit
 *
 * // Manage resources
 * const disposables = new CompositeDisposable();
 * disposables.add(gizmo1, gizmo2);
 * disposables.dispose(); // Clean up all
 * ```
 *
 * @packageDocumentation
 */

// CancellablePromise
export {
  CancelError,
  type CancellableExecutor,
  CancellablePromise,
  InterruptError,
  isCancelError,
  isCancellationError,
  isInterruptError,
} from "./cancellable-promise"
// Disposable
export {
  CompositeDisposable,
  type Disposable,
  DisposableValue,
  disposableAbortController,
  disposableEventListener,
  disposableInterval,
  disposableTimeout,
  isDisposable,
  resource,
  toDisposable,
  withDisposable,
} from "./disposable"

// Executable
export {
  createExecutable,
  type Executable,
  type ExecutableOptions,
  type ExecutionContext,
  parallelExecutables,
  sequenceExecutables,
} from "./executable"
// State Machines
export {
  AbstractValueStateMachine,
  AngleStateMachine,
  createStateMachine,
  MagnitudeStateMachine,
  type Quat,
  QuaternionStateMachine,
  type Vec3,
  VectorStateMachine,
} from "./state-machine"
