/**
 * @file selection.hpp
 * @brief Geometry selection operations for face/edge/vertex picking
 *
 * This module provides functions for selecting and extracting individual
 * geometric elements from shapes, similar to Blender's selection modes
 * and Plasticity's automatic command activation.
 *
 * Selection Modes (like Plasticity):
 * - Vertex Mode: Select control points
 * - Edge Mode: Select edges and curves
 * - Face Mode: Select faces and regions
 * - Solid Mode: Select entire solids
 */

#pragma once

#include "../core/types.hpp"

#include <BRep_Tool.hxx>
#include <BRepGProp.hxx>
#include <BRepGProp_Face.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepTools.hxx>
#include <GProp_GProps.hxx>
#include <GeomLProp_SLProps.hxx>
#include <Geom_Surface.hxx>
#include <ShapeAnalysis_Surface.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Face Selection & Information
//------------------------------------------------------------------------------

/**
 * @brief Get a face from a shape by its index
 *
 * Iterates through all faces in the shape topology and returns
 * the face at the specified index.
 *
 * @param shape The source shape containing faces
 * @param index Zero-based index of the face to retrieve
 * @return The face as an OcctShape, or nullptr if index is out of bounds
 */
std::unique_ptr<OcctShape> get_face_by_index(
    const OcctShape& shape,
    int32_t index
);

/**
 * @brief Get detailed information about a specific face
 *
 * Computes face properties including:
 * - Center point (centroid)
 * - Normal vector at center
 * - Surface area
 * - Edge count
 * - Whether face is planar
 *
 * @param shape The source shape
 * @param face_index Index of the face
 * @return FaceInfo structure with computed properties
 */
FaceInfo get_face_info(
    const OcctShape& shape,
    int32_t face_index
);

/**
 * @brief Get the normal vector of a face at its center
 *
 * @param shape The source shape
 * @param face_index Index of the face
 * @return Normal vector as [x, y, z] array
 */
std::array<double, 3> get_face_normal(
    const OcctShape& shape,
    int32_t face_index
);

/**
 * @brief Get the center point (centroid) of a face
 *
 * @param shape The source shape
 * @param face_index Index of the face
 * @return Center point as [x, y, z] array
 */
std::array<double, 3> get_face_center(
    const OcctShape& shape,
    int32_t face_index
);

/**
 * @brief Get the surface area of a face
 *
 * @param shape The source shape
 * @param face_index Index of the face
 * @return Surface area in square units
 */
double get_face_area(
    const OcctShape& shape,
    int32_t face_index
);

/**
 * @brief Get all face information for a shape
 *
 * @param shape The source shape
 * @return Vector of FaceInfo for all faces
 */
std::vector<FaceInfo> get_all_faces_info(const OcctShape& shape);

//------------------------------------------------------------------------------
// Edge Selection & Information
//------------------------------------------------------------------------------

/**
 * @brief Get an edge from a shape by its index
 *
 * @param shape The source shape containing edges
 * @param index Zero-based index of the edge to retrieve
 * @return The edge as an OcctShape, or nullptr if index is out of bounds
 */
std::unique_ptr<OcctShape> get_edge_by_index(
    const OcctShape& shape,
    int32_t index
);

/**
 * @brief Get detailed information about a specific edge
 *
 * @param shape The source shape
 * @param edge_index Index of the edge
 * @return EdgeInfo structure with computed properties
 */
EdgeInfo get_edge_info(
    const OcctShape& shape,
    int32_t edge_index
);

/**
 * @brief Get all edge information for a shape
 *
 * @param shape The source shape
 * @return Vector of EdgeInfo for all edges
 */
std::vector<EdgeInfo> get_all_edges_info(const OcctShape& shape);

/**
 * @brief Get indices of edges that bound a specific face
 *
 * @param shape The source shape
 * @param face_index Index of the face
 * @return Vector of edge indices forming the face boundary
 */
std::vector<int32_t> get_face_edges(
    const OcctShape& shape,
    int32_t face_index
);

//------------------------------------------------------------------------------
// Vertex Selection & Information
//------------------------------------------------------------------------------

/**
 * @brief Get a vertex from a shape by its index
 *
 * @param shape The source shape containing vertices
 * @param index Zero-based index of the vertex to retrieve
 * @return The vertex as an OcctShape, or nullptr if index is out of bounds
 */
std::unique_ptr<OcctShape> get_vertex_by_index(
    const OcctShape& shape,
    int32_t index
);

/**
 * @brief Get detailed information about a specific vertex
 *
 * @param shape The source shape
 * @param vertex_index Index of the vertex
 * @return VertexInfo structure with computed properties
 */
VertexInfo get_vertex_info(
    const OcctShape& shape,
    int32_t vertex_index
);

/**
 * @brief Get all vertex information for a shape
 *
 * @param shape The source shape
 * @return Vector of VertexInfo for all vertices
 */
std::vector<VertexInfo> get_all_vertices_info(const OcctShape& shape);

//------------------------------------------------------------------------------
// Adjacency Queries
//------------------------------------------------------------------------------

/**
 * @brief Get faces adjacent to a specific edge
 *
 * An edge typically has 1 face (boundary edge) or 2 faces (internal edge).
 *
 * @param shape The source shape
 * @param edge_index Index of the edge
 * @return Vector of face indices adjacent to the edge
 */
std::vector<int32_t> get_adjacent_faces_for_edge(
    const OcctShape& shape,
    int32_t edge_index
);

/**
 * @brief Get edges adjacent to a specific vertex
 *
 * @param shape The source shape
 * @param vertex_index Index of the vertex
 * @return Vector of edge indices connected to the vertex
 */
std::vector<int32_t> get_adjacent_edges_for_vertex(
    const OcctShape& shape,
    int32_t vertex_index
);

/**
 * @brief Get faces that share a vertex
 *
 * @param shape The source shape
 * @param vertex_index Index of the vertex
 * @return Vector of face indices that contain the vertex
 */
std::vector<int32_t> get_adjacent_faces_for_vertex(
    const OcctShape& shape,
    int32_t vertex_index
);

//------------------------------------------------------------------------------
// Selection Utilities
//------------------------------------------------------------------------------

/**
 * @brief Find the face at a 3D point (ray picking helper)
 *
 * @param shape The source shape
 * @param point The 3D point to test
 * @param tolerance Distance tolerance for hit detection
 * @return Face index if found, -1 otherwise
 */
int32_t find_face_at_point(
    const OcctShape& shape,
    const Point3D& point,
    double tolerance = 0.001
);

/**
 * @brief Find the edge closest to a 3D point
 *
 * @param shape The source shape
 * @param point The 3D point to test
 * @param max_distance Maximum distance for consideration
 * @return Edge index if found within distance, -1 otherwise
 */
int32_t find_nearest_edge(
    const OcctShape& shape,
    const Point3D& point,
    double max_distance = 1.0
);

/**
 * @brief Find the vertex closest to a 3D point
 *
 * @param shape The source shape
 * @param point The 3D point to test
 * @param max_distance Maximum distance for consideration
 * @return Vertex index if found within distance, -1 otherwise
 */
int32_t find_nearest_vertex(
    const OcctShape& shape,
    const Point3D& point,
    double max_distance = 0.1
);

} // namespace cadhy::edit
