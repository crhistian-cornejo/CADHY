/**
 * @fileoverview Operator Executor - Handles operator execution
 * @module operators/core
 *
 * Provides utilities for:
 * - Building operator context from scene state
 * - Executing operators with proper lifecycle
 * - Managing modal operator state
 * - Undo integration
 */

import { getOperator, operatorRegistry } from "./OP_registry"
import type {
  OperatorContext,
  OperatorEvent,
  OperatorEventType,
  OperatorEventValue,
  OperatorProperty,
  OperatorReturn,
  OperatorType,
} from "./OP_types"

// ============================================================================
// TYPES
// ============================================================================

interface ModalOperatorState {
  operatorId: string
  props: Record<string, unknown>
  startTime: number
  lastEvent?: OperatorEvent
}

type ContextProvider = () => OperatorContext

// ============================================================================
// STATE
// ============================================================================

let contextProvider: ContextProvider | null = null
let modalOperator: ModalOperatorState | null = null
let undoStack: Array<{ operatorId: string; props: Record<string, unknown>; timestamp: number }> = []

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * Set the context provider function
 * This should be called by the app to provide access to scene state
 */
export function setContextProvider(provider: ContextProvider): void {
  contextProvider = provider
}

/**
 * Get current operator context
 */
export function getOperatorContext(): OperatorContext {
  if (contextProvider) {
    return contextProvider()
  }

  // Default empty context
  return {
    mode: "OBJECT",
    activeObject: null,
    selectedObjects: [],
    selectedVertices: [],
    selectedEdges: [],
    selectedFaces: [],
    activeLayer: "default",
    visibleLayers: ["default"],
    view: "3D",
    viewCamera: {
      position: { x: 0, y: 5, z: 5 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
    },
    time: 0,
    preferences: {
      units: "metric",
      precision: 3,
      gridSize: 1,
    },
  }
}

// ============================================================================
// PROPERTY DEFAULTS
// ============================================================================

/**
 * Get default property values from operator definition
 */
export function getPropertyDefaults(operator: OperatorType): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}

  if (operator.properties) {
    for (const prop of operator.properties) {
      defaults[prop.id] = prop.default
    }
  }

  // Apply context-specific defaults if available
  if (operator.getDefaults) {
    const context = getOperatorContext()
    const contextDefaults = operator.getDefaults(context)
    Object.assign(defaults, contextDefaults)
  }

  return defaults
}

/**
 * Validate property values against definitions
 */
export function validateProperties(
  operator: OperatorType,
  props: Record<string, unknown>
): string[] {
  const errors: string[] = []

  if (!operator.properties) return errors

  for (const propDef of operator.properties) {
    const value = props[propDef.id]

    if (value === undefined && propDef.default === undefined) {
      errors.push(`Missing required property: ${propDef.id}`)
      continue
    }

    // Type-specific validation
    switch (propDef.type) {
      case "int":
      case "float": {
        const numValue = value as number
        const numProp = propDef as { min?: number; max?: number }
        if (numProp.min !== undefined && numValue < numProp.min) {
          errors.push(`${propDef.id}: value ${numValue} is below minimum ${numProp.min}`)
        }
        if (numProp.max !== undefined && numValue > numProp.max) {
          errors.push(`${propDef.id}: value ${numValue} exceeds maximum ${numProp.max}`)
        }
        break
      }
      case "enum": {
        const enumProp = propDef as { items: Array<{ value: string }> }
        const validValues = enumProp.items.map((i) => i.value)
        if (!validValues.includes(value as string)) {
          errors.push(`${propDef.id}: invalid enum value "${value}"`)
        }
        break
      }
    }
  }

  return errors
}

// ============================================================================
// EXECUTION
// ============================================================================

/**
 * Execute an operator by idname
 */
export async function executeOperator(
  idname: string,
  props?: Record<string, unknown>,
  event?: OperatorEvent
): Promise<OperatorReturn> {
  const operator = getOperator(idname)

  if (!operator) {
    return {
      result: "CANCELLED",
      error: `Unknown operator: ${idname}`,
    }
  }

  return executeOperatorType(operator, props, event)
}

/**
 * Execute an operator type directly
 */
export async function executeOperatorType(
  operator: OperatorType,
  props?: Record<string, unknown>,
  event?: OperatorEvent
): Promise<OperatorReturn> {
  const context = getOperatorContext()

  // Check poll
  if (operator.poll && !operator.poll(context)) {
    return {
      result: "CANCELLED",
      error: `Operator ${operator.idname} poll failed - not available in current context`,
    }
  }

  // Merge props with defaults
  const finalProps = {
    ...getPropertyDefaults(operator),
    ...props,
  }

  // Validate properties
  const errors = validateProperties(operator, finalProps)
  if (errors.length > 0) {
    return {
      result: "CANCELLED",
      error: `Property validation failed: ${errors.join(", ")}`,
    }
  }

  // Create default event if not provided
  const operatorEvent: OperatorEvent = event ?? {
    type: "LEFTMOUSE",
    value: "PRESS",
    mouse: { x: 0, y: 0 },
    prevMouse: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    shift: false,
    ctrl: false,
    alt: false,
    osKey: false,
    timestamp: Date.now(),
  }

  try {
    let result: OperatorReturn

    // Try invoke first if available
    if (operator.invoke) {
      result = await operator.invoke(context, operatorEvent, finalProps)

      // If invoke returns RUNNING_MODAL, set up modal state
      if (result.result === "RUNNING_MODAL") {
        modalOperator = {
          operatorId: operator.idname,
          props: finalProps,
          startTime: Date.now(),
          lastEvent: operatorEvent,
        }
        return result
      }

      // If invoke handles everything, return
      if (result.result !== "PASS_THROUGH") {
        return result
      }
    }

    // Execute main logic
    result = await operator.execute(context, finalProps)

    // Add to undo stack if successful and undo is enabled
    if (result.result === "FINISHED" && operator.options.undo) {
      undoStack.push({
        operatorId: operator.idname,
        props: finalProps,
        timestamp: Date.now(),
      })

      // Limit undo stack size
      if (undoStack.length > 100) {
        undoStack = undoStack.slice(-100)
      }
    }

    return result
  } catch (error) {
    console.error(`[OP_Executor] Error executing ${operator.idname}:`, error)
    return {
      result: "CANCELLED",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ============================================================================
// MODAL OPERATORS
// ============================================================================

/**
 * Check if a modal operator is running
 */
export function isModalRunning(): boolean {
  return modalOperator !== null
}

/**
 * Get current modal operator info
 */
export function getModalOperator(): ModalOperatorState | null {
  return modalOperator
}

/**
 * Handle event for modal operator
 */
export async function handleModalEvent(event: OperatorEvent): Promise<OperatorReturn> {
  if (!modalOperator) {
    return { result: "PASS_THROUGH" }
  }

  const operator = getOperator(modalOperator.operatorId)
  if (!operator || !operator.modal) {
    cancelModal()
    return { result: "CANCELLED", error: "Modal operator not found" }
  }

  const context = getOperatorContext()

  try {
    const result = await operator.modal(context, event, modalOperator.props)
    modalOperator.lastEvent = event

    // Handle result
    if (result.result === "FINISHED" || result.result === "CANCELLED") {
      if (result.result === "CANCELLED" && operator.cancel) {
        operator.cancel(context, modalOperator.props)
      }
      modalOperator = null
    }

    return result
  } catch (error) {
    console.error(`[OP_Executor] Modal error:`, error)
    cancelModal()
    return {
      result: "CANCELLED",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Cancel current modal operator
 */
export function cancelModal(): void {
  if (!modalOperator) return

  const operator = getOperator(modalOperator.operatorId)
  if (operator?.cancel) {
    const context = getOperatorContext()
    operator.cancel(context, modalOperator.props)
  }

  modalOperator = null
}

// ============================================================================
// EVENT CONVERSION
// ============================================================================

/**
 * Convert DOM KeyboardEvent to OperatorEvent
 */
export function keyEventToOperatorEvent(
  e: KeyboardEvent,
  mousePos?: { x: number; y: number }
): OperatorEvent {
  return {
    type: keyToOperatorEventType(e.key),
    value: e.type === "keydown" ? "PRESS" : "RELEASE",
    mouse: mousePos ?? { x: 0, y: 0 },
    prevMouse: mousePos ?? { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    osKey: e.metaKey,
    timestamp: e.timeStamp,
  }
}

/**
 * Convert DOM MouseEvent to OperatorEvent
 */
export function mouseEventToOperatorEvent(
  e: MouseEvent,
  prevMouse?: { x: number; y: number }
): OperatorEvent {
  const mouse = { x: e.clientX, y: e.clientY }
  const prev = prevMouse ?? mouse

  let type: OperatorEventType = "MOUSEMOVE"
  let value: OperatorEventValue = "PRESS"

  switch (e.type) {
    case "mousedown":
      type = e.button === 0 ? "LEFTMOUSE" : e.button === 1 ? "MIDDLEMOUSE" : "RIGHTMOUSE"
      value = "PRESS"
      break
    case "mouseup":
      type = e.button === 0 ? "LEFTMOUSE" : e.button === 1 ? "MIDDLEMOUSE" : "RIGHTMOUSE"
      value = "RELEASE"
      break
    case "click":
      type = "LEFTMOUSE"
      value = "CLICK"
      break
    case "dblclick":
      type = "LEFTMOUSE"
      value = "DOUBLE_CLICK"
      break
    case "contextmenu":
      type = "RIGHTMOUSE"
      value = "CLICK"
      break
    case "mousemove":
      type = "MOUSEMOVE"
      break
  }

  return {
    type,
    value,
    mouse,
    prevMouse: prev,
    delta: { x: mouse.x - prev.x, y: mouse.y - prev.y },
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    osKey: e.metaKey,
    timestamp: e.timeStamp,
  }
}

/**
 * Convert key string to OperatorEventType
 */
function keyToOperatorEventType(key: string): OperatorEventType {
  const keyMap: Record<string, OperatorEventType> = {
    Escape: "ESC",
    Enter: "RET",
    " ": "SPACE",
    Tab: "TAB",
    Delete: "DEL",
    Backspace: "BACK",
    "0": "ZERO",
    "1": "ONE",
    "2": "TWO",
    "3": "THREE",
    "4": "FOUR",
    "5": "FIVE",
    "6": "SIX",
    "7": "SEVEN",
    "8": "EIGHT",
    "9": "NINE",
  }

  if (keyMap[key]) return keyMap[key]

  // Single letter keys
  const upper = key.toUpperCase()
  if (upper.length === 1 && upper >= "A" && upper <= "Z") {
    return upper as OperatorEventType
  }

  return "A" // Default fallback
}
