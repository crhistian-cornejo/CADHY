/**
 * @fileoverview Modifiers System - Non-destructive geometry editing
 * @module core/modifiers
 *
 * Blender-inspired modifier system for CADHY.
 * Modifiers are stacked and evaluated in order to produce final geometry.
 *
 * Key concepts:
 * - ModifierStack: Ordered list of modifiers for an object
 * - Modifier: Individual operation (array, mirror, boolean, etc.)
 * - Evaluator: Executes modifiers using C++/Rust backend
 * - Store: Zustand state management for modifiers
 */

// Evaluator
export { evaluateModifierStack, previewModifier, validateModifier } from "./MOD_evaluator"
// Store
export {
  useModifierPanelOpen,
  useModifierStack,
  useModifierStore,
  useModifiers,
  useSelectedModifier,
} from "./MOD_store"
// Types
export * from "./MOD_types"
