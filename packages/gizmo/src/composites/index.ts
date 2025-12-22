/**
 * Composite Gizmos
 *
 * Container components for grouping multiple gizmos:
 * - CompositeGizmo: Base container for grouping gizmos
 * - BoxGizmo: Pre-built composite for box dimensions
 *
 * Hooks:
 * - useCompositeGizmoContext: Access composite context
 * - useCompositeChild: Register child gizmo with composite
 */

export type { BoxGizmoProps, CompositeGizmoContextValue } from "./CompositeGizmo"
export {
  BoxGizmo,
  CompositeGizmo,
  useCompositeChild,
  useCompositeGizmoContext,
} from "./CompositeGizmo"
