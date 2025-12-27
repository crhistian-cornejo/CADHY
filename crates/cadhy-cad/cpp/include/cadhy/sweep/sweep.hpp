/**
 * @file sweep.hpp
 * @brief Sweep operations (extrude, revolve, loft, pipe, sweep)
 *
 * Surface and solid generation through sweeping profiles.
 * Uses OpenCASCADE BRepPrimAPI and BRepOffsetAPI.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeRevol.hxx>
#include <BRepOffsetAPI_ThruSections.hxx>
#include <BRepOffsetAPI_MakePipe.hxx>
#include <BRepOffsetAPI_MakePipeShell.hxx>
#include <BRepOffsetAPI_MakeEvolved.hxx>
#include <BRepSweep_Revol.hxx>
#include <GeomFill_Trihedron.hxx>

namespace cadhy::sweep {

//------------------------------------------------------------------------------
// Extrusion (Prism)
//------------------------------------------------------------------------------

/// Extrude shape along direction vector
std::unique_ptr<OcctShape> extrude(
    const OcctShape& profile,
    double dx, double dy, double dz
);

/// Extrude shape along direction by distance
std::unique_ptr<OcctShape> extrude_direction(
    const OcctShape& profile,
    const Vector3D& direction,
    double distance
);

/// Extrude with taper (draft) angle
std::unique_ptr<OcctShape> extrude_tapered(
    const OcctShape& profile,
    const Vector3D& direction,
    double distance,
    double taper_angle  // In radians
);

/// Two-sided extrusion (symmetric)
std::unique_ptr<OcctShape> extrude_symmetric(
    const OcctShape& profile,
    const Vector3D& direction,
    double distance  // Total distance, half on each side
);

/// Extrude up to a face/surface
std::unique_ptr<OcctShape> extrude_to_face(
    const OcctShape& profile,
    const OcctShape& target_face
);

//------------------------------------------------------------------------------
// Revolution
//------------------------------------------------------------------------------

/// Revolve shape around axis
std::unique_ptr<OcctShape> revolve(
    const OcctShape& profile,
    const Point3D& axis_point,
    const Vector3D& axis_direction,
    double angle  // In radians
);

/// Full revolution (360 degrees)
std::unique_ptr<OcctShape> revolve_full(
    const OcctShape& profile,
    const Point3D& axis_point,
    const Vector3D& axis_direction
);

/// Revolve around X axis
std::unique_ptr<OcctShape> revolve_x(
    const OcctShape& profile,
    double angle
);

/// Revolve around Y axis
std::unique_ptr<OcctShape> revolve_y(
    const OcctShape& profile,
    double angle
);

/// Revolve around Z axis
std::unique_ptr<OcctShape> revolve_z(
    const OcctShape& profile,
    double angle
);

//------------------------------------------------------------------------------
// Loft (Through Sections)
//------------------------------------------------------------------------------

/// Loft through multiple profiles
std::unique_ptr<OcctShape> loft(
    const std::vector<const OcctShape*>& profiles,
    bool solid = true,
    bool ruled = false
);

/// Loft with smoothing
std::unique_ptr<OcctShape> loft_smooth(
    const std::vector<const OcctShape*>& profiles,
    bool solid = true
);

/// Loft with start and end vertex (conical ends)
std::unique_ptr<OcctShape> loft_with_vertices(
    const std::vector<const OcctShape*>& profiles,
    const Point3D* start_vertex,  // nullptr for no vertex
    const Point3D* end_vertex,
    bool solid = true
);

/// Loft along guide curve
std::unique_ptr<OcctShape> loft_guided(
    const std::vector<const OcctShape*>& profiles,
    const OcctShape& guide_curve,
    bool solid = true
);

//------------------------------------------------------------------------------
// Pipe (Constant Section Sweep)
//------------------------------------------------------------------------------

/// Sweep profile along spine
std::unique_ptr<OcctShape> pipe(
    const OcctShape& profile,
    const OcctShape& spine
);

/// Pipe with bi-normal mode (fixed direction)
std::unique_ptr<OcctShape> pipe_binormal(
    const OcctShape& profile,
    const OcctShape& spine,
    const Vector3D& binormal
);

/// Pipe with auxiliary spine
std::unique_ptr<OcctShape> pipe_auxiliary(
    const OcctShape& profile,
    const OcctShape& spine,
    const OcctShape& auxiliary_spine
);

//------------------------------------------------------------------------------
// Pipe Shell (Variable Section Sweep)
//------------------------------------------------------------------------------

/// Trihedron mode for sweep orientation
enum class TrihedronMode {
    Frenet,         // Natural curve frame
    CorrectedFrenet,// Corrected for inflection points
    Fixed,          // Fixed direction
    Constant,       // Constant angle with reference
    Auxiliary       // Follow auxiliary spine
};

/// Pipe shell with variable sections
std::unique_ptr<OcctShape> pipe_shell(
    const std::vector<const OcctShape*>& profiles,
    const OcctShape& spine,
    TrihedronMode mode = TrihedronMode::CorrectedFrenet
);

/// Pipe shell with scaling
std::unique_ptr<OcctShape> pipe_shell_scaled(
    const OcctShape& profile,
    const OcctShape& spine,
    double start_scale,
    double end_scale
);

/// Pipe shell with twist
std::unique_ptr<OcctShape> pipe_shell_twisted(
    const OcctShape& profile,
    const OcctShape& spine,
    double twist_angle  // Total twist in radians
);

//------------------------------------------------------------------------------
// Helix
//------------------------------------------------------------------------------

/// Create helix as wire
std::unique_ptr<OcctShape> make_helix(
    double radius,
    double pitch,
    double height,
    bool left_handed = false
);

/// Create helix with variable radius (conical)
std::unique_ptr<OcctShape> make_helix_conical(
    double radius_start,
    double radius_end,
    double pitch,
    double height,
    bool left_handed = false
);

/// Sweep profile along helix
std::unique_ptr<OcctShape> helix_sweep(
    const OcctShape& profile,
    double radius,
    double pitch,
    double height,
    bool left_handed = false
);

//------------------------------------------------------------------------------
// Evolved Shape
//------------------------------------------------------------------------------

/// Create evolved shape (offset curve swept along profile)
std::unique_ptr<OcctShape> evolve(
    const OcctShape& spine,
    const OcctShape& profile
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Check if profile can be extruded
bool can_extrude(const OcctShape& profile);

/// Check if profile can be revolved
bool can_revolve(const OcctShape& profile, const Point3D& axis_point, const Vector3D& axis);

/// Check if profiles can be lofted
bool can_loft(const std::vector<const OcctShape*>& profiles);

/// Check if profile can be swept along spine
bool can_pipe(const OcctShape& profile, const OcctShape& spine);

} // namespace cadhy::sweep
