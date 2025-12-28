/**
 * Topology Hook Tests - @cadhy/desktop
 *
 * Tests for the topology hook helper functions:
 * - getEdgesForVertex
 * - getFacesForEdge
 *
 * Note: The React hook itself would require renderHook from @testing-library/react,
 * so we focus on testing the pure helper functions.
 */

import { describe, expect, test } from "bun:test"
import { getEdgesForVertex, getFacesForEdge } from "../core/kernel/KE_topology_hook"
import type { TopologyData } from "../core/services/SV_cad"

// Helper to create mock topology data
function createMockTopologyData(overrides: Partial<TopologyData> = {}): TopologyData {
  return {
    vertices: [
      { index: 0, x: 0, y: 0, z: 0, tolerance: 0.001, num_edges: 3 },
      { index: 1, x: 1, y: 0, z: 0, tolerance: 0.001, num_edges: 3 },
      { index: 2, x: 1, y: 1, z: 0, tolerance: 0.001, num_edges: 3 },
      { index: 3, x: 0, y: 1, z: 0, tolerance: 0.001, num_edges: 3 },
    ],
    edges: [
      {
        index: 0,
        curve_type: "Line",
        start_vertex: 0,
        end_vertex: 1,
        length: 1,
        is_degenerated: false,
        points: [],
        adjacent_faces: [0],
      },
      {
        index: 1,
        curve_type: "Line",
        start_vertex: 1,
        end_vertex: 2,
        length: 1,
        is_degenerated: false,
        points: [],
        adjacent_faces: [0],
      },
      {
        index: 2,
        curve_type: "Line",
        start_vertex: 2,
        end_vertex: 3,
        length: 1,
        is_degenerated: false,
        points: [],
        adjacent_faces: [0],
      },
      {
        index: 3,
        curve_type: "Line",
        start_vertex: 3,
        end_vertex: 0,
        length: 1,
        is_degenerated: false,
        points: [],
        adjacent_faces: [0],
      },
    ],
    faces: [
      {
        index: 0,
        surface_type: "Plane",
        area: 1,
        is_reversed: false,
        num_edges: 4,
        boundary_edges: [0, 1, 2, 3],
        center: [0.5, 0.5, 0],
        normal: [0, 0, 1],
      },
    ],
    // Vertex 0 connects to edges 0 and 3
    // Vertex 1 connects to edges 0 and 1
    // Vertex 2 connects to edges 1 and 2
    // Vertex 3 connects to edges 2 and 3
    vertex_to_edges: [0, 3, 0, 1, 1, 2, 2, 3],
    vertex_to_edges_offset: [0, 2, 4, 6, 8],
    // All edges connect to face 0
    edge_to_faces: [0, 0, 0, 0],
    edge_to_faces_offset: [0, 1, 2, 3, 4],
    ...overrides,
  }
}

describe("Topology Helper Functions", () => {
  // ============================================================
  // getEdgesForVertex Tests
  // ============================================================

  describe("getEdgesForVertex", () => {
    test("should return edges for vertex 0", () => {
      const topology = createMockTopologyData()

      const edges = getEdgesForVertex(topology, 0)

      expect(edges).toEqual([0, 3])
    })

    test("should return edges for vertex 1", () => {
      const topology = createMockTopologyData()

      const edges = getEdgesForVertex(topology, 1)

      expect(edges).toEqual([0, 1])
    })

    test("should return edges for vertex 2", () => {
      const topology = createMockTopologyData()

      const edges = getEdgesForVertex(topology, 2)

      expect(edges).toEqual([1, 2])
    })

    test("should return edges for vertex 3", () => {
      const topology = createMockTopologyData()

      const edges = getEdgesForVertex(topology, 3)

      expect(edges).toEqual([2, 3])
    })

    test("should return empty array for out-of-bounds vertex", () => {
      const topology = createMockTopologyData()

      const edges = getEdgesForVertex(topology, 10)

      expect(edges).toEqual([])
    })

    test("should return empty array for last vertex (no next offset)", () => {
      const topology = createMockTopologyData({
        vertex_to_edges_offset: [0, 2, 4, 6], // Missing last offset
      })

      const edges = getEdgesForVertex(topology, 3)

      expect(edges).toEqual([])
    })

    test("should handle vertex with many edges", () => {
      const topology = createMockTopologyData({
        vertex_to_edges: [0, 1, 2, 3, 4, 5], // 6 edges on vertex 0
        vertex_to_edges_offset: [0, 6, 6, 6, 6],
      })

      const edges = getEdgesForVertex(topology, 0)

      expect(edges).toEqual([0, 1, 2, 3, 4, 5])
      expect(edges).toHaveLength(6)
    })

    test("should handle vertex with no edges", () => {
      const topology = createMockTopologyData({
        vertex_to_edges: [],
        vertex_to_edges_offset: [0, 0, 0, 0, 0],
      })

      const edges = getEdgesForVertex(topology, 0)

      expect(edges).toEqual([])
    })
  })

  // ============================================================
  // getFacesForEdge Tests
  // ============================================================

  describe("getFacesForEdge", () => {
    test("should return face 0 for edge 0", () => {
      const topology = createMockTopologyData()

      const faces = getFacesForEdge(topology, 0)

      expect(faces).toEqual([0])
    })

    test("should return face for each edge", () => {
      const topology = createMockTopologyData()

      expect(getFacesForEdge(topology, 0)).toEqual([0])
      expect(getFacesForEdge(topology, 1)).toEqual([0])
      expect(getFacesForEdge(topology, 2)).toEqual([0])
      expect(getFacesForEdge(topology, 3)).toEqual([0])
    })

    test("should return empty array for out-of-bounds edge", () => {
      const topology = createMockTopologyData()

      const faces = getFacesForEdge(topology, 10)

      expect(faces).toEqual([])
    })

    test("should handle edge shared by multiple faces", () => {
      const topology = createMockTopologyData({
        // Edge 0 is shared between faces 0 and 1
        edge_to_faces: [0, 1, 0, 0, 0],
        edge_to_faces_offset: [0, 2, 3, 4, 5],
      })

      const faces = getFacesForEdge(topology, 0)

      expect(faces).toEqual([0, 1])
      expect(faces).toHaveLength(2)
    })

    test("should handle edge with no adjacent faces", () => {
      const topology = createMockTopologyData({
        edge_to_faces: [],
        edge_to_faces_offset: [0, 0, 0, 0, 0],
      })

      const faces = getFacesForEdge(topology, 0)

      expect(faces).toEqual([])
    })

    test("should handle last edge correctly", () => {
      const topology = createMockTopologyData()

      const faces = getFacesForEdge(topology, 3)

      expect(faces).toEqual([0])
    })
  })

  // ============================================================
  // Edge Cases and Complex Topology
  // ============================================================

  describe("Complex Topology", () => {
    test("should handle a cube topology (8 vertices, 12 edges, 6 faces)", () => {
      // Simplified cube topology
      const cubeTopology: TopologyData = {
        vertices: Array.from({ length: 8 }, (_, i) => ({
          index: i,
          x: i % 2,
          y: Math.floor(i / 2) % 2,
          z: Math.floor(i / 4),
          tolerance: 0.001,
          num_edges: 3,
        })),
        edges: Array.from({ length: 12 }, (_, i) => ({
          index: i,
          curve_type: "Line",
          start_vertex: 0,
          end_vertex: 1,
          length: 1,
          is_degenerated: false,
          points: [],
          adjacent_faces: [0, 1],
        })),
        faces: Array.from({ length: 6 }, (_, i) => ({
          index: i,
          surface_type: "Plane",
          area: 1,
          is_reversed: false,
          num_edges: 4,
          boundary_edges: [],
          center: [0.5, 0.5, 0.5],
          normal: [0, 0, 1],
        })),
        // Each vertex has 3 edges
        vertex_to_edges: [
          0,
          3,
          8, // v0
          0,
          1,
          9, // v1
          1,
          2,
          10, // v2
          2,
          3,
          11, // v3
          4,
          7,
          8, // v4
          4,
          5,
          9, // v5
          5,
          6,
          10, // v6
          6,
          7,
          11, // v7
        ],
        vertex_to_edges_offset: [0, 3, 6, 9, 12, 15, 18, 21, 24],
        // Each edge has 2 adjacent faces
        edge_to_faces: [
          0,
          1, // e0
          0,
          2, // e1
          0,
          3, // e2
          0,
          4, // e3
          1,
          5, // e4
          2,
          5, // e5
          3,
          5, // e6
          4,
          5, // e7
          1,
          4, // e8
          1,
          2, // e9
          2,
          3, // e10
          3,
          4, // e11
        ],
        edge_to_faces_offset: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
      }

      // Test vertex 0 has 3 edges
      const edgesV0 = getEdgesForVertex(cubeTopology, 0)
      expect(edgesV0).toHaveLength(3)
      expect(edgesV0).toEqual([0, 3, 8])

      // Test vertex 7 has 3 edges
      const edgesV7 = getEdgesForVertex(cubeTopology, 7)
      expect(edgesV7).toHaveLength(3)
      expect(edgesV7).toEqual([6, 7, 11])

      // Test edge 0 has 2 faces
      const facesE0 = getFacesForEdge(cubeTopology, 0)
      expect(facesE0).toHaveLength(2)
      expect(facesE0).toEqual([0, 1])

      // Test edge 5 has 2 faces
      const facesE5 = getFacesForEdge(cubeTopology, 5)
      expect(facesE5).toHaveLength(2)
      expect(facesE5).toEqual([2, 5])
    })

    test("should handle empty topology", () => {
      const emptyTopology: TopologyData = {
        vertices: [],
        edges: [],
        faces: [],
        vertex_to_edges: [],
        vertex_to_edges_offset: [],
        edge_to_faces: [],
        edge_to_faces_offset: [],
      }

      expect(getEdgesForVertex(emptyTopology, 0)).toEqual([])
      expect(getFacesForEdge(emptyTopology, 0)).toEqual([])
    })

    test("should handle single vertex single edge single face", () => {
      const minimalTopology: TopologyData = {
        vertices: [{ index: 0, x: 0, y: 0, z: 0, tolerance: 0.001, num_edges: 1 }],
        edges: [
          {
            index: 0,
            curve_type: "Circle",
            start_vertex: 0,
            end_vertex: 0,
            length: 6.28,
            is_degenerated: false,
            points: [],
            adjacent_faces: [0],
          },
        ],
        faces: [
          {
            index: 0,
            surface_type: "Cylinder",
            area: 10,
            is_reversed: false,
            num_edges: 1,
            boundary_edges: [0],
            center: [0, 0, 5],
            normal: [0, 0, 1],
          },
        ],
        vertex_to_edges: [0],
        vertex_to_edges_offset: [0, 1],
        edge_to_faces: [0],
        edge_to_faces_offset: [0, 1],
      }

      expect(getEdgesForVertex(minimalTopology, 0)).toEqual([0])
      expect(getFacesForEdge(minimalTopology, 0)).toEqual([0])
    })
  })
})
