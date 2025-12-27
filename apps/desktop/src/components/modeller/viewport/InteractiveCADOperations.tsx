import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui"
import { Html } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import { shapeIdMap } from "@/hooks/use-cad"
import { useCADOperations } from "@/hooks/use-cad-operations"
import { useCADPreview } from "@/hooks/use-cad-preview"
import { useEdgeDetection } from "@/hooks/use-edge-detection"
import { useSelectedObjects, useSelectionMode } from "@/stores/modeller"
import { CADPreviewMesh } from "./CADPreviewMesh"
import { EdgeGizmo } from "./EdgeGizmo"

export interface InteractiveCADOperationsProps {
  /** Active operation type */
  operation: "fillet" | "chamfer" | "shell" | null
  /** Current value from dialogState */
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
  const { dialogState, setDialogAdvancedValue, applyOperation, closeDialog } = useCADOperations()

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
    backendShapeId: (backendShapeId as string) || "",
    operation: operation || "fillet",
    value,
    edgeIndices: selectedEdge ? [selectedEdge.index] : undefined,
    continuity: dialogState.continuity,
    chamferMode: dialogState.chamferMode,
    value2: Number.parseFloat(dialogState.value2 || "0.5"),
    angle: (Number.parseFloat(dialogState.angle || "45") * Math.PI) / 180,
    enabled: edgeDetectionEnabled && !!selectedEdge && !!backendShapeId,
    debounceMs: 200,
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
              backgroundColor: "rgba(245, 158, 11, 0.9)",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "16px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              backdropFilter: "blur(8px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <span>⚠️</span>
            <span>Cambia a modo de selección de Aristas para operar</span>
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

      {/* Advanced Popover UI */}
      {selectedEdge && (
        <group
          position={selectedEdge.midpoint
            .clone()
            .add(selectedEdge.direction.clone().multiplyScalar(0.5))}
        >
          <Html center distanceFactor={10}>
            <div
              className="flex flex-col gap-3 p-4 rounded-2xl bg-[#1C1Extra]/90 backdrop-blur-xl border border-white/10 shadow-2xl min-w-[200px]"
              style={{
                backgroundColor: "#1c1a16e6",
                color: "#eee",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                  {operation === "fillet"
                    ? "Empalme"
                    : operation === "chamfer"
                      ? "Chaflán"
                      : "Vaciado"}
                </span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded uppercase font-mono">
                  Arista #{selectedEdge.index}
                </span>
              </div>

              {/* Main Value Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="main-value" className="text-[10px] opacity-60 ml-1">
                  {operation === "fillet" ? "Radio (mm)" : "Distancia (mm)"}
                </label>
                <Input
                  id="main-value"
                  type="number"
                  value={value}
                  onChange={(e) => onValueChange(Number.parseFloat(e.target.value) || 0)}
                  className="h-8 bg-black/40 border-white/10 text-sm focus:ring-blue-500"
                  step={0.1}
                />
              </div>

              {/* Fillet Continuity */}
              {operation === "fillet" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="continuity-select" className="text-[10px] opacity-60 ml-1">
                    Continuidad
                  </label>
                  <Select
                    value={dialogState.continuity?.toString() || "1"}
                    onValueChange={(v) => setDialogAdvancedValue("continuity", Number.parseInt(v))}
                  >
                    <SelectTrigger
                      id="continuity-select"
                      className="h-8 bg-black/40 border-white/10 text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">C0 (Posición)</SelectItem>
                      <SelectItem value="1">G1 (Tangente)</SelectItem>
                      <SelectItem value="2">G2 (Curvatura)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Chamfer Options */}
              {operation === "chamfer" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="chamfer-mode" className="text-[10px] opacity-60 ml-1">
                      Modo
                    </label>
                    <Select
                      value={dialogState.chamferMode || "constant"}
                      onValueChange={(v) =>
                        setDialogAdvancedValue(
                          "chamferMode",
                          v as "constant" | "two-distances" | "distance-angle"
                        )
                      }
                    >
                      <SelectTrigger
                        id="chamfer-mode"
                        className="h-8 bg-black/40 border-white/10 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="constant">Equidistante</SelectItem>
                        <SelectItem value="two-distances">Dos Distancias</SelectItem>
                        <SelectItem value="distance-angle">Distancia-Ángulo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dialogState.chamferMode === "two-distances" && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="value2-input" className="text-[10px] opacity-60 ml-1">
                        Distancia 2 (mm)
                      </label>
                      <Input
                        id="value2-input"
                        type="number"
                        value={dialogState.value2 || "0.5"}
                        onChange={(e) => setDialogAdvancedValue("value2", e.target.value)}
                        className="h-8 bg-black/40 border-white/10 text-sm"
                        step={0.1}
                      />
                    </div>
                  )}

                  {dialogState.chamferMode === "distance-angle" && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="angle-input" className="text-[10px] opacity-60 ml-1">
                        Ángulo (°)
                      </label>
                      <Input
                        id="angle-input"
                        type="number"
                        value={dialogState.angle || "45"}
                        onChange={(e) => setDialogAdvancedValue("angle", e.target.value)}
                        className="h-8 bg-black/40 border-white/10 text-sm"
                        step={1}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeDialog}
                  className="h-8 border-white/10 hover:bg-white/5 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyOperation([selectedEdge.index])}
                  className="h-8 bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* Preview Mesh */}
      {hasPreview && previewMesh && selectedObjects[0] && (
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
            operation === "fillet" ? "#3b82f6" : operation === "chamfer" ? "#f59e0b" : "#8b5cf6"
          }
          opacity={0.5}
        />
      )}

      {/* Loading indicator */}
      {isLoading && selectedEdge && (
        <Html position={selectedEdge.midpoint} center>
          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </Html>
      )}
    </>
  )
}
