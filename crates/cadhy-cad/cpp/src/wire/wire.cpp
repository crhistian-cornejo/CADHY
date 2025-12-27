/**
 * @file wire.cpp
 * @brief Implementation of wire and sketch operations
 *
 * Uses OpenCASCADE BRepBuilderAPI and Geom classes for 2D/3D curves.
 */

#include <cadhy/wire/wire.hpp>

#include <BRepBuilderAPI_MakeVertex.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakePolygon.hxx>
#include <BRepOffsetAPI_MakeOffset.hxx>
#include <BRepFilletAPI_MakeFillet2d.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <GC_MakeCircle.hxx>
#include <GC_MakeArcOfCircle.hxx>
#include <GC_MakeEllipse.hxx>
#include <GC_MakeSegment.hxx>
#include <GCE2d_MakeSegment.hxx>
#include <Geom_Line.hxx>
#include <Geom_Circle.hxx>
#include <Geom_Ellipse.hxx>
#include <Geom_BezierCurve.hxx>
#include <Geom_BSplineCurve.hxx>
#include <GeomAPI_Interpolate.hxx>
#include <GeomAPI_PointsToBSpline.hxx>
#include <TColgp_Array1OfPnt.hxx>
#include <TColgp_HArray1OfPnt.hxx>
#include <TColStd_HArray1OfReal.hxx>
#include <TColStd_Array1OfReal.hxx>
#include <TColStd_Array1OfInteger.hxx>
#include <ShapeAnalysis_Wire.hxx>
#include <ShapeAnalysis_Curve.hxx>
#include <ShapeFix_Wire.hxx>
#include <BRepTools_WireExplorer.hxx>
#include <TopoDS.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <GProp_GProps.hxx>
#include <BRepGProp.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax3.hxx>
#include <gp_Circ.hxx>
#include <gp_Elips.hxx>
#include <gp_Lin.hxx>
#include <gp_Pln.hxx>

namespace cadhy::wire {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

gp_Pnt to_gp_pnt(const Point3D& p) {
    return gp_Pnt(p.x, p.y, p.z);
}

gp_Dir to_gp_dir(const Vector3D& v) {
    return gp_Dir(v.x, v.y, v.z);
}

gp_Vec to_gp_vec(const Vector3D& v) {
    return gp_Vec(v.x, v.y, v.z);
}

Point3D from_gp_pnt(const gp_Pnt& p) {
    return Point3D{p.X(), p.Y(), p.Z()};
}

Vector3D from_gp_dir(const gp_Dir& d) {
    return Vector3D{d.X(), d.Y(), d.Z()};
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Point/Vertex Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_vertex(double x, double y, double z) {
    BRepBuilderAPI_MakeVertex maker(gp_Pnt(x, y, z));
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Vertex());
}

std::unique_ptr<OcctShape> make_vertex(const Point3D& point) {
    return make_vertex(point.x, point.y, point.z);
}

//------------------------------------------------------------------------------
// Line/Edge Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_line(
    double x1, double y1, double z1,
    double x2, double y2, double z2
) {
    gp_Pnt p1(x1, y1, z1);
    gp_Pnt p2(x2, y2, z2);

    if (p1.Distance(p2) < 1e-10) {
        return nullptr;  // Points too close
    }

    BRepBuilderAPI_MakeEdge maker(p1, p2);
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Edge());
}

std::unique_ptr<OcctShape> make_line(const Point3D& p1, const Point3D& p2) {
    return make_line(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
}

std::unique_ptr<OcctShape> make_infinite_line(
    const Point3D& point,
    const Vector3D& direction
) {
    gp_Lin line(to_gp_pnt(point), to_gp_dir(direction));
    BRepBuilderAPI_MakeEdge maker(line);
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Edge());
}

std::unique_ptr<OcctShape> make_ray(
    const Point3D& origin,
    const Vector3D& direction,
    double length
) {
    gp_Pnt p1 = to_gp_pnt(origin);
    gp_Vec vec = to_gp_vec(direction);
    vec.Normalize();
    vec.Multiply(length);
    gp_Pnt p2 = p1.Translated(vec);

    BRepBuilderAPI_MakeEdge maker(p1, p2);
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Edge());
}

//------------------------------------------------------------------------------
// Arc Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_arc_3_points(
    const Point3D& p1,
    const Point3D& p2,
    const Point3D& p3
) {
    GC_MakeArcOfCircle arc_maker(to_gp_pnt(p1), to_gp_pnt(p2), to_gp_pnt(p3));
    if (!arc_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeEdge edge_maker(arc_maker.Value());
    if (!edge_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(edge_maker.Edge());
}

std::unique_ptr<OcctShape> make_arc_center(
    const Point3D& center,
    const Point3D& start,
    const Point3D& end
) {
    // Calculate radius from center to start
    gp_Pnt c = to_gp_pnt(center);
    gp_Pnt s = to_gp_pnt(start);
    gp_Pnt e = to_gp_pnt(end);

    double radius = c.Distance(s);

    // Determine plane normal from center, start, end
    gp_Vec v1(c, s);
    gp_Vec v2(c, e);
    gp_Vec normal = v1.Crossed(v2);

    if (normal.Magnitude() < 1e-10) {
        return nullptr;  // Collinear points
    }
    normal.Normalize();

    gp_Ax2 ax2(c, gp_Dir(normal), gp_Dir(v1));
    gp_Circ circle(ax2, radius);

    GC_MakeArcOfCircle arc_maker(circle, s, e, true);
    if (!arc_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeEdge edge_maker(arc_maker.Value());
    if (!edge_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(edge_maker.Edge());
}

std::unique_ptr<OcctShape> make_arc_angles(
    const Point3D& center,
    double radius,
    double start_angle,
    double end_angle
) {
    gp_Ax2 ax2(to_gp_pnt(center), gp_Dir(0, 0, 1));
    gp_Circ circle(ax2, radius);

    BRepBuilderAPI_MakeEdge maker(circle, start_angle, end_angle);
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Edge());
}

std::unique_ptr<OcctShape> make_arc_tangent(
    const OcctShape& edge,
    const Point3D& point,
    const Point3D& end_point
) {
    // Get tangent at point on edge
    BRepAdaptor_Curve curve(TopoDS::Edge(edge.get()));

    // Find parameter at point
    ShapeAnalysis_Curve analyzer;
    gp_Pnt proj_point;
    double param;
    analyzer.Project(curve, to_gp_pnt(point), 1e-6, proj_point, param);

    // Get tangent at that parameter
    gp_Pnt p;
    gp_Vec tangent;
    curve.D1(param, p, tangent);

    // Create arc starting at point with that tangent, ending at end_point
    GC_MakeArcOfCircle arc_maker(to_gp_pnt(point), tangent, to_gp_pnt(end_point));
    if (!arc_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeEdge edge_maker(arc_maker.Value());
    if (!edge_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(edge_maker.Edge());
}

//------------------------------------------------------------------------------
// Circle Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_circle(double radius) {
    gp_Ax2 ax2(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1));
    gp_Circ circle(ax2, radius);

    BRepBuilderAPI_MakeEdge edge_maker(circle);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_circle_at(
    double cx, double cy, double cz,
    double radius
) {
    gp_Ax2 ax2(gp_Pnt(cx, cy, cz), gp_Dir(0, 0, 1));
    gp_Circ circle(ax2, radius);

    BRepBuilderAPI_MakeEdge edge_maker(circle);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_circle_normal(
    const Point3D& center,
    const Vector3D& normal,
    double radius
) {
    gp_Ax2 ax2(to_gp_pnt(center), to_gp_dir(normal));
    gp_Circ circle(ax2, radius);

    BRepBuilderAPI_MakeEdge edge_maker(circle);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_circle_3_points(
    const Point3D& p1,
    const Point3D& p2,
    const Point3D& p3
) {
    GC_MakeCircle circle_maker(to_gp_pnt(p1), to_gp_pnt(p2), to_gp_pnt(p3));
    if (!circle_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeEdge edge_maker(circle_maker.Value());
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

//------------------------------------------------------------------------------
// Ellipse Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_ellipse(
    double major_radius,
    double minor_radius
) {
    if (minor_radius > major_radius) {
        std::swap(major_radius, minor_radius);
    }

    gp_Ax2 ax2(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1));
    gp_Elips ellipse(ax2, major_radius, minor_radius);

    BRepBuilderAPI_MakeEdge edge_maker(ellipse);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_ellipse_at(
    const Point3D& center,
    const Vector3D& normal,
    double major_radius,
    double minor_radius,
    double rotation
) {
    if (minor_radius > major_radius) {
        std::swap(major_radius, minor_radius);
    }

    gp_Ax2 ax2(to_gp_pnt(center), to_gp_dir(normal));

    // Apply rotation
    if (std::abs(rotation) > 1e-10) {
        ax2.Rotate(gp_Ax1(to_gp_pnt(center), to_gp_dir(normal)), rotation);
    }

    gp_Elips ellipse(ax2, major_radius, minor_radius);

    BRepBuilderAPI_MakeEdge edge_maker(ellipse);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

//------------------------------------------------------------------------------
// Rectangle Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_rectangle(double width, double height) {
    BRepBuilderAPI_MakePolygon poly;
    poly.Add(gp_Pnt(0, 0, 0));
    poly.Add(gp_Pnt(width, 0, 0));
    poly.Add(gp_Pnt(width, height, 0));
    poly.Add(gp_Pnt(0, height, 0));
    poly.Close();

    if (!poly.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(poly.Wire());
}

std::unique_ptr<OcctShape> make_rectangle_centered(double width, double height) {
    double hw = width / 2;
    double hh = height / 2;

    BRepBuilderAPI_MakePolygon poly;
    poly.Add(gp_Pnt(-hw, -hh, 0));
    poly.Add(gp_Pnt(hw, -hh, 0));
    poly.Add(gp_Pnt(hw, hh, 0));
    poly.Add(gp_Pnt(-hw, hh, 0));
    poly.Close();

    if (!poly.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(poly.Wire());
}

std::unique_ptr<OcctShape> make_rectangle_at(
    const Point3D& corner,
    double width, double height
) {
    double x = corner.x;
    double y = corner.y;
    double z = corner.z;

    BRepBuilderAPI_MakePolygon poly;
    poly.Add(gp_Pnt(x, y, z));
    poly.Add(gp_Pnt(x + width, y, z));
    poly.Add(gp_Pnt(x + width, y + height, z));
    poly.Add(gp_Pnt(x, y + height, z));
    poly.Close();

    if (!poly.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(poly.Wire());
}

std::unique_ptr<OcctShape> make_rounded_rectangle(
    double width, double height,
    double corner_radius
) {
    // Create basic rectangle first
    auto rect = make_rectangle_centered(width, height);
    if (!rect) return nullptr;

    // Convert to face for fillet operation
    BRepBuilderAPI_MakeFace face_maker(TopoDS::Wire(rect->get()));
    if (!face_maker.IsDone()) {
        return nullptr;
    }

    // Apply fillet to all corners
    BRepFilletAPI_MakeFillet2d fillet(face_maker.Face());

    for (TopExp_Explorer exp(face_maker.Face(), TopAbs_VERTEX); exp.More(); exp.Next()) {
        fillet.AddFillet(TopoDS::Vertex(exp.Current()), corner_radius);
    }

    fillet.Build();
    if (!fillet.IsDone()) {
        return rect;  // Return non-rounded if fillet fails
    }

    // Extract outer wire from filleted face
    for (TopExp_Explorer exp(fillet.Shape(), TopAbs_WIRE); exp.More(); exp.Next()) {
        return std::make_unique<OcctShape>(exp.Current());
    }

    return nullptr;
}

//------------------------------------------------------------------------------
// Polygon Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_polygon(
    int sides,
    double radius,
    bool inscribed
) {
    if (sides < 3) return nullptr;

    BRepBuilderAPI_MakePolygon poly;

    double actual_radius = inscribed ? radius : radius * std::cos(M_PI / sides);

    for (int i = 0; i < sides; ++i) {
        double angle = 2 * M_PI * i / sides;
        double x = actual_radius * std::cos(angle);
        double y = actual_radius * std::sin(angle);
        poly.Add(gp_Pnt(x, y, 0));
    }
    poly.Close();

    if (!poly.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(poly.Wire());
}

std::unique_ptr<OcctShape> make_polygon_points(
    const std::vector<Point3D>& points,
    bool close
) {
    if (points.size() < 2) return nullptr;

    BRepBuilderAPI_MakePolygon poly;
    for (const auto& pt : points) {
        poly.Add(to_gp_pnt(pt));
    }

    if (close) {
        poly.Close();
    }

    if (!poly.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(poly.Wire());
}

std::unique_ptr<OcctShape> make_polyline(
    const std::vector<Point3D>& points
) {
    return make_polygon_points(points, false);
}

//------------------------------------------------------------------------------
// Spline Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_spline(
    const std::vector<Point3D>& points,
    bool closed
) {
    if (points.size() < 2) return nullptr;

    Handle(TColgp_HArray1OfPnt) pts = new TColgp_HArray1OfPnt(1, static_cast<Standard_Integer>(points.size()));
    for (size_t i = 0; i < points.size(); ++i) {
        pts->SetValue(static_cast<Standard_Integer>(i + 1), to_gp_pnt(points[i]));
    }

    GeomAPI_Interpolate interp(pts, closed, 1e-6);
    interp.Perform();

    if (!interp.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeEdge edge_maker(interp.Curve());
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_spline_tangent(
    const std::vector<Point3D>& points,
    const Vector3D& start_tangent,
    const Vector3D& end_tangent
) {
    if (points.size() < 2) return nullptr;

    Handle(TColgp_HArray1OfPnt) pts = new TColgp_HArray1OfPnt(1, static_cast<Standard_Integer>(points.size()));
    for (size_t i = 0; i < points.size(); ++i) {
        pts->SetValue(static_cast<Standard_Integer>(i + 1), to_gp_pnt(points[i]));
    }

    GeomAPI_Interpolate interp(pts, false, 1e-6);
    interp.Load(to_gp_vec(start_tangent), to_gp_vec(end_tangent));
    interp.Perform();

    if (!interp.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeEdge edge_maker(interp.Curve());
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_bezier(
    const std::vector<Point3D>& control_points
) {
    if (control_points.size() < 2) return nullptr;

    TColgp_Array1OfPnt pts(1, static_cast<Standard_Integer>(control_points.size()));
    for (size_t i = 0; i < control_points.size(); ++i) {
        pts.SetValue(static_cast<Standard_Integer>(i + 1), to_gp_pnt(control_points[i]));
    }

    Handle(Geom_BezierCurve) curve = new Geom_BezierCurve(pts);

    BRepBuilderAPI_MakeEdge edge_maker(curve);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_nurbs(
    const std::vector<Point3D>& control_points,
    const std::vector<double>& weights,
    const std::vector<double>& knots,
    int degree
) {
    if (control_points.size() < 2) return nullptr;

    int n = static_cast<int>(control_points.size());

    TColgp_Array1OfPnt poles(1, n);
    TColStd_Array1OfReal w(1, n);

    for (int i = 0; i < n; ++i) {
        poles.SetValue(i + 1, to_gp_pnt(control_points[i]));
        w.SetValue(i + 1, i < static_cast<int>(weights.size()) ? weights[i] : 1.0);
    }

    // Build knot vector
    int num_knots = static_cast<int>(knots.size());
    TColStd_Array1OfReal k(1, num_knots);
    TColStd_Array1OfInteger m(1, num_knots);

    for (int i = 0; i < num_knots; ++i) {
        k.SetValue(i + 1, knots[i]);
        m.SetValue(i + 1, 1);  // Multiplicity 1 for all knots
    }

    Handle(Geom_BSplineCurve) curve = new Geom_BSplineCurve(poles, w, k, m, degree);

    BRepBuilderAPI_MakeEdge edge_maker(curve);
    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(wire_maker.Wire());
}

//------------------------------------------------------------------------------
// Wire Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_wire(
    const std::vector<const OcctShape*>& edges
) {
    BRepBuilderAPI_MakeWire maker;

    for (const auto* edge : edges) {
        if (edge->get().ShapeType() == TopAbs_EDGE) {
            maker.Add(TopoDS::Edge(edge->get()));
        } else if (edge->get().ShapeType() == TopAbs_WIRE) {
            maker.Add(TopoDS::Wire(edge->get()));
        }
    }

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Wire());
}

std::unique_ptr<OcctShape> make_wire_from_edge(const OcctShape& edge) {
    BRepBuilderAPI_MakeWire maker(TopoDS::Edge(edge.get()));
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Wire());
}

std::unique_ptr<OcctShape> connect_edges(
    const std::vector<const OcctShape*>& edges,
    double tolerance
) {
    if (edges.empty()) return nullptr;

    BRepBuilderAPI_MakeWire maker;

    for (const auto* edge : edges) {
        if (edge && !edge->is_null() && edge->get().ShapeType() == TopAbs_EDGE) {
            maker.Add(TopoDS::Edge(edge->get()));
        }
    }

    if (maker.IsDone()) {
        return std::make_unique<OcctShape>(maker.Wire());
    }

    // If direct construction failed, try with increased tolerance
    // Build a wire from edges that we can get, then try to fix it
    BRepBuilderAPI_MakeWire retry_maker;

    for (const auto* edge : edges) {
        if (edge && !edge->is_null() && edge->get().ShapeType() == TopAbs_EDGE) {
            retry_maker.Add(TopoDS::Edge(edge->get()));
        }
    }

    if (!retry_maker.Wire().IsNull()) {
        TopoDS_Wire wire = retry_maker.Wire();

        // Try to fix the wire
        try {
            // Create a dummy face for the fixer
            BRepBuilderAPI_MakeFace face_maker(wire, Standard_True);
            if (face_maker.IsDone()) {
                ShapeFix_Wire fixer(wire, face_maker.Face(), tolerance);
                fixer.FixReorder();
                fixer.FixConnected();
                fixer.FixGaps3d();
                fixer.Perform();

                if (!fixer.Wire().IsNull()) {
                    return std::make_unique<OcctShape>(fixer.Wire());
                }
            }
        } catch (...) {
            // Fall through to return partial wire
        }

        // Return the partial wire if we have one
        return std::make_unique<OcctShape>(wire);
    }

    return nullptr;
}

std::unique_ptr<OcctShape> close_wire(const OcctShape& wire) {
    TopoDS_Wire w = TopoDS::Wire(wire.get());

    ShapeFix_Wire fixer(w, BRepBuilderAPI_MakeFace(w).Face(), 1e-6);
    fixer.ClosedWireMode() = true;
    fixer.Perform();

    return std::make_unique<OcctShape>(fixer.Wire());
}

//------------------------------------------------------------------------------
// Face Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_face(const OcctShape& wire) {
    BRepBuilderAPI_MakeFace maker(TopoDS::Wire(wire.get()));
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Face());
}

std::unique_ptr<OcctShape> make_face_with_holes(
    const OcctShape& outer_wire,
    const std::vector<const OcctShape*>& hole_wires
) {
    BRepBuilderAPI_MakeFace maker(TopoDS::Wire(outer_wire.get()));
    if (!maker.IsDone()) {
        return nullptr;
    }

    for (const auto* hole : hole_wires) {
        TopoDS_Wire hw = TopoDS::Wire(hole->get());
        hw.Reverse();  // Holes must be reversed
        maker.Add(hw);
    }

    return std::make_unique<OcctShape>(maker.Face());
}

std::unique_ptr<OcctShape> make_face_on_plane(
    const OcctShape& wire,
    const Point3D& plane_point,
    const Vector3D& plane_normal
) {
    gp_Pln plane(to_gp_pnt(plane_point), to_gp_dir(plane_normal));
    BRepBuilderAPI_MakeFace maker(plane, TopoDS::Wire(wire.get()));
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Face());
}

//------------------------------------------------------------------------------
// Offset Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> offset_wire(
    const OcctShape& wire,
    double offset,
    bool round_corners
) {
    GeomAbs_JoinType join = round_corners ? GeomAbs_Arc : GeomAbs_Intersection;
    BRepOffsetAPI_MakeOffset maker(TopoDS::Wire(wire.get()), join);
    maker.Perform(offset);

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

bool is_wire_closed(const OcctShape& wire) {
    ShapeAnalysis_Wire analyzer;
    analyzer.Load(TopoDS::Wire(wire.get()));
    return analyzer.CheckClosed();
}

bool is_wire_planar(const OcctShape& wire) {
    BRepBuilderAPI_MakeFace maker(TopoDS::Wire(wire.get()), true);
    return maker.IsDone();
}

double wire_length(const OcctShape& wire) {
    GProp_GProps props;
    BRepGProp::LinearProperties(wire.get(), props);
    return props.Mass();
}

Point3D point_on_wire(const OcctShape& wire, double parameter) {
    // Get first edge and evaluate at parameter
    for (BRepTools_WireExplorer exp(TopoDS::Wire(wire.get())); exp.More(); exp.Next()) {
        BRepAdaptor_Curve curve(exp.Current());
        double first = curve.FirstParameter();
        double last = curve.LastParameter();
        double u = first + parameter * (last - first);
        gp_Pnt pt = curve.Value(u);
        return from_gp_pnt(pt);
    }
    return Point3D{0, 0, 0};
}

Vector3D tangent_on_wire(const OcctShape& wire, double parameter) {
    for (BRepTools_WireExplorer exp(TopoDS::Wire(wire.get())); exp.More(); exp.Next()) {
        BRepAdaptor_Curve curve(exp.Current());
        double first = curve.FirstParameter();
        double last = curve.LastParameter();
        double u = first + parameter * (last - first);
        gp_Pnt pt;
        gp_Vec tangent;
        curve.D1(u, pt, tangent);
        tangent.Normalize();
        return from_gp_dir(gp_Dir(tangent));
    }
    return Vector3D{1, 0, 0};
}

double project_point_to_wire(const OcctShape& wire, const Point3D& point) {
    double total_length = wire_length(wire);
    double accumulated = 0;
    double min_dist = 1e10;
    double best_param = 0;

    for (BRepTools_WireExplorer exp(TopoDS::Wire(wire.get())); exp.More(); exp.Next()) {
        BRepAdaptor_Curve curve(exp.Current());

        ShapeAnalysis_Curve analyzer;
        gp_Pnt proj;
        double param;
        double dist = analyzer.Project(curve, to_gp_pnt(point), 1e-6, proj, param);

        if (dist < min_dist) {
            min_dist = dist;
            double edge_length = curve.LastParameter() - curve.FirstParameter();
            double local_param = (param - curve.FirstParameter()) / edge_length;
            best_param = (accumulated + local_param * edge_length) / total_length;
        }

        GProp_GProps props;
        BRepGProp::LinearProperties(exp.Current(), props);
        accumulated += props.Mass();
    }

    return best_param;
}

} // namespace cadhy::wire
