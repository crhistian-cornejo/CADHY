// Geometry types - Vec3, Plane, BBox

export interface Vec2 {
  x: number
  y: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Plane {
  origin: Vec3
  normal: Vec3
}

export interface BBox {
  min: Vec3
  max: Vec3
}

export interface Transform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}
