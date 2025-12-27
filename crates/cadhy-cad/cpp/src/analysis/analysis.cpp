/**
 * @file analysis.cpp
 * @brief Implementation of shape analysis, validation, and measurement
 *
 * Uses OpenCASCADE BRepCheck, BRepGProp, and Extrema algorithms.
 */

#include <cadhy/analysis/analysis.hpp>

#include <BRepCheck_Analyzer.hxx>
#include <BRepCheck_Result.hxx>
#include <BRepCheck_ListOfStatus.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <GProp_PrincipalProps.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepLProp_CLProps.hxx>
#include <BRepLProp_SLProps.hxx>
#include <BRepClass3d_SolidClassifier.hxx>
#include <BRepBndLib.hxx>
#include <ShapeAnalysis_Edge.hxx>
#include <ShapeAnalysis_Surface.hxx>
#include <ShapeAnalysis_Shell.hxx>
#include <ShapeAnalysis_ShapeContents.hxx>
#include <ShapeFix_Shape.hxx>
#include <ShapeFix_Solid.hxx>
#include <ShapeFix_Shell.hxx>
#include <ShapeFix_Face.hxx>
#include <ShapeFix_Wire.hxx>
#include <ShapeUpgrade_UnifySameDomain.hxx>
#include <BRepBuilderAPI_Sewing.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_IndexedDataMapOfShapeListOfShape.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <Geom_Surface.hxx>
#include <Geom_Curve.hxx>
#include <GeomLProp_SLProps.hxx>
#include <GeomLProp_CLProps.hxx>
#include <Bnd_Box.hxx>
#include <gp_Pln.hxx>
#include <gp_Cylinder.hxx>
#include <gp_Cone.hxx>
#include <gp_Sphere.hxx>
#include <gp_Torus.hxx>

namespace cadhy::analysis {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

Point3D from_gp_pnt(const gp_Pnt& p) {
    return Point3D{p.X(), p.Y(), p.Z()};
}

Vector3D from_gp_dir(const gp_Dir& d) {
    return Vector3D{d.X(), d.Y(), d.Z()};
}

Vector3D from_gp_vec(const gp_Vec& v) {
    double len = v.Magnitude();
    if (len < 1e-10) return Vector3D{0, 0, 0};
    return Vector3D{v.X() / len, v.Y() / len, v.Z() / len};
}

gp_Pnt to_gp_pnt(const Point3D& p) {
    return gp_Pnt(p.x, p.y, p.z);
}

gp_Dir to_gp_dir(const Vector3D& v) {
    return gp_Dir(v.x, v.y, v.z);
}

std::string status_to_string(BRepCheck_Status status) {
    switch (status) {
        case BRepCheck_NoError: return "No error";
        case BRepCheck_InvalidPointOnCurve: return "Invalid point on curve";
        case BRepCheck_InvalidPointOnCurveOnSurface: return "Invalid point on curve on surface";
        case BRepCheck_InvalidPointOnSurface: return "Invalid point on surface";
        case BRepCheck_No3DCurve: return "No 3D curve";
        case BRepCheck_Multiple3DCurve: return "Multiple 3D curves";
        case BRepCheck_Invalid3DCurve: return "Invalid 3D curve";
        case BRepCheck_NoCurveOnSurface: return "No curve on surface";
        case BRepCheck_InvalidCurveOnSurface: return "Invalid curve on surface";
        case BRepCheck_InvalidCurveOnClosedSurface: return "Invalid curve on closed surface";
        case BRepCheck_InvalidSameRangeFlag: return "Invalid same range flag";
        case BRepCheck_InvalidSameParameterFlag: return "Invalid same parameter flag";
        case BRepCheck_InvalidDegeneratedFlag: return "Invalid degenerated flag";
        case BRepCheck_FreeEdge: return "Free edge";
        case BRepCheck_InvalidMultiConnexity: return "Invalid multi-connexity";
        case BRepCheck_InvalidRange: return "Invalid range";
        case BRepCheck_EmptyWire: return "Empty wire";
        case BRepCheck_RedundantEdge: return "Redundant edge";
        case BRepCheck_SelfIntersectingWire: return "Self-intersecting wire";
        case BRepCheck_NoSurface: return "No surface";
        case BRepCheck_InvalidWire: return "Invalid wire";
        case BRepCheck_RedundantWire: return "Redundant wire";
        case BRepCheck_IntersectingWires: return "Intersecting wires";
        case BRepCheck_InvalidImbricationOfWires: return "Invalid imbrication of wires";
        case BRepCheck_EmptyShell: return "Empty shell";
        case BRepCheck_RedundantFace: return "Redundant face";
        case BRepCheck_UnorientableShape: return "Unorientable shape";
        case BRepCheck_NotClosed: return "Not closed";
        case BRepCheck_NotConnected: return "Not connected";
        case BRepCheck_SubshapeNotInShape: return "Subshape not in shape";
        case BRepCheck_BadOrientation: return "Bad orientation";
        case BRepCheck_BadOrientationOfSubshape: return "Bad orientation of subshape";
        case BRepCheck_InvalidPolygonOnTriangulation: return "Invalid polygon on triangulation";
        case BRepCheck_InvalidToleranceValue: return "Invalid tolerance value";
        case BRepCheck_CheckFail: return "Check failed";
        default: return "Unknown error";
    }
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Shape Validation
//------------------------------------------------------------------------------

bool is_valid(const OcctShape& shape) {
    BRepCheck_Analyzer analyzer(shape.get());
    return analyzer.IsValid();
}

ValidationResult validate(const OcctShape& shape) {
    return validate_detailed(shape, true, true, true, true);
}

ValidationResult validate_detailed(
    const OcctShape& shape,
    bool check_faces,
    bool check_edges,
    bool check_vertices,
    bool check_continuity
) {
    ValidationResult result;
    result.is_valid = true;
    result.vertex_issues = 0;
    result.edge_issues = 0;
    result.face_issues = 0;
    result.shell_issues = 0;
    result.solid_issues = 0;

    BRepCheck_Analyzer analyzer(shape.get());
    result.is_valid = analyzer.IsValid();
    result.status = result.is_valid ? ValidityStatus::Valid : ValidityStatus::Invalid;

    // Check if closed
    result.is_closed = is_closed(shape);

    // Check if manifold
    result.is_manifold = is_manifold(shape);

    // Collect specific issues
    if (!result.is_valid) {
        // Check vertices
        if (check_vertices) {
            for (TopExp_Explorer exp(shape.get(), TopAbs_VERTEX); exp.More(); exp.Next()) {
                const Handle(BRepCheck_Result)& res = analyzer.Result(exp.Current());
                if (!res.IsNull()) {
                    for (BRepCheck_ListOfStatus::Iterator it(res->Status()); it.More(); it.Next()) {
                        if (it.Value() != BRepCheck_NoError) {
                            ValidationIssue issue;
                            issue.type = "VERTEX";
                            issue.description = status_to_string(it.Value());
                            issue.element_type = "vertex";
                            issue.severity = ValidityStatus::Invalid;
                            result.issues.push_back(issue);
                            result.vertex_issues++;
                        }
                    }
                }
            }
        }

        // Check edges
        if (check_edges) {
            for (TopExp_Explorer exp(shape.get(), TopAbs_EDGE); exp.More(); exp.Next()) {
                const Handle(BRepCheck_Result)& res = analyzer.Result(exp.Current());
                if (!res.IsNull()) {
                    for (BRepCheck_ListOfStatus::Iterator it(res->Status()); it.More(); it.Next()) {
                        if (it.Value() != BRepCheck_NoError) {
                            ValidationIssue issue;
                            issue.type = "EDGE";
                            issue.description = status_to_string(it.Value());
                            issue.element_type = "edge";
                            issue.severity = ValidityStatus::Invalid;
                            result.issues.push_back(issue);
                            result.edge_issues++;
                        }
                    }
                }
            }
        }

        // Check faces
        if (check_faces) {
            for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) {
                const Handle(BRepCheck_Result)& res = analyzer.Result(exp.Current());
                if (!res.IsNull()) {
                    for (BRepCheck_ListOfStatus::Iterator it(res->Status()); it.More(); it.Next()) {
                        if (it.Value() != BRepCheck_NoError) {
                            ValidationIssue issue;
                            issue.type = "FACE";
                            issue.description = status_to_string(it.Value());
                            issue.element_type = "face";
                            issue.severity = ValidityStatus::Invalid;
                            result.issues.push_back(issue);
                            result.face_issues++;
                        }
                    }
                }
            }
        }
    }

    return result;
}

bool is_closed(const OcctShape& shape) {
    for (TopExp_Explorer exp(shape.get(), TopAbs_SHELL); exp.More(); exp.Next()) {
        TopoDS_Shell shell = TopoDS::Shell(exp.Current());
        BRepCheck_Analyzer analyzer(shell);
        if (!analyzer.IsValid()) return false;
    }

    // Also check using ShapeAnalysis
    ShapeAnalysis_ShapeContents contents;
    contents.Perform(shape.get());

    return contents.NbFreeEdges() == 0;
}

bool is_manifold(const OcctShape& shape) {
    TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
    TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

    // Check that each edge has at most 2 adjacent faces
    for (int i = 1; i <= edge_face_map.Extent(); ++i) {
        if (edge_face_map(i).Extent() > 2) {
            return false;  // Non-manifold edge
        }
    }

    return true;
}

bool has_self_intersection(const OcctShape& shape) {
    BRepCheck_Analyzer analyzer(shape.get());

    // Look for self-intersection status
    for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) {
        const Handle(BRepCheck_Result)& res = analyzer.Result(exp.Current());
        if (!res.IsNull()) {
            for (BRepCheck_ListOfStatus::Iterator it(res->Status()); it.More(); it.Next()) {
                if (it.Value() == BRepCheck_SelfIntersectingWire) {
                    return true;
                }
            }
        }
    }

    return false;
}

//------------------------------------------------------------------------------
// Shape Repair
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> repair(
    const OcctShape& shape,
    const RepairOptions& options
) {
    TopoDS_Shape result = shape.get();

    // Apply shape fix
    ShapeFix_Shape fixer(result);
    fixer.SetPrecision(options.tolerance);
    fixer.Perform();
    result = fixer.Shape();

    // Sew faces if requested
    if (options.sew_faces) {
        BRepBuilderAPI_Sewing sewer(options.sewing_tolerance);
        sewer.Add(result);
        sewer.Perform();
        result = sewer.SewedShape();
    }

    if (result.IsNull()) {
        return nullptr;
    }

    return std::make_unique<OcctShape>(result);
}

std::unique_ptr<OcctShape> fix_solid(const OcctShape& solid) {
    ShapeFix_Solid fixer(TopoDS::Solid(solid.get()));
    fixer.Perform();
    return std::make_unique<OcctShape>(fixer.Solid());
}

std::unique_ptr<OcctShape> fix_shell(const OcctShape& shell) {
    ShapeFix_Shell fixer(TopoDS::Shell(shell.get()));
    fixer.Perform();
    return std::make_unique<OcctShape>(fixer.Shell());
}

std::unique_ptr<OcctShape> fix_face(const OcctShape& face) {
    ShapeFix_Face fixer(TopoDS::Face(face.get()));
    fixer.Perform();
    return std::make_unique<OcctShape>(fixer.Face());
}

std::unique_ptr<OcctShape> fix_wire(const OcctShape& wire) {
    ShapeFix_Wire fixer(TopoDS::Wire(wire.get()), TopoDS_Face(), 1e-6);
    fixer.Perform();
    return std::make_unique<OcctShape>(fixer.Wire());
}

std::unique_ptr<OcctShape> sew_faces(
    const std::vector<const OcctShape*>& faces,
    double tolerance
) {
    BRepBuilderAPI_Sewing sewer(tolerance);

    for (const auto* face : faces) {
        sewer.Add(face->get());
    }

    sewer.Perform();
    TopoDS_Shape result = sewer.SewedShape();

    if (result.IsNull()) return nullptr;
    return std::make_unique<OcctShape>(result);
}

std::unique_ptr<OcctShape> heal(
    const OcctShape& shape,
    double tolerance
) {
    RepairOptions options;
    options.tolerance = tolerance;
    options.sew_faces = true;
    options.fix_continuity = true;
    return repair(shape, options);
}

//------------------------------------------------------------------------------
// Mass Properties
//------------------------------------------------------------------------------

double volume(const OcctShape& solid) {
    GProp_GProps props;
    BRepGProp::VolumeProperties(solid.get(), props);
    return props.Mass();
}

double surface_area(const OcctShape& shape) {
    GProp_GProps props;
    BRepGProp::SurfaceProperties(shape.get(), props);
    return props.Mass();
}

MassProperties mass_properties(const OcctShape& shape) {
    MassProperties result;

    GProp_GProps props;
    BRepGProp::VolumeProperties(shape.get(), props);

    result.mass = props.Mass();

    gp_Pnt cog = props.CentreOfMass();
    result.center_of_gravity = from_gp_pnt(cog);

    // Get moments of inertia
    gp_Mat inertia = props.MatrixOfInertia();
    result.moments_of_inertia[0] = inertia(1, 1);  // Ixx
    result.moments_of_inertia[1] = inertia(2, 2);  // Iyy
    result.moments_of_inertia[2] = inertia(3, 3);  // Izz

    result.products_of_inertia[0] = inertia(1, 2);  // Ixy
    result.products_of_inertia[1] = inertia(1, 3);  // Ixz
    result.products_of_inertia[2] = inertia(2, 3);  // Iyz

    // Get principal properties
    GProp_PrincipalProps principal = props.PrincipalProperties();
    principal.Moments(result.principal_moments[0],
                      result.principal_moments[1],
                      result.principal_moments[2]);

    // Get principal axes (these return gp_Vec, not void)
    gp_Vec v1 = principal.FirstAxisOfInertia();
    gp_Vec v2 = principal.SecondAxisOfInertia();
    gp_Vec v3 = principal.ThirdAxisOfInertia();

    result.principal_axes[0] = from_gp_vec(v1);
    result.principal_axes[1] = from_gp_vec(v2);
    result.principal_axes[2] = from_gp_vec(v3);

    // Calculate radii of gyration from moments and mass
    double mass = result.mass;
    if (mass > 1e-10) {
        result.gyration_radii[0] = std::sqrt(std::abs(result.principal_moments[0]) / mass);
        result.gyration_radii[1] = std::sqrt(std::abs(result.principal_moments[1]) / mass);
        result.gyration_radii[2] = std::sqrt(std::abs(result.principal_moments[2]) / mass);
    } else {
        result.gyration_radii[0] = 0;
        result.gyration_radii[1] = 0;
        result.gyration_radii[2] = 0;
    }

    return result;
}

Point3D center_of_gravity(const OcctShape& shape) {
    GProp_GProps props;
    BRepGProp::VolumeProperties(shape.get(), props);
    return from_gp_pnt(props.CentreOfMass());
}

void moments_of_inertia(
    const OcctShape& shape,
    double& ixx, double& iyy, double& izz,
    double& ixy, double& ixz, double& iyz
) {
    GProp_GProps props;
    BRepGProp::VolumeProperties(shape.get(), props);
    gp_Mat mat = props.MatrixOfInertia();

    ixx = mat(1, 1);
    iyy = mat(2, 2);
    izz = mat(3, 3);
    ixy = mat(1, 2);
    ixz = mat(1, 3);
    iyz = mat(2, 3);
}

//------------------------------------------------------------------------------
// Linear Measurements
//------------------------------------------------------------------------------

double length(const OcctShape& edge_or_wire) {
    GProp_GProps props;
    BRepGProp::LinearProperties(edge_or_wire.get(), props);
    return props.Mass();
}

double perimeter(const OcctShape& face) {
    double total = 0;
    for (TopExp_Explorer exp(face.get(), TopAbs_EDGE); exp.More(); exp.Next()) {
        GProp_GProps props;
        BRepGProp::LinearProperties(exp.Current(), props);
        total += props.Mass();
    }
    return total;
}

double point_distance(const Point3D& p1, const Point3D& p2) {
    double dx = p2.x - p1.x;
    double dy = p2.y - p1.y;
    double dz = p2.z - p1.z;
    return std::sqrt(dx * dx + dy * dy + dz * dz);
}

double min_distance(const OcctShape& shape1, const OcctShape& shape2) {
    BRepExtrema_DistShapeShape dist(shape1.get(), shape2.get());
    if (!dist.IsDone()) return -1;
    return dist.Value();
}

double max_distance(const OcctShape& shape1, const OcctShape& shape2) {
    // This requires sampling points - simplified implementation
    Bnd_Box box1, box2;
    BRepBndLib::Add(shape1.get(), box1);
    BRepBndLib::Add(shape2.get(), box2);

    // Get corners of bounding boxes and find max distance
    double xmin1, ymin1, zmin1, xmax1, ymax1, zmax1;
    double xmin2, ymin2, zmin2, xmax2, ymax2, zmax2;
    box1.Get(xmin1, ymin1, zmin1, xmax1, ymax1, zmax1);
    box2.Get(xmin2, ymin2, zmin2, xmax2, ymax2, zmax2);

    double max_dist = 0;
    gp_Pnt corners1[8] = {
        gp_Pnt(xmin1, ymin1, zmin1), gp_Pnt(xmax1, ymin1, zmin1),
        gp_Pnt(xmin1, ymax1, zmin1), gp_Pnt(xmax1, ymax1, zmin1),
        gp_Pnt(xmin1, ymin1, zmax1), gp_Pnt(xmax1, ymin1, zmax1),
        gp_Pnt(xmin1, ymax1, zmax1), gp_Pnt(xmax1, ymax1, zmax1)
    };
    gp_Pnt corners2[8] = {
        gp_Pnt(xmin2, ymin2, zmin2), gp_Pnt(xmax2, ymin2, zmin2),
        gp_Pnt(xmin2, ymax2, zmin2), gp_Pnt(xmax2, ymax2, zmin2),
        gp_Pnt(xmin2, ymin2, zmax2), gp_Pnt(xmax2, ymin2, zmax2),
        gp_Pnt(xmin2, ymax2, zmax2), gp_Pnt(xmax2, ymax2, zmax2)
    };

    for (const auto& c1 : corners1) {
        for (const auto& c2 : corners2) {
            max_dist = std::max(max_dist, c1.Distance(c2));
        }
    }

    return max_dist;
}

DistanceResult distance_detailed(
    const OcctShape& shape1,
    const OcctShape& shape2
) {
    DistanceResult result;

    BRepExtrema_DistShapeShape dist(shape1.get(), shape2.get());
    if (!dist.IsDone()) {
        result.distance = -1;
        return result;
    }

    result.distance = dist.Value();

    if (dist.NbSolution() > 0) {
        result.point1 = from_gp_pnt(dist.PointOnShape1(1));
        result.point2 = from_gp_pnt(dist.PointOnShape2(1));
    }

    return result;
}

DistanceResult point_to_shape_distance(
    const Point3D& point,
    const OcctShape& shape
) {
    DistanceResult result;

    // Create a vertex from point
    TopoDS_Vertex vertex = BRepBuilderAPI_MakeVertex(to_gp_pnt(point)).Vertex();

    BRepExtrema_DistShapeShape dist(vertex, shape.get());
    if (!dist.IsDone()) {
        result.distance = -1;
        return result;
    }

    result.distance = dist.Value();
    result.point1 = point;

    if (dist.NbSolution() > 0) {
        result.point2 = from_gp_pnt(dist.PointOnShape2(1));
    }

    return result;
}

//------------------------------------------------------------------------------
// Angular Measurements
//------------------------------------------------------------------------------

double angle_between_vectors(const Vector3D& v1, const Vector3D& v2) {
    gp_Dir d1(v1.x, v1.y, v1.z);
    gp_Dir d2(v2.x, v2.y, v2.z);
    return d1.Angle(d2);
}

double dihedral_angle(const OcctShape& face1, const OcctShape& face2) {
    BRepAdaptor_Surface surf1(TopoDS::Face(face1.get()));
    BRepAdaptor_Surface surf2(TopoDS::Face(face2.get()));

    // Get normals at face centers (simplified)
    double u1 = (surf1.FirstUParameter() + surf1.LastUParameter()) / 2;
    double v1 = (surf1.FirstVParameter() + surf1.LastVParameter()) / 2;
    double u2 = (surf2.FirstUParameter() + surf2.LastUParameter()) / 2;
    double v2 = (surf2.FirstVParameter() + surf2.LastVParameter()) / 2;

    gp_Pnt p1, p2;
    gp_Vec du1, dv1, du2, dv2;
    surf1.D1(u1, v1, p1, du1, dv1);
    surf2.D1(u2, v2, p2, du2, dv2);

    gp_Vec n1 = du1.Crossed(dv1);
    gp_Vec n2 = du2.Crossed(dv2);

    n1.Normalize();
    n2.Normalize();

    return n1.Angle(n2);
}

//------------------------------------------------------------------------------
// Surface Analysis
//------------------------------------------------------------------------------

SurfaceType identify_surface(const OcctShape& face) {
    BRepAdaptor_Surface surf(TopoDS::Face(face.get()));

    switch (surf.GetType()) {
        case GeomAbs_Plane:      return SurfaceType::Plane;
        case GeomAbs_Cylinder:   return SurfaceType::Cylinder;
        case GeomAbs_Cone:       return SurfaceType::Cone;
        case GeomAbs_Sphere:     return SurfaceType::Sphere;
        case GeomAbs_Torus:      return SurfaceType::Torus;
        case GeomAbs_BezierSurface: return SurfaceType::BezierSurface;
        case GeomAbs_BSplineSurface: return SurfaceType::BSplineSurface;
        case GeomAbs_SurfaceOfRevolution: return SurfaceType::RevolutionSurface;
        case GeomAbs_SurfaceOfExtrusion: return SurfaceType::ExtrusionSurface;
        case GeomAbs_OffsetSurface: return SurfaceType::OffsetSurface;
        default: return SurfaceType::OtherSurface;
    }
}

bool is_planar(const OcctShape& face, double tolerance) {
    BRepAdaptor_Surface surf(TopoDS::Face(face.get()));
    return surf.GetType() == GeomAbs_Plane;
}

bool get_plane(const OcctShape& face, Point3D& point, Vector3D& normal) {
    BRepAdaptor_Surface surf(TopoDS::Face(face.get()));
    if (surf.GetType() != GeomAbs_Plane) return false;

    gp_Pln plane = surf.Plane();
    point = from_gp_pnt(plane.Location());
    normal = from_gp_dir(plane.Axis().Direction());
    return true;
}

bool is_cylindrical(
    const OcctShape& face,
    Point3D& axis_point,
    Vector3D& axis_direction,
    double& radius
) {
    BRepAdaptor_Surface surf(TopoDS::Face(face.get()));
    if (surf.GetType() != GeomAbs_Cylinder) return false;

    gp_Cylinder cyl = surf.Cylinder();
    axis_point = from_gp_pnt(cyl.Location());
    axis_direction = from_gp_dir(cyl.Axis().Direction());
    radius = cyl.Radius();
    return true;
}

//------------------------------------------------------------------------------
// Edge Analysis
//------------------------------------------------------------------------------

EdgeType identify_edge(const OcctShape& edge) {
    BRepAdaptor_Curve curve(TopoDS::Edge(edge.get()));

    switch (curve.GetType()) {
        case GeomAbs_Line:     return EdgeType::Line;
        case GeomAbs_Circle:   return EdgeType::Circle;
        case GeomAbs_Ellipse:  return EdgeType::Ellipse;
        case GeomAbs_Hyperbola: return EdgeType::Hyperbola;
        case GeomAbs_Parabola: return EdgeType::Parabola;
        case GeomAbs_BezierCurve: return EdgeType::BezierCurve;
        case GeomAbs_BSplineCurve: return EdgeType::BSplineCurve;
        case GeomAbs_OffsetCurve: return EdgeType::OffsetCurve;
        default: return EdgeType::OtherCurve;
    }
}

bool is_linear(const OcctShape& edge, double tolerance) {
    BRepAdaptor_Curve curve(TopoDS::Edge(edge.get()));
    return curve.GetType() == GeomAbs_Line;
}

bool get_line(const OcctShape& edge, Point3D& start, Point3D& end) {
    BRepAdaptor_Curve curve(TopoDS::Edge(edge.get()));

    start = from_gp_pnt(curve.Value(curve.FirstParameter()));
    end = from_gp_pnt(curve.Value(curve.LastParameter()));
    return true;
}

//------------------------------------------------------------------------------
// Topology Analysis
//------------------------------------------------------------------------------

TopologyStats count_topology(const OcctShape& shape) {
    TopologyStats stats = {};

    for (TopExp_Explorer exp(shape.get(), TopAbs_SOLID); exp.More(); exp.Next()) stats.solids++;
    for (TopExp_Explorer exp(shape.get(), TopAbs_SHELL); exp.More(); exp.Next()) stats.shells++;
    for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) stats.faces++;
    for (TopExp_Explorer exp(shape.get(), TopAbs_WIRE); exp.More(); exp.Next()) stats.wires++;
    for (TopExp_Explorer exp(shape.get(), TopAbs_EDGE); exp.More(); exp.Next()) stats.edges++;
    for (TopExp_Explorer exp(shape.get(), TopAbs_VERTEX); exp.More(); exp.Next()) stats.vertices++;
    for (TopExp_Explorer exp(shape.get(), TopAbs_COMPOUND); exp.More(); exp.Next()) stats.compounds++;

    return stats;
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

BoundingBox3D bounding_box(const OcctShape& shape) {
    Bnd_Box box;
    BRepBndLib::Add(shape.get(), box);

    double xmin, ymin, zmin, xmax, ymax, zmax;
    box.Get(xmin, ymin, zmin, xmax, ymax, zmax);

    return BoundingBox3D{
        Point3D{xmin, ymin, zmin},
        Point3D{xmax, ymax, zmax}
    };
}

BoundingBox3D bounding_box_extended(const OcctShape& shape, double gap) {
    BoundingBox3D bbox = bounding_box(shape);
    bbox.min.x -= gap;
    bbox.min.y -= gap;
    bbox.min.z -= gap;
    bbox.max.x += gap;
    bbox.max.y += gap;
    bbox.max.z += gap;
    return bbox;
}

bool is_point_inside(const OcctShape& solid, const Point3D& point) {
    BRepClass3d_SolidClassifier classifier(solid.get());
    classifier.Perform(to_gp_pnt(point), 1e-7);

    return classifier.State() == TopAbs_IN;
}

PointLocation classify_point(
    const OcctShape& solid,
    const Point3D& point,
    double tolerance
) {
    BRepClass3d_SolidClassifier classifier(solid.get());
    classifier.Perform(to_gp_pnt(point), tolerance);

    switch (classifier.State()) {
        case TopAbs_IN: return PointLocation::Inside;
        case TopAbs_OUT: return PointLocation::Outside;
        case TopAbs_ON: return PointLocation::OnBoundary;
        default: return PointLocation::Outside;
    }
}

} // namespace cadhy::analysis
