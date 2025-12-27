/**
 * @file modify.hpp
 * @brief Modification operations (fillet, chamfer, offset, shell, draft)
 *
 * Shape modification operations using OpenCASCADE BRepFilletAPI and BRepOffsetAPI.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepOffsetAPI_MakeOffsetShape.hxx>
#include <BRepOffsetAPI_DraftAngle.hxx>
#include <BRepOffset_MakeOffset.hxx>
#include <ChFi3d_FilletShape.hxx>

namespace cadhy::modify {

//------------------------------------------------------------------------------
// Fillet Operations
//------------------------------------------------------------------------------

/// Fillet all edges with uniform radius
std::unique_ptr<OcctShape> fillet_all_edges(
    const OcctShape& shape,
    double radius
);

/// Fillet specific edges with uniform radius
std::unique_ptr<OcctShape> fillet_edges(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double radius
);

/// Fillet specific edges with individual radii
std::unique_ptr<OcctShape> fillet_edges_varied(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    const std::vector<double>& radii
);

/// Variable radius fillet (blend)
std::unique_ptr<OcctShape> fillet_variable(
    const OcctShape& shape,
    int32_t edge_index,
    double radius_start,
    double radius_end
);

/// Fillet shape type
enum class FilletType {
    Rational,   // G1 continuity
    QuasiAngular,
    Polynomial  // Higher continuity
};

/// Advanced fillet with continuity control
std::unique_ptr<OcctShape> fillet_advanced(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    const std::vector<double>& radii,
    FilletType type = FilletType::Rational
);

//------------------------------------------------------------------------------
// Chamfer Operations
//------------------------------------------------------------------------------

/// Chamfer all edges with uniform distance
std::unique_ptr<OcctShape> chamfer_all_edges(
    const OcctShape& shape,
    double distance
);

/// Chamfer specific edges with uniform distance
std::unique_ptr<OcctShape> chamfer_edges(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double distance
);

/// Chamfer with two distances (asymmetric)
std::unique_ptr<OcctShape> chamfer_edges_asymmetric(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double distance1,
    double distance2
);

/// Chamfer with distance and angle
std::unique_ptr<OcctShape> chamfer_edges_angle(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double distance,
    double angle  // In radians
);

//------------------------------------------------------------------------------
// Offset Operations
//------------------------------------------------------------------------------

/// Offset entire shape (thicken/shrink)
std::unique_ptr<OcctShape> offset_shape(
    const OcctShape& shape,
    double offset
);

/// Offset with join type control
enum class JoinType {
    Arc,        // Smooth arcs at corners
    Tangent,    // Tangent extension
    Intersection // Sharp corners
};

std::unique_ptr<OcctShape> offset_shape_advanced(
    const OcctShape& shape,
    double offset,
    JoinType join = JoinType::Arc,
    bool remove_internal_edges = true
);

/// Offset specific faces
std::unique_ptr<OcctShape> offset_faces(
    const OcctShape& shape,
    const std::vector<int32_t>& face_indices,
    double offset
);

//------------------------------------------------------------------------------
// Shell Operations
//------------------------------------------------------------------------------

/// Create shell (hollow solid) by removing faces
std::unique_ptr<OcctShape> make_shell(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    double thickness
);

/// Shell with variable thickness
std::unique_ptr<OcctShape> make_shell_varied(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    const std::vector<int32_t>& face_indices,
    const std::vector<double>& thicknesses
);

/// Shell inward (thickness negative = outward)
std::unique_ptr<OcctShape> shell_inward(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    double thickness
);

//------------------------------------------------------------------------------
// Draft (Taper) Operations
//------------------------------------------------------------------------------

/// Apply draft angle to faces
std::unique_ptr<OcctShape> draft_faces(
    const OcctShape& shape,
    const std::vector<int32_t>& face_indices,
    const Vector3D& direction,
    double angle,  // In radians
    const Point3D& neutral_plane_point
);

/// Draft all faces in a direction
std::unique_ptr<OcctShape> draft_all(
    const OcctShape& shape,
    const Vector3D& direction,
    double angle,
    const Point3D& neutral_plane_point
);

//------------------------------------------------------------------------------
// Thicken Operations
//------------------------------------------------------------------------------

/// Thicken a surface to create solid
std::unique_ptr<OcctShape> thicken_surface(
    const OcctShape& surface,
    double thickness
);

/// Thicken with different amounts on each side
std::unique_ptr<OcctShape> thicken_surface_asymmetric(
    const OcctShape& surface,
    double thickness_positive,
    double thickness_negative
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Get maximum fillet radius for an edge
double max_fillet_radius(
    const OcctShape& shape,
    int32_t edge_index
);

/// Get maximum chamfer distance for an edge
double max_chamfer_distance(
    const OcctShape& shape,
    int32_t edge_index
);

/// Check if shell operation would succeed
bool can_shell(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    double thickness
);

} // namespace cadhy::modify
