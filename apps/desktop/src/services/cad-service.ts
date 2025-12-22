/**
 * CAD Service - CADHY
 *
 * Provides access to OpenCASCADE-based CAD operations through Tauri commands.
 * This service enables creating, manipulating, and exporting 3D geometry.
 *
 * The backend maintains a shape registry where each shape is stored with a
 * unique ID. This ID is used to reference shapes in subsequent operations.
 */

import { logger } from "@cadhy/shared/logger"
import { invoke } from "@tauri-apps/api/core"

// ============================================================================
// TYPES - Shape Results
// ============================================================================

/**
 * Bounding box for a shape
 */
export interface BoundingBox {
  min: [number, number, number]
  max: [number, number, number]
}

/**
 * Shape analysis information
 */
export interface ShapeAnalysis {
  is_valid: boolean
  num_vertices: number
  num_edges: number
  num_faces: number
  num_solids: number
  surface_area: number
  volume: number
  bounding_box: BoundingBox | null
}

/**
 * Result of creating or modifying a shape
 */
export interface ShapeResult {
  /** Unique shape ID for referencing in subsequent operations */
  id: string
  /** Shape analysis information */
  analysis: ShapeAnalysis
}

/**
 * Mesh data from tessellation, ready for Three.js rendering
 */
export interface CadMeshData {
  /** Vertices as flat array [x1, y1, z1, x2, y2, z2, ...] */
  vertices: number[]
  /** Triangle indices as flat array [i1, i2, i3, ...] */
  indices: number[]
  /** Normals as flat array (if available) */
  normals: number[] | null
  /** Number of vertices */
  vertex_count: number
  /** Number of triangles */
  triangle_count: number
}

// ============================================================================
// PRIMITIVE SHAPES
// ============================================================================

/**
 * Create a box with given dimensions at origin
 */
export async function createBox(
  width: number,
  depth: number,
  height: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_box", { width, depth, height })
}

/**
 * Create a box at a specific position
 */
export async function createBoxAt(
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  height: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_box_at", { x, y, z, width, depth, height })
}

/**
 * Create a cylinder with given radius and height
 */
export async function createCylinder(radius: number, height: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_cylinder", { radius, height })
}

/**
 * Create a cylinder at a specific position with custom axis
 */
export async function createCylinderAt(
  x: number,
  y: number,
  z: number,
  axisX: number,
  axisY: number,
  axisZ: number,
  radius: number,
  height: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_cylinder_at", {
    x,
    y,
    z,
    axis_x: axisX,
    axis_y: axisY,
    axis_z: axisZ,
    radius,
    height,
  })
}

/**
 * Create a sphere with given radius
 */
export async function createSphere(radius: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_sphere", { radius })
}

/**
 * Create a sphere at a specific position
 */
export async function createSphereAt(
  x: number,
  y: number,
  z: number,
  radius: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_sphere_at", { x, y, z, radius })
}

/**
 * Create a cone or truncated cone
 */
export async function createCone(
  baseRadius: number,
  topRadius: number,
  height: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_cone", {
    base_radius: baseRadius,
    top_radius: topRadius,
    height,
  })
}

/**
 * Create a torus (donut shape)
 */
export async function createTorus(majorRadius: number, minorRadius: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_torus", {
    major_radius: majorRadius,
    minor_radius: minorRadius,
  })
}

/**
 * Create a wedge (tapered box)
 */
export async function createWedge(
  dx: number,
  dy: number,
  dz: number,
  ltx: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_wedge", { dx, dy, dz, ltx })
}

/**
 * Create a pyramid (square base tapering to a point)
 * @param x, y, z - Base dimensions (width, depth, height)
 * @param px, py, pz - Base center position
 * @param dx, dy, dz - Normal direction (apex direction)
 */
export async function createPyramid(
  x: number,
  y: number,
  z: number,
  px: number,
  py: number,
  pz: number,
  dx: number,
  dy: number,
  dz: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_pyramid", { x, y, z, px, py, pz, dx, dy, dz })
}

/**
 * Create an ellipsoid (3D ellipse with different radii)
 * @param cx, cy, cz - Center position
 * @param rx, ry, rz - Radii along X, Y, Z axes
 */
export async function createEllipsoid(
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_ellipsoid", { cx, cy, cz, rx, ry, rz })
}

/**
 * Create a vertex (point)
 * @param x, y, z - Point position
 */
export async function createVertex(x: number, y: number, z: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_vertex", { x, y, z })
}

/**
 * Create a helix (spiral wire)
 * @param radius - Helix radius
 * @param pitch - Distance between turns
 * @param height - Total height of helix
 * @param clockwise - Direction of rotation
 */
export async function createHelix(
  radius: number,
  pitch: number,
  height: number,
  clockwise: boolean
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_helix", { radius, pitch, height, clockwise })
}

// ============================================================================
// BOOLEAN OPERATIONS
// ============================================================================

/**
 * Boolean union (fuse) of two shapes
 * Creates a new shape that is the union of both shapes
 */
export async function booleanFuse(shape1Id: string, shape2Id: string): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_boolean_fuse", {
    shape1_id: shape1Id,
    shape2_id: shape2Id,
  })
}

/**
 * Boolean difference (cut) - subtract shape2 from shape1
 * Creates a new shape that is shape1 minus shape2
 */
export async function booleanCut(shape1Id: string, shape2Id: string): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_boolean_cut", {
    shape1_id: shape1Id,
    shape2_id: shape2Id,
  })
}

/**
 * Boolean intersection (common) of two shapes
 * Creates a new shape that is the intersection of both shapes
 */
export async function booleanCommon(shape1Id: string, shape2Id: string): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_boolean_common", {
    shape1_id: shape1Id,
    shape2_id: shape2Id,
  })
}

// ============================================================================
// MODIFICATION OPERATIONS
// ============================================================================

/**
 * Apply fillet (rounded edges) to all edges of a shape
 */
export async function fillet(shapeId: string, radius: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_fillet", { shape_id: shapeId, radius })
}

/**
 * Apply fillet to specific edges (RECOMMENDED - more reliable than filleting all edges)
 * @param shapeId - Shape to fillet
 * @param edgeIndices - Array of edge indices to fillet (0-based)
 * @param radii - Array of radii for each edge (must match edgeIndices length, or single value for all)
 */
export async function filletEdges(
  shapeId: string,
  edgeIndices: number[],
  radii: number[]
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_fillet_edges", {
    shape_id: shapeId,
    edge_indices: edgeIndices,
    radii,
  })
}

/**
 * Apply chamfer (beveled edges) to all edges of a shape
 */
export async function chamfer(shapeId: string, distance: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_chamfer", { shape_id: shapeId, distance })
}

/**
 * Apply chamfer to specific edges
 * @param shapeId - Shape to chamfer
 * @param edgeIndices - Array of edge indices to chamfer (0-based)
 * @param distances - Array of distances for each edge (must match edgeIndices length, or single value for all)
 */
export async function chamferEdges(
  shapeId: string,
  edgeIndices: number[],
  distances: number[]
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_chamfer_edges", {
    shape_id: shapeId,
    edge_indices: edgeIndices,
    distances,
  })
}

/**
 * Create a shell (hollow solid) from a shape
 */
export async function shell(shapeId: string, thickness: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_shell", { shape_id: shapeId, thickness })
}

// ============================================================================
// TRANSFORM OPERATIONS
// ============================================================================

/**
 * Translate (move) a shape by a vector
 */
export async function translate(
  shapeId: string,
  dx: number,
  dy: number,
  dz: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_translate", { shape_id: shapeId, dx, dy, dz })
}

/**
 * Rotate a shape around an axis
 * @param shapeId - Shape to rotate
 * @param originX, originY, originZ - Point on the rotation axis
 * @param axisX, axisY, axisZ - Direction of the rotation axis
 * @param angleRadians - Rotation angle in radians
 */
export async function rotate(
  shapeId: string,
  originX: number,
  originY: number,
  originZ: number,
  axisX: number,
  axisY: number,
  axisZ: number,
  angleRadians: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_rotate", {
    shape_id: shapeId,
    origin_x: originX,
    origin_y: originY,
    origin_z: originZ,
    axis_x: axisX,
    axis_y: axisY,
    axis_z: axisZ,
    angle_radians: angleRadians,
  })
}

/**
 * Scale a shape uniformly from a center point
 */
export async function scale(
  shapeId: string,
  centerX: number,
  centerY: number,
  centerZ: number,
  factor: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_scale", {
    shape_id: shapeId,
    center_x: centerX,
    center_y: centerY,
    center_z: centerZ,
    factor,
  })
}

/**
 * Mirror a shape across a plane
 * @param shapeId - Shape to mirror
 * @param originX, originY, originZ - Point on the mirror plane
 * @param normalX, normalY, normalZ - Normal vector of the mirror plane
 */
export async function mirror(
  shapeId: string,
  originX: number,
  originY: number,
  originZ: number,
  normalX: number,
  normalY: number,
  normalZ: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_mirror", {
    shape_id: shapeId,
    origin_x: originX,
    origin_y: originY,
    origin_z: originZ,
    normal_x: normalX,
    normal_y: normalY,
    normal_z: normalZ,
  })
}

// ============================================================================
// ADVANCED OPERATIONS
// ============================================================================

/**
 * Extrude a profile shape along a direction
 */
export async function extrude(
  shapeId: string,
  dx: number,
  dy: number,
  dz: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_extrude", { shape_id: shapeId, dx, dy, dz })
}

/**
 * Revolve a profile shape around an axis
 */
export async function revolve(
  shapeId: string,
  originX: number,
  originY: number,
  originZ: number,
  axisX: number,
  axisY: number,
  axisZ: number,
  angleRadians: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_revolve", {
    shape_id: shapeId,
    origin_x: originX,
    origin_y: originY,
    origin_z: originZ,
    axis_x: axisX,
    axis_y: axisY,
    axis_z: axisZ,
    angle_radians: angleRadians,
  })
}

/**
 * Create a lofted solid/shell through multiple wire profiles
 */
export async function loft(
  profileIds: string[],
  solid: boolean,
  ruled: boolean
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_loft", {
    profile_ids: profileIds,
    solid,
    ruled,
  })
}

/**
 * Sweep a profile along a spine path (pipe operation)
 */
export async function pipe(profileId: string, spineId: string): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_pipe", {
    profile_id: profileId,
    spine_id: spineId,
  })
}

/**
 * Create a pipe shell (hollow pipe) along a spine path
 */
export async function pipeShell(
  profileId: string,
  spineId: string,
  thickness: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_pipe_shell", {
    profile_id: profileId,
    spine_id: spineId,
    thickness,
  })
}

/**
 * Offset a shape (expand or shrink)
 */
export async function offset(shapeId: string, offsetDistance: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_offset", {
    shape_id: shapeId,
    offset: offsetDistance,
  })
}

// ============================================================================
// CURVE CREATION
// ============================================================================

export interface Point2D {
  x: number
  y: number
}

export interface Point3D {
  x: number
  y: number
  z: number
}

/**
 * Create a line segment between two points
 */
export async function createLine(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_line", { x1, y1, z1, x2, y2, z2 })
}

/**
 * Create a line from a point and direction
 */
export async function createLineDir(
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
  length: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_line_dir", { x, y, z, dx, dy, dz, length })
}

/**
 * Create a full circle in 3D space
 */
export async function createCircle(
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  ny: number,
  nz: number,
  radius: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_circle", { cx, cy, cz, nx, ny, nz, radius })
}

/**
 * Create a circle in the XY plane (Z = 0)
 */
export async function createCircleXY(cx: number, cy: number, radius: number): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_circle_xy", { cx, cy, radius })
}

/**
 * Create a circular arc in 3D space
 */
export async function createArc(
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  ny: number,
  nz: number,
  radius: number,
  startAngle: number,
  endAngle: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_arc", {
    cx,
    cy,
    cz,
    nx,
    ny,
    nz,
    radius,
    start_angle: startAngle,
    end_angle: endAngle,
  })
}

/**
 * Create an arc in the XY plane (Z = 0)
 */
export async function createArcXY(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_arc_xy", {
    cx,
    cy,
    radius,
    start_angle: startAngle,
    end_angle: endAngle,
  })
}

/**
 * Create an arc through three points
 */
export async function createArc3Points(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  x3: number,
  y3: number,
  z3: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_arc_3_points", { x1, y1, z1, x2, y2, z2, x3, y3, z3 })
}

/**
 * Create a rectangle wire in the XY plane
 */
export async function createRectangle(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_rectangle", { x, y, width, height })
}

/**
 * Create a centered rectangle wire in the XY plane
 */
export async function createRectangleCentered(
  cx: number,
  cy: number,
  width: number,
  height: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_rectangle_centered", { cx, cy, width, height })
}

/**
 * Create a regular polygon (triangle, hexagon, etc.)
 */
export async function createRegularPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_regular_polygon", { cx, cy, radius, sides })
}

/**
 * Create a closed polygon from 2D points
 */
export async function createPolygon2D(points: Point2D[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_polygon_2d", { points })
}

/**
 * Create a closed polygon from 3D points
 */
export async function createPolygon3D(points: Point3D[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_polygon_3d", { points })
}

/**
 * Create a polyline from 2D points (not closed)
 */
export async function createPolyline2D(points: Point2D[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_polyline_2d", { points })
}

/**
 * Create a polyline from 3D points (not closed)
 */
export async function createPolyline3D(points: Point3D[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_polyline_3d", { points })
}

/**
 * Create an ellipse in 3D space
 */
export async function createEllipse(
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  ny: number,
  nz: number,
  majorRadius: number,
  minorRadius: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_ellipse", {
    cx,
    cy,
    cz,
    nx,
    ny,
    nz,
    major_radius: majorRadius,
    minor_radius: minorRadius,
  })
}

/**
 * Create an ellipse in the XY plane (Z = 0)
 */
export async function createEllipseXY(
  cx: number,
  cy: number,
  majorRadius: number,
  minorRadius: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_ellipse_xy", {
    cx,
    cy,
    major_radius: majorRadius,
    minor_radius: minorRadius,
  })
}

/**
 * Create a B-spline curve interpolating through points
 */
export async function createBSpline(points: Point3D[], closed: boolean): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_bspline", { points, closed })
}

/**
 * Create a Bezier curve from control points
 */
export async function createBezier(controlPoints: Point3D[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_bezier", { control_points: controlPoints })
}

/**
 * Create a wire from multiple edges
 */
export async function createWireFromEdges(edgeIds: string[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_wire_from_edges", { edge_ids: edgeIds })
}

/**
 * Create a face from a closed wire
 */
export async function createFaceFromWire(wireId: string): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_face_from_wire", { wire_id: wireId })
}

// ============================================================================
// TESSELLATION / MESH
// ============================================================================

/**
 * Tessellate a shape to get mesh data for 3D rendering
 * @param shapeId - Shape to tessellate
 * @param deflection - Tessellation quality (smaller = higher quality, default 0.1)
 */
export async function tessellate(shapeId: string, deflection = 0.1): Promise<CadMeshData> {
  logger.log("[cad-service] tessellate called with shapeId:", shapeId)
  return invoke<CadMeshData>("cad_tessellate", { shape_id: shapeId, deflection })
}

// ============================================================================
// IMPORT / EXPORT
// ============================================================================

/**
 * Import a STEP file
 */
export async function importStep(filePath: string): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_import_step", { file_path: filePath })
}

/**
 * Export a shape to STEP file
 */
export async function exportStep(shapeId: string, filePath: string): Promise<string> {
  return invoke<string>("cad_export_step", { shape_id: shapeId, file_path: filePath })
}

/**
 * Export a shape to STL file (binary)
 */
export async function exportStl(
  shapeId: string,
  filePath: string,
  deflection = 0.1
): Promise<string> {
  return invoke<string>("cad_export_stl", { shape_id: shapeId, file_path: filePath, deflection })
}

/**
 * Export a shape to OBJ file
 */
export async function exportObj(
  shapeId: string,
  filePath: string,
  deflection = 0.1
): Promise<string> {
  return invoke<string>("cad_export_obj", { shape_id: shapeId, file_path: filePath, deflection })
}

/**
 * Export a shape to glTF binary file
 */
export async function exportGlb(
  shapeId: string,
  filePath: string,
  deflection = 0.1
): Promise<string> {
  return invoke<string>("cad_export_glb", { shape_id: shapeId, file_path: filePath, deflection })
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Analyze a shape (get topology info)
 */
export async function analyze(shapeId: string): Promise<ShapeAnalysis> {
  return invoke<ShapeAnalysis>("cad_analyze", { shape_id: shapeId })
}

/**
 * Measure minimum distance between two shapes
 */
export async function measureDistance(shape1Id: string, shape2Id: string): Promise<number> {
  return invoke<number>("cad_measure_distance", {
    shape1_id: shape1Id,
    shape2_id: shape2Id,
  })
}

/**
 * Delete a shape from the registry
 */
export async function deleteShape(shapeId: string): Promise<void> {
  return invoke<void>("cad_delete_shape", { shape_id: shapeId })
}

/**
 * Clear all shapes from the registry
 * Returns the number of shapes cleared
 */
export async function clearAll(): Promise<number> {
  return invoke<number>("cad_clear_all")
}

/**
 * Get count of shapes in registry
 */
export async function getShapeCount(): Promise<number> {
  return invoke<number>("cad_shape_count")
}

/**
 * Simplify a shape by unifying faces and edges
 * CRITICAL: Use this after boolean operations to clean up geometry!
 * @param shapeId - Shape to simplify
 * @param unifyEdges - Whether to merge collinear edges (default: true)
 * @param unifyFaces - Whether to merge coplanar faces (default: true)
 */
export async function simplify(
  shapeId: string,
  unifyEdges = true,
  unifyFaces = true
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_simplify", {
    shape_id: shapeId,
    unify_edges: unifyEdges,
    unify_faces: unifyFaces,
  })
}

/**
 * Combine multiple shapes into a compound (assembly)
 * Creates a multi-part assembly without merging the shapes
 * @param shapeIds - Array of shape IDs to combine
 */
export async function combine(shapeIds: string[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_combine", { shape_ids: shapeIds })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Calculate bounding box dimensions
 */
export function getBoundingBoxDimensions(bbox: BoundingBox): {
  width: number
  depth: number
  height: number
  center: [number, number, number]
} {
  return {
    width: bbox.max[0] - bbox.min[0],
    depth: bbox.max[1] - bbox.min[1],
    height: bbox.max[2] - bbox.min[2],
    center: [
      (bbox.min[0] + bbox.max[0]) / 2,
      (bbox.min[1] + bbox.max[1]) / 2,
      (bbox.min[2] + bbox.max[2]) / 2,
    ],
  }
}

// ============================================================================
// CAD SERVICE CLASS (Optional facade)
// ============================================================================

/**
 * CAD Service class providing a convenient interface to all CAD operations.
 * Can be used as a singleton or instantiated multiple times.
 */
export class CadService {
  // Primitives
  createBox = createBox
  createBoxAt = createBoxAt
  createCylinder = createCylinder
  createCylinderAt = createCylinderAt
  createSphere = createSphere
  createSphereAt = createSphereAt
  createCone = createCone
  createTorus = createTorus
  createWedge = createWedge
  createHelix = createHelix
  createPyramid = createPyramid
  createEllipsoid = createEllipsoid
  createVertex = createVertex

  // Boolean
  booleanFuse = booleanFuse
  booleanCut = booleanCut
  booleanCommon = booleanCommon

  // Modifications
  fillet = fillet
  filletEdges = filletEdges
  chamfer = chamfer
  chamferEdges = chamferEdges
  shell = shell

  // Transforms
  translate = translate
  rotate = rotate
  scale = scale
  mirror = mirror

  // Advanced
  extrude = extrude
  revolve = revolve
  loft = loft
  pipe = pipe
  pipeShell = pipeShell
  offset = offset

  // Curves
  createLine = createLine
  createLineDir = createLineDir
  createCircle = createCircle
  createCircleXY = createCircleXY
  createArc = createArc
  createArcXY = createArcXY
  createArc3Points = createArc3Points
  createRectangle = createRectangle
  createRectangleCentered = createRectangleCentered
  createRegularPolygon = createRegularPolygon
  createPolygon2D = createPolygon2D
  createPolygon3D = createPolygon3D
  createPolyline2D = createPolyline2D
  createPolyline3D = createPolyline3D
  createEllipse = createEllipse
  createEllipseXY = createEllipseXY
  createBSpline = createBSpline
  createBezier = createBezier
  createWireFromEdges = createWireFromEdges
  createFaceFromWire = createFaceFromWire

  // Tessellation
  tessellate = tessellate

  // Import/Export
  importStep = importStep
  exportStep = exportStep
  exportStl = exportStl
  exportObj = exportObj
  exportGlb = exportGlb

  // Utility
  analyze = analyze
  measureDistance = measureDistance
  deleteShape = deleteShape
  clearAll = clearAll
  getShapeCount = getShapeCount
  simplify = simplify
  combine = combine

  // Helpers
  degreesToRadians = degreesToRadians
  radiansToDegrees = radiansToDegrees
  getBoundingBoxDimensions = getBoundingBoxDimensions
}

// Default singleton instance
export const cadService = new CadService()
