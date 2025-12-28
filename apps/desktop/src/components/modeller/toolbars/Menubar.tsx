/**
 * Menubar Component - CADHY
 *
 * Complete CAD menubar with all operations organized in logical categories:
 * - File: New, Open, Save, Export
 * - Edit: Undo, Redo, Copy, Paste, Delete
 * - Create: Primitives, Sketch, Operations
 * - Modify: Fillet, Chamfer, Boolean, Offset, Draft
 * - Measure: Distance, Properties, Dimensions
 * - View: Camera, Display Mode, Grid, Axes
 * - Tools: Settings, Analysis, Repair
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  toast,
} from "@cadhy/ui"
import {
  Add01Icon,
  ArrowTurnBackwardIcon, // Undo
  ArrowTurnForwardIcon, // Redo
  CircleIcon,
  CubeIcon,
  Cylinder01Icon,
  Download01Icon,
  Edit01Icon,
  File01Icon,
  FolderOpenIcon,
  PencilEdit01Icon,
  RulerIcon,
  Settings02Icon,
  ToolsIcon,
  TriangleIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { save } from "@tauri-apps/plugin-dialog"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useCAD } from "@/hooks/use-cad"
import { usePlatform } from "@/hooks/use-platform"
import * as cadService from "@/services/cad-service"
import {
  useCanRedo,
  useCanUndo,
  useModellerStore,
  useSelectedObjects,
  useModellerStore as useStore,
  useViewportSettings,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface MenubarProps {
  className?: string
}

interface MenuButtonProps {
  children: React.ReactNode
}

// ============================================================================
// MENU BUTTON
// ============================================================================

function MenuButton({ children }: MenuButtonProps) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-normal hover:bg-accent">
      {children}
    </Button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Menubar({ className }: MenubarProps) {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()
  const modKey = isMacOS ? "Cmd" : "Ctrl"

  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const selectedObjects = useSelectedObjects()
  const viewportSettings = useViewportSettings()

  const { undo, redo, deleteSelected, duplicateSelected, setViewportSettings } = useModellerStore()

  const { fuseShapes, cutShapes, intersectShapes } = useCAD()

  // Parameter dialog state
  type ParameterOperation = "fillet" | "chamfer" | "shell" | "offset" | null
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

  // File menu handlers
  const handleNew = useCallback(() => {
    toast.info("New project - coming soon")
  }, [])

  const handleOpen = useCallback(() => {
    toast.info("Open project - coming soon")
  }, [])

  const handleSave = useCallback(() => {
    toast.info("Save project - coming soon")
  }, [])

  const handleExport = useCallback(
    async (format: "STEP" | "IGES" | "STL" | "OBJ" | "GLB") => {
      if (selectedObjects.length === 0) {
        toast.error("No objects selected for export")
        return
      }

      const { shapeIdMap } = useStore.getState()
      const selectedObject = selectedObjects[0]
      const backendId = shapeIdMap.get(selectedObject.id)

      if (!backendId) {
        toast.error("Shape not found in backend")
        return
      }

      try {
        // Format configurations
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
          IGES: {
            extensions: ["iges", "igs"],
            name: "IGES Files",
          },
        }

        const config = formatConfig[format]
        if (!config.exportFn) {
          toast.error(`${format} export not yet implemented`)
          return
        }

        // Show save dialog
        const filePath = await save({
          filters: [{ name: config.name, extensions: config.extensions }],
          title: `Export as ${format}`,
          defaultPath: `${selectedObject.name}.${config.extensions[0]}`,
        })

        if (!filePath) {
          return // User cancelled
        }

        // Export the file
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

  // Edit menu handlers
  const handleCopy = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    toast.info("Copy - coming soon")
  }, [selectedObjects])

  const handlePaste = useCallback(() => {
    toast.info("Paste - coming soon")
  }, [])

  const handleDelete = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    deleteSelected()
    toast.success(`Deleted ${selectedObjects.length} object(s)`)
  }, [selectedObjects, deleteSelected])

  const handleDuplicate = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    duplicateSelected()
    toast.success(`Duplicated ${selectedObjects.length} object(s)`)
  }, [selectedObjects, duplicateSelected])

  // Create menu handlers
  const handleCreatePrimitive = useCallback((type: string) => {
    toast.info(`Create ${type} - use Create Panel (Shift+${type[0].toUpperCase()})`)
  }, [])

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

  // Modify menu handlers (for operations that need parameter dialogs)
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

  const handleOffset = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "offset", value: "1.0" })
  }, [selectedObjects])

  // Apply parameter operation
  const handleApplyParameterOperation = useCallback(async () => {
    if (!parameterDialog.operation || selectedObjects.length === 0) return

    const value = parseFloat(parameterDialog.value)
    if (Number.isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number")
      return
    }

    const { addObject, deleteObject, shapeIdMap } = useStore.getState()
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
        case "offset":
          toast.error("Offset operation not yet implemented in backend")
          return
      }

      if (result) {
        // Tessellate the result for rendering
        const meshData = await cadService.tessellate(result.id, 0.1)

        // Convert mesh data and create new scene object
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

        // Delete original and add modified version
        deleteObject(selectedObject.id)
        const newId = addObject(newObject)

        // Update shape ID map
        shapeIdMap.set(newId, result.id)

        toast.success(`${operationName} applied successfully`)
        setParameterDialog({ open: false, operation: null, value: "" })
      }
    } catch (error) {
      toast.error(
        `${parameterDialog.operation} failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [parameterDialog, selectedObjects])

  // Measure menu handlers
  const handleMeasureDistance = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects to measure distance")
      return
    }

    const { shapeIdMap } = useStore.getState()
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

    const { shapeIdMap } = useStore.getState()
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

  const handleMeasureVolume = useCallback(async () => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }

    const { shapeIdMap } = useStore.getState()
    const selectedObject = selectedObjects[0]
    const backendId = shapeIdMap.get(selectedObject.id)

    if (!backendId) {
      toast.error("Shape not found in backend")
      return
    }

    try {
      const analysis = await cadService.analyze(backendId)
      setMeasureDialog({
        open: true,
        title: `Volume & Surface Area: ${selectedObject.name || "Unnamed"}`,
        results: [
          { label: "Volume", value: `${analysis.volume.toFixed(3)} units³` },
          { label: "Surface Area", value: `${analysis.surface_area.toFixed(3)} units²` },
        ],
      })
    } catch (error) {
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects])

  const handleMeasureBoundingBox = useCallback(async () => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }

    const { shapeIdMap } = useStore.getState()
    const selectedObject = selectedObjects[0]
    const backendId = shapeIdMap.get(selectedObject.id)

    if (!backendId) {
      toast.error("Shape not found in backend")
      return
    }

    try {
      const analysis = await cadService.analyze(backendId)
      if (!analysis.bounding_box) {
        toast.error("No bounding box available")
        return
      }

      const bbox = analysis.bounding_box
      const width = bbox.max_x - bbox.min_x
      const height = bbox.max_y - bbox.min_y
      const depth = bbox.max_z - bbox.min_z

      setMeasureDialog({
        open: true,
        title: `Bounding Box: ${selectedObject.name || "Unnamed"}`,
        results: [
          { label: "Width (X)", value: `${width.toFixed(3)} units` },
          { label: "Height (Y)", value: `${height.toFixed(3)} units` },
          { label: "Depth (Z)", value: `${depth.toFixed(3)} units` },
          {
            label: "Min Point",
            value: `(${bbox.min_x.toFixed(2)}, ${bbox.min_y.toFixed(2)}, ${bbox.min_z.toFixed(2)})`,
          },
          {
            label: "Max Point",
            value: `(${bbox.max_x.toFixed(2)}, ${bbox.max_y.toFixed(2)}, ${bbox.max_z.toFixed(2)})`,
          },
        ],
      })
    } catch (error) {
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects])

  // View menu handlers
  const handleViewMode = useCallback(
    (mode: "solid" | "wireframe" | "xray") => {
      setViewportSettings({ viewMode: mode })
    },
    [setViewportSettings]
  )

  const handleToggleGrid = useCallback(() => {
    setViewportSettings({ showGrid: !viewportSettings.showGrid })
  }, [setViewportSettings, viewportSettings.showGrid])

  const handleToggleAxes = useCallback(() => {
    setViewportSettings({ showAxes: !viewportSettings.showAxes })
  }, [setViewportSettings, viewportSettings.showAxes])

  const handleToggleShadows = useCallback(() => {
    setViewportSettings({ shadows: !viewportSettings.shadows })
  }, [setViewportSettings, viewportSettings.shadows])

  // Tools menu handlers
  const handleAnalyze = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    toast.info("Advanced analysis - coming soon")
  }, [selectedObjects])

  const handleRepair = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    toast.info("Shape repair - coming soon")
  }, [selectedObjects])

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border/40 bg-background px-2 py-1",
        className
      )}
    >
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={File01Icon} className="mr-1.5 size-3.5" />
            File
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={handleNew}>
            <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
            <span>New Project</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+N</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpen}>
            <HugeiconsIcon icon={FolderOpenIcon} className="mr-2 size-4" />
            <span>Open Project</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+O</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSave}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Save Project</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSave()}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Save As...</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+Shift+S</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleExport("STEP")}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Export STEP</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("IGES")}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Export IGES</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("STL")}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Export STL</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("OBJ")}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Export OBJ</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("GLB")}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 size-4" />
            <span>Export GLB</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={Edit01Icon} className="mr-1.5 size-3.5" />
            Edit
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={undo} disabled={!canUndo}>
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="mr-2 size-4" />
            <span>Undo</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+Z</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={redo} disabled={!canRedo}>
            <HugeiconsIcon icon={ArrowTurnForwardIcon} className="mr-2 size-4" />
            <span>Redo</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {isMacOS ? `${modKey}+Shift+Z` : `${modKey}+Y`}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
            <span>Copy</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+C</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePaste}>
            <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
            <span>Paste</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+V</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
            <span>Duplicate</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+D</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
            <span>Delete</span>
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={Add01Icon} className="mr-1.5 size-3.5" />
            Create
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Primitives</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Box")}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Box</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+B</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Cylinder")}>
            <HugeiconsIcon icon={Cylinder01Icon} className="mr-2 size-4" />
            <span>Cylinder</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+Y</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Sphere")}>
            <HugeiconsIcon icon={CircleIcon} className="mr-2 size-4" />
            <span>Sphere</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+P</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Cone")}>
            <HugeiconsIcon icon={TriangleIcon} className="mr-2 size-4" />
            <span>Cone</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+O</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Torus")}>
            <HugeiconsIcon icon={CircleIcon} className="mr-2 size-4" />
            <span>Torus</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+U</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Helix")}>
            <HugeiconsIcon icon={Cylinder01Icon} className="mr-2 size-4" />
            <span>Helix</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+H</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Sketch</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleCreatePrimitive("Sketch")}>
            <HugeiconsIcon icon={PencilEdit01Icon} className="mr-2 size-4" />
            <span>New Sketch</span>
            <span className="ml-auto text-xs text-muted-foreground">Shift+K</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modify Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={Settings02Icon} className="mr-1.5 size-3.5" />
            Modify
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Edges</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleFillet} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4" />
            <span>Fillet (Round)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleChamfer} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4" />
            <span>Chamfer (Bevel)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Boolean Operations</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleBooleanUnion} disabled={selectedObjects.length !== 2}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Union (Fuse)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBooleanSubtract} disabled={selectedObjects.length !== 2}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Subtract (Cut)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleBooleanIntersect}
            disabled={selectedObjects.length !== 2}
          >
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Intersect (Common)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Advanced</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleOffset} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4" />
            <span>Offset Solid</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShell} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Shell (Hollow)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info("Thicken - coming soon")}
            disabled={selectedObjects.length === 0}
          >
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Thicken Surface</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info("Draft - coming soon")}
            disabled={selectedObjects.length === 0}
          >
            <HugeiconsIcon icon={TriangleIcon} className="mr-2 size-4" />
            <span>Add Draft Angle</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Measure Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={RulerIcon} className="mr-1.5 size-3.5" />
            Measure
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={handleMeasureDistance} disabled={selectedObjects.length !== 2}>
            <HugeiconsIcon icon={RulerIcon} className="mr-2 size-4" />
            <span>Distance</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info("Point to Shape - coming soon")}
            disabled={selectedObjects.length === 0}
          >
            <HugeiconsIcon icon={RulerIcon} className="mr-2 size-4" />
            <span>Point to Shape</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleMeasureProperties}
            disabled={selectedObjects.length === 0}
          >
            <HugeiconsIcon icon={RulerIcon} className="mr-2 size-4" />
            <span>Properties</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMeasureVolume} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Volume & Surface Area</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleMeasureBoundingBox}
            disabled={selectedObjects.length === 0}
          >
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Bounding Box</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={ViewIcon} className="mr-1.5 size-3.5" />
            View
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Display Mode</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleViewMode("solid")}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Solid</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleViewMode("wireframe")}>
            <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
            <span>Wireframe</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleViewMode("xray")}>
            <HugeiconsIcon icon={ViewIcon} className="mr-2 size-4" />
            <span>X-Ray</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={viewportSettings.showGrid}
            onCheckedChange={handleToggleGrid}
          >
            Show Grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={viewportSettings.showAxes}
            onCheckedChange={handleToggleAxes}
          >
            Show Axes
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={viewportSettings.shadows}
            onCheckedChange={handleToggleShadows}
          >
            Shadows
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tools Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MenuButton>
            <HugeiconsIcon icon={ToolsIcon} className="mr-1.5 size-3.5" />
            Tools
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={handleAnalyze} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={RulerIcon} className="mr-2 size-4" />
            <span>Advanced Analysis</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRepair} disabled={selectedObjects.length === 0}>
            <HugeiconsIcon icon={ToolsIcon} className="mr-2 size-4" />
            <span>Repair Shape</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast.info("Settings - coming soon")}>
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4" />
            <span>Settings</span>
            <span className="ml-auto text-xs text-muted-foreground">{modKey}+,</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Parameter Dialog for Fillet, Chamfer, Shell, Offset */}
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
              {parameterDialog.operation === "offset" && "Offset Solid"}
            </DialogTitle>
            <DialogDescription>
              {parameterDialog.operation === "fillet" && "Enter the radius for rounding edges"}
              {parameterDialog.operation === "chamfer" && "Enter the distance for beveling edges"}
              {parameterDialog.operation === "shell" && "Enter the wall thickness"}
              {parameterDialog.operation === "offset" && "Enter the offset distance"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="parameter-value">
                {parameterDialog.operation === "fillet" && "Radius"}
                {parameterDialog.operation === "chamfer" && "Distance"}
                {parameterDialog.operation === "shell" && "Thickness"}
                {parameterDialog.operation === "offset" && "Offset"}
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
    </div>
  )
}

export default Menubar
