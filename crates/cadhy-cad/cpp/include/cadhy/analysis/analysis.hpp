/**
 * @file analysis.hpp
 * @brief Shape analysis, validation, and measurement
 *
 * Comprehensive geometric analysis using OpenCASCADE BRepCheck,
 * BRepGProp, and Extrema algorithms.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepCheck_Analyzer.hxx>
#include <BRepCheck_Status.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <BRepExtrema_ExtCC.hxx>
#include <BRepExtrema_ExtCF.hxx>
#include <BRepExtrema_ExtFF.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <ShapeAnalysis_Edge.hxx>
#include <ShapeAnalysis_Surface.hxx>
#include <ShapeAnalysis_Shell.hxx>
#include <ShapeFix_Shape.hxx>
#include <ShapeFix_Solid.hxx>
#include <ShapeFix_Shell.hxx>
#include <ShapeFix_Face.hxx>
#include <ShapeFix_Wire.hxx>

namespace cadhy::analysis {

//------------------------------------------------------------------------------
// Validation Status
//------------------------------------------------------------------------------

/// Shape validity status
enum class ValidityStatus {
    Valid,
    Invalid,
    Warning,
    Unknown
};

/// Specific validation issue
struct ValidationIssue {
    std::string type;           // Issue type identifier
    std::string description;    // Human-readable description
    int32_t element_index;      // Index of problematic element (-1 if global)
    std::string element_type;   // "face", "edge", "vertex", etc.
    ValidityStatus severity;
};

/// Complete validation result
struct ValidationResult {
    ValidityStatus status;
    bool is_valid;
    bool is_closed;
    bool is_manifold;
    std::vector<ValidationIssue> issues;

    // Counts by type
    int vertex_issues;
    int edge_issues;
    int face_issues;
    int shell_issues;
    int solid_issues;
};

//------------------------------------------------------------------------------
// Shape Validation
//------------------------------------------------------------------------------

/// Quick validity check
bool is_valid(const OcctShape& shape);

/// Full validation analysis
ValidationResult validate(const OcctShape& shape);

/// Validate with specific checks
ValidationResult validate_detailed(
    const OcctShape& shape,
    bool check_faces = true,
    bool check_edges = true,
    bool check_vertices = true,
    bool check_continuity = true
);

/// Check if shape is closed (watertight)
bool is_closed(const OcctShape& shape);

/// Check if shape is manifold
bool is_manifold(const OcctShape& shape);

/// Check if shape has self-intersections
bool has_self_intersection(const OcctShape& shape);

//------------------------------------------------------------------------------
// Shape Repair
//------------------------------------------------------------------------------

/// Repair options
struct RepairOptions {
    double tolerance = 1e-7;
    bool fix_small_face = true;
    bool fix_small_edge = true;
    bool fix_degenerated = true;
    bool fix_notched = true;
    bool fix_continuity = true;
    bool sew_faces = true;
    double sewing_tolerance = 1e-6;
};

/// Repair shape
std::unique_ptr<OcctShape> repair(
    const OcctShape& shape,
    const RepairOptions& options = {}
);

/// Fix specific issues
std::unique_ptr<OcctShape> fix_solid(const OcctShape& solid);
std::unique_ptr<OcctShape> fix_shell(const OcctShape& shell);
std::unique_ptr<OcctShape> fix_face(const OcctShape& face);
std::unique_ptr<OcctShape> fix_wire(const OcctShape& wire);

/// Sew faces into shell/solid
std::unique_ptr<OcctShape> sew_faces(
    const std::vector<const OcctShape*>& faces,
    double tolerance = 1e-6
);

/// Heal shape (comprehensive repair)
std::unique_ptr<OcctShape> heal(
    const OcctShape& shape,
    double tolerance = 1e-7
);

//------------------------------------------------------------------------------
// Mass Properties
//------------------------------------------------------------------------------

/// Mass properties result
struct MassProperties {
    double mass;                    // Volume for solids, area for faces
    Point3D center_of_gravity;
    double moments_of_inertia[3];   // Ixx, Iyy, Izz
    double products_of_inertia[3];  // Ixy, Ixz, Iyz
    double principal_moments[3];
    Vector3D principal_axes[3];
    double gyration_radii[3];
};

/// Compute volume of solid
double volume(const OcctShape& solid);

/// Compute surface area
double surface_area(const OcctShape& shape);

/// Compute full mass properties
MassProperties mass_properties(const OcctShape& shape);

/// Compute center of gravity
Point3D center_of_gravity(const OcctShape& shape);

/// Compute moments of inertia
void moments_of_inertia(
    const OcctShape& shape,
    double& ixx, double& iyy, double& izz,
    double& ixy, double& ixz, double& iyz
);

//------------------------------------------------------------------------------
// Linear Measurements
//------------------------------------------------------------------------------

/// Compute length of edge/wire
double length(const OcctShape& edge_or_wire);

/// Compute perimeter of face
double perimeter(const OcctShape& face);

/// Distance between two points
double point_distance(const Point3D& p1, const Point3D& p2);

/// Minimum distance between two shapes
double min_distance(const OcctShape& shape1, const OcctShape& shape2);

/// Maximum distance between two shapes
double max_distance(const OcctShape& shape1, const OcctShape& shape2);

/// Distance with closest points
struct DistanceResult {
    double distance;
    Point3D point1;
    Point3D point2;
    int32_t element1_index;  // Index of element on shape1
    int32_t element2_index;  // Index of element on shape2
};

DistanceResult distance_detailed(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Distance from point to shape
DistanceResult point_to_shape_distance(
    const Point3D& point,
    const OcctShape& shape
);

//------------------------------------------------------------------------------
// Angular Measurements
//------------------------------------------------------------------------------

/// Angle between two edges at their common vertex
double angle_between_edges(
    const OcctShape& edge1,
    const OcctShape& edge2
);

/// Angle between two faces (dihedral angle)
double dihedral_angle(
    const OcctShape& face1,
    const OcctShape& face2
);

/// Angle between two vectors
double angle_between_vectors(
    const Vector3D& v1,
    const Vector3D& v2
);

//------------------------------------------------------------------------------
// Curvature Analysis
//------------------------------------------------------------------------------

/// Curvature at point on edge
struct EdgeCurvature {
    double curvature;       // 1/radius
    double radius;          // Radius of curvature
    Vector3D tangent;
    Vector3D normal;
    Vector3D binormal;
};

EdgeCurvature edge_curvature_at(
    const OcctShape& edge,
    double parameter  // 0 to 1
);

/// Curvature at point on surface
struct SurfaceCurvature {
    double gaussian;        // K = k1 * k2
    double mean;            // H = (k1 + k2) / 2
    double max_curvature;   // k1
    double min_curvature;   // k2
    Vector3D max_direction; // Direction of k1
    Vector3D min_direction; // Direction of k2
    Vector3D normal;
};

SurfaceCurvature surface_curvature_at(
    const OcctShape& face,
    double u, double v
);

/// Get curvature at point (UV computed automatically)
SurfaceCurvature surface_curvature_at_point(
    const OcctShape& face,
    const Point3D& point
);

//------------------------------------------------------------------------------
// Surface Analysis
//------------------------------------------------------------------------------

/// Surface type classification
enum class SurfaceType {
    Plane,
    Cylinder,
    Cone,
    Sphere,
    Torus,
    BezierSurface,
    BSplineSurface,
    RevolutionSurface,
    ExtrusionSurface,
    OffsetSurface,
    OtherSurface
};

/// Identify surface type
SurfaceType identify_surface(const OcctShape& face);

/// Surface analysis result
struct SurfaceAnalysis {
    SurfaceType type;
    bool is_planar;
    bool is_ruled;
    bool is_developable;
    double area;
    BoundingBox3D uv_bounds;  // Parameter space bounds
    Point3D centroid;
    Vector3D normal_at_centroid;
};

SurfaceAnalysis analyze_surface(const OcctShape& face);

/// Check if surface is planar within tolerance
bool is_planar(const OcctShape& face, double tolerance = 1e-7);

/// Get plane parameters (if planar)
bool get_plane(
    const OcctShape& face,
    Point3D& point,
    Vector3D& normal
);

/// Check if surface is cylindrical
bool is_cylindrical(
    const OcctShape& face,
    Point3D& axis_point,
    Vector3D& axis_direction,
    double& radius
);

//------------------------------------------------------------------------------
// Edge Analysis
//------------------------------------------------------------------------------

/// Edge type classification
enum class EdgeType {
    Line,
    Circle,
    Ellipse,
    Hyperbola,
    Parabola,
    BezierCurve,
    BSplineCurve,
    OffsetCurve,
    OtherCurve
};

/// Identify edge type
EdgeType identify_edge(const OcctShape& edge);

/// Edge analysis result
struct EdgeAnalysis {
    EdgeType type;
    double length;
    bool is_closed;
    bool is_periodic;
    Point3D start_point;
    Point3D end_point;
    Vector3D start_tangent;
    Vector3D end_tangent;
};

EdgeAnalysis analyze_edge(const OcctShape& edge);

/// Check if edge is linear
bool is_linear(const OcctShape& edge, double tolerance = 1e-7);

/// Get line parameters (if linear)
bool get_line(
    const OcctShape& edge,
    Point3D& start,
    Point3D& end
);

/// Check if edge is circular
bool is_circular(
    const OcctShape& edge,
    Point3D& center,
    Vector3D& axis,
    double& radius
);

//------------------------------------------------------------------------------
// Topology Analysis
//------------------------------------------------------------------------------

/// Topology statistics
struct TopologyStats {
    int32_t solids;
    int32_t shells;
    int32_t faces;
    int32_t wires;
    int32_t edges;
    int32_t vertices;
    int32_t compounds;
};

TopologyStats count_topology(const OcctShape& shape);

/// Check if shapes are connected
bool are_connected(const OcctShape& shape1, const OcctShape& shape2);

/// Check if shapes share faces
bool share_faces(const OcctShape& shape1, const OcctShape& shape2);

/// Check if shapes share edges
bool share_edges(const OcctShape& shape1, const OcctShape& shape2);

/// Get common elements
std::vector<int32_t> common_faces(
    const OcctShape& shape1,
    const OcctShape& shape2
);

std::vector<int32_t> common_edges(
    const OcctShape& shape1,
    const OcctShape& shape2
);

//------------------------------------------------------------------------------
// Interference Detection
//------------------------------------------------------------------------------

/// Interference type
enum class InterferenceType {
    None,
    Touch,          // Touching at boundary
    Overlap,        // Partial overlap
    Contain,        // One contains another
    Equal           // Identical
};

/// Check interference between shapes
InterferenceType check_interference(
    const OcctShape& shape1,
    const OcctShape& shape2,
    double tolerance = 1e-7
);

/// Get intersection volume
double intersection_volume(
    const OcctShape& solid1,
    const OcctShape& solid2
);

/// Clearance analysis (minimum gap)
struct ClearanceResult {
    double min_clearance;
    Point3D point1;
    Point3D point2;
    bool has_interference;
};

ClearanceResult clearance_analysis(
    const OcctShape& shape1,
    const OcctShape& shape2
);

//------------------------------------------------------------------------------
// Draft Analysis (for manufacturing)
//------------------------------------------------------------------------------

/// Draft analysis for moldability
struct DraftAnalysis {
    bool has_sufficient_draft;
    double min_draft_angle;
    double max_draft_angle;
    std::vector<int32_t> undercut_faces;
    std::vector<int32_t> insufficient_draft_faces;
};

DraftAnalysis analyze_draft(
    const OcctShape& solid,
    const Vector3D& pull_direction,
    double required_draft_angle
);

/// Identify undercuts
std::vector<int32_t> find_undercuts(
    const OcctShape& solid,
    const Vector3D& pull_direction
);

//------------------------------------------------------------------------------
// Wall Thickness Analysis
//------------------------------------------------------------------------------

/// Wall thickness result
struct ThicknessResult {
    double min_thickness;
    double max_thickness;
    double avg_thickness;
    Point3D min_thickness_point;
    Point3D max_thickness_point;
    std::vector<Point3D> thin_regions;  // Points where thickness < threshold
};

ThicknessResult analyze_thickness(
    const OcctShape& solid,
    double thin_threshold = 0.5
);

/// Get thickness at point
double thickness_at_point(
    const OcctShape& solid,
    const Point3D& point,
    const Vector3D& direction
);

//------------------------------------------------------------------------------
// Continuity Analysis
//------------------------------------------------------------------------------

/// Continuity type
enum class Continuity {
    C0,     // Position (G0)
    C1,     // Tangent (G1)
    C2,     // Curvature (G2)
    C3      // Third derivative
};

/// Check edge continuity at vertex
Continuity edge_continuity(
    const OcctShape& edge1,
    const OcctShape& edge2,
    double tolerance = 1e-7
);

/// Check surface continuity across edge
Continuity surface_continuity(
    const OcctShape& face1,
    const OcctShape& face2,
    double tolerance = 1e-7
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Get bounding box
BoundingBox3D bounding_box(const OcctShape& shape);

/// Get bounding box with gap
BoundingBox3D bounding_box_extended(
    const OcctShape& shape,
    double gap
);

/// Get oriented bounding box (minimum volume box)
struct OrientedBox {
    Point3D center;
    Vector3D axes[3];  // Local X, Y, Z
    double half_extents[3];
};

OrientedBox oriented_bounding_box(const OcctShape& shape);

/// Check if point is inside solid
bool is_point_inside(
    const OcctShape& solid,
    const Point3D& point
);

/// Classify point location
enum class PointLocation {
    Inside,
    Outside,
    OnBoundary
};

PointLocation classify_point(
    const OcctShape& solid,
    const Point3D& point,
    double tolerance = 1e-7
);

} // namespace cadhy::analysis
