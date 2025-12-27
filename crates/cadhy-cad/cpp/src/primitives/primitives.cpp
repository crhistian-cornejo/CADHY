/**
 * @file primitives.cpp
 * @brief Implementation of primitive shape creation
 *
 * Uses OpenCASCADE BRepPrimAPI for solid primitive generation.
 */

#include <cadhy/primitives/primitives.hpp>

#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepPrimAPI_MakeCone.hxx>
#include <BRepPrimAPI_MakeTorus.hxx>
#include <BRepPrimAPI_MakeWedge.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeHalfSpace.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakePolygon.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepOffsetAPI_MakePipe.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <TopoDS.hxx>
#include <gp_Ax2.hxx>
#include <gp_Pln.hxx>
#include <gp_Circ.hxx>
#include <gp_Trsf.hxx>

namespace cadhy::primitives {

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

gp_Ax2 make_axis(const Point3D& origin, const Vector3D& z_dir) {
    return gp_Ax2(to_gp_pnt(origin), to_gp_dir(z_dir));
}

gp_Ax2 make_axis(const Point3D& origin, const Vector3D& z_dir, const Vector3D& x_dir) {
    return gp_Ax2(to_gp_pnt(origin), to_gp_dir(z_dir), to_gp_dir(x_dir));
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Box
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_box(double dx, double dy, double dz) {
    BRepPrimAPI_MakeBox maker(dx, dy, dz);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_box_at(
    double x, double y, double z,
    double dx, double dy, double dz
) {
    gp_Pnt corner(x, y, z);
    BRepPrimAPI_MakeBox maker(corner, dx, dy, dz);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_box_centered(double dx, double dy, double dz) {
    gp_Pnt corner(-dx/2, -dy/2, -dz/2);
    BRepPrimAPI_MakeBox maker(corner, dx, dy, dz);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_box_two_points(
    const Point3D& p1,
    const Point3D& p2
) {
    BRepPrimAPI_MakeBox maker(to_gp_pnt(p1), to_gp_pnt(p2));
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_box_axis(
    const Point3D& origin,
    const Vector3D& x_dir,
    const Vector3D& z_dir,
    double dx, double dy, double dz
) {
    gp_Ax2 ax2 = make_axis(origin, z_dir, x_dir);
    BRepPrimAPI_MakeBox maker(ax2, dx, dy, dz);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Cylinder
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_cylinder(double radius, double height) {
    BRepPrimAPI_MakeCylinder maker(radius, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cylinder_at(
    double x, double y, double z,
    double radius, double height
) {
    gp_Ax2 ax2(gp_Pnt(x, y, z), gp_Dir(0, 0, 1));
    BRepPrimAPI_MakeCylinder maker(ax2, radius, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cylinder_axis(
    const Point3D& origin,
    const Vector3D& axis,
    double radius, double height
) {
    gp_Ax2 ax2 = make_axis(origin, axis);
    BRepPrimAPI_MakeCylinder maker(ax2, radius, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cylinder_segment(
    double radius, double height,
    double start_angle, double end_angle
) {
    double angle = end_angle - start_angle;
    BRepPrimAPI_MakeCylinder maker(radius, height, angle);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }

    // Rotate to start_angle if needed
    if (std::abs(start_angle) > 1e-10) {
        gp_Trsf trsf;
        trsf.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), start_angle);
        BRepBuilderAPI_Transform transform(maker.Shape(), trsf);
        return std::make_unique<OcctShape>(transform.Shape());
    }

    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cylinder_centered(double radius, double height) {
    gp_Ax2 ax2(gp_Pnt(0, 0, -height/2), gp_Dir(0, 0, 1));
    BRepPrimAPI_MakeCylinder maker(ax2, radius, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Sphere
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_sphere(double radius) {
    BRepPrimAPI_MakeSphere maker(radius);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_sphere_at(
    double x, double y, double z,
    double radius
) {
    gp_Pnt center(x, y, z);
    BRepPrimAPI_MakeSphere maker(center, radius);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_sphere_segment(
    double radius,
    double angle1, double angle2
) {
    BRepPrimAPI_MakeSphere maker(radius, angle1, angle2);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_hemisphere(double radius, bool upper) {
    if (upper) {
        BRepPrimAPI_MakeSphere maker(radius, 0, M_PI/2);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    } else {
        BRepPrimAPI_MakeSphere maker(radius, -M_PI/2, 0);
        maker.Build();
        if (!maker.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(maker.Shape());
    }
}

//------------------------------------------------------------------------------
// Cone
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_cone(double radius1, double radius2, double height) {
    BRepPrimAPI_MakeCone maker(radius1, radius2, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cone_at(
    double x, double y, double z,
    double radius1, double radius2, double height
) {
    gp_Ax2 ax2(gp_Pnt(x, y, z), gp_Dir(0, 0, 1));
    BRepPrimAPI_MakeCone maker(ax2, radius1, radius2, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cone_axis(
    const Point3D& origin,
    const Vector3D& axis,
    double radius1, double radius2, double height
) {
    gp_Ax2 ax2 = make_axis(origin, axis);
    BRepPrimAPI_MakeCone maker(ax2, radius1, radius2, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cone_point(double radius, double height) {
    // Cone from radius to point (radius2 = 0)
    BRepPrimAPI_MakeCone maker(radius, 0, height);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_cone_segment(
    double radius1, double radius2, double height,
    double start_angle, double end_angle
) {
    double angle = end_angle - start_angle;
    BRepPrimAPI_MakeCone maker(radius1, radius2, height, angle);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }

    if (std::abs(start_angle) > 1e-10) {
        gp_Trsf trsf;
        trsf.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), start_angle);
        BRepBuilderAPI_Transform transform(maker.Shape(), trsf);
        return std::make_unique<OcctShape>(transform.Shape());
    }

    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Torus
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_torus(double major_radius, double minor_radius) {
    BRepPrimAPI_MakeTorus maker(major_radius, minor_radius);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_torus_at(
    double x, double y, double z,
    double major_radius, double minor_radius
) {
    gp_Ax2 ax2(gp_Pnt(x, y, z), gp_Dir(0, 0, 1));
    BRepPrimAPI_MakeTorus maker(ax2, major_radius, minor_radius);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_torus_axis(
    const Point3D& origin,
    const Vector3D& axis,
    double major_radius, double minor_radius
) {
    gp_Ax2 ax2 = make_axis(origin, axis);
    BRepPrimAPI_MakeTorus maker(ax2, major_radius, minor_radius);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_torus_segment(
    double major_radius, double minor_radius,
    double angle1, double angle2
) {
    double angle = angle2 - angle1;
    BRepPrimAPI_MakeTorus maker(major_radius, minor_radius, angle);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }

    if (std::abs(angle1) > 1e-10) {
        gp_Trsf trsf;
        trsf.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), angle1);
        BRepBuilderAPI_Transform transform(maker.Shape(), trsf);
        return std::make_unique<OcctShape>(transform.Shape());
    }

    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_torus_section(
    double major_radius, double minor_radius,
    double minor_angle1, double minor_angle2
) {
    BRepPrimAPI_MakeTorus maker(major_radius, minor_radius, minor_angle1, minor_angle2);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Wedge
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_wedge(
    double dx, double dy, double dz,
    double ltx
) {
    BRepPrimAPI_MakeWedge maker(dx, dy, dz, ltx);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_wedge_full(
    double dx, double dy, double dz,
    double xmin, double zmin, double xmax, double zmax
) {
    BRepPrimAPI_MakeWedge maker(dx, dy, dz, xmin, zmin, xmax, zmax);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

std::unique_ptr<OcctShape> make_wedge_axis(
    const Point3D& origin,
    const Vector3D& x_dir,
    const Vector3D& z_dir,
    double dx, double dy, double dz,
    double ltx
) {
    gp_Ax2 ax2 = make_axis(origin, z_dir, x_dir);
    BRepPrimAPI_MakeWedge maker(ax2, dx, dy, dz, ltx);
    maker.Build();
    if (!maker.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Special Primitives
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_pyramid(
    int sides,
    double base_radius,
    double height
) {
    // Create polygon base
    std::vector<gp_Pnt> points;
    for (int i = 0; i < sides; ++i) {
        double angle = 2 * M_PI * i / sides;
        points.push_back(gp_Pnt(base_radius * cos(angle), base_radius * sin(angle), 0));
    }

    // Make wire
    BRepBuilderAPI_MakePolygon poly;
    for (const auto& pt : points) {
        poly.Add(pt);
    }
    poly.Close();

    // Make face
    BRepBuilderAPI_MakeFace face_maker(poly.Wire());
    if (!face_maker.IsDone()) return nullptr;

    // Extrude to apex
    gp_Pnt apex(0, 0, height);
    BRepPrimAPI_MakeWedge wedge_maker(
        base_radius * 2, base_radius * 2, height,
        base_radius * 2, 0, 0, 0  // Top degenerates to point
    );

    // Alternative: use loft from polygon to point
    // For now, return a cone approximation for regular pyramids
    return make_cone_point(base_radius, height);
}

std::unique_ptr<OcctShape> make_prism(
    int sides,
    double radius,
    double height
) {
    // Create polygon base
    BRepBuilderAPI_MakePolygon poly;
    for (int i = 0; i < sides; ++i) {
        double angle = 2 * M_PI * i / sides;
        poly.Add(gp_Pnt(radius * cos(angle), radius * sin(angle), 0));
    }
    poly.Close();

    BRepBuilderAPI_MakeFace face_maker(poly.Wire());
    if (!face_maker.IsDone()) return nullptr;

    // Extrude
    gp_Vec dir(0, 0, height);
    BRepPrimAPI_MakePrism prism(face_maker.Face(), dir);
    prism.Build();
    if (!prism.IsDone()) return nullptr;

    return std::make_unique<OcctShape>(prism.Shape());
}

std::unique_ptr<OcctShape> make_half_space(
    const Point3D& point,
    const Vector3D& normal
) {
    // Create a face on the plane
    gp_Pln plane(to_gp_pnt(point), to_gp_dir(normal));
    BRepBuilderAPI_MakeFace face_maker(plane);
    if (!face_maker.IsDone()) return nullptr;

    // Reference point on the positive side of the plane
    gp_Pnt ref_point = to_gp_pnt(point);
    ref_point.Translate(to_gp_vec(normal));

    BRepPrimAPI_MakeHalfSpace maker(face_maker.Face(), ref_point);
    maker.Build();
    if (!maker.IsDone()) return nullptr;

    return std::make_unique<OcctShape>(maker.Shape());
}

//------------------------------------------------------------------------------
// Compound Primitives
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_rectangular_tube(
    double width, double height,
    double wall_thickness,
    double length
) {
    // Outer rectangle
    auto outer = make_box(width, height, length);
    if (!outer) return nullptr;

    // Inner rectangle (to be cut)
    double inner_w = width - 2 * wall_thickness;
    double inner_h = height - 2 * wall_thickness;

    if (inner_w <= 0 || inner_h <= 0) {
        return outer; // Wall too thick, return solid
    }

    gp_Pnt inner_origin(wall_thickness, wall_thickness, -0.001);
    BRepPrimAPI_MakeBox inner_maker(inner_origin, inner_w, inner_h, length + 0.002);
    inner_maker.Build();
    if (!inner_maker.IsDone()) return outer;

    BRepAlgoAPI_Cut cut(outer->get(), inner_maker.Shape());
    cut.Build();
    if (!cut.IsDone()) return outer;

    return std::make_unique<OcctShape>(cut.Shape());
}

std::unique_ptr<OcctShape> make_pipe_primitive(
    double outer_radius, double inner_radius,
    double height
) {
    if (inner_radius >= outer_radius || inner_radius <= 0) {
        return make_cylinder(outer_radius, height);
    }

    auto outer = make_cylinder(outer_radius, height);
    if (!outer) return nullptr;

    gp_Ax2 ax2(gp_Pnt(0, 0, -0.001), gp_Dir(0, 0, 1));
    BRepPrimAPI_MakeCylinder inner_maker(ax2, inner_radius, height + 0.002);
    inner_maker.Build();
    if (!inner_maker.IsDone()) return outer;

    BRepAlgoAPI_Cut cut(outer->get(), inner_maker.Shape());
    cut.Build();
    if (!cut.IsDone()) return outer;

    return std::make_unique<OcctShape>(cut.Shape());
}

std::unique_ptr<OcctShape> make_channel_section(
    double width, double height,
    double flange_thickness, double web_thickness,
    double length
) {
    // C-channel (U-shape when viewed from end)
    // Start with outer box
    auto outer = make_box(width, height, length);
    if (!outer) return nullptr;

    // Cut inner rectangle
    double cut_w = width - web_thickness;
    double cut_h = height - 2 * flange_thickness;

    if (cut_w <= 0 || cut_h <= 0) {
        return outer;
    }

    gp_Pnt cut_origin(web_thickness, flange_thickness, -0.001);
    BRepPrimAPI_MakeBox cut_maker(cut_origin, cut_w + 0.001, cut_h, length + 0.002);
    cut_maker.Build();
    if (!cut_maker.IsDone()) return outer;

    BRepAlgoAPI_Cut cut(outer->get(), cut_maker.Shape());
    cut.Build();
    if (!cut.IsDone()) return outer;

    return std::make_unique<OcctShape>(cut.Shape());
}

std::unique_ptr<OcctShape> make_i_beam(
    double width, double height,
    double flange_thickness, double web_thickness,
    double length
) {
    // I-beam (H-shape when viewed from end)
    // Build from three boxes: top flange, web, bottom flange

    // Web (vertical center)
    double web_x = (width - web_thickness) / 2;
    double web_h = height - 2 * flange_thickness;

    if (web_h <= 0) {
        return make_box(width, height, length);
    }

    gp_Pnt web_origin(web_x, flange_thickness, 0);
    BRepPrimAPI_MakeBox web_maker(web_origin, web_thickness, web_h, length);
    web_maker.Build();
    if (!web_maker.IsDone()) return nullptr;

    // Bottom flange
    BRepPrimAPI_MakeBox bottom_maker(width, flange_thickness, length);
    bottom_maker.Build();
    if (!bottom_maker.IsDone()) return nullptr;

    // Top flange
    gp_Pnt top_origin(0, height - flange_thickness, 0);
    BRepPrimAPI_MakeBox top_maker(top_origin, width, flange_thickness, length);
    top_maker.Build();
    if (!top_maker.IsDone()) return nullptr;

    // Fuse all together
    BRepAlgoAPI_Fuse fuse1(bottom_maker.Shape(), web_maker.Shape());
    fuse1.Build();
    if (!fuse1.IsDone()) return nullptr;

    BRepAlgoAPI_Fuse fuse2(fuse1.Shape(), top_maker.Shape());
    fuse2.Build();
    if (!fuse2.IsDone()) return nullptr;

    return std::make_unique<OcctShape>(fuse2.Shape());
}

std::unique_ptr<OcctShape> make_angle_section(
    double width, double height,
    double thickness,
    double length
) {
    // L-angle section
    // Horizontal leg
    BRepPrimAPI_MakeBox h_maker(width, thickness, length);
    h_maker.Build();
    if (!h_maker.IsDone()) return nullptr;

    // Vertical leg
    gp_Pnt v_origin(0, thickness, 0);
    BRepPrimAPI_MakeBox v_maker(v_origin, thickness, height - thickness, length);
    v_maker.Build();
    if (!v_maker.IsDone()) return nullptr;

    BRepAlgoAPI_Fuse fuse(h_maker.Shape(), v_maker.Shape());
    fuse.Build();
    if (!fuse.IsDone()) return nullptr;

    return std::make_unique<OcctShape>(fuse.Shape());
}

std::unique_ptr<OcctShape> make_t_section(
    double width, double height,
    double flange_thickness, double web_thickness,
    double length
) {
    // T-section
    // Top flange
    gp_Pnt flange_origin(0, height - flange_thickness, 0);
    BRepPrimAPI_MakeBox flange_maker(flange_origin, width, flange_thickness, length);
    flange_maker.Build();
    if (!flange_maker.IsDone()) return nullptr;

    // Vertical web
    double web_x = (width - web_thickness) / 2;
    gp_Pnt web_origin(web_x, 0, 0);
    BRepPrimAPI_MakeBox web_maker(web_origin, web_thickness, height - flange_thickness, length);
    web_maker.Build();
    if (!web_maker.IsDone()) return nullptr;

    BRepAlgoAPI_Fuse fuse(flange_maker.Shape(), web_maker.Shape());
    fuse.Build();
    if (!fuse.IsDone()) return nullptr;

    return std::make_unique<OcctShape>(fuse.Shape());
}

} // namespace cadhy::primitives
