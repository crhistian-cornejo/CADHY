/**
 * CAD Operations Toolbar - CADHY
 *
 * Toolbar with CAD operations:
 * - Boolean operations (Union, Subtract, Intersect)
 * - Modify operations (Fillet, Chamfer, Shell)
 * - Export (STEP, STL, OBJ, GLB)
 * - Measure (Distance, Properties, Volume, BBox)
 */

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@cadhy/ui"
import { save } from "@tauri-apps/plugin-dialog"
import { useCallback, useState } from "react"
import { CadIcon } from "@/components/ui/cad-icon"
import { shapeIdMap, useCAD } from "@/hooks/use-cad"
import * as cadService from "@/services/cad-service"
import { useModellerStore, useSelectedObjects } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

type ParameterOperation = "fillet" | "chamfer" | "shell" | null

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CADToolbarProps {
  className?: string
}

export function CADToolbar({ className }: CADToolbarProps) {
  const selectedObjects = useSelectedObjects()

  const { addObject, deleteObject } = useModellerStore()

  const { fuseShapes, cutShapes, intersectShapes } = useCAD()

  // Parameter dialog state
  const [parameterDialog, setParameterDialog] = useState<{
    open: boolean
    operation: ParameterOperation
    value: string
  }>({
    open: false,
    operation: null,
    value: "",
  })

  // Measure results dialog state
  const [measureDialog, setMeasureDialog] = useState<{
    open: boolean
    title: string
    results: Array<{ label: string; value: string }>
  }>({
    open: false,
    title: "",
    results: [],
  })

  // Boolean operation handlers
  const handleBooleanUnion = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects for Boolean Union")
      return
    }
    try {
      const result = await fuseShapes(selectedObjects[0].id, selectedObjects[1].id, "Union")
      if (result) {
        toast.success("Boolean Union completed")
      }
    } catch (error) {
      toast.error(`Boolean Union failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects, fuseShapes])

  const handleBooleanSubtract = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects for Boolean Subtract")
      return
    }
    try {
      const result = await cutShapes(selectedObjects[0].id, selectedObjects[1].id, "Subtract")
      if (result) {
        toast.success("Boolean Subtract completed")
      }
    } catch (error) {
      toast.error(
        `Boolean Subtract failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [selectedObjects, cutShapes])

  const handleBooleanIntersect = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects for Boolean Intersect")
      return
    }
    try {
      const result = await intersectShapes(
        selectedObjects[0].id,
        selectedObjects[1].id,
        "Intersect"
      )
      if (result) {
        toast.success("Boolean Intersect completed")
      }
    } catch (error) {
      toast.error(
        `Boolean Intersect failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [selectedObjects, intersectShapes])

  // Modify operations
  const handleFillet = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "fillet", value: "1.0" })
  }, [selectedObjects])

  const handleChamfer = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "chamfer", value: "0.5" })
  }, [selectedObjects])

  const handleShell = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "shell", value: "0.5" })
  }, [selectedObjects])

  // Apply parameter operation
  const handleApplyParameterOperation = useCallback(async () => {
    if (!parameterDialog.operation || selectedObjects.length === 0) return

    const value = parseFloat(parameterDialog.value)
    if (Number.isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number")
      return
    }

    const selectedObject = selectedObjects[0]
    const backendId = shapeIdMap.get(selectedObject.id)

    if (!backendId) {
      toast.error("Shape not found in backend")
      return
    }

    try {
      let result
      let operationName = ""

      switch (parameterDialog.operation) {
        case "fillet":
          result = await cadService.fillet(backendId, value)
          operationName = "Fillet"
          break
        case "chamfer":
          result = await cadService.chamfer(backendId, value)
          operationName = "Chamfer"
          break
        case "shell":
          result = await cadService.shell(backendId, value)
          operationName = "Shell"
          break
      }

      if (result) {
        const meshData = await cadService.tessellate(result.id, 0.1)
        const newObject = {
          type: "shape" as const,
          mesh: {
            vertices: new Float32Array(meshData.vertices),
            indices: new Uint32Array(meshData.indices),
            normals: new Float32Array(meshData.normals),
          },
          metadata: {
            backendShapeId: result.id,
            operation: parameterDialog.operation,
            sourceId: selectedObject.id,
            parameter: value,
          },
          position: selectedObject.position,
          rotation: selectedObject.rotation,
          scale: selectedObject.scale,
          visible: true,
          name: `${operationName} ${value}`,
        }

        deleteObject(selectedObject.id)
        const newId = addObject(newObject)
        shapeIdMap.set(newId, result.id)

        toast.success(`${operationName} applied successfully`)
        setParameterDialog({ open: false, operation: null, value: "" })
      }
    } catch (error) {
      toast.error(
        `${parameterDialog.operation} failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [parameterDialog, selectedObjects, addObject, deleteObject])

  // Export handler
  const handleExport = useCallback(
    async (format: "STEP" | "STL" | "OBJ" | "GLB") => {
      if (selectedObjects.length === 0) {
        toast.error("No objects selected for export")
        return
      }

      const selectedObject = selectedObjects[0]
      const backendId = shapeIdMap.get(selectedObject.id)

      if (!backendId) {
        toast.error("Shape not found in backend")
        return
      }

      try {
        const formatConfig: Record<
          string,
          {
            extensions: string[]
            name: string
            exportFn?: (id: string, path: string) => Promise<string>
          }
        > = {
          STEP: {
            extensions: ["step", "stp"],
            name: "STEP Files",
            exportFn: cadService.exportStep,
          },
          STL: {
            extensions: ["stl"],
            name: "STL Files",
            exportFn: cadService.exportStl,
          },
          OBJ: {
            extensions: ["obj"],
            name: "OBJ Files",
            exportFn: cadService.exportObj,
          },
          GLB: {
            extensions: ["glb"],
            name: "GLB Files",
            exportFn: cadService.exportGlb,
          },
        }

        const config = formatConfig[format]
        if (!config.exportFn) {
          toast.error(`${format} export not yet implemented`)
          return
        }

        const filePath = await save({
          filters: [{ name: config.name, extensions: config.extensions }],
          title: `Export as ${format}`,
          defaultPath: `${selectedObject.name}.${config.extensions[0]}`,
        })

        if (!filePath) {
          return
        }

        await config.exportFn(backendId, filePath)
        toast.success(`Exported to ${format} successfully`)
      } catch (error) {
        toast.error(
          `Export to ${format} failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [selectedObjects]
  )

  // Measure handlers
  const handleMeasureDistance = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects to measure distance")
      return
    }

    const backendId1 = shapeIdMap.get(selectedObjects[0].id)
    const backendId2 = shapeIdMap.get(selectedObjects[1].id)

    if (!backendId1 || !backendId2) {
      toast.error("Shapes not found in backend")
      return
    }

    try {
      const distance = await cadService.measureDistance(backendId1, backendId2)
      setMeasureDialog({
        open: true,
        title: "Distance Measurement",
        results: [
          { label: "Distance", value: `${distance.toFixed(3)} units` },
          { label: "Object 1", value: selectedObjects[0].name || "Unnamed" },
          { label: "Object 2", value: selectedObjects[1].name || "Unnamed" },
        ],
      })
    } catch (error) {
      toast.error(`Measurement failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects])

  const handleMeasureProperties = useCallback(async () => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }

    const selectedObject = selectedObjects[0]
    const backendId = shapeIdMap.get(selectedObject.id)

    if (!backendId) {
      toast.error("Shape not found in backend")
      return
    }

    try {
      const analysis = await cadService.analyze(backendId)
      const results = [
        { label: "Valid", value: analysis.is_valid ? "Yes" : "No" },
        { label: "Vertices", value: analysis.num_vertices.toString() },
        { label: "Edges", value: analysis.num_edges.toString() },
        { label: "Faces", value: analysis.num_faces.toString() },
        { label: "Solids", value: analysis.num_solids.toString() },
        { label: "Surface Area", value: `${analysis.surface_area.toFixed(3)} units²` },
        { label: "Volume", value: `${analysis.volume.toFixed(3)} units³` },
      ]

      if (analysis.bounding_box) {
        const bbox = analysis.bounding_box
        results.push(
          {
            label: "Bounding Box Min",
            value: `(${bbox.min_x.toFixed(2)}, ${bbox.min_y.toFixed(2)}, ${bbox.min_z.toFixed(2)})`,
          },
          {
            label: "Bounding Box Max",
            value: `(${bbox.max_x.toFixed(2)}, ${bbox.max_y.toFixed(2)}, ${bbox.max_z.toFixed(2)})`,
          }
        )
      }

      setMeasureDialog({
        open: true,
        title: `Properties: ${selectedObject.name || "Unnamed"}`,
        results,
      })
    } catch (error) {
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects])

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 border-b border-border/40 bg-background dark:bg-toolbar-bg px-2 py-1",
          className
        )}
      >
        {/* Boolean Operations */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={selectedObjects.length !== 2}
                      className="h-7 w-7"
                    >
                      <CadIcon name="box" size={16} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Boolean Operations</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Boolean Operations</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleBooleanUnion}>
                <CadIcon name="union" className="mr-2" size={16} />
                Union (Fuse)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBooleanSubtract}>
                <CadIcon name="difference" className="mr-2" size={16} />
                Subtract (Cut)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBooleanIntersect}>
                <CadIcon name="intersection" className="mr-2" size={16} />
                Intersect (Common)
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Modify Operations */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={selectedObjects.length === 0}
                      className="h-7 w-7"
                    >
                      <CadIcon name="settings" size={16} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Modify</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Modify Operations</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleFillet}>
                <CadIcon name="fillet" className="mr-2" size={16} />
                Fillet (Round)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleChamfer}>
                <CadIcon name="chamfer" className="mr-2" size={16} />
                Chamfer (Bevel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShell}>
                <CadIcon name="shell" className="mr-2" size={16} />
                Shell (Hollow)
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* Export */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={selectedObjects.length === 0}
                      className="h-7 w-7"
                    >
                      <CadIcon name="save" size={16} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Export</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Export Formats</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport("STEP")}>
                <CadIcon name="save" className="mr-2" size={16} />
                Export STEP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("STL")}>
                <CadIcon name="save" className="mr-2" size={16} />
                Export STL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("OBJ")}>
                <CadIcon name="save" className="mr-2" size={16} />
                Export OBJ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("GLB")}>
                <CadIcon name="save" className="mr-2" size={16} />
                Export GLB
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Measure */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={selectedObjects.length === 0}
                      className="h-7 w-7"
                    >
                      <CadIcon name="measure" size={16} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Measure</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Measurements</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleMeasureDistance}
                disabled={selectedObjects.length !== 2}
              >
                <CadIcon name="measure" className="mr-2" size={16} />
                Distance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleMeasureProperties}>
                <CadIcon name="measure" className="mr-2" size={16} />
                Properties
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Parameter Dialog */}
      <Dialog
        open={parameterDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setParameterDialog({ open: false, operation: null, value: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parameterDialog.operation === "fillet" && "Fillet (Round Edges)"}
              {parameterDialog.operation === "chamfer" && "Chamfer (Bevel Edges)"}
              {parameterDialog.operation === "shell" && "Shell (Hollow Out)"}
            </DialogTitle>
            <DialogDescription>
              {parameterDialog.operation === "fillet" && "Enter the radius for rounding edges"}
              {parameterDialog.operation === "chamfer" && "Enter the distance for beveling edges"}
              {parameterDialog.operation === "shell" && "Enter the wall thickness"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="parameter-value">
                {parameterDialog.operation === "fillet" && "Radius"}
                {parameterDialog.operation === "chamfer" && "Distance"}
                {parameterDialog.operation === "shell" && "Thickness"}
              </Label>
              <Input
                id="parameter-value"
                type="number"
                step="0.1"
                min="0.01"
                value={parameterDialog.value}
                onChange={(e) =>
                  setParameterDialog((prev) => ({
                    ...prev,
                    value: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleApplyParameterOperation()
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setParameterDialog({ open: false, operation: null, value: "" })}
            >
              Cancel
            </Button>
            <Button onClick={handleApplyParameterOperation}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Measure Results Dialog */}
      <Dialog
        open={measureDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setMeasureDialog({ open: false, title: "", results: [] })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{measureDialog.title}</DialogTitle>
            <DialogDescription>Measurement results</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {measureDialog.results.map((result, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0"
              >
                <span className="text-sm font-medium text-muted-foreground">{result.label}</span>
                <span className="text-sm font-mono">{result.value}</span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setMeasureDialog({ open: false, title: "", results: [] })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CADToolbar
