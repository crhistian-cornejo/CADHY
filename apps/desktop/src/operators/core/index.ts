/**
 * @fileoverview Operator Core System
 * @module operators/core
 *
 * Blender-inspired operator infrastructure for CADHY.
 *
 * Key concepts:
 * - OperatorType: Definition of an operator (poll/invoke/execute/modal)
 * - OperatorContext: Current scene state available to operators
 * - OperatorEvent: Input events for modal operators
 * - OperatorRegistry: Central registration and lookup
 * - Executor: Handles operator lifecycle and execution
 */

// Executor
export {
  cancelModal,
  executeOperator,
  executeOperatorType,
  getModalOperator,
  getOperatorContext,
  getPropertyDefaults,
  handleModalEvent,
  isModalRunning,
  keyEventToOperatorEvent,
  mouseEventToOperatorEvent,
  setContextProvider,
  validateProperties,
} from "./OP_executor"

// Registry
export {
  getOperator,
  getOperatorsByCategory,
  operatorRegistry,
  registerOperator,
  registerOperators,
  searchOperators,
  unregisterOperator,
} from "./OP_registry"
// Types
export * from "./OP_types"
