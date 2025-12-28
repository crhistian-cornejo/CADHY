/**
 * @fileoverview Space Node Editor - Visual node-based editor
 * @module editors/space_node
 */

import { Button, Input, ScrollArea } from "@cadhy/ui"
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Loading02Icon,
  PlayIcon,
  Search01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useNodeEditorStore } from "./SN_store"
import type { Connection, Node, NodeCategory, Socket } from "./SN_types"
import { getNodeDefinition, getSocketColor, NODE_DEFINITIONS } from "./SN_types"

// ============================================================================
// SOCKET COMPONENT
// ============================================================================

interface SocketComponentProps {
  socket: Socket
  nodeId: string
  isOutput: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
}

function SocketComponent({ socket, onMouseDown, onMouseUp }: SocketComponentProps) {
  const color = getSocketColor(socket.type)
  const hasConnections = socket.connections.length > 0

  return (
    <div className={`flex items-center gap-2 ${socket.isInput ? "" : "flex-row-reverse"}`}>
      <div
        className="w-3 h-3 rounded-full cursor-pointer border-2 border-background transition-transform hover:scale-125"
        style={{
          backgroundColor: hasConnections ? color : "transparent",
          borderColor: color,
        }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      />
      <span className="text-xs text-foreground/70">{socket.name}</span>
    </div>
  )
}

// ============================================================================
// NODE COMPONENT
// ============================================================================

interface NodeComponentProps {
  node: Node
  isSelected: boolean
  onSelect: (additive: boolean) => void
  onDragStart: () => void
  onDragEnd: () => void
  onSocketMouseDown: (socketId: string, isOutput: boolean) => void
  onSocketMouseUp: (socketId: string) => void
}

function NodeComponent({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onSocketMouseDown,
  onSocketMouseUp,
}: NodeComponentProps) {
  const definition = getNodeDefinition(node.typeId)
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    onSelect(e.ctrlKey || e.metaKey)
    isDragging.current = true
    startPos.current = { x: e.clientX, y: e.clientY }
    onDragStart()
  }

  useEffect(() => {
    if (!isDragging.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      // Drag handled by parent
    }

    const handleMouseUp = () => {
      isDragging.current = false
      onDragEnd()
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [onDragEnd])

  return (
    <div
      className={`absolute min-w-[160px] rounded-lg shadow-lg overflow-hidden ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${node.muted ? "opacity-50" : ""}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        backgroundColor: "hsl(var(--card))",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-sm font-medium text-white flex items-center justify-between"
        style={{ backgroundColor: definition?.color ?? "#666" }}
      >
        <span>{node.label ?? definition?.name ?? "Node"}</span>
        {node.muted && <HugeiconsIcon icon={ViewOffSlashIcon} className="h-3 w-3" />}
      </div>

      {/* Body */}
      {!node.collapsed && (
        <div className="p-3 flex gap-4">
          {/* Inputs */}
          <div className="flex flex-col gap-2">
            {node.inputs.map((socket) => (
              <SocketComponent
                key={socket.id}
                socket={socket}
                nodeId={node.id}
                isOutput={false}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onSocketMouseDown(socket.id, false)
                }}
                onMouseUp={(e) => {
                  e.stopPropagation()
                  onSocketMouseUp(socket.id)
                }}
              />
            ))}
          </div>

          {/* Outputs */}
          <div className="flex flex-col gap-2 ml-auto">
            {node.outputs.map((socket) => (
              <SocketComponent
                key={socket.id}
                socket={socket}
                nodeId={node.id}
                isOutput
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onSocketMouseDown(socket.id, true)
                }}
                onMouseUp={(e) => {
                  e.stopPropagation()
                  onSocketMouseUp(socket.id)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CONNECTION COMPONENT
// ============================================================================

interface ConnectionComponentProps {
  connection: Connection
  nodes: Node[]
}

function ConnectionComponent({ connection, nodes }: ConnectionComponentProps) {
  const fromNode = nodes.find((n) => n.id === connection.fromNodeId)
  const toNode = nodes.find((n) => n.id === connection.toNodeId)

  if (!fromNode || !toNode) return null

  const fromSocket = fromNode.outputs.find((s) => s.id === connection.fromSocketId)
  if (!fromSocket) return null

  // Calculate positions (simplified)
  const x1 = fromNode.position.x + 160 // Right side of node
  const y1 = fromNode.position.y + 50 // Approximate socket position
  const x2 = toNode.position.x // Left side of node
  const y2 = toNode.position.y + 50

  const color = getSocketColor(fromSocket.type)

  // Bezier control points
  const cx1 = x1 + Math.abs(x2 - x1) * 0.5
  const cy1 = y1
  const cx2 = x2 - Math.abs(x2 - x1) * 0.5
  const cy2 = y2

  return (
    <path
      d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeOpacity={0.8}
    />
  )
}

// ============================================================================
// NODE PALETTE
// ============================================================================

interface NodePaletteProps {
  onAddNode: (typeId: string) => void
}

function NodePalette({ onAddNode }: NodePaletteProps) {
  const [search, setSearch] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(["input", "modifier"])
  )

  const categories: NodeCategory[] = [
    "input",
    "geometry",
    "transform",
    "modifier",
    "math",
    "output",
  ]

  const filteredNodes = useMemo(() => {
    if (!search) return NODE_DEFINITIONS
    const lower = search.toLowerCase()
    return NODE_DEFINITIONS.filter(
      (n) => n.name.toLowerCase().includes(lower) || n.description.toLowerCase().includes(lower)
    )
  }, [search])

  const toggleCategory = (cat: NodeCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(cat)) {
        newSet.delete(cat)
      } else {
        newSet.add(cat)
      }
      return newSet
    })
  }

  return (
    <div className="w-56 border-r bg-background flex flex-col">
      <div className="p-2 border-b">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {categories.map((category) => {
            const nodesInCategory = filteredNodes.filter((n) => n.category === category)
            if (nodesInCategory.length === 0) return null

            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="mb-2">
                <button
                  className="flex items-center gap-1 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground py-1"
                  onClick={() => toggleCategory(category)}
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>

                {isExpanded && (
                  <div className="pl-4 space-y-1">
                    {nodesInCategory.map((node) => (
                      <button
                        key={node.id}
                        className="flex items-center gap-2 w-full text-left text-sm py-1 px-2 rounded hover:bg-accent transition-colors"
                        onClick={() => onAddNode(node.id)}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: node.color }}
                        />
                        {node.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// MAIN NODE EDITOR
// ============================================================================

export function NodeEditor() {
  const {
    getActiveGraph,
    selectedNodeIds,
    viewPosition,
    viewZoom,
    connectingFromSocket,
    isEvaluating,
    lastEvalResult,
    addNode,
    deleteSelectedNodes,
    selectNode,
    deselectAll,
    startConnection,
    endConnection,
    cancelConnection,
    startDrag,
    endDrag,
    pan,
    zoom,
    evaluate,
  } = useNodeEditorStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const graph = getActiveGraph()

  const handleAddNode = useCallback(
    (typeId: string) => {
      addNode(typeId, {
        x: -viewPosition.x + 200,
        y: -viewPosition.y + 100,
      })
    },
    [addNode, viewPosition]
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        zoom(factor, { x: e.clientX, y: e.clientY })
      } else {
        pan(-e.deltaX, -e.deltaY)
      }
    },
    [pan, zoom]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      } else if (e.button === 0) {
        deselectAll()
        if (connectingFromSocket) {
          cancelConnection()
        }
      }
    },
    [deselectAll, cancelConnection, connectingFromSocket]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.current.x
        const dy = e.clientY - lastMousePos.current.y
        lastMousePos.current = { x: e.clientX, y: e.clientY }
        pan(dx, dy)
      }
    },
    [isPanning, pan]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedNodes()
      }
      if (e.key === "Escape") {
        cancelConnection()
        deselectAll()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [deleteSelectedNodes, cancelConnection, deselectAll])

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No node graph selected. Create a new graph to get started.
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <NodePalette onAddNode={handleAddNode} />

      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-grid-pattern"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: `${20 * viewZoom}px ${20 * viewZoom}px`,
            backgroundPosition: `${viewPosition.x}px ${viewPosition.y}px`,
          }}
        />

        {/* Connections layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewPosition.x}px, ${viewPosition.y}px) scale(${viewZoom})`,
            transformOrigin: "0 0",
          }}
        >
          {graph.connections.map((connection) => (
            <ConnectionComponent key={connection.id} connection={connection} nodes={graph.nodes} />
          ))}
        </svg>

        {/* Nodes layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${viewPosition.x}px, ${viewPosition.y}px) scale(${viewZoom})`,
            transformOrigin: "0 0",
          }}
        >
          {graph.nodes.map((node) => (
            <NodeComponent
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.has(node.id)}
              onSelect={(additive) => selectNode(node.id, additive)}
              onDragStart={() => startDrag(node.id)}
              onDragEnd={endDrag}
              onSocketMouseDown={(socketId, isOutput) =>
                startConnection(node.id, socketId, isOutput)
              }
              onSocketMouseUp={(socketId) => endConnection(node.id, socketId)}
            />
          ))}
        </div>

        {/* Toolbar */}
        <div className="absolute top-2 right-2 flex gap-2">
          <Button variant="default" size="sm" onClick={() => evaluate()} disabled={isEvaluating}>
            {isEvaluating ? (
              <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <HugeiconsIcon icon={PlayIcon} className="h-4 w-4 mr-1" />
            )}
            Evaluate
          </Button>
          <Button variant="secondary" size="sm" onClick={deleteSelectedNodes}>
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        {/* Evaluation Status */}
        {lastEvalResult && (
          <div className="absolute bottom-2 right-2 text-xs bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              {lastEvalResult.success ? (
                <HugeiconsIcon icon={ViewIcon} className="h-4 w-4 text-green-500" />
              ) : (
                <HugeiconsIcon icon={ViewOffSlashIcon} className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium">
                {lastEvalResult.success ? "Evaluation Complete" : "Evaluation Failed"}
              </span>
            </div>
            <div className="text-muted-foreground">
              {lastEvalResult.nodeResults.length} nodes evaluated in{" "}
              {lastEvalResult.totalTime.toFixed(0)}ms
            </div>
            {lastEvalResult.errors.length > 0 && (
              <div className="mt-2 text-destructive text-xs">
                {lastEvalResult.errors.slice(0, 3).map((err, i) => (
                  <div key={i} className="truncate">
                    • {err}
                  </div>
                ))}
                {lastEvalResult.errors.length > 3 && (
                  <div>...and {lastEvalResult.errors.length - 3} more errors</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NodeEditor
