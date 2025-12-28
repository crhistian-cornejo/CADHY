/**
 * @file topology.hpp
 * @brief Full topology extraction and adjacency analysis
 *
 * This module provides comprehensive topology extraction from B-Rep shapes,
 * including vertex/edge/face information with CSR-format adjacency data.
 * Extracted from bridge.cpp for modularity and reusability.
 *
 * Key features:
 * - Full topology with adjacency relationships
 * - CSR (Compressed Sparse Row) format for efficient adjacency queries
 * - Edge tessellation with curve type analysis
 * - Face topology with boundary edge lists
 */

#pragma once

#include "../core/types.hpp"

#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_IndexedDataMapOfShapeListOfShape.hxx>
#include <BRep_Tool.hxx>
#include <BRepGProp.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <GProp_GProps.hxx>
#include <GCPnts_TangentialDeflection.hxx>
#include <Precision.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Topology Result Types
//------------------------------------------------------------------------------

/**
 * @brief Point along a tessellated edge with parameter value
 */
struct EdgePoint {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
    double parameter = 0.0;  // Curve parameter (0 to 1 normalized)
};

/**
 * @brief Extended vertex information for topology extraction
 */
struct TopologyVertexInfo {
    uint32_t index = 0;
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
    double tolerance = 0.0;
    int32_t num_edges = 0;  // Number of adjacent edges
};

/**
 * @brief Tessellated edge with topology information
 */
struct EdgeTessellation {
    uint32_t index = 0;
    int32_t curve_type = 0;      // GeomAbs_CurveType enum value
    double length = 0.0;
    bool is_degenerated = false;
    uint32_t start_vertex = 0xFFFFFFFF;  // Index or invalid marker
    uint32_t end_vertex = 0xFFFFFFFF;
    std::vector<EdgePoint> points;       // Tessellation points
    std::vector<uint32_t> adjacent_faces; // Indices of adjacent faces
};

/**
 * @brief Face topology information
 */
struct FaceTopologyInfo {
    uint32_t index = 0;
    int32_t surface_type = 0;    // GeomAbs_SurfaceType enum value
    double area = 0.0;
    bool is_reversed = false;
    double center_x = 0.0;
    double center_y = 0.0;
    double center_z = 0.0;
    double normal_x = 0.0;
    double normal_y = 0.0;
    double normal_z = 0.0;
    int32_t num_edges = 0;
    std::vector<uint32_t> boundary_edges;  // Edge indices forming boundary
};

/**
 * @brief Complete topology result with CSR adjacency data
 *
 * Uses Compressed Sparse Row (CSR) format for adjacency:
 * - vertex_to_edges_offset[i] gives starting index in vertex_to_edges
 * - vertex_to_edges contains edge indices for all vertices
 *
 * Example: To get edges adjacent to vertex i:
 *   start = vertex_to_edges_offset[i]
 *   end = vertex_to_edges_offset[i+1]
 *   edges = vertex_to_edges[start..end]
 */
struct TopologyResult {
    // Element data
    std::vector<TopologyVertexInfo> vertices;
    std::vector<EdgeTessellation> edges;
    std::vector<FaceTopologyInfo> faces;

    // CSR adjacency: vertex -> edges
    std::vector<uint32_t> vertex_to_edges_offset;
    std::vector<uint32_t> vertex_to_edges;

    // CSR adjacency: edge -> faces
    std::vector<uint32_t> edge_to_faces_offset;
    std::vector<uint32_t> edge_to_faces;
};

//------------------------------------------------------------------------------
// Topology Extraction Functions
//------------------------------------------------------------------------------

/**
 * @brief Extract complete topology with tessellated edges and adjacency
 *
 * This function builds:
 * 1. Vertex map with positions and edge counts
 * 2. Edge map with tessellation and curve types
 * 3. Face map with area, normals, and boundary edges
 * 4. Adjacency data in CSR format for efficient queries
 *
 * @param shape Source shape
 * @param edge_deflection Tessellation deflection for edges
 * @return Complete topology result
 */
TopologyResult get_full_topology(
    const OcctShape& shape,
    double edge_deflection = 0.01
);

/**
 * @brief Get vertices with adjacency information
 *
 * @param shape Source shape
 * @return Vector of vertex info with edge counts
 */
std::vector<TopologyVertexInfo> get_topology_vertices(const OcctShape& shape);

/**
 * @brief Tessellate all edges in a shape
 *
 * @param shape Source shape
 * @param deflection Tessellation deflection
 * @return Vector of tessellated edges
 */
std::vector<EdgeTessellation> tessellate_edges(
    const OcctShape& shape,
    double deflection = 0.01
);

/**
 * @brief Get face topology information
 *
 * @param shape Source shape
 * @return Vector of face topology info
 */
std::vector<FaceTopologyInfo> get_face_topology(const OcctShape& shape);

//------------------------------------------------------------------------------
// Adjacency Query Functions
//------------------------------------------------------------------------------

/**
 * @brief Build vertex-to-edge adjacency map
 *
 * Returns a map where map[vertex_index] = list of edge indices
 *
 * @param shape Source shape
 * @return Map from vertex index to edge indices
 */
std::vector<std::vector<int32_t>> build_vertex_edge_adjacency(const OcctShape& shape);

/**
 * @brief Build edge-to-face adjacency map
 *
 * @param shape Source shape
 * @return Map from edge index to face indices
 */
std::vector<std::vector<int32_t>> build_edge_face_adjacency(const OcctShape& shape);

/**
 * @brief Build face-to-edge adjacency map
 *
 * @param shape Source shape
 * @return Map from face index to edge indices
 */
std::vector<std::vector<int32_t>> build_face_edge_adjacency(const OcctShape& shape);

} // namespace cadhy::edit
