/**
 * @file wire.hpp
 * @brief Wire and sketch operations (curves, edges, wires, faces)
 *
 * 2D and 3D curve creation for sketching and profiling.
 * Uses OpenCASCADE BRepBuilderAPI and Geom classes.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakePolygon.hxx>
#include <Geom_Line.hxx>
#include <Geom_Circle.hxx>
#include <Geom_Ellipse.hxx>
#include <Geom_BezierCurve.hxx>
#include <Geom_BSplineCurve.hxx>
#include <GC_MakeCircle.hxx>
#include <GC_MakeArcOfCircle.hxx>
#include <GC_MakeEllipse.hxx>
#include <GeomAPI_Interpolate.hxx>

namespace cadhy::wire {

//------------------------------------------------------------------------------
// Point/Vertex Operations
//------------------------------------------------------------------------------

/// Create vertex at point
std::unique_ptr<OcctShape> make_vertex(double x, double y, double z);
std::unique_ptr<OcctShape> make_vertex(const Point3D& point);

//------------------------------------------------------------------------------
// Line/Edge Operations
//------------------------------------------------------------------------------

/// Create line edge between two points
std::unique_ptr<OcctShape> make_line(
    double x1, double y1, double z1,
    double x2, double y2, double z2
);
std::unique_ptr<OcctShape> make_line(const Point3D& p1, const Point3D& p2);

/// Create infinite line through point with direction
std::unique_ptr<OcctShape> make_infinite_line(
    const Point3D& point,
    const Vector3D& direction
);

/// Create ray (semi-infinite line)
std::unique_ptr<OcctShape> make_ray(
    const Point3D& origin,
    const Vector3D& direction,
    double length
);

//------------------------------------------------------------------------------
// Arc Operations
//------------------------------------------------------------------------------

/// Create arc through three points
std::unique_ptr<OcctShape> make_arc_3_points(
    const Point3D& p1,
    const Point3D& p2,
    const Point3D& p3
);

/// Create arc from center, start, end
std::unique_ptr<OcctShape> make_arc_center(
    const Point3D& center,
    const Point3D& start,
    const Point3D& end
);

/// Create arc from center, radius, angles (on XY plane)
std::unique_ptr<OcctShape> make_arc_angles(
    const Point3D& center,
    double radius,
    double start_angle,
    double end_angle
);

/// Create arc tangent to edge at point
std::unique_ptr<OcctShape> make_arc_tangent(
    const OcctShape& edge,
    const Point3D& point,
    const Point3D& end_point
);

//------------------------------------------------------------------------------
// Circle Operations
//------------------------------------------------------------------------------

/// Create circle on XY plane at origin
std::unique_ptr<OcctShape> make_circle(double radius);

/// Create circle at center on XY plane
std::unique_ptr<OcctShape> make_circle_at(
    double cx, double cy, double cz,
    double radius
);

/// Create circle with normal direction
std::unique_ptr<OcctShape> make_circle_normal(
    const Point3D& center,
    const Vector3D& normal,
    double radius
);

/// Create circle through three points
std::unique_ptr<OcctShape> make_circle_3_points(
    const Point3D& p1,
    const Point3D& p2,
    const Point3D& p3
);

//------------------------------------------------------------------------------
// Ellipse Operations
//------------------------------------------------------------------------------

/// Create ellipse at origin on XY plane
std::unique_ptr<OcctShape> make_ellipse(
    double major_radius,
    double minor_radius
);

/// Create ellipse at center with rotation
std::unique_ptr<OcctShape> make_ellipse_at(
    const Point3D& center,
    const Vector3D& normal,
    double major_radius,
    double minor_radius,
    double rotation = 0.0
);

//------------------------------------------------------------------------------
// Rectangle Operations
//------------------------------------------------------------------------------

/// Create rectangle on XY plane
std::unique_ptr<OcctShape> make_rectangle(double width, double height);

/// Create rectangle centered at origin
std::unique_ptr<OcctShape> make_rectangle_centered(double width, double height);

/// Create rectangle at position
std::unique_ptr<OcctShape> make_rectangle_at(
    const Point3D& corner,
    double width, double height
);

/// Create rounded rectangle
std::unique_ptr<OcctShape> make_rounded_rectangle(
    double width, double height,
    double corner_radius
);

//------------------------------------------------------------------------------
// Polygon Operations
//------------------------------------------------------------------------------

/// Create regular polygon
std::unique_ptr<OcctShape> make_polygon(
    int sides,
    double radius,
    bool inscribed = true  // Inscribed (true) or circumscribed (false)
);

/// Create polygon from points
std::unique_ptr<OcctShape> make_polygon_points(
    const std::vector<Point3D>& points,
    bool close = true
);

/// Create polygon wire from points
std::unique_ptr<OcctShape> make_polyline(
    const std::vector<Point3D>& points
);

//------------------------------------------------------------------------------
// Spline Operations
//------------------------------------------------------------------------------

/// Create B-spline through points
std::unique_ptr<OcctShape> make_spline(
    const std::vector<Point3D>& points,
    bool closed = false
);

/// Create B-spline with tangent constraints
std::unique_ptr<OcctShape> make_spline_tangent(
    const std::vector<Point3D>& points,
    const Vector3D& start_tangent,
    const Vector3D& end_tangent
);

/// Create Bezier curve
std::unique_ptr<OcctShape> make_bezier(
    const std::vector<Point3D>& control_points
);

/// Create NURBS curve
std::unique_ptr<OcctShape> make_nurbs(
    const std::vector<Point3D>& control_points,
    const std::vector<double>& weights,
    const std::vector<double>& knots,
    int degree
);

//------------------------------------------------------------------------------
// Wire Operations
//------------------------------------------------------------------------------

/// Create wire from edges
std::unique_ptr<OcctShape> make_wire(
    const std::vector<const OcctShape*>& edges
);

/// Create wire from single edge
std::unique_ptr<OcctShape> make_wire_from_edge(const OcctShape& edge);

/// Connect edges into wire (with gap tolerance)
std::unique_ptr<OcctShape> connect_edges(
    const std::vector<const OcctShape*>& edges,
    double tolerance = 1e-6
);

/// Close wire (connect last point to first)
std::unique_ptr<OcctShape> close_wire(const OcctShape& wire);

/// Extend wire
std::unique_ptr<OcctShape> extend_wire(
    const OcctShape& wire,
    double length,
    bool at_start = false
);

/// Trim wire
std::unique_ptr<OcctShape> trim_wire(
    const OcctShape& wire,
    double start_param,  // 0 to 1
    double end_param
);

//------------------------------------------------------------------------------
// Face Operations
//------------------------------------------------------------------------------

/// Create face from wire (planar)
std::unique_ptr<OcctShape> make_face(const OcctShape& wire);

/// Create face with holes
std::unique_ptr<OcctShape> make_face_with_holes(
    const OcctShape& outer_wire,
    const std::vector<const OcctShape*>& hole_wires
);

/// Create face on plane
std::unique_ptr<OcctShape> make_face_on_plane(
    const OcctShape& wire,
    const Point3D& plane_point,
    const Vector3D& plane_normal
);

/// Create face from surface bounded by wire
std::unique_ptr<OcctShape> make_bounded_face(
    const OcctShape& surface,
    const OcctShape& wire
);

//------------------------------------------------------------------------------
// Offset Operations
//------------------------------------------------------------------------------

/// Offset wire (2D offset on plane)
std::unique_ptr<OcctShape> offset_wire(
    const OcctShape& wire,
    double offset,
    bool round_corners = true
);

/// Offset curve (3D offset)
std::unique_ptr<OcctShape> offset_curve(
    const OcctShape& edge,
    double offset,
    const Vector3D& direction
);

//------------------------------------------------------------------------------
// Fillet/Chamfer on 2D
//------------------------------------------------------------------------------

/// Fillet corners of wire
std::unique_ptr<OcctShape> fillet_wire(
    const OcctShape& wire,
    double radius
);

/// Chamfer corners of wire
std::unique_ptr<OcctShape> chamfer_wire(
    const OcctShape& wire,
    double distance
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Check if wire is closed
bool is_wire_closed(const OcctShape& wire);

/// Check if wire is planar
bool is_wire_planar(const OcctShape& wire);

/// Get wire length
double wire_length(const OcctShape& wire);

/// Get point on wire at parameter (0 to 1)
Point3D point_on_wire(const OcctShape& wire, double parameter);

/// Get tangent at parameter
Vector3D tangent_on_wire(const OcctShape& wire, double parameter);

/// Project point onto wire
double project_point_to_wire(const OcctShape& wire, const Point3D& point);

} // namespace cadhy::wire
