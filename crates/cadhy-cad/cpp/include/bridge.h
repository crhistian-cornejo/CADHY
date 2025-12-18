#pragma once

// Standard C++ headers
#include <memory>
#include <string>
#include <vector>
#include <cmath>
#include <limits>
#include <algorithm>

// Forward declare rust types - cxx.h is included by the generated code
namespace rust {
inline namespace cxxbridge1 {
    class Str;
    template <typename T> class Vec;
    template <typename T> class Slice;
}
}

// OpenCASCADE Foundation headers
#include <Standard_Failure.hxx>
#include <iostream>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Pnt.hxx>
#include <gp_Dir.hxx>
#include <gp_Vec.hxx>
#include <gp_Trsf.hxx>
#include <gp_Pln.hxx>
#include <gp_Circ.hxx>

// Topology headers
#include <TopoDS.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Face.hxx>
#include <TopExp_Explorer.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopLoc_Location.hxx>

// B-Rep headers
#include <BRep_Tool.hxx>
#include <BRep_Builder.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepBuilderAPI_GTransform.hxx>

// Primitive creation
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepPrimAPI_MakeCone.hxx>
#include <BRepPrimAPI_MakeTorus.hxx>
#include <BRepPrimAPI_MakeWedge.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeRevol.hxx>

// Boolean operations
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Common.hxx>

// Filleting/Chamfering
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>

// Offset operations
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepOffsetAPI_MakeOffsetShape.hxx>
#include <TopTools_ListOfShape.hxx>

// Loft/Sweep operations
#include <BRepOffsetAPI_ThruSections.hxx>
#include <BRepOffsetAPI_MakePipe.hxx>
#include <BRepOffsetAPI_MakePipeShell.hxx>

// Helix creation
#include <Geom_CylindricalSurface.hxx>
#include <Geom2d_Line.hxx>
#include <GCE2d_MakeLine.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>

// Draft/Taper operation
#include <BRepOffsetAPI_DraftAngle.hxx>

// Thicken operation (surface to solid)
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepOffset_MakeOffset.hxx>

// Meshing
#include <BRepMesh_IncrementalMesh.hxx>
#include <Poly_Triangulation.hxx>

// Geometry
#include <Geom_Plane.hxx>
#include <Geom_Circle.hxx>
#include <Geom_Line.hxx>
#include <GC_MakeCircle.hxx>
#include <GC_MakeArcOfCircle.hxx>

// Properties/Measurement
#include <Bnd_Box.hxx>
#include <BRepBndLib.hxx>
#include <GProp_GProps.hxx>
#include <BRepGProp.hxx>
#include <BRepExtrema_DistShapeShape.hxx>

// Data Exchange
#include <STEPControl_Reader.hxx>
#include <STEPControl_Writer.hxx>
#include <IGESControl_Reader.hxx>
#include <IGESControl_Writer.hxx>

// BRep I/O
#include <BRepTools.hxx>
#include <sstream>

// Shape Healing / Analysis
#include <ShapeFix_Shape.hxx>
#include <ShapeFix_Wireframe.hxx>
#include <ShapeFix_Face.hxx>
#include <ShapeFix_Wire.hxx>
#include <ShapeFix_Edge.hxx>
#include <ShapeFix_ShapeTolerance.hxx>
#include <ShapeAnalysis_ShapeContents.hxx>
#include <ShapeAnalysis_CheckSmallFace.hxx>
#include <ShapeAnalysis_Shell.hxx>
#include <ShapeAnalysis_Edge.hxx>
#include <ShapeAnalysis_Wire.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <BRepCheck_ListOfStatus.hxx>
#include <BRepCheck_Result.hxx>
#include <ShapeBuild_ReShape.hxx>

// Self-intersection detection
#include <BOPAlgo_CheckerSI.hxx>
#include <BOPDS_DS.hxx>
#include <BOPAlgo_Options.hxx>

// Advanced Distance/Extrema
#include <BRepExtrema_DistShapeShape.hxx>
#include <BRepExtrema_SupportType.hxx>

// Data Exchange - IGES
#include <IGESControl_Reader.hxx>
#include <IGESControl_Writer.hxx>
#include <IGESData_IGESModel.hxx>

// Data Exchange - glTF
#include <RWGltf_CafWriter.hxx>
#include <RWGltf_CafReader.hxx>
#include <RWObj_CafWriter.hxx>
#include <RWObj_CafReader.hxx>
#include <RWStl.hxx>
#include <StlAPI_Writer.hxx>
#include <RWPly_CafWriter.hxx>

// XDE Framework for advanced export
#include <XCAFDoc_DocumentTool.hxx>
#include <XCAFDoc_ShapeTool.hxx>
#include <XCAFDoc_ColorTool.hxx>
#include <TDocStd_Document.hxx>
#include <TDocStd_Application.hxx>
#include <TDataStd_Name.hxx>
#include <TDF_Label.hxx>
#include <TDF_LabelSequence.hxx>
#include <Quantity_Color.hxx>
#include <Quantity_ColorRGBA.hxx>
#include <TColStd_IndexedDataMapOfStringString.hxx>
#include <Message_ProgressRange.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>

// Adaptor for curves
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <GeomAbs_CurveType.hxx>
#include <GeomAbs_SurfaceType.hxx>
#include <Geom_Curve.hxx>
#include <Geom_Surface.hxx>

// Hidden Line Removal (HLR) for 2D projections
#include <HLRBRep_Algo.hxx>
#include <HLRBRep_HLRToShape.hxx>
#include <HLRAlgo_Projector.hxx>
#include <BRepAlgoAPI_Section.hxx>
#include <BRepPrimAPI_MakeHalfSpace.hxx>
#include <Geom2d_Curve.hxx>

// Hatching and wire analysis for section views
#include <ShapeAnalysis_FreeBounds.hxx>
#include <ShapeAnalysis_FreeBoundsProperties.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepTools_WireExplorer.hxx>
#include <TopoDS_Compound.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Dir2d.hxx>
#include <gp_Lin2d.hxx>
#include <Geom2d_Line.hxx>
#include <Geom2dAdaptor_Curve.hxx>
#include <Geom2dAPI_InterCurveCurve.hxx>

// Topology exploration for vertex/edge extraction
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_IndexedDataMapOfShapeListOfShape.hxx>
#include <TopTools_ListOfShape.hxx>
#include <TopTools_ListIteratorOfListOfShape.hxx>
#include <GCPnts_UniformDeflection.hxx>
#include <GCPnts_TangentialDeflection.hxx>

namespace cadhy_cad {

// Forward declarations for cxx types
struct Vertex;
struct Triangle;
struct MeshResult;
struct FaceInfo;
struct BoundingBoxResult;
struct ShapeProperties;
struct EdgeInfo;
struct Line2DFFI;
struct HLRProjectionResult;
struct Curve2DFFI;
struct TessPoint2D;
struct Polyline2DFFI;
struct HLRProjectionResultV2;
struct ShapeAnalysisResult;
struct DistanceResult;
struct ExportOptions;
struct VertexInfo;
struct EdgePoint;
struct EdgeTessellation;
struct FaceTopologyInfo;
struct TopologyResult;
struct ExplodedPart;
struct ExplodeResult;
struct HatchLineFFI;
struct HatchRegionFFI;
struct SectionWithHatchResult;

/// Wrapper class for TopoDS_Shape
class OcctShape {
public:
    OcctShape() = default;
    explicit OcctShape(const TopoDS_Shape& shape) : shape_(shape) {}

    const TopoDS_Shape& get() const { return shape_; }
    TopoDS_Shape& get() { return shape_; }

    bool is_null() const { return shape_.IsNull(); }

private:
    TopoDS_Shape shape_;
};

// ============================================================
// PRIMITIVE CREATION
// ============================================================
std::unique_ptr<OcctShape> make_box(double dx, double dy, double dz);
std::unique_ptr<OcctShape> make_box_at(double x, double y, double z, double dx, double dy, double dz);
std::unique_ptr<OcctShape> make_box_centered(double dx, double dy, double dz);
std::unique_ptr<OcctShape> make_cylinder(double radius, double height);
std::unique_ptr<OcctShape> make_cylinder_at(double x, double y, double z, double ax, double ay, double az, double radius, double height);
std::unique_ptr<OcctShape> make_sphere(double radius);
std::unique_ptr<OcctShape> make_sphere_at(double x, double y, double z, double radius);
std::unique_ptr<OcctShape> make_cone(double r1, double r2, double height);
std::unique_ptr<OcctShape> make_cone_at(double x, double y, double z, double ax, double ay, double az, double r1, double r2, double height);
std::unique_ptr<OcctShape> make_torus(double major_radius, double minor_radius);
std::unique_ptr<OcctShape> make_torus_at(double x, double y, double z, double ax, double ay, double az, double major_radius, double minor_radius);
std::unique_ptr<OcctShape> make_wedge(double dx, double dy, double dz, double ltx);

/// Create a helix (spiral) wire
/// radius: helix radius
/// pitch: distance between turns (vertical rise per turn)
/// height: total height of the helix
/// clockwise: true for right-handed helix, false for left-handed
/// Returns: wire shape representing the helix
std::unique_ptr<OcctShape> make_helix(
    double radius,
    double pitch,
    double height,
    bool clockwise
);

/// Create a helix at a specific position with custom axis
std::unique_ptr<OcctShape> make_helix_at(
    double x, double y, double z,
    double ax, double ay, double az,
    double radius,
    double pitch,
    double height,
    bool clockwise
);

// ============================================================
// BOOLEAN OPERATIONS
// ============================================================
std::unique_ptr<OcctShape> boolean_fuse(const OcctShape& shape1, const OcctShape& shape2);
std::unique_ptr<OcctShape> boolean_cut(const OcctShape& shape1, const OcctShape& shape2);
std::unique_ptr<OcctShape> boolean_common(const OcctShape& shape1, const OcctShape& shape2);

// ============================================================
// MODIFICATION OPERATIONS
// ============================================================
std::unique_ptr<OcctShape> fillet_all_edges(const OcctShape& shape, double radius);
std::unique_ptr<OcctShape> chamfer_all_edges(const OcctShape& shape, double distance);
std::unique_ptr<OcctShape> make_shell(const OcctShape& shape, double thickness);
std::unique_ptr<OcctShape> offset_solid(const OcctShape& shape, double offset);

/// Apply fillet to specific edges by index
/// shape: input shape
/// edge_indices: indices of edges to fillet (0-based)
/// radii: radius for each edge (same length as edge_indices)
std::unique_ptr<OcctShape> fillet_edges(
    const OcctShape& shape,
    rust::Slice<const int32_t> edge_indices,
    rust::Slice<const double> radii
);

/// Apply chamfer to specific edges by index
/// shape: input shape
/// edge_indices: indices of edges to chamfer (0-based)
/// distances: distance for each edge (same length as edge_indices)
std::unique_ptr<OcctShape> chamfer_edges(
    const OcctShape& shape,
    rust::Slice<const int32_t> edge_indices,
    rust::Slice<const double> distances
);

/// Add draft angle to faces (for mold release)
/// shape: input shape
/// angle: draft angle in radians
/// dir_x, dir_y, dir_z: pull direction (mold opening direction)
/// neutral_x, neutral_y, neutral_z: point on the neutral plane
std::unique_ptr<OcctShape> add_draft(
    const OcctShape& shape,
    double angle,
    double dir_x, double dir_y, double dir_z,
    double neutral_x, double neutral_y, double neutral_z
);

/// Thicken a surface/shell into a solid
/// shape: input surface/shell shape
/// thickness: thickness to add (positive = outward, negative = inward)
/// both_sides: if true, add thickness to both sides
std::unique_ptr<OcctShape> thicken(
    const OcctShape& shape,
    double thickness,
    bool both_sides
);

// ============================================================
// TRANSFORM OPERATIONS
// ============================================================
std::unique_ptr<OcctShape> translate(const OcctShape& shape, double dx, double dy, double dz);
std::unique_ptr<OcctShape> rotate(const OcctShape& shape, double ox, double oy, double oz, double ax, double ay, double az, double angle);
std::unique_ptr<OcctShape> scale_uniform(const OcctShape& shape, double cx, double cy, double cz, double factor);
std::unique_ptr<OcctShape> scale_xyz(const OcctShape& shape, double cx, double cy, double cz, double fx, double fy, double fz);
std::unique_ptr<OcctShape> mirror(const OcctShape& shape, double ox, double oy, double oz, double nx, double ny, double nz);

// ============================================================
// SURFACE/SOLID GENERATION
// ============================================================
std::unique_ptr<OcctShape> extrude(const OcctShape& shape, double dx, double dy, double dz);
std::unique_ptr<OcctShape> revolve(const OcctShape& shape, double ox, double oy, double oz, double ax, double ay, double az, double angle);

// ============================================================
// LOFT/SWEEP OPERATIONS
// ============================================================

/// Create a lofted solid/shell through multiple wire profiles
/// profiles: array of wire shapes to loft through
/// count: number of profiles
/// solid: if true, create a solid; if false, create a shell
/// ruled: if true, use ruled surfaces (straight lines between profiles)
std::unique_ptr<OcctShape> make_loft(
    rust::Slice<const OcctShape* const> profiles,
    size_t count,
    bool solid,
    bool ruled
);

/// Sweep a profile along a spine path (simple pipe)
/// profile: wire or face to sweep
/// spine: path wire to sweep along
std::unique_ptr<OcctShape> make_pipe(
    const OcctShape& profile,
    const OcctShape& spine
);

/// Sweep a profile along a spine path with more control
/// profile: wire to sweep
/// spine: path wire to sweep along
/// auxiliary: optional auxiliary spine for twist control (can be null)
/// with_contact: maintain contact with spine
/// with_correction: apply correction for smooth result
std::unique_ptr<OcctShape> make_pipe_shell(
    const OcctShape& profile,
    const OcctShape& spine,
    bool with_contact,
    bool with_correction
);

// ============================================================
// WIRE/SKETCH OPERATIONS
// ============================================================
std::unique_ptr<OcctShape> make_line(double x1, double y1, double z1, double x2, double y2, double z2);
std::unique_ptr<OcctShape> make_circle(double cx, double cy, double cz, double nx, double ny, double nz, double radius);
std::unique_ptr<OcctShape> make_arc(double cx, double cy, double cz, double nx, double ny, double nz, double radius, double start_angle, double end_angle);
std::unique_ptr<OcctShape> make_rectangle(double x, double y, double width, double height);
std::unique_ptr<OcctShape> make_face_from_wire(const OcctShape& wire);
std::unique_ptr<OcctShape> make_wire_from_edges(rust::Slice<const OcctShape* const> edges, size_t count);

/// Create a closed polygon wire from a list of 2D points (in XY plane)
/// Points should be in order, last point connects to first
std::unique_ptr<OcctShape> make_polygon_wire(rust::Slice<const Vertex> points);

/// Create a closed polygon wire from a list of 3D points
/// Points should be in order, last point connects to first
std::unique_ptr<OcctShape> make_polygon_wire_3d(rust::Slice<const Vertex> points);

// ============================================================
// TESSELLATION
// ============================================================
MeshResult tessellate(const OcctShape& shape, double deflection);
MeshResult tessellate_with_angle(const OcctShape& shape, double deflection, double angle);

// ============================================================
// BREP I/O
// ============================================================
rust::Vec<uint8_t> write_brep(const OcctShape& shape);
std::unique_ptr<OcctShape> read_brep(rust::Slice<const uint8_t> data);
bool write_brep_file(const OcctShape& shape, rust::Str filename);
std::unique_ptr<OcctShape> read_brep_file(rust::Str filename);

// ============================================================
// STEP/IGES I/O
// ============================================================
std::unique_ptr<OcctShape> read_step(rust::Str filename);
bool write_step(const OcctShape& shape, rust::Str filename);
std::unique_ptr<OcctShape> read_iges(rust::Str filename);
bool write_iges(const OcctShape& shape, rust::Str filename);

// ============================================================
// GLTF/OBJ/STL/PLY EXPORT (Modern formats)
// ============================================================
bool write_gltf(const OcctShape& shape, rust::Str filename, double deflection);
bool write_glb(const OcctShape& shape, rust::Str filename, double deflection);
bool write_obj(const OcctShape& shape, rust::Str filename, double deflection);
bool write_stl(const OcctShape& shape, rust::Str filename, double deflection);
bool write_stl_binary(const OcctShape& shape, rust::Str filename, double deflection);
bool write_ply(const OcctShape& shape, rust::Str filename, double deflection);

// ============================================================
// SHAPE ANALYSIS & VALIDATION
// ============================================================

/// Analyze shape and return detailed diagnostics
ShapeAnalysisResult analyze_shape(const OcctShape& shape);

/// Check if shape has valid topology
bool check_shape_validity(const OcctShape& shape);

/// Get shape tolerance
double get_shape_tolerance(const OcctShape& shape);

/// Fix shape with advanced healing options
std::unique_ptr<OcctShape> fix_shape_advanced(
    const OcctShape& shape,
    bool fix_small_faces,
    bool fix_small_edges,
    bool fix_degenerated,
    bool fix_self_intersection,
    double tolerance
);

/// Sew faces into a shell/solid
std::unique_ptr<OcctShape> sew_shapes(
    rust::Slice<const OcctShape* const> shapes,
    size_t count,
    double tolerance
);

// ============================================================
// ADVANCED DISTANCE MEASUREMENT
// ============================================================

/// Calculate minimum distance between two shapes with detailed results
DistanceResult compute_minimum_distance(const OcctShape& shape1, const OcctShape& shape2);

/// Calculate distance from a point to a shape
DistanceResult compute_point_to_shape_distance(
    double px, double py, double pz,
    const OcctShape& shape
);

// ============================================================
// MEASUREMENT/PROPERTIES
// ============================================================
BoundingBoxResult get_bounding_box(const OcctShape& shape);
ShapeProperties get_shape_properties(const OcctShape& shape);
double measure_distance(const OcctShape& shape1, const OcctShape& shape2);
rust::Vec<EdgeInfo> get_edges(const OcctShape& shape);

// ============================================================
// SHAPE UTILITIES
// ============================================================
bool is_valid(const OcctShape& shape);
bool is_null(const OcctShape& shape);
std::unique_ptr<OcctShape> clone_shape(const OcctShape& shape);
std::unique_ptr<OcctShape> fix_shape(const OcctShape& shape);
int32_t get_shape_type(const OcctShape& shape);

// ============================================================
// HLR PROJECTION (2D Technical Drawings)
// ============================================================

/// Compute Hidden Line Removal projection of a shape
/// Returns lines classified by visibility and type
HLRProjectionResult compute_hlr_projection(
    const OcctShape& shape,
    double dir_x, double dir_y, double dir_z,
    double up_x, double up_y, double up_z,
    double scale
);

/// Compute Hidden Line Removal projection with full curve support
/// Returns curves (lines, arcs, circles, ellipses) and polylines for complex curves
/// deflection: controls curve tessellation quality (smaller = more accurate, 0.01 recommended)
HLRProjectionResultV2 compute_hlr_projection_v2(
    const OcctShape& shape,
    double dir_x, double dir_y, double dir_z,
    double up_x, double up_y, double up_z,
    double scale,
    double deflection
);

/// Compute a section cut of a shape with a plane
/// origin: point on the cutting plane
/// normal: direction perpendicular to the plane
std::unique_ptr<OcctShape> compute_section(
    const OcctShape& shape,
    double origin_x, double origin_y, double origin_z,
    double normal_x, double normal_y, double normal_z
);

/// Compute a section cut with hatching lines for technical drawings
/// Returns section curves and hatch lines for closed regions
/// hatch_angle: angle of hatch lines in degrees (45 typical)
/// hatch_spacing: distance between hatch lines
/// up_x, up_y, up_z: up direction for 2D projection
SectionWithHatchResult compute_section_with_hatch(
    const OcctShape& shape,
    double origin_x, double origin_y, double origin_z,
    double normal_x, double normal_y, double normal_z,
    double up_x, double up_y, double up_z,
    double hatch_angle,
    double hatch_spacing
);

// ============================================================
// TOPOLOGY EXTRACTION FOR INTERACTIVE SELECTION
// ============================================================

/// Extract all topological vertices from the shape
/// Returns position and connectivity info for each vertex
rust::Vec<VertexInfo> get_topology_vertices(const OcctShape& shape);

/// Tessellate all edges for wireframe rendering
/// deflection: controls curve approximation quality (smaller = more points)
rust::Vec<EdgeTessellation> tessellate_edges(const OcctShape& shape, double deflection);

/// Get complete topology with adjacency information
/// This is the most comprehensive function for selection support
TopologyResult get_full_topology(const OcctShape& shape, double edge_deflection);

// ============================================================
// EXPLODE/IMPLODE VIEW OPERATIONS
// ============================================================

/// Explode a shape into its sub-components with offset vectors
/// shape: the shape to explode
/// level: 0=solids, 1=shells, 2=faces
/// distance: how far to move parts from center
/// deflection: tessellation quality
ExplodeResult explode_shape(
    const OcctShape& shape,
    int32_t level,
    double distance,
    double deflection
);

/// Get shape components without offset (for analysis)
rust::Vec<ExplodedPart> get_shape_components(
    const OcctShape& shape,
    int32_t level,
    double deflection
);

/// Count the number of sub-components at a given level
int32_t count_shape_components(const OcctShape& shape, int32_t level);

} // namespace cadhy_cad

