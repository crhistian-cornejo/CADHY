// Mesh types - MeshData, FaceInfo

import type { Vec3 } from "./geometry"

export interface MeshData {
  vertices: Float32Array
  normals?: Float32Array
  indices: Uint32Array
  uvs?: Float32Array
}

export interface FaceInfo {
  id: string
  vertexCount: number
  normal: Vec3
  area: number
}

export interface EdgeInfo {
  id: string
  startVertex: Vec3
  endVertex: Vec3
  length: number
}
