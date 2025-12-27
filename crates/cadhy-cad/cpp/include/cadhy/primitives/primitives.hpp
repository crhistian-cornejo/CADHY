/**
 * @file primitives.hpp
 * @brief Primitive shape creation (box, cylinder, sphere, cone, torus, wedge)
 *
 * High-performance primitive creation using OpenCASCADE BRepPrimAPI.
 * All functions return shapes centered or at origin with various options.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepPrimAPI_MakeCone.hxx>
#include <BRepPrimAPI_MakeTorus.hxx>
#include <BRepPrimAPI_MakeWedge.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeRevol.hxx>
#include <BRepPrimAPI_MakeHalfSpace.hxx>

namespace cadhy::primitives {

//------------------------------------------------------------------------------
// Box Creation
//------------------------------------------------------------------------------

/// Create box at origin with dimensions
std::unique_ptr<OcctShape> make_box(double dx, double dy, double dz);

/// Create box at specified corner position
std::unique_ptr<OcctShape> make_box_at(
    double x, double y, double z,
    double dx, double dy, double dz
);

/// Create box centered at origin
std::unique_ptr<OcctShape> make_box_centered(double dx, double dy, double dz);

/// Create box from two corner points
std::unique_ptr<OcctShape> make_box_from_corners(
    const Point3D& p1,
    const Point3D& p2
);

//------------------------------------------------------------------------------
// Cylinder Creation
//------------------------------------------------------------------------------

/// Create cylinder at origin along Z axis
std::unique_ptr<OcctShape> make_cylinder(double radius, double height);

/// Create cylinder at position with axis direction
std::unique_ptr<OcctShape> make_cylinder_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double radius, double height
);

/// Create cylinder centered at origin (like Three.js)
std::unique_ptr<OcctShape> make_cylinder_centered(double radius, double height);

/// Create hollow cylinder (pipe section)
std::unique_ptr<OcctShape> make_hollow_cylinder(
    double outer_radius,
    double inner_radius,
    double height
);

//------------------------------------------------------------------------------
// Sphere Creation
//------------------------------------------------------------------------------

/// Create sphere at origin
std::unique_ptr<OcctShape> make_sphere(double radius);

/// Create sphere at specified center
std::unique_ptr<OcctShape> make_sphere_at(
    double cx, double cy, double cz,
    double radius
);

/// Create partial sphere (segment)
std::unique_ptr<OcctShape> make_sphere_segment(
    double radius,
    double angle1,  // Start angle (radians)
    double angle2   // End angle (radians)
);

//------------------------------------------------------------------------------
// Cone Creation
//------------------------------------------------------------------------------

/// Create cone at origin
std::unique_ptr<OcctShape> make_cone(double r1, double r2, double height);

/// Create cone at position with axis
std::unique_ptr<OcctShape> make_cone_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double r1, double r2, double height
);

/// Create cone centered at origin (like Three.js)
std::unique_ptr<OcctShape> make_cone_centered(double r1, double r2, double height);

//------------------------------------------------------------------------------
// Torus Creation
//------------------------------------------------------------------------------

/// Create torus at origin
std::unique_ptr<OcctShape> make_torus(double major_radius, double minor_radius);

/// Create torus at position with axis
std::unique_ptr<OcctShape> make_torus_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double major_radius, double minor_radius
);

/// Create partial torus (arc)
std::unique_ptr<OcctShape> make_torus_segment(
    double major_radius,
    double minor_radius,
    double angle  // Sweep angle in radians
);

//------------------------------------------------------------------------------
// Wedge Creation
//------------------------------------------------------------------------------

/// Create wedge (tapered box)
std::unique_ptr<OcctShape> make_wedge(double dx, double dy, double dz, double ltx);

/// Create wedge with full control
std::unique_ptr<OcctShape> make_wedge_full(
    double dx, double dy, double dz,
    double xmin, double zmin,
    double xmax, double zmax
);

//------------------------------------------------------------------------------
// Special Primitives
//------------------------------------------------------------------------------

/// Create pyramid with polygonal base
std::unique_ptr<OcctShape> make_pyramid(
    int sides,          // Number of sides (3=triangle, 4=square, etc.)
    double base_radius,
    double height
);

/// Create prism with polygonal base
std::unique_ptr<OcctShape> make_prism(
    int sides,
    double radius,
    double height
);

/// Create half-space (infinite solid for boolean operations)
std::unique_ptr<OcctShape> make_half_space(
    const Point3D& point,
    const Vector3D& normal
);

//------------------------------------------------------------------------------
// Compound Primitives
//------------------------------------------------------------------------------

/// Create rectangular tube (hollow box)
std::unique_ptr<OcctShape> make_rectangular_tube(
    double outer_width, double outer_height,
    double inner_width, double inner_height,
    double length
);

/// Create channel section (C-shape)
std::unique_ptr<OcctShape> make_channel_section(
    double width, double height, double thickness,
    double length
);

/// Create I-beam section
std::unique_ptr<OcctShape> make_i_beam(
    double width, double height,
    double web_thickness, double flange_thickness,
    double length
);

} // namespace cadhy::primitives
