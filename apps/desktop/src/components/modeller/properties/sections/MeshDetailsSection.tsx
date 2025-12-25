/**
 * MeshDetailsSection Component - CADHY
 *
 * Displays mesh topology information:
 * - Vertex count
 * - Triangle count
 * - Face topology (if available)
 * - Edge information
 */

import { GridIcon } from "@hugeicons/core-free-icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  ShapeObject,
  TransitionObject,
} from "@/stores/modeller"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface MeshDetailsSectionProps {
  object: AnySceneObject
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num)
}

function getMeshData(object: AnySceneObject): {
  vertices: number
  triangles: number
  faces?: number
  hasTopology: boolean
  isEstimated: boolean
} | null {
  // Check if object has stored mesh data
  if (object.type === "shape") {
    const shape = object as ShapeObject
    if (shape.mesh?.vertices && shape.mesh.vertices.length > 0) {
      const vertexCount = shape.mesh.vertices.length / 3
      const triangleCount = shape.mesh.indices ? shape.mesh.indices.length / 3 : 0
      const faceCount = shape.mesh.faces?.length
      const hasTopology = shape.mesh.faces !== undefined && shape.mesh.face_ids !== undefined

      return {
        vertices: vertexCount,
        triangles: triangleCount,
        faces: faceCount,
        hasTopology,
        isEstimated: false,
      }
    }
    // Estimate mesh data from shape parameters
    const params = shape.parameters
    const segments = params.segments ?? 32
    let vertices = 0
    let triangles = 0

    switch (shape.shapeType) {
      case "box": {
        // Box with subdivisions: (segments+1)^3 vertices, 6 faces * segments^2 * 2 triangles
        const s = Math.max(1, Math.floor(segments))
        vertices = (s + 1) ** 3
        triangles = 6 * s * s * 2
        break
      }
      case "cylinder": {
        // Cylinder: segments around + 2 caps, height segments from segments/8
        const radialSegments = segments
        const heightSegments = Math.max(1, Math.floor(segments / 8))
        // Vertices: radial * height + 2 caps (radial vertices each)
        vertices = radialSegments * heightSegments + 2 * radialSegments
        // Triangles: radial * height * 2 (quads) + 2 caps (radial - 2 triangles each)
        triangles = radialSegments * heightSegments * 2 + 2 * (radialSegments - 2)
        break
      }
      case "sphere": {
        // Sphere: segments around * segments vertical
        const radialSegments = segments
        const heightSegments = Math.max(8, Math.floor(segments / 2))
        // Vertices: radial * height + 2 poles
        vertices = radialSegments * heightSegments + 2
        // Triangles: radial * height * 2
        triangles = radialSegments * heightSegments * 2
        break
      }
      case "cone": {
        // Cone: similar to cylinder but with one cap
        const radialSegments = segments
        const heightSegments = Math.max(1, Math.floor(segments / 8))
        // Vertices: radial * height + 1 cap (radial vertices)
        vertices = radialSegments * heightSegments + radialSegments
        // Triangles: radial * height * 2 (sides) + cap (radial - 2 triangles)
        triangles = radialSegments * heightSegments * 2 + (radialSegments - 2)
        break
      }
      case "torus": {
        // Torus: major segments * minor segments
        const majorSegments = segments
        const minorSegments = Math.max(8, Math.floor(segments / 2))
        // Vertices: major * minor
        vertices = majorSegments * minorSegments
        // Triangles: major * minor * 2 (quads)
        triangles = majorSegments * minorSegments * 2
        break
      }
      default:
        // Unknown shape type, return null
        return null
    }

    return {
      vertices,
      triangles,
      hasTopology: false,
      isEstimated: true,
    }
  }

  if (object.type === "channel") {
    const channel = object as ChannelObject
    // Check for stored mesh data first
    if (channel.mesh?.vertices && channel.mesh.vertices.length > 0) {
      const vertexCount = channel.mesh.vertices.length / 3
      const triangleCount = channel.mesh.indices ? channel.mesh.indices.length / 3 : 0
      const faceCount = channel.mesh.faces?.length
      const hasTopology = channel.mesh.faces !== undefined && channel.mesh.face_ids !== undefined

      return {
        vertices: vertexCount,
        triangles: triangleCount,
        faces: faceCount,
        hasTopology,
        isEstimated: false,
      }
    }
    // Estimate mesh data from channel parameters
    // Resolution used: Math.min(1.0, length / 10)
    const resolution = Math.min(1.0, channel.length / 10)
    const crossSections = Math.max(2, Math.ceil(channel.length / resolution))
    // Each cross-section has ~8-16 vertices (rectangular section)
    const verticesPerSection = 8
    const totalVertices = crossSections * verticesPerSection
    // Each cross-section connects to next with quads (2 triangles per quad)
    const trianglesPerSegment = (verticesPerSection - 1) * 2
    const totalTriangles = (crossSections - 1) * trianglesPerSegment

    return {
      vertices: totalVertices,
      triangles: totalTriangles,
      hasTopology: false,
      isEstimated: true,
    }
  }

  if (object.type === "transition") {
    const transition = object as TransitionObject
    if (transition.mesh?.vertices && transition.mesh.vertices.length > 0) {
      const vertexCount = transition.mesh.vertices.length / 3
      const triangleCount = transition.mesh.indices ? transition.mesh.indices.length / 3 : 0
      const faceCount = transition.mesh.faces?.length
      const hasTopology =
        transition.mesh.faces !== undefined && transition.mesh.face_ids !== undefined

      return {
        vertices: vertexCount,
        triangles: triangleCount,
        faces: faceCount,
        hasTopology,
        isEstimated: false,
      }
    }
    // Estimate for transition
    const resolution = Math.min(1.0, transition.length / 10)
    const crossSections = Math.max(2, Math.ceil(transition.length / resolution))
    const verticesPerSection = 10
    const totalVertices = crossSections * verticesPerSection
    const trianglesPerSegment = (verticesPerSection - 1) * 2
    const totalTriangles = (crossSections - 1) * trianglesPerSegment

    return {
      vertices: totalVertices,
      triangles: totalTriangles,
      hasTopology: false,
      isEstimated: true,
    }
  }

  if (object.type === "chute") {
    const chute = object as ChuteObject
    if (chute.mesh?.vertices && chute.mesh.vertices.length > 0) {
      const vertexCount = chute.mesh.vertices.length / 3
      const triangleCount = chute.mesh.indices ? chute.mesh.indices.length / 3 : 0
      const faceCount = chute.mesh.faces?.length
      const hasTopology = chute.mesh.faces !== undefined && chute.mesh.face_ids !== undefined

      return {
        vertices: vertexCount,
        triangles: triangleCount,
        faces: faceCount,
        hasTopology,
        isEstimated: false,
      }
    }
    // Estimate for chute
    const resolution = Math.min(1.0, chute.length / 10)
    const crossSections = Math.max(2, Math.ceil(chute.length / resolution))
    const verticesPerSection = 8
    const totalVertices = crossSections * verticesPerSection
    const trianglesPerSegment = (verticesPerSection - 1) * 2
    const totalTriangles = (crossSections - 1) * trianglesPerSegment

    return {
      vertices: totalVertices,
      triangles: totalTriangles,
      hasTopology: false,
      isEstimated: true,
    }
  }

  return null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MeshDetailsSection({ object }: MeshDetailsSectionProps) {
  const { t } = useTranslation()
  const meshData = useMemo(() => getMeshData(object), [object])

  // Always show section, even if no mesh data (will show "No mesh data" message)

  return (
    <PropertySection
      title={t("properties.meshDetails", "Mesh Details")}
      icon={GridIcon}
      defaultOpen={false}
    >
      <div className="space-y-2">
        {meshData ? (
          <>
            {meshData.isEstimated && (
              <div className="text-xs text-muted-foreground/70 px-1 pb-1">
                {t("properties.estimatedMesh", "Estimated mesh data (generated dynamically)")}
              </div>
            )}
            <PropertyRow label={t("properties.vertices", "Vertices")}>
              <span className="text-xs font-mono text-foreground">
                {meshData.isEstimated ? "~" : ""}
                {formatNumber(meshData.vertices)}
              </span>
            </PropertyRow>

            <PropertyRow label={t("properties.triangles", "Triangles")}>
              <span className="text-xs font-mono text-foreground">
                {meshData.isEstimated ? "~" : ""}
                {formatNumber(meshData.triangles)}
              </span>
            </PropertyRow>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("properties.noMeshData", "No mesh data available for this object.")}
          </p>
        )}

        {meshData.hasTopology && meshData.faces !== undefined && (
          <>
            <PropertyRow label={t("properties.faces", "Faces")}>
              <span className="text-xs font-mono text-foreground">
                {formatNumber(meshData.faces)}
              </span>
            </PropertyRow>

            {object.type === "shape" && (object as ShapeObject).mesh?.faces && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {t("properties.topology", "Topology")}
                </div>
                <div className="space-y-1 text-xs">
                  {(object as ShapeObject).mesh.faces.slice(0, 5).map((face, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/30"
                    >
                      <span className="text-muted-foreground">
                        {face.label || `Face ${face.index}`}
                      </span>
                      <span className="font-mono text-foreground">{face.area.toFixed(3)} m²</span>
                    </div>
                  ))}
                  {(object as ShapeObject).mesh.faces.length > 5 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{formatNumber((object as ShapeObject).mesh.faces.length - 5)} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PropertySection>
  )
}
