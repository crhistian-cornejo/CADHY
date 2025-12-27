/**
 * @file projection.hpp
 * @brief Projection operations (HLR, sections, silhouettes)
 *
 * Hidden Line Removal and technical drawing projections using
 * OpenCASCADE HLRBRep and BRepAlgo.
 */

#pragma once

#include "../core/types.hpp"

#include <HLRBRep_Algo.hxx>
#include <HLRBRep_HLRToShape.hxx>
#include <HLRAlgo_Projector.hxx>
#include <HLRBRep_PolyAlgo.hxx>
#include <HLRBRep_PolyHLRToShape.hxx>
#include <BRepAlgoAPI_Section.hxx>
#include <BRepProj_Projection.hxx>

namespace cadhy::projection {

//------------------------------------------------------------------------------
// Projection Direction
//------------------------------------------------------------------------------

/// Standard view directions
enum class ViewDirection {
    Front,      // -Y
    Back,       // +Y
    Left,       // -X
    Right,      // +X
    Top,        // +Z
    Bottom,     // -Z
    Isometric,  // (1,1,1)
    Dimetric,
    Trimetric,
    Custom
};

/// Get direction vector for standard view
Vector3D view_direction_vector(ViewDirection view);

/// Projection parameters
struct ProjectionParams {
    Point3D eye_position;       // Camera position
    Point3D focus_point;        // Look-at point
    Vector3D up_direction;      // Up vector
    bool perspective;           // Perspective vs orthographic
    double focal_length;        // For perspective
    double scale;               // For orthographic
};

/// Create projection params from standard view
ProjectionParams standard_view(ViewDirection view, const BoundingBox3D& bbox);

//------------------------------------------------------------------------------
// Hidden Line Removal (HLR)
//------------------------------------------------------------------------------

/// Line type classification for HLR
enum class LineType {
    Visible,            // Visible outline
    Hidden,             // Hidden (dashed)
    VisibleSharp,       // Visible sharp edge
    HiddenSharp,        // Hidden sharp edge
    VisibleSmooth,      // Visible smooth edge
    HiddenSmooth,       // Hidden smooth edge
    VisibleSewn,        // Visible sewn edge
    HiddenSewn,         // Hidden sewn edge
    VisibleOutline,     // Silhouette (visible)
    HiddenOutline,      // Silhouette (hidden)
    IsoParametric       // Iso-parametric lines
};

/// 2D line segment result
struct Line2D {
    double x1, y1, x2, y2;
    LineType type;
    int32_t source_edge;    // Original 3D edge index
    int32_t source_face;    // Face that generates this line
};

/// Polyline result (for curves)
struct Polyline2D {
    std::vector<std::pair<double, double>> points;
    LineType type;
    int32_t source_edge;
    int32_t source_face;
};

/// HLR computation result
struct HLRResult {
    std::vector<Line2D> lines;
    std::vector<Polyline2D> curves;
    BoundingBox3D view_box;     // 2D bounding box (z ignored)
    double scale;               // Applied scale factor
};

/// HLR options
struct HLROptions {
    double tolerance = 1e-5;        // Computation tolerance
    bool compute_hidden = true;      // Include hidden lines
    bool compute_smooth = true;      // Include smooth edges
    bool compute_sewn = false;       // Include sewn edges
    bool compute_outlines = true;    // Include silhouettes
    bool compute_iso_lines = false;  // Include iso-parametric lines
    int iso_count = 5;               // Number of iso lines per direction
    bool use_poly_algo = false;      // Use faster polygon-based HLR
    double poly_deflection = 0.1;    // Deflection for poly algo
};

/// Compute HLR with standard view
HLRResult compute_hlr(
    const OcctShape& shape,
    ViewDirection view
);

/// Compute HLR with custom projection
HLRResult compute_hlr_custom(
    const OcctShape& shape,
    const ProjectionParams& params,
    const HLROptions& options = {}
);

/// Compute HLR with direction vector
HLRResult compute_hlr_direction(
    const OcctShape& shape,
    const Vector3D& direction,
    const HLROptions& options = {}
);

/// Fast HLR using polygon approximation
HLRResult compute_hlr_poly(
    const OcctShape& shape,
    ViewDirection view,
    double deflection = 0.1
);

/// Get only visible lines (faster)
HLRResult compute_visible_lines(
    const OcctShape& shape,
    ViewDirection view
);

/// Get only silhouette lines
HLRResult compute_silhouette(
    const OcctShape& shape,
    ViewDirection view
);

//------------------------------------------------------------------------------
// Multi-View Projection
//------------------------------------------------------------------------------

/// Standard engineering views
struct EngineeringViews {
    HLRResult front;
    HLRResult top;
    HLRResult right;
    bool include_back;
    bool include_bottom;
    bool include_left;
    HLRResult back;
    HLRResult bottom;
    HLRResult left;
    HLRResult isometric;
};

/// Generate standard engineering views
EngineeringViews generate_engineering_views(
    const OcctShape& shape,
    const HLROptions& options = {},
    bool all_six = false,
    bool include_isometric = true
);

/// Generate custom multi-view
std::vector<HLRResult> generate_multi_view(
    const OcctShape& shape,
    const std::vector<ViewDirection>& views,
    const HLROptions& options = {}
);

//------------------------------------------------------------------------------
// Section Operations
//------------------------------------------------------------------------------

/// Section plane definition
struct SectionPlane {
    Point3D point;      // Point on plane
    Vector3D normal;    // Normal direction
};

/// Section result
struct SectionResult {
    std::unique_ptr<OcctShape> section_shape;  // Resulting wires/edges
    std::vector<Polyline2D> outlines;          // 2D outlines
    double section_area;                        // Area of section (if closed)
    Point3D centroid;                           // Centroid of section
    bool is_closed;                             // Whether section forms closed loops
};

/// Compute section with plane
SectionResult section_by_plane(
    const OcctShape& shape,
    const SectionPlane& plane
);

/// Compute section at coordinate
SectionResult section_at_x(const OcctShape& shape, double x);
SectionResult section_at_y(const OcctShape& shape, double y);
SectionResult section_at_z(const OcctShape& shape, double z);

/// Compute multiple sections
std::vector<SectionResult> sections_parallel(
    const OcctShape& shape,
    const Vector3D& normal,
    double start,
    double end,
    int count
);

/// Section with another shape (intersection)
SectionResult section_with_shape(
    const OcctShape& shape1,
    const OcctShape& shape2
);

//------------------------------------------------------------------------------
// Section View Generation
//------------------------------------------------------------------------------

/// Section view options
struct SectionViewOptions {
    bool show_hatching = true;      // Show cross-hatching
    double hatch_angle = 0.785;     // 45 degrees
    double hatch_spacing = 2.0;     // mm
    bool show_outline = true;
    bool show_hidden = false;
    LineType outline_type = LineType::Visible;
};

/// Section view result (for drawing)
struct SectionView {
    SectionResult section;
    HLRResult projection;
    std::vector<Line2D> hatch_lines;
};

/// Generate section view for drawing
SectionView generate_section_view(
    const OcctShape& shape,
    const SectionPlane& plane,
    ViewDirection view,
    const SectionViewOptions& options = {}
);

//------------------------------------------------------------------------------
// Projection onto Shapes
//------------------------------------------------------------------------------

/// Project point onto shape
Point3D project_point_to_shape(
    const Point3D& point,
    const OcctShape& shape
);

/// Project point onto plane
Point3D project_point_to_plane(
    const Point3D& point,
    const SectionPlane& plane
);

/// Project curve onto surface
std::unique_ptr<OcctShape> project_curve_to_surface(
    const OcctShape& curve,
    const OcctShape& surface,
    const Vector3D& direction
);

/// Project wire onto plane
std::unique_ptr<OcctShape> project_wire_to_plane(
    const OcctShape& wire,
    const SectionPlane& plane,
    const Vector3D& direction
);

/// Project shape onto plane (shadow)
std::unique_ptr<OcctShape> project_shape_to_plane(
    const OcctShape& shape,
    const SectionPlane& plane,
    const Vector3D& direction
);

//------------------------------------------------------------------------------
// Silhouette and Outline
//------------------------------------------------------------------------------

/// Extract silhouette curves
std::unique_ptr<OcctShape> extract_silhouette(
    const OcctShape& shape,
    const Vector3D& view_direction
);

/// Extract sharp edges
std::unique_ptr<OcctShape> extract_sharp_edges(
    const OcctShape& shape,
    double angle_threshold = 0.5  // Radians
);

/// Extract outline for planar view
std::unique_ptr<OcctShape> extract_outline(
    const OcctShape& shape,
    const Vector3D& view_direction
);

/// Extract feature edges (combination)
struct FeatureEdges {
    std::unique_ptr<OcctShape> sharp_edges;
    std::unique_ptr<OcctShape> boundary_edges;
    std::unique_ptr<OcctShape> silhouette_edges;
    std::unique_ptr<OcctShape> crease_edges;
};

FeatureEdges extract_feature_edges(
    const OcctShape& shape,
    const Vector3D& view_direction,
    double crease_angle = 0.5
);

//------------------------------------------------------------------------------
// Dimension Extraction (for automatic dimensioning)
//------------------------------------------------------------------------------

/// Extracted dimension
struct ExtractedDimension {
    enum class Type {
        Linear,
        Radius,
        Diameter,
        Angle,
        Arc
    };
    Type type;
    Point3D point1;
    Point3D point2;
    Point3D dimension_point;  // Where to place dimension text
    double value;
    std::string unit;
};

/// Extract key dimensions from projected view
std::vector<ExtractedDimension> extract_dimensions(
    const HLRResult& projection,
    const OcctShape& original_shape
);

/// Extract dimensions for specific features
std::vector<ExtractedDimension> extract_hole_dimensions(
    const OcctShape& shape,
    const Vector3D& view_direction
);

//------------------------------------------------------------------------------
// Unfolding (for sheet metal)
//------------------------------------------------------------------------------

/// Unfold result
struct UnfoldResult {
    std::unique_ptr<OcctShape> flat_pattern;
    std::vector<Line2D> bend_lines;
    std::vector<double> bend_angles;
    double flat_area;
    bool success;
    std::string error_message;
};

/// Unfold sheet metal part
UnfoldResult unfold_sheet(
    const OcctShape& shape,
    double thickness,
    double k_factor = 0.44  // Bend allowance factor
);

/// Check if shape can be unfolded
bool can_unfold(const OcctShape& shape);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Convert HLR result to SVG path data
std::string hlr_to_svg_path(
    const HLRResult& hlr,
    bool visible_only = false
);

/// Convert HLR result to DXF entities
std::string hlr_to_dxf(const HLRResult& hlr);

/// Scale and center projection
HLRResult fit_to_view(
    const HLRResult& hlr,
    double width,
    double height,
    double margin = 10.0
);

/// Merge multiple HLR results
HLRResult merge_hlr(
    const std::vector<HLRResult>& results
);

/// Simplify HLR result (remove short segments)
HLRResult simplify_hlr(
    const HLRResult& hlr,
    double min_length = 0.1
);

} // namespace cadhy::projection
