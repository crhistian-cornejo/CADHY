/**
 * @fileoverview Operator Types - Core definitions for Blender-style operators
 * @module operators/core
 *
 * Implements the Blender operator pattern:
 * - poll: Check if operator can run in current context
 * - invoke: Called when operator is invoked (can show UI)
 * - execute: Main operator logic
 * - modal: For interactive operators (mouse tracking, etc.)
 * - cancel: Cleanup on cancel
 */

// ============================================================================
// OPERATOR RESULT
// ============================================================================

/**
 * Result of operator execution
 */
export type OperatorResult =
  | "FINISHED" // Operator completed successfully
  | "CANCELLED" // Operator was cancelled
  | "RUNNING_MODAL" // Operator is running in modal mode
  | "PASS_THROUGH" // Pass event to other operators
  | "INTERFACE" // Operator needs UI interaction

/**
 * Operator return value with optional data
 */
export interface OperatorReturn<T = unknown> {
  result: OperatorResult
  data?: T
  error?: string
}

// ============================================================================
// OPERATOR CONTEXT
// ============================================================================

/**
 * Scene object reference in context
 */
export interface ContextObject {
  id: string
  name: string
  type: string
  backendShapeId?: string
  transform: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    scale: { x: number; y: number; z: number }
  }
}

/**
 * Operator execution context
 * Provides access to scene state, selection, etc.
 */
export interface OperatorContext {
  /** Current edit mode */
  mode: "OBJECT" | "EDIT" | "SCULPT" | "VERTEX_PAINT"

  /** Active (last selected) object */
  activeObject: ContextObject | null

  /** All selected objects */
  selectedObjects: ContextObject[]

  /** Selected vertex indices (edit mode) */
  selectedVertices: number[]

  /** Selected edge indices (edit mode) */
  selectedEdges: number[]

  /** Selected face indices (edit mode) */
  selectedFaces: number[]

  /** Current layer ID */
  activeLayer: string

  /** All visible layers */
  visibleLayers: string[]

  /** Current view type */
  view: "3D" | "2D" | "DRAWING"

  /** Camera position (for view-dependent ops) */
  viewCamera: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    up: { x: number; y: number; z: number }
  }

  /** Scene time (for animation) */
  time: number

  /** User preferences */
  preferences: {
    units: "metric" | "imperial"
    precision: number
    gridSize: number
  }
}

// ============================================================================
// OPERATOR EVENTS
// ============================================================================

/**
 * Event types for modal operators
 */
export type OperatorEventType =
  | "MOUSEMOVE"
  | "LEFTMOUSE"
  | "RIGHTMOUSE"
  | "MIDDLEMOUSE"
  | "WHEELUPMOUSE"
  | "WHEELDOWNMOUSE"
  | "TIMER"
  | "ESC"
  | "RET" // Enter
  | "SPACE"
  | "TAB"
  | "DEL"
  | "BACK" // Backspace
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "ZERO"
  | "ONE"
  | "TWO"
  | "THREE"
  | "FOUR"
  | "FIVE"
  | "SIX"
  | "SEVEN"
  | "EIGHT"
  | "NINE"

export type OperatorEventValue = "PRESS" | "RELEASE" | "CLICK" | "DOUBLE_CLICK"

/**
 * Event passed to modal operators
 */
export interface OperatorEvent {
  type: OperatorEventType
  value: OperatorEventValue

  /** Mouse position */
  mouse: { x: number; y: number }

  /** Previous mouse position */
  prevMouse: { x: number; y: number }

  /** Delta from previous position */
  delta: { x: number; y: number }

  /** Modifier keys */
  shift: boolean
  ctrl: boolean
  alt: boolean
  osKey: boolean // Cmd on Mac, Win on Windows

  /** Timestamp */
  timestamp: number
}

// ============================================================================
// OPERATOR PROPERTIES
// ============================================================================

/**
 * Property types for operator parameters
 */
export type PropertyType =
  | "bool"
  | "int"
  | "float"
  | "string"
  | "enum"
  | "float_vector"
  | "int_vector"
  | "color"

/**
 * Base property definition
 */
export interface PropertyBase {
  /** Property identifier */
  id: string
  /** Display name */
  name: string
  /** Description/tooltip */
  description?: string
  /** Default value */
  default: unknown
  /** Show in UI */
  hidden?: boolean
  /** Read-only */
  readonly?: boolean
  /** Keyboard shortcut for quick input */
  shortcut?: string
}

export interface PropertyBool extends PropertyBase {
  type: "bool"
  default: boolean
}

export interface PropertyInt extends PropertyBase {
  type: "int"
  default: number
  min?: number
  max?: number
  step?: number
  softMin?: number
  softMax?: number
}

export interface PropertyFloat extends PropertyBase {
  type: "float"
  default: number
  min?: number
  max?: number
  step?: number
  precision?: number
  softMin?: number
  softMax?: number
  unit?: string
  subtype?: "distance" | "angle" | "factor" | "percentage" | "none"
}

export interface PropertyString extends PropertyBase {
  type: "string"
  default: string
  maxLength?: number
  subtype?: "file_path" | "dir_path" | "none"
}

export interface PropertyEnum extends PropertyBase {
  type: "enum"
  default: string
  items: Array<{
    value: string
    name: string
    description?: string
    icon?: string
  }>
}

export interface PropertyFloatVector extends PropertyBase {
  type: "float_vector"
  default: number[]
  size: 2 | 3 | 4
  min?: number
  max?: number
  unit?: string
  subtype?: "translation" | "rotation" | "scale" | "color" | "none"
}

export interface PropertyIntVector extends PropertyBase {
  type: "int_vector"
  default: number[]
  size: 2 | 3 | 4
  min?: number
  max?: number
}

export interface PropertyColor extends PropertyBase {
  type: "color"
  default: [number, number, number, number]
  hasAlpha?: boolean
}

export type OperatorProperty =
  | PropertyBool
  | PropertyInt
  | PropertyFloat
  | PropertyString
  | PropertyEnum
  | PropertyFloatVector
  | PropertyIntVector
  | PropertyColor

// ============================================================================
// OPERATOR DEFINITION
// ============================================================================

/**
 * Operator flags
 */
export interface OperatorFlags {
  /** Register for undo/redo */
  register?: boolean
  /** Add to undo stack */
  undo?: boolean
  /** Show in operator search */
  internalUseOnly?: boolean
  /** Block input while running */
  blocking?: boolean
  /** Macro operator (contains sub-operators) */
  macro?: boolean
  /** Preset operator */
  preset?: boolean
}

/**
 * Keymap entry for operator
 */
export interface OperatorKeymap {
  key: string
  shift?: boolean
  ctrl?: boolean
  alt?: boolean
  osKey?: boolean
}

/**
 * Menu entry for operator
 */
export interface OperatorMenu {
  category: string
  name?: string
  icon?: string
}

/**
 * Complete operator definition
 */
export interface OperatorType<TProps extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique operator identifier (CATEGORY_OT_name) */
  idname: string

  /** Display label */
  label: string

  /** Description/tooltip */
  description?: string

  /** Icon name */
  icon?: string

  /** Operator options */
  options: OperatorFlags

  /** Properties/parameters */
  properties?: OperatorProperty[]

  /** Keymap binding */
  keymap?: OperatorKeymap

  /** Menu entry */
  menu?: OperatorMenu

  // Operator functions

  /**
   * Poll function - check if operator can run
   * Return true if operator is available in current context
   */
  poll?: (context: OperatorContext) => boolean

  /**
   * Invoke function - called when operator is invoked
   * Can show UI, gather input, then call execute or start modal
   */
  invoke?: (
    context: OperatorContext,
    event: OperatorEvent,
    props: TProps
  ) => Promise<OperatorReturn>

  /**
   * Execute function - main operator logic
   * Called directly or after invoke gathers parameters
   */
  execute: (context: OperatorContext, props: TProps) => Promise<OperatorReturn>

  /**
   * Modal function - for interactive operators
   * Called repeatedly while operator is running
   */
  modal?: (context: OperatorContext, event: OperatorEvent, props: TProps) => Promise<OperatorReturn>

  /**
   * Cancel function - cleanup when operator is cancelled
   */
  cancel?: (context: OperatorContext, props: TProps) => void

  /**
   * Draw function - custom UI in operator panel
   */
  drawUI?: (props: TProps, onChange: (id: string, value: unknown) => void) => React.ReactNode

  /**
   * Get property defaults based on context
   */
  getDefaults?: (context: OperatorContext) => Partial<TProps>
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Extract props type from operator definition
 */
export type OperatorProps<T extends OperatorType> =
  T extends OperatorType<infer P> ? P : Record<string, unknown>

/**
 * Create a typed operator
 */
export function defineOperator<TProps extends Record<string, unknown>>(
  op: OperatorType<TProps>
): OperatorType<TProps> {
  return op
}
