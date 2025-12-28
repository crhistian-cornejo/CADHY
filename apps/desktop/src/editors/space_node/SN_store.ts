/**
 * @fileoverview Space Node Store - Node graph state management
 * @module editors/space_node
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

import { evaluateGraph, type GraphEvalResult } from "./SN_eval"
import type { Connection, Node, NodeGraph } from "./SN_types"
import { createNode } from "./SN_types"

// ============================================================================
// STORE STATE
// ============================================================================

interface NodeEditorStore {
  // Graph state
  activeGraphId: string | null
  graphs: NodeGraph[]

  // Selection
  selectedNodeIds: Set<string>
  hoveredNodeId: string | null
  hoveredSocketId: string | null

  // Editing
  draggingNodeId: string | null
  connectingFromSocket: { nodeId: string; socketId: string; isOutput: boolean } | null

  // View
  viewPosition: { x: number; y: number }
  viewZoom: number

  // Actions - Graph
  createGraph: (name: string) => NodeGraph
  deleteGraph: (id: string) => void
  setActiveGraph: (id: string) => void
  getActiveGraph: () => NodeGraph | null

  // Actions - Node
  addNode: (typeId: string, position: { x: number; y: number }) => Node
  deleteNode: (id: string) => void
  deleteSelectedNodes: () => void
  moveNode: (id: string, position: { x: number; y: number }) => void
  duplicateSelectedNodes: () => void
  setNodeProperty: (nodeId: string, key: string, value: unknown) => void
  toggleNodeMuted: (id: string) => void
  toggleNodeCollapsed: (id: string) => void

  // Actions - Selection
  selectNode: (id: string, additive?: boolean) => void
  deselectAll: () => void
  selectAll: () => void
  setHoveredNode: (id: string | null) => void
  setHoveredSocket: (id: string | null) => void

  // Actions - Connections
  startConnection: (nodeId: string, socketId: string, isOutput: boolean) => void
  endConnection: (nodeId: string, socketId: string) => void
  cancelConnection: () => void
  deleteConnection: (id: string) => void
  getSocketConnections: (socketId: string) => Connection[]

  // Actions - View
  pan: (dx: number, dy: number) => void
  zoom: (factor: number, center?: { x: number; y: number }) => void
  resetView: () => void

  // Actions - Drag
  startDrag: (nodeId: string) => void
  endDrag: () => void

  // Evaluation state
  isEvaluating: boolean
  lastEvalResult: GraphEvalResult | null
  autoEvaluate: boolean

  // Actions - Evaluation
  evaluate: () => Promise<GraphEvalResult | null>
  setAutoEvaluate: (enabled: boolean) => void
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

const useNodeEditorStore = create<NodeEditorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      activeGraphId: null,
      graphs: [],
      selectedNodeIds: new Set(),
      hoveredNodeId: null,
      hoveredSocketId: null,
      draggingNodeId: null,
      connectingFromSocket: null,
      viewPosition: { x: 0, y: 0 },
      viewZoom: 1,

      // Graph actions
      createGraph: (name: string) => {
        const graph: NodeGraph = {
          id: crypto.randomUUID(),
          name,
          nodes: [],
          connections: [],
          viewPosition: { x: 0, y: 0 },
          viewZoom: 1,
        }

        set((state) => ({
          graphs: [...state.graphs, graph],
          activeGraphId: graph.id,
        }))

        return graph
      },

      deleteGraph: (id: string) => {
        set((state) => ({
          graphs: state.graphs.filter((g) => g.id !== id),
          activeGraphId: state.activeGraphId === id ? null : state.activeGraphId,
        }))
      },

      setActiveGraph: (id: string) => {
        const graph = get().graphs.find((g) => g.id === id)
        if (graph) {
          set({
            activeGraphId: id,
            viewPosition: graph.viewPosition,
            viewZoom: graph.viewZoom,
            selectedNodeIds: new Set(),
          })
        }
      },

      getActiveGraph: () => {
        const { activeGraphId, graphs } = get()
        return graphs.find((g) => g.id === activeGraphId) ?? null
      },

      // Node actions
      addNode: (typeId: string, position: { x: number; y: number }) => {
        const node = createNode(typeId, position)

        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id ? { ...g, nodes: [...g.nodes, node] } : g
            ),
            selectedNodeIds: new Set([node.id]),
          }
        })

        return node
      },

      deleteNode: (id: string) => {
        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          // Also delete connections to/from this node
          const newConnections = graph.connections.filter(
            (c) => c.fromNodeId !== id && c.toNodeId !== id
          )

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id
                ? {
                    ...g,
                    nodes: g.nodes.filter((n) => n.id !== id),
                    connections: newConnections,
                  }
                : g
            ),
            selectedNodeIds: new Set([...state.selectedNodeIds].filter((i) => i !== id)),
          }
        })
      },

      deleteSelectedNodes: () => {
        const { selectedNodeIds, deleteNode } = get()
        selectedNodeIds.forEach((id) => deleteNode(id))
      },

      moveNode: (id: string, position: { x: number; y: number }) => {
        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id
                ? {
                    ...g,
                    nodes: g.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
                  }
                : g
            ),
          }
        })
      },

      duplicateSelectedNodes: () => {
        const { selectedNodeIds, getActiveGraph, addNode } = get()
        const graph = getActiveGraph()
        if (!graph) return

        const newIds: string[] = []
        const offset = 50

        selectedNodeIds.forEach((id) => {
          const node = graph.nodes.find((n) => n.id === id)
          if (node) {
            const newNode = addNode(node.typeId, {
              x: node.position.x + offset,
              y: node.position.y + offset,
            })
            newIds.push(newNode.id)
          }
        })

        set({ selectedNodeIds: new Set(newIds) })
      },

      setNodeProperty: (nodeId: string, key: string, value: unknown) => {
        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id
                ? {
                    ...g,
                    nodes: g.nodes.map((n) =>
                      n.id === nodeId ? { ...n, properties: { ...n.properties, [key]: value } } : n
                    ),
                  }
                : g
            ),
          }
        })
      },

      toggleNodeMuted: (id: string) => {
        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id
                ? {
                    ...g,
                    nodes: g.nodes.map((n) => (n.id === id ? { ...n, muted: !n.muted } : n)),
                  }
                : g
            ),
          }
        })
      },

      toggleNodeCollapsed: (id: string) => {
        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id
                ? {
                    ...g,
                    nodes: g.nodes.map((n) =>
                      n.id === id ? { ...n, collapsed: !n.collapsed } : n
                    ),
                  }
                : g
            ),
          }
        })
      },

      // Selection
      selectNode: (id: string, additive = false) => {
        set((state) => {
          const newSelection = additive ? new Set(state.selectedNodeIds) : new Set<string>()
          newSelection.add(id)
          return { selectedNodeIds: newSelection }
        })
      },

      deselectAll: () => {
        set({ selectedNodeIds: new Set() })
      },

      selectAll: () => {
        const graph = get().getActiveGraph()
        if (graph) {
          set({ selectedNodeIds: new Set(graph.nodes.map((n) => n.id)) })
        }
      },

      setHoveredNode: (id: string | null) => {
        set({ hoveredNodeId: id })
      },

      setHoveredSocket: (id: string | null) => {
        set({ hoveredSocketId: id })
      },

      // Connections
      startConnection: (nodeId: string, socketId: string, isOutput: boolean) => {
        set({ connectingFromSocket: { nodeId, socketId, isOutput } })
      },

      endConnection: (nodeId: string, socketId: string) => {
        const { connectingFromSocket, getActiveGraph } = get()
        if (!connectingFromSocket) return

        const graph = getActiveGraph()
        if (!graph) return

        // Can't connect to same node
        if (connectingFromSocket.nodeId === nodeId) {
          set({ connectingFromSocket: null })
          return
        }

        // Determine from/to based on output/input
        let fromNodeId: string
        let fromSocketId: string
        let toNodeId: string
        let toSocketId: string

        if (connectingFromSocket.isOutput) {
          fromNodeId = connectingFromSocket.nodeId
          fromSocketId = connectingFromSocket.socketId
          toNodeId = nodeId
          toSocketId = socketId
        } else {
          fromNodeId = nodeId
          fromSocketId = socketId
          toNodeId = connectingFromSocket.nodeId
          toSocketId = connectingFromSocket.socketId
        }

        // Check if connection already exists
        const exists = graph.connections.some(
          (c) =>
            c.fromNodeId === fromNodeId &&
            c.fromSocketId === fromSocketId &&
            c.toNodeId === toNodeId &&
            c.toSocketId === toSocketId
        )

        if (!exists) {
          const connection: Connection = {
            id: crypto.randomUUID(),
            fromNodeId,
            fromSocketId,
            toNodeId,
            toSocketId,
          }

          set((state) => ({
            graphs: state.graphs.map((g) =>
              g.id === graph.id ? { ...g, connections: [...g.connections, connection] } : g
            ),
            connectingFromSocket: null,
          }))
        } else {
          set({ connectingFromSocket: null })
        }
      },

      cancelConnection: () => {
        set({ connectingFromSocket: null })
      },

      deleteConnection: (id: string) => {
        set((state) => {
          const graph = state.graphs.find((g) => g.id === state.activeGraphId)
          if (!graph) return state

          return {
            graphs: state.graphs.map((g) =>
              g.id === graph.id
                ? { ...g, connections: g.connections.filter((c) => c.id !== id) }
                : g
            ),
          }
        })
      },

      getSocketConnections: (socketId: string) => {
        const graph = get().getActiveGraph()
        if (!graph) return []

        return graph.connections.filter(
          (c) => c.fromSocketId === socketId || c.toSocketId === socketId
        )
      },

      // View
      pan: (dx: number, dy: number) => {
        set((state) => ({
          viewPosition: {
            x: state.viewPosition.x + dx,
            y: state.viewPosition.y + dy,
          },
        }))
      },

      zoom: (factor: number, center?: { x: number; y: number }) => {
        set((state) => {
          const newZoom = Math.max(0.1, Math.min(2, state.viewZoom * factor))

          // If center provided, adjust view position to zoom toward center
          if (center) {
            const dx = (center.x - state.viewPosition.x) * (1 - factor)
            const dy = (center.y - state.viewPosition.y) * (1 - factor)
            return {
              viewZoom: newZoom,
              viewPosition: {
                x: state.viewPosition.x + dx,
                y: state.viewPosition.y + dy,
              },
            }
          }

          return { viewZoom: newZoom }
        })
      },

      resetView: () => {
        set({ viewPosition: { x: 0, y: 0 }, viewZoom: 1 })
      },

      // Drag
      startDrag: (nodeId: string) => {
        set({ draggingNodeId: nodeId })
      },

      endDrag: () => {
        set({ draggingNodeId: null })
      },

      // Evaluation state
      isEvaluating: false,
      lastEvalResult: null,
      autoEvaluate: true,

      // Evaluation actions
      evaluate: async () => {
        const graph = get().getActiveGraph()
        if (!graph) return null

        set({ isEvaluating: true })

        try {
          const result = await evaluateGraph(graph)
          set({ lastEvalResult: result, isEvaluating: false })
          return result
        } catch (error) {
          console.error("[NodeEditor] Evaluation failed:", error)
          set({ isEvaluating: false })
          return null
        }
      },

      setAutoEvaluate: (enabled: boolean) => {
        set({ autoEvaluate: enabled })
      },
    }),
    {
      name: "cadhy-node-editor",
      partialize: (state) => ({
        graphs: state.graphs,
        activeGraphId: state.activeGraphId,
        autoEvaluate: state.autoEvaluate,
      }),
    }
  )
)

export { useNodeEditorStore }
