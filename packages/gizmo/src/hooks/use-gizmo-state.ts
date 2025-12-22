/**
 * useGizmoState Hook
 *
 * React hook that wraps the state machines from @cadhy/command
 * for use with React Three Fiber gizmos.
 *
 * @example
 * ```tsx
 * const { value, setValue, start, commit, revert } = useGizmoState({
 *   type: 'magnitude',
 *   initialValue: 10,
 *   min: 0,
 *   max: 100,
 *   onCommit: (v) => console.log('Committed:', v),
 * });
 * ```
 */

import {
  AngleStateMachine,
  MagnitudeStateMachine,
  type Quat,
  QuaternionStateMachine,
  type Vec3,
  VectorStateMachine,
} from "@cadhy/command/state-machine"
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react"

// ============================================================================
// Types
// ============================================================================

export interface UseGizmoStateOptionsBase<T> {
  /** Initial value */
  initialValue: T
  /** Callback when value changes */
  onChange?: (value: T) => void
  /** Callback when value is committed */
  onCommit?: (value: T) => void
  /** Callback when value is reverted */
  onRevert?: (value: T) => void
}

export interface UseMagnitudeStateOptions extends UseGizmoStateOptionsBase<number> {
  type: "magnitude"
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
}

export interface UseAngleStateOptions extends UseGizmoStateOptionsBase<number> {
  type: "angle"
  /** Minimum angle in radians */
  min?: number
  /** Maximum angle in radians */
  max?: number
}

export interface UseVectorStateOptions extends UseGizmoStateOptionsBase<Vec3> {
  type: "vector"
}

export interface UseQuaternionStateOptions extends UseGizmoStateOptionsBase<Quat> {
  type: "quaternion"
}

export type UseGizmoStateOptions =
  | UseMagnitudeStateOptions
  | UseAngleStateOptions
  | UseVectorStateOptions
  | UseQuaternionStateOptions

export interface UseGizmoStateReturn<T> {
  /** Current value */
  value: T
  /** Original value (before interaction) */
  originalValue: T
  /** Whether currently interacting */
  isInteracting: boolean
  /** Whether value has changed from original */
  hasChanged: boolean
  /** Set the current value */
  setValue: (value: T) => void
  /** Start interaction */
  start: () => void
  /** Commit the current value */
  commit: () => void
  /** Revert to original value */
  revert: () => void
  /** Reset to a new value */
  reset: (value: T) => void
  /** The underlying state machine (for advanced use) */
  stateMachine:
    | MagnitudeStateMachine
    | AngleStateMachine
    | VectorStateMachine
    | QuaternionStateMachine
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing gizmo state with automatic state machine selection
 */
export function useGizmoState(options: UseMagnitudeStateOptions): UseGizmoStateReturn<number>
export function useGizmoState(options: UseAngleStateOptions): UseGizmoStateReturn<number>
export function useGizmoState(options: UseVectorStateOptions): UseGizmoStateReturn<Vec3>
export function useGizmoState(options: UseQuaternionStateOptions): UseGizmoStateReturn<Quat>
export function useGizmoState<T extends number | Vec3 | Quat>(
  options: UseGizmoStateOptions
): UseGizmoStateReturn<T> {
  // Create state machine based on type
  const stateMachine = useMemo(() => {
    switch (options.type) {
      case "magnitude": {
        const sm = new MagnitudeStateMachine(options.initialValue)
        sm.min = options.min ?? Number.NEGATIVE_INFINITY
        sm.max = options.max ?? Number.POSITIVE_INFINITY
        return sm
      }
      case "angle": {
        const sm = new AngleStateMachine(options.initialValue)
        sm.min = options.min ?? Number.NEGATIVE_INFINITY
        sm.max = options.max ?? Number.POSITIVE_INFINITY
        return sm
      }
      case "vector":
        return new VectorStateMachine(options.initialValue)
      case "quaternion":
        return new QuaternionStateMachine(options.initialValue)
    }
  }, [
    options.initialValue,
    "max" in options ? options.max : undefined,
    "min" in options ? options.min : undefined,
    options.type,
  ]) // Only create once

  // Version counter for triggering re-renders
  const versionRef = useRef(0)
  const listenersRef = useRef(new Set<() => void>())

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  // Notify all listeners of state change
  const notifyChange = useCallback(() => {
    versionRef.current++
    for (const listener of listenersRef.current) {
      listener()
    }
  }, [])

  // Get current snapshot
  const getSnapshot = useCallback(() => versionRef.current, [])

  // Use sync external store to track changes
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Actions
  const setValue = useCallback(
    (value: number | Vec3 | Quat) => {
      stateMachine.current = value as never
      options.onChange?.(value as never)
      notifyChange()
    },
    [stateMachine, options.onChange, notifyChange]
  )

  const start = useCallback(() => {
    stateMachine.start()
    notifyChange()
  }, [stateMachine, notifyChange])

  const commit = useCallback(() => {
    const value = stateMachine.current
    stateMachine.push()
    options.onCommit?.(value as never)
    notifyChange()
  }, [stateMachine, options.onCommit, notifyChange])

  const revert = useCallback(() => {
    const originalValue = stateMachine.original
    stateMachine.revert()
    options.onRevert?.(originalValue as never)
    notifyChange()
  }, [stateMachine, options.onRevert, notifyChange])

  const reset = useCallback(
    (value: number | Vec3 | Quat) => {
      stateMachine.reset(value as never)
      notifyChange()
    },
    [stateMachine, notifyChange]
  )

  return {
    value: stateMachine.current,
    originalValue: stateMachine.original,
    isInteracting: stateMachine.isInteracting,
    hasChanged: stateMachine.hasChanged,
    setValue,
    start,
    commit,
    revert,
    reset,
    stateMachine,
  } as unknown as UseGizmoStateReturn<T>
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for magnitude (scalar) values
 */
export function useMagnitudeState(
  initialValue: number,
  options?: {
    min?: number
    max?: number
    onChange?: (value: number) => void
    onCommit?: (value: number) => void
    onRevert?: (value: number) => void
  }
): UseGizmoStateReturn<number> {
  return useGizmoState({
    type: "magnitude",
    initialValue,
    ...options,
  })
}

/**
 * Hook for angle values (in radians)
 */
export function useAngleState(
  initialValue: number,
  options?: {
    min?: number
    max?: number
    onChange?: (value: number) => void
    onCommit?: (value: number) => void
    onRevert?: (value: number) => void
  }
): UseGizmoStateReturn<number> {
  return useGizmoState({
    type: "angle",
    initialValue,
    ...options,
  })
}

/**
 * Hook for 3D vector values
 */
export function useVectorState(
  initialValue: Vec3 = { x: 0, y: 0, z: 0 },
  options?: {
    onChange?: (value: Vec3) => void
    onCommit?: (value: Vec3) => void
    onRevert?: (value: Vec3) => void
  }
): UseGizmoStateReturn<Vec3> {
  return useGizmoState({
    type: "vector",
    initialValue,
    ...options,
  })
}

/**
 * Hook for quaternion values
 */
export function useQuaternionState(
  initialValue: Quat = { x: 0, y: 0, z: 0, w: 1 },
  options?: {
    onChange?: (value: Quat) => void
    onCommit?: (value: Quat) => void
    onRevert?: (value: Quat) => void
  }
): UseGizmoStateReturn<Quat> {
  return useGizmoState({
    type: "quaternion",
    initialValue,
    ...options,
  })
}
