/**
 * @file mesh.hpp
 * @brief Mesh generation and manipulation
 *
 * High-performance tessellation using OpenCASCADE BRepMesh.
 * Includes support for quality control, quad meshing hints, and optimization.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepMesh_IncrementalMesh.hxx>
#include <Poly_Triangulation.hxx>
#include <Poly_Connect.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>

namespace cadhy::mesh {

//------------------------------------------------------------------------------
// Mesh Data Structures
//------------------------------------------------------------------------------

/// Triangle in mesh
struct Triangle {
    uint32_t v0, v1, v2;  // Vertex indices
};

/// Quad in mesh (optional, for quad-dominant meshing)
struct Quad {
    uint32_t v0, v1, v2, v3;  // Vertex indices
};

/// Per-face mesh data
struct FaceMesh {
    int32_t face_index;
    std::vector<Point3D> vertices;
    std::vector<Vector3D> normals;
    std::vector<Triangle> triangles;
    std::vector<std::pair<double, double>> uvs;  // UV coordinates
};

/// Complete mesh data
struct MeshData {
    std::vector<float> positions;    // Flat: [x0,y0,z0, x1,y1,z1, ...]
    std::vector<float> normals;      // Flat: [nx0,ny0,nz0, ...]
    std::vector<uint32_t> indices;   // Triangle indices
    std::vector<int32_t> face_ids;   // Face ID per triangle (for selection)

    // Per-face data (optional)
    std::vector<FaceMesh> faces;

    // Statistics
    uint32_t vertex_count() const { return positions.size() / 3; }
    uint32_t triangle_count() const { return indices.size() / 3; }
};

/// Mesh quality settings
struct MeshQuality {
    double linear_deflection = 0.1;    // Max distance from surface
    double angular_deflection = 0.5;   // Max angle in radians (default ~28 deg)
    bool relative = false;             // Deflection relative to size
    double relative_factor = 0.001;    // Factor if relative
    int min_points = 5;                // Min points per edge
    bool parallel = true;              // Parallel processing
    bool internal_vertices = true;     // Allow internal vertices
    bool control_surface_deflection = true;
};

//------------------------------------------------------------------------------
// Basic Tessellation
//------------------------------------------------------------------------------

/// Tessellate shape with default quality
MeshData tessellate(const OcctShape& shape);

/// Tessellate with linear deflection
MeshData tessellate_deflection(
    const OcctShape& shape,
    double deflection
);

/// Tessellate with quality settings
MeshData tessellate_quality(
    const OcctShape& shape,
    const MeshQuality& quality
);

/// Tessellate single face
FaceMesh tessellate_face(
    const OcctShape& shape,
    int32_t face_index,
    double deflection = 0.1
);

//------------------------------------------------------------------------------
// Adaptive Tessellation
//------------------------------------------------------------------------------

/// Tessellate with curvature-based refinement
MeshData tessellate_adaptive(
    const OcctShape& shape,
    double min_deflection,
    double max_deflection,
    double curvature_factor = 1.0
);

/// Tessellate with edge length control
MeshData tessellate_edge_length(
    const OcctShape& shape,
    double min_edge_length,
    double max_edge_length
);

//------------------------------------------------------------------------------
// LOD (Level of Detail)
//------------------------------------------------------------------------------

/// Generate multiple LODs
struct LODMesh {
    MeshData high;
    MeshData medium;
    MeshData low;
    MeshData preview;
};

LODMesh generate_lods(
    const OcctShape& shape,
    double high_deflection = 0.01,
    double medium_deflection = 0.05,
    double low_deflection = 0.2,
    double preview_deflection = 1.0
);

/// Choose LOD based on bounding box diagonal
MeshQuality auto_quality(const OcctShape& shape);

//------------------------------------------------------------------------------
// Mesh Extraction (from already tessellated shape)
//------------------------------------------------------------------------------

/// Extract existing tessellation from shape
MeshData extract_mesh(const OcctShape& shape);

/// Extract mesh with face mapping
MeshData extract_mesh_with_faces(const OcctShape& shape);

/// Check if shape is already tessellated
bool is_tessellated(const OcctShape& shape);

/// Get existing tessellation quality
double get_tessellation_deflection(const OcctShape& shape);

//------------------------------------------------------------------------------
// Mesh for Technical Drawing (wireframe)
//------------------------------------------------------------------------------

/// Extract edge lines for wireframe rendering
struct WireframeMesh {
    std::vector<float> line_positions;  // Line segments
    std::vector<int32_t> edge_ids;      // Edge ID per segment
    std::vector<uint8_t> edge_types;    // 0=sharp, 1=smooth, 2=silhouette
};

WireframeMesh extract_wireframe(
    const OcctShape& shape,
    double deflection = 0.1
);

/// Extract sharp edges only
WireframeMesh extract_sharp_edges(
    const OcctShape& shape,
    double angle_threshold = 0.5  // Radians (~30 deg)
);

//------------------------------------------------------------------------------
// Mesh Simplification
//------------------------------------------------------------------------------

/// Decimate mesh to target triangle count
MeshData decimate(
    const MeshData& mesh,
    uint32_t target_triangles
);

/// Decimate to target vertex count
MeshData decimate_vertices(
    const MeshData& mesh,
    uint32_t target_vertices
);

/// Simplify preserving features
MeshData simplify_preserve_features(
    const MeshData& mesh,
    double feature_angle,  // Preserve edges above this angle
    float reduction_ratio  // 0.5 = half triangles
);

//------------------------------------------------------------------------------
// Mesh Optimization
//------------------------------------------------------------------------------

/// Optimize mesh for rendering (reorder for cache)
MeshData optimize_for_rendering(const MeshData& mesh);

/// Merge duplicate vertices
MeshData merge_vertices(
    const MeshData& mesh,
    double tolerance = 1e-6
);

/// Compute smooth normals
MeshData compute_smooth_normals(
    const MeshData& mesh,
    double angle_threshold = 0.7  // ~40 deg
);

/// Compute flat normals (per-face)
MeshData compute_flat_normals(const MeshData& mesh);

//------------------------------------------------------------------------------
// Mesh Analysis
//------------------------------------------------------------------------------

/// Mesh statistics
struct MeshStats {
    uint32_t vertices;
    uint32_t triangles;
    uint32_t edges;
    double surface_area;
    double volume;  // If closed
    double min_edge_length;
    double max_edge_length;
    double avg_edge_length;
    double min_angle;
    double max_angle;
    bool is_manifold;
    bool is_closed;
    int genus;  // Topological genus
};

MeshStats analyze_mesh(const MeshData& mesh);

/// Check mesh validity
struct MeshValidation {
    bool valid;
    bool has_degenerate_triangles;
    bool has_duplicate_vertices;
    bool has_non_manifold_edges;
    bool has_flipped_normals;
    int degenerate_count;
    int non_manifold_count;
};

MeshValidation validate_mesh(const MeshData& mesh);

//------------------------------------------------------------------------------
// Quad Meshing (experimental - uses external algorithms)
//------------------------------------------------------------------------------

/// Quad-dominant mesh data
struct QuadMesh {
    std::vector<float> positions;
    std::vector<float> normals;
    std::vector<uint32_t> quad_indices;     // 4 indices per quad
    std::vector<uint32_t> triangle_indices; // Remaining triangles
    uint32_t quad_count;
    uint32_t triangle_count;
};

/// Convert triangle mesh to quad-dominant
QuadMesh triangles_to_quads(
    const MeshData& mesh,
    double angle_tolerance = 0.1
);

/// Generate quad-dominant mesh from shape
QuadMesh tessellate_quads(
    const OcctShape& shape,
    double target_edge_length
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Compute bounding box from mesh
BoundingBox3D mesh_bounding_box(const MeshData& mesh);

/// Transform mesh
MeshData transform_mesh(
    const MeshData& mesh,
    const std::array<double, 16>& matrix
);

/// Flip mesh normals
MeshData flip_normals(const MeshData& mesh);

/// Reverse winding order
MeshData reverse_winding(const MeshData& mesh);

} // namespace cadhy::mesh
