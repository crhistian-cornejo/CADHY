// CAD types - Shape, Operation

import type { BBox, Transform } from "./geometry"
import type { MeshData } from "./mesh"

export type ShapeType = "box" | "cylinder" | "sphere" | "cone" | "torus" | "compound"

export interface Shape {
  id: string
  name: string
  type: ShapeType
  transform: Transform
  mesh?: MeshData
  bbox?: BBox
  visible: boolean
  selected: boolean
}

export type OperationType = "extrude" | "revolve" | "loft" | "sweep"

export interface Operation {
  id: string
  type: OperationType
  sourceShapeId: string
  parameters: Record<string, unknown>
}

export type BooleanType = "union" | "cut" | "intersect"

export interface BooleanOperation {
  id: string
  type: BooleanType
  targetShapeId: string
  toolShapeId: string
}

export type ModifierType = "fillet" | "chamfer" | "shell"

export interface Modifier {
  id: string
  type: ModifierType
  shapeId: string
  parameters: Record<string, unknown>
}

// Primitive parameters
export interface BoxParams {
  width: number
  height: number
  depth: number
}

export interface CylinderParams {
  radius: number
  height: number
}

export interface SphereParams {
  radius: number
}

export interface ConeParams {
  bottomRadius: number
  topRadius: number
  height: number
}

export interface TorusParams {
  majorRadius: number
  minorRadius: number
}
