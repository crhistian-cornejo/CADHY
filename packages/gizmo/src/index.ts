/**
 * @cadhy/gizmo
 *
 * Interactive 3D gizmo system for CADHY CAD application.
 * Based on Plasticity's gizmo architecture adapted for React Three Fiber.
 *
 * ## Features
 *
 * - **Primitive Gizmos**: DistanceGizmo, AngleGizmo, LengthGizmo, PointGizmo
 * - **Composite Gizmos**: Group multiple gizmos together
 * - **State Management**: Built-in state machines for value tracking
 * - **Visual Helpers**: NumberHelper, AxisHelper, DimensionHelper
 * - **Keyboard Input**: Type values directly during interaction
 *
 * ## Usage
 *
 * ```tsx
 * import { DistanceGizmo, AngleGizmo, CompositeGizmo } from '@cadhy/gizmo'
 *
 * function MyComponent() {
 *   const [distance, setDistance] = useState(1)
 *
 *   return (
 *     <DistanceGizmo
 *       origin={[0, 0, 0]}
 *       direction={[1, 0, 0]}
 *       value={distance}
 *       onChange={setDistance}
 *       onCommit={(value) => console.log('Committed:', value)}
 *     />
 *   )
 * }
 * ```
 *
 * @packageDocumentation
 */

export type {
  AbstractGizmoProps,
  GizmoContextValue,
  GizmoHandleProps,
} from "./base"
// Base
export {
  AbstractGizmo,
  GizmoColors,
  GizmoHandle,
  getGizmoColor,
  useGizmoContext,
} from "./base"
export type { BoxGizmoProps, CompositeGizmoContextValue } from "./composites"
// Composites
export {
  BoxGizmo,
  CompositeGizmo,
  useCompositeChild,
  useCompositeGizmoContext,
} from "./composites"
// Helpers
export { AxisHelper, DimensionHelper, NumberHelper } from "./helpers"
// Hooks
export { useGizmoDrag, useGizmoState } from "./hooks"

// Primitives
export { AngleGizmo, DistanceGizmo, LengthGizmo, PointGizmo } from "./primitives"
// Types
export type {
  AngleGizmoProps,
  AxisHelperProps,
  CompositeGizmoChild,
  CompositeGizmoProps,
  DimensionHelperProps,
  DistanceGizmoProps,
  GizmoAxis,
  GizmoBaseProps,
  GizmoChangeEvent,
  GizmoEndEvent,
  GizmoEventBase,
  GizmoInputMode,
  GizmoIntersection,
  GizmoMovementInfo,
  GizmoStartEvent,
  GizmoState,
  GizmoStyle,
  MagnitudeGizmoProps,
  NumberHelperProps,
  PointGizmoProps,
  UseGizmoDragOptions,
  UseGizmoDragReturn,
  UseGizmoStateOptions,
  UseGizmoStateReturn,
} from "./types"
export { defaultGizmoStyle } from "./types"
