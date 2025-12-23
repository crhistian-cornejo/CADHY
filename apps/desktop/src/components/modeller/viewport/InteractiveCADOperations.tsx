/**
 * InteractiveCADOperations Component - CADHY
 *
 * Main orchestrator for interactive edge-based CAD operations.
 * Combines edge detection, gizmos, labels, and real-time preview.
 */

import { Html } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import { shapeIdMap } from "@/hooks/use-cad"
import { useCADPreview } from "@/hooks/use-cad-preview"
import { useEdgeDetection } from "@/hooks/use-edge-detection"
import { useSelectedObjects, useSelectionMode } from "@/stores/modeller"
import { CADPreviewMesh } from "./CADPreviewMesh"
import { EdgeGizmo } from "./EdgeGizmo"

export interface InteractiveCADOperationsProps {
  /** Active operation type */
  operation: "fillet" | "chamfer" | "shell" | null
  /** Current value */
  value: number
  /** Min value */
  min?: number
  /** Max value */
  max?: number
  /** Callback when value changes */
  onValueChange: (value: number) => void
  /** Enable interactive mode */
  enabled: boolean
}

export function InteractiveCADOperations({
  operation,
  value,
  min = 0.01,
  max = 10,
  onValueChange,
  enabled,
}: InteractiveCADOperationsProps) {
  const { gl } = useThree()
  const selectedObjects = useSelectedObjects()
  const selectionMode = useSelectionMode()

  // Only enable edge detection when in edge selection mode
  const edgeDetectionEnabled = enabled && selectionMode === "edge"

  const { selectedEdge, hoveredEdge, handlePointerMove, handlePointerClick, clearSelection } =
    useEdgeDetection()

  // Get backend shape ID for preview
  const backendShapeId =
    selectedObjects.length > 0
      ? shapeIdMap.get(selectedObjects[0].id) || selectedObjects[0].metadata?.backendShapeId
      : null

  // Generate preview when edge is selected and value changes
  const { previewMesh, isLoading, hasPreview } = useCADPreview({
    backendShapeId: backendShapeId || "",
    operation: operation || "fillet",
    value,
    enabled: edgeDetectionEnabled && !!selectedEdge && !!backendShapeId,
    debounceMs: 300,
  })

  // Add event listeners for edge detection
  useEffect(() => {
    if (!edgeDetectionEnabled) return

    const canvas = gl.domElement

    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("click", handlePointerClick)

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("click", handlePointerClick)
    }
  }, [edgeDetectionEnabled, gl, handlePointerMove, handlePointerClick])

  // Clear selection when disabled
  useEffect(() => {
    if (!edgeDetectionEnabled) {
      clearSelection()
    }
  }, [edgeDetectionEnabled, clearSelection])

  // Show message when operation is active but not in edge mode
  if (!enabled || !operation) return null

  if (selectionMode !== "edge") {
    return (
      <group>
        <Html center distanceFactor={15} position={[0, 2, 0]}>
          <div
            style={{
              backgroundColor: "#f59e0b",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "16px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span>
            <span>Switch to Edge selection mode to use {operation} operation</span>
          </div>
        </Html>
      </group>
    )
  }

  // Show gizmo on selected edge, or hovered edge if no selection
  const activeEdge = selectedEdge || hoveredEdge

  return (
    <>
      {/* Edge Gizmo */}
      {activeEdge && (
        <EdgeGizmo
          edge={activeEdge}
          value={value}
          min={min}
          max={max}
          color={
            operation === "fillet" ? "#3b82f6" : operation === "chamfer" ? "#f59e0b" : "#8b5cf6"
          }
          onValueChange={onValueChange}
        />
      )}

      {/* Value Label using Html from drei */}
      {activeEdge && (
        <group
          position={activeEdge.midpoint
            .clone()
            .add(activeEdge.direction.clone().multiplyScalar(0.3))}
        >
          <Html
            center
            distanceFactor={10}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              style={{
                backgroundColor:
                  operation === "fillet"
                    ? "#3b82f6"
                    : operation === "chamfer"
                      ? "#f59e0b"
                      : "#8b5cf6",
                color: "#ffffff",
                padding: "4px 10px",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ opacity: 0.9 }}>
                {operation === "fillet" ? "R" : operation === "chamfer" ? "D" : "T"}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {value.toFixed(2)}
                <span style={{ fontSize: "11px", marginLeft: "2px", opacity: 0.8 }}>mm</span>
              </span>
            </div>
          </Html>
        </group>
      )}

      {/* Preview Mesh */}
      {hasPreview && previewMesh && selectedObjects.length > 0 && (
        <CADPreviewMesh
          mesh={previewMesh}
          position={[
            selectedObjects[0].transform.position.x,
            selectedObjects[0].transform.position.y,
            selectedObjects[0].transform.position.z,
          ]}
          rotation={[
            (selectedObjects[0].transform.rotation.x * Math.PI) / 180,
            (selectedObjects[0].transform.rotation.y * Math.PI) / 180,
            (selectedObjects[0].transform.rotation.z * Math.PI) / 180,
          ]}
          scale={[
            selectedObjects[0].transform.scale.x,
            selectedObjects[0].transform.scale.y,
            selectedObjects[0].transform.scale.z,
          ]}
          color={
            operation === "fillet" ? "#10b981" : operation === "chamfer" ? "#f59e0b" : "#8b5cf6"
          }
          opacity={0.6}
        />
      )}

      {/* Loading indicator (optional) */}
      {isLoading && selectedEdge && (
        <mesh position={selectedEdge.midpoint}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </>
  )
}
