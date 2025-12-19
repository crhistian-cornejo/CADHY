/**
 * Export Service - CADHY
 *
 * Handles mesh export operations via Tauri IPC and native dialogs.
 * Supports STL, OBJ, STEP, and GLB formats for both hydraulic objects
 * (channels, transitions) and CAD shapes (primitives, boolean results).
 */

import { save } from "@tauri-apps/plugin-dialog"
import { shapeIdMap } from "@/hooks/useCAD"
import type {
  AnySceneObject,
  ChannelObject,
  ChannelSection,
  ShapeObject,
  TransitionObject,
  TransitionSection,
} from "@/stores/modeller-store"
import * as cadService from "./cad-service"
import {
  type ChannelSectionType,
  convertSectionToBackend,
  type ExportFormat,
  exportMeshToFile,
  generateChannelMesh,
  generateTransitionMesh,
  isTauriAvailable,
  type MeshResult,
  type TransitionType,
} from "./hydraulics-service"

// ============================================================================
// CONSTANTS
// ============================================================================

export const EXPORT_FORMATS: { id: ExportFormat; name: string; extension: string }[] = [
  { id: "stl", name: "STL (Stereolithography)", extension: "stl" },
  { id: "obj", name: "OBJ (Wavefront)", extension: "obj" },
  { id: "step", name: "STEP (CAD Exchange)", extension: "step" },
]

/** Extended format for CAD shapes (includes GLB) */
export const CAD_EXPORT_FORMATS: { id: CadExportFormat; name: string; extension: string }[] = [
  { id: "stl", name: "STL (Stereolithography)", extension: "stl" },
  { id: "obj", name: "OBJ (Wavefront)", extension: "obj" },
  { id: "step", name: "STEP (CAD Exchange)", extension: "step" },
  { id: "glb", name: "GLB (glTF Binary)", extension: "glb" },
]

export type CadExportFormat = "stl" | "obj" | "step" | "glb"

const FORMAT_FILTERS: Record<CadExportFormat, { name: string; extensions: string[] }> = {
  stl: { name: "STL Files", extensions: ["stl"] },
  obj: { name: "OBJ Files", extensions: ["obj"] },
  step: { name: "STEP Files", extensions: ["step", "stp"] },
  glb: { name: "GLB Files", extensions: ["glb"] },
}

// ============================================================================
// MESH MERGING
// ============================================================================

/**
 * Merge multiple MeshResult objects into a single combined mesh.
 * Handles vertex offset for indices and combines all arrays.
 */
export function mergeMeshes(meshes: MeshResult[]): MeshResult {
  if (meshes.length === 0) {
    return {
      vertices: [],
      indices: [],
      normals: null,
      vertex_count: 0,
      triangle_count: 0,
    }
  }

  if (meshes.length === 1) {
    return meshes[0]
  }

  const combinedVertices: number[] = []
  const combinedIndices: number[] = []
  const combinedNormals: number[] = []
  let hasNormals = true
  let vertexOffset = 0

  for (const mesh of meshes) {
    // Add vertices
    combinedVertices.push(...mesh.vertices)

    // Add indices with offset
    for (const index of mesh.indices) {
      combinedIndices.push(index + vertexOffset)
    }

    // Handle normals
    if (mesh.normals) {
      combinedNormals.push(...mesh.normals)
    } else {
      hasNormals = false
    }

    // Update offset (vertices are x,y,z triplets)
    vertexOffset += mesh.vertex_count
  }

  return {
    vertices: combinedVertices,
    indices: combinedIndices,
    normals: hasNormals ? combinedNormals : null,
    vertex_count: vertexOffset,
    triangle_count: combinedIndices.length / 3,
  }
}

// ============================================================================
// EXPORT DIALOG
// ============================================================================

/**
 * Opens a native save dialog for mesh export
 */
export async function openExportDialog(
  format: CadExportFormat,
  defaultName?: string
): Promise<string | null> {
  const filter = FORMAT_FILTERS[format]
  const extension =
    CAD_EXPORT_FORMATS.find((f) => f.id === format)?.extension ??
    EXPORT_FORMATS.find((f) => f.id === format)?.extension ??
    "stl"

  const path = await save({
    filters: [filter],
    title: `Export as ${format.toUpperCase()}`,
    defaultPath: defaultName ? `${defaultName}.${extension}` : undefined,
  })

  return path
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract section parameters from ChannelSection for backend conversion
 */
function getSectionParams(section: ChannelSection): Record<string, number> {
  switch (section.type) {
    case "rectangular":
      return {
        width: section.width,
        depth: section.depth,
      }
    case "trapezoidal":
      return {
        bottomWidth: section.bottomWidth,
        depth: section.depth,
        sideSlope: section.sideSlope,
      }
    case "triangular":
      return {
        depth: section.depth,
        sideSlope: section.sideSlope,
      }
  }
}

/**
 * Convert TransitionSection to backend TransitionSectionDef format
 */
function convertTransitionSection(section: TransitionSection): {
  section_type: string
  width: number
  depth: number
  side_slope: number
  wall_thickness: number
  floor_thickness: number
} {
  return {
    section_type: section.sectionType,
    width: section.width,
    depth: section.depth,
    side_slope: section.sideSlope,
    wall_thickness: section.wallThickness,
    floor_thickness: section.floorThickness,
  }
}

// ============================================================================
// MESH GENERATION
// ============================================================================

/**
 * Generate mesh for a channel object
 */
export async function generateMeshForChannel(channel: ChannelObject): Promise<MeshResult> {
  const sectionParams = getSectionParams(channel.section)
  const section = convertSectionToBackend(channel.section.type as ChannelSectionType, sectionParams)

  return generateChannelMesh({
    name: channel.name,
    section,
    manning_n: channel.manningN,
    slope: channel.slope,
    length: channel.length,
    resolution: 20,
  })
}

/**
 * Generate mesh for a transition object
 */
export async function generateMeshForTransition(transition: TransitionObject): Promise<MeshResult> {
  return generateTransitionMesh({
    name: transition.name,
    transition_type: transition.transitionType as TransitionType,
    length: transition.length,
    start_station: transition.startStation,
    start_elevation: transition.startElevation,
    end_elevation: transition.endElevation,
    inlet: convertTransitionSection(transition.inlet),
    outlet: convertTransitionSection(transition.outlet),
    resolution: 20,
  })
}

/**
 * Generate mesh for any exportable scene object
 */
export async function generateMeshForObject(object: AnySceneObject): Promise<MeshResult | null> {
  switch (object.type) {
    case "channel":
      return generateMeshForChannel(object as ChannelObject)
    case "transition":
      return generateMeshForTransition(object as TransitionObject)
    case "shape": {
      const shape = object as ShapeObject

      // First, try to get mesh from the object itself
      if (shape.mesh && shape.mesh.vertices && shape.mesh.vertices.length > 0) {
        console.log("[export-service] Using mesh from shape object:", {
          id: object.id,
          vertexCount: shape.mesh.vertices.length / 3,
        })
        return {
          vertices: Array.from(shape.mesh.vertices),
          indices: Array.from(shape.mesh.indices),
          normals: shape.mesh.normals ? Array.from(shape.mesh.normals) : null,
          vertex_count: shape.mesh.vertices.length / 3,
          triangle_count: shape.mesh.indices.length / 3,
        }
      }

      // Try to get backend ID from shapeIdMap first, then from metadata
      let backendId = shapeIdMap.get(object.id)
      if (!backendId && shape.metadata?.backendShapeId) {
        backendId = shape.metadata.backendShapeId as string
      }

      console.log("[export-service] Shape mesh not found, checking backend:", {
        objectId: object.id,
        backendId,
        shapeIdMapSize: shapeIdMap.size,
        metadataBackendId: shape.metadata?.backendShapeId,
      })

      if (backendId) {
        try {
          console.log("[export-service] Tessellating from backend:", backendId)
          const meshData = await cadService.tessellate(backendId, 0.1)
          console.log("[export-service] Tessellation successful:", {
            vertexCount: meshData.vertices.length / 3,
          })
          return {
            vertices: meshData.vertices,
            indices: meshData.indices,
            normals: meshData.normals,
            vertex_count: meshData.vertices.length / 3,
            triangle_count: meshData.indices.length / 3,
          }
        } catch (err) {
          console.error("[export-service] Tessellation failed:", err)
          return null
        }
      }

      console.warn("[export-service] Shape has no mesh and no backend ID:", object.id)
      return null
    }
    default:
      return null
  }
}

// ============================================================================
// SHAPE EXPORT (CAD Backend)
// ============================================================================

/**
 * Get backend shape ID from shapeIdMap or metadata
 */
function getBackendShapeId(object: AnySceneObject): string | undefined {
  // Try shapeIdMap first (for current session shapes)
  const mapId = shapeIdMap.get(object.id)
  if (mapId) return mapId

  // Fall back to metadata (for loaded/persisted shapes)
  if (object.type === "shape") {
    const shape = object as ShapeObject
    if (shape.metadata?.backendShapeId) {
      return shape.metadata.backendShapeId as string
    }
  }

  return undefined
}

/**
 * Check if a shape object can be exported via CAD backend
 */
export function canExportShapeViaCad(object: AnySceneObject): boolean {
  if (object.type !== "shape") return false
  return getBackendShapeId(object) !== undefined
}

/**
 * Export a shape object directly via CAD backend (OpenCASCADE)
 * This produces higher quality exports than mesh-based export
 */
export async function exportShapeViaCad(
  shape: ShapeObject,
  format: CadExportFormat
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return {
      success: false,
      error: "Export is only available in the desktop app",
    }
  }

  const backendId = getBackendShapeId(shape)
  if (!backendId) {
    return {
      success: false,
      error: "Shape not found in CAD backend. Try recreating the shape.",
    }
  }

  try {
    const targetPath = await openExportDialog(format, shape.name)
    if (!targetPath) {
      return { success: false, error: "Export cancelled" }
    }

    // Use the appropriate CAD export function based on format
    switch (format) {
      case "step":
        await cadService.exportStep(backendId, targetPath)
        break
      case "stl":
        await cadService.exportStl(backendId, targetPath)
        break
      case "obj":
        await cadService.exportObj(backendId, targetPath)
        break
      case "glb":
        await cadService.exportGlb(backendId, targetPath)
        break
    }

    return {
      success: true,
      filePath: targetPath,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Export failed",
    }
  }
}

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

/**
 * Export a single object to file
 */
export async function exportObject(
  object: AnySceneObject,
  format: ExportFormat,
  filePath?: string
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return {
      success: false,
      error: "Export is only available in the desktop app",
    }
  }

  try {
    // Get file path from dialog if not provided
    const targetPath = filePath ?? (await openExportDialog(format, object.name))
    if (!targetPath) {
      return { success: false, error: "Export cancelled" }
    }

    // Generate mesh
    const mesh = await generateMeshForObject(object)
    if (!mesh) {
      return {
        success: false,
        error: `Cannot export object type: ${object.type}`,
      }
    }

    // Export to file
    await exportMeshToFile(mesh, targetPath, format)

    return {
      success: true,
      filePath: targetPath,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Export failed",
    }
  }
}

/**
 * Export multiple objects to a single file (combined mesh)
 * Generates meshes for all exportable objects and merges them into one.
 */
export async function exportObjects(
  objects: AnySceneObject[],
  format: ExportFormat
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return {
      success: false,
      error: "Export is only available in the desktop app",
    }
  }

  // Filter to exportable objects (channels, transitions, and shapes)
  const exportable = objects.filter(
    (o) => o.type === "channel" || o.type === "transition" || o.type === "shape"
  )
  if (exportable.length === 0) {
    return {
      success: false,
      error: "No exportable objects selected.",
    }
  }

  // For single shape with CAD backend, prefer CAD export for higher quality
  if (exportable.length === 1 && exportable[0].type === "shape") {
    const shape = exportable[0] as ShapeObject
    if (canExportShapeViaCad(shape)) {
      return exportShapeViaCad(shape, format as CadExportFormat)
    }
  }

  // For single object, use simple export
  if (exportable.length === 1) {
    return exportObject(exportable[0], format)
  }

  // For multiple objects, generate all meshes and combine
  try {
    const targetPath = await openExportDialog(format, "combined_export")
    if (!targetPath) {
      return { success: false, error: "Export cancelled" }
    }

    // Generate meshes for all objects in parallel
    const meshPromises = exportable.map((obj) => generateMeshForObject(obj))
    const meshResults = await Promise.all(meshPromises)

    // Filter out null results (unsupported object types)
    const meshes = meshResults.filter((m): m is MeshResult => m !== null)

    if (meshes.length === 0) {
      return { success: false, error: "Failed to generate any meshes" }
    }

    // Merge all meshes into one
    const combinedMesh = mergeMeshes(meshes)

    // Export combined mesh to file
    await exportMeshToFile(combinedMesh, targetPath, format)

    return {
      success: true,
      filePath: targetPath,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Export failed",
    }
  }
}

/**
 * Export selected objects from the scene
 */
export async function exportSelection(
  selectedObjects: AnySceneObject[],
  format: ExportFormat
): Promise<ExportResult> {
  if (selectedObjects.length === 0) {
    return {
      success: false,
      error: "No objects selected for export",
    }
  }

  return exportObjects(selectedObjects, format)
}

/**
 * Export all objects in the scene to a single file.
 * Generates meshes for all exportable objects and merges them.
 */
export async function exportScene(
  allObjects: AnySceneObject[],
  format: ExportFormat
): Promise<ExportResult> {
  if (!isTauriAvailable()) {
    return {
      success: false,
      error: "Export is only available in the desktop app",
    }
  }

  // Filter to exportable objects (channels, transitions, and shapes)
  const exportable = allObjects.filter(
    (o) => o.type === "channel" || o.type === "transition" || o.type === "shape"
  )

  if (exportable.length === 0) {
    return {
      success: false,
      error: "No exportable objects in scene. Create channels, transitions, or shapes first.",
    }
  }

  try {
    const targetPath = await openExportDialog(format as CadExportFormat, "cadhy_scene")
    if (!targetPath) {
      return { success: false, error: "Export cancelled" }
    }

    // Generate meshes for all objects in parallel
    const meshPromises = exportable.map((obj) => generateMeshForObject(obj))
    const meshResults = await Promise.all(meshPromises)

    // Filter out null results (unsupported object types)
    const meshes = meshResults.filter((m): m is MeshResult => m !== null)

    if (meshes.length === 0) {
      return { success: false, error: "Failed to generate any meshes" }
    }

    // Merge all meshes into one
    const combinedMesh = mergeMeshes(meshes)

    // Export combined mesh to file
    await exportMeshToFile(combinedMesh, targetPath, format)

    return {
      success: true,
      filePath: targetPath,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Export failed",
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an object is exportable (channel, transition, or shape)
 */
export function isExportable(object: AnySceneObject): boolean {
  return object.type === "channel" || object.type === "transition" || object.type === "shape"
}

/**
 * Check if any objects in an array are exportable
 */
export function hasExportableObjects(objects: AnySceneObject[]): boolean {
  return objects.some(isExportable)
}
