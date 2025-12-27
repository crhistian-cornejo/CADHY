/**
 * @file transform.cpp
 * @brief Implementation of transform operations
 *
 * Uses OpenCASCADE gp_Trsf and BRepBuilderAPI_Transform for geometric transformations.
 */

#include <cadhy/transform/transform.hpp>

#include <BRepBuilderAPI_Transform.hxx>
#include <BRepBuilderAPI_GTransform.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <Bnd_Box.hxx>
#include <BRepBndLib.hxx>
#include <gp_Trsf.hxx>
#include <gp_GTrsf.hxx>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax3.hxx>
#include <gp_Pln.hxx>
#include <gp_Quaternion.hxx>
#include <TopoDS_Compound.hxx>
#include <BRep_Builder.hxx>

namespace cadhy::transform {

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

std::unique_ptr<OcctShape> apply_transform(const OcctShape& shape, const gp_Trsf& trsf) {
    BRepBuilderAPI_Transform transform(shape.get(), trsf, true);
    if (!transform.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(transform.Shape());
}

std::unique_ptr<OcctShape> apply_gtransform(const OcctShape& shape, const gp_GTrsf& gtrsf) {
    BRepBuilderAPI_GTransform transform(shape.get(), gtrsf, true);
    if (!transform.IsDone()) {
        return nullptr;
    }
    return std::make_unique<OcctShape>(transform.Shape());
}

Point3D get_center(const OcctShape& shape) {
    GProp_GProps props;
    BRepGProp::VolumeProperties(shape.get(), props);
    gp_Pnt center = props.CentreOfMass();
    return from_gp_pnt(center);
}

BoundingBox3D get_bbox(const OcctShape& shape) {
    Bnd_Box box;
    BRepBndLib::Add(shape.get(), box);
    double xmin, ymin, zmin, xmax, ymax, zmax;
    box.Get(xmin, ymin, zmin, xmax, ymax, zmax);
    return BoundingBox3D{
        Point3D{xmin, ymin, zmin},
        Point3D{xmax, ymax, zmax}
    };
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Translation
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> translate(
    const OcctShape& shape,
    double dx, double dy, double dz
) {
    gp_Trsf trsf;
    trsf.SetTranslation(gp_Vec(dx, dy, dz));
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> translate_vec(
    const OcctShape& shape,
    const Vector3D& vec
) {
    return translate(shape, vec.x, vec.y, vec.z);
}

std::unique_ptr<OcctShape> translate_to(
    const OcctShape& shape,
    const Point3D& target
) {
    Point3D center = get_center(shape);
    double dx = target.x - center.x;
    double dy = target.y - center.y;
    double dz = target.z - center.z;
    return translate(shape, dx, dy, dz);
}

//------------------------------------------------------------------------------
// Rotation
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> rotate(
    const OcctShape& shape,
    double ax, double ay, double az,
    double angle
) {
    gp_Ax1 axis(gp_Pnt(0, 0, 0), gp_Dir(ax, ay, az));
    gp_Trsf trsf;
    trsf.SetRotation(axis, angle);
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> rotate_around(
    const OcctShape& shape,
    const Point3D& point,
    const Vector3D& axis,
    double angle
) {
    gp_Ax1 ax1(to_gp_pnt(point), to_gp_dir(axis));
    gp_Trsf trsf;
    trsf.SetRotation(ax1, angle);
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> rotate_euler(
    const OcctShape& shape,
    double rx, double ry, double rz
) {
    // XYZ Euler angles
    gp_Trsf trsf_x, trsf_y, trsf_z;
    trsf_x.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(1, 0, 0)), rx);
    trsf_y.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 1, 0)), ry);
    trsf_z.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), rz);

    gp_Trsf combined = trsf_z * trsf_y * trsf_x;
    return apply_transform(shape, combined);
}

std::unique_ptr<OcctShape> rotate_quaternion(
    const OcctShape& shape,
    double qw, double qx, double qy, double qz
) {
    gp_Quaternion quat(qx, qy, qz, qw);
    gp_Trsf trsf;
    trsf.SetRotation(quat);
    return apply_transform(shape, trsf);
}

//------------------------------------------------------------------------------
// Scaling
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> scale(
    const OcctShape& shape,
    double factor
) {
    gp_Trsf trsf;
    trsf.SetScale(gp_Pnt(0, 0, 0), factor);
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> scale_from(
    const OcctShape& shape,
    const Point3D& center,
    double factor
) {
    gp_Trsf trsf;
    trsf.SetScale(to_gp_pnt(center), factor);
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> scale_xyz(
    const OcctShape& shape,
    double sx, double sy, double sz
) {
    // Non-uniform scaling requires gp_GTrsf
    gp_GTrsf gtrsf;
    gtrsf.SetValue(1, 1, sx);
    gtrsf.SetValue(2, 2, sy);
    gtrsf.SetValue(3, 3, sz);
    return apply_gtransform(shape, gtrsf);
}

std::unique_ptr<OcctShape> scale_xyz_from(
    const OcctShape& shape,
    const Point3D& center,
    double sx, double sy, double sz
) {
    // Translate to origin, scale, translate back
    auto translated = translate(shape, -center.x, -center.y, -center.z);
    if (!translated) return nullptr;

    auto scaled = scale_xyz(*translated, sx, sy, sz);
    if (!scaled) return nullptr;

    return translate(*scaled, center.x, center.y, center.z);
}

//------------------------------------------------------------------------------
// Mirror
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> mirror_xy(const OcctShape& shape) {
    gp_Trsf trsf;
    trsf.SetMirror(gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)));
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> mirror_xz(const OcctShape& shape) {
    gp_Trsf trsf;
    trsf.SetMirror(gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(0, 1, 0)));
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> mirror_yz(const OcctShape& shape) {
    gp_Trsf trsf;
    trsf.SetMirror(gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(1, 0, 0)));
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> mirror_plane(
    const OcctShape& shape,
    const Point3D& point,
    const Vector3D& normal
) {
    gp_Ax2 ax2(to_gp_pnt(point), to_gp_dir(normal));
    gp_Trsf trsf;
    trsf.SetMirror(ax2);
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> mirror_point(
    const OcctShape& shape,
    const Point3D& center
) {
    gp_Trsf trsf;
    trsf.SetMirror(to_gp_pnt(center));
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> mirror_axis(
    const OcctShape& shape,
    const Point3D& point,
    const Vector3D& direction
) {
    gp_Ax1 ax1(to_gp_pnt(point), to_gp_dir(direction));
    gp_Trsf trsf;
    trsf.SetMirror(ax1);
    return apply_transform(shape, trsf);
}

//------------------------------------------------------------------------------
// Combined Transforms
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> transform_matrix(
    const OcctShape& shape,
    const std::array<double, 16>& matrix
) {
    // Convert row-major 4x4 matrix to gp_Trsf
    // Matrix layout: [m00 m01 m02 m03] [m10 m11 m12 m13] [m20 m21 m22 m23] [m30 m31 m32 m33]
    gp_Trsf trsf;

    // Set rotation/scale part (3x3)
    trsf.SetValues(
        matrix[0], matrix[1], matrix[2], matrix[3],   // Row 1 with translation
        matrix[4], matrix[5], matrix[6], matrix[7],   // Row 2 with translation
        matrix[8], matrix[9], matrix[10], matrix[11]  // Row 3 with translation
    );

    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> transform(
    const OcctShape& shape,
    const gp_Trsf& trsf
) {
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> transform_general(
    const OcctShape& shape,
    const gp_GTrsf& gtrsf
) {
    return apply_gtransform(shape, gtrsf);
}

//------------------------------------------------------------------------------
// Alignment Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> align_to_axis(
    const OcctShape& shape,
    const Point3D& origin,
    const Vector3D& x_dir,
    const Vector3D& z_dir
) {
    gp_Ax3 target_ax3(to_gp_pnt(origin), to_gp_dir(z_dir), to_gp_dir(x_dir));
    gp_Ax3 source_ax3(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1), gp_Dir(1, 0, 0));

    gp_Trsf trsf;
    trsf.SetTransformation(target_ax3, source_ax3);
    return apply_transform(shape, trsf);
}

std::unique_ptr<OcctShape> move_to_origin(const OcctShape& shape) {
    BoundingBox3D bbox = get_bbox(shape);
    return translate(shape, -bbox.min.x, -bbox.min.y, -bbox.min.z);
}

std::unique_ptr<OcctShape> center_at_origin(const OcctShape& shape) {
    Point3D center = get_center(shape);
    return translate(shape, -center.x, -center.y, -center.z);
}

std::unique_ptr<OcctShape> align_shapes(
    const OcctShape& target,
    const OcctShape& shape_to_move,
    const Point3D& target_point,
    const Point3D& source_point
) {
    double dx = target_point.x - source_point.x;
    double dy = target_point.y - source_point.y;
    double dz = target_point.z - source_point.z;
    return translate(shape_to_move, dx, dy, dz);
}

//------------------------------------------------------------------------------
// Pattern Operations
//------------------------------------------------------------------------------

std::vector<std::unique_ptr<OcctShape>> linear_pattern(
    const OcctShape& shape,
    const Vector3D& direction,
    double spacing,
    int count
) {
    std::vector<std::unique_ptr<OcctShape>> result;

    // Normalize direction
    double len = std::sqrt(direction.x * direction.x +
                           direction.y * direction.y +
                           direction.z * direction.z);
    Vector3D norm_dir{direction.x / len, direction.y / len, direction.z / len};

    for (int i = 0; i < count; ++i) {
        double dist = i * spacing;
        auto copy = translate(shape, norm_dir.x * dist, norm_dir.y * dist, norm_dir.z * dist);
        if (copy) {
            result.push_back(std::move(copy));
        }
    }

    return result;
}

std::vector<std::unique_ptr<OcctShape>> rectangular_pattern(
    const OcctShape& shape,
    const Vector3D& dir1, double spacing1, int count1,
    const Vector3D& dir2, double spacing2, int count2
) {
    std::vector<std::unique_ptr<OcctShape>> result;

    // Normalize directions
    double len1 = std::sqrt(dir1.x * dir1.x + dir1.y * dir1.y + dir1.z * dir1.z);
    double len2 = std::sqrt(dir2.x * dir2.x + dir2.y * dir2.y + dir2.z * dir2.z);
    Vector3D norm_dir1{dir1.x / len1, dir1.y / len1, dir1.z / len1};
    Vector3D norm_dir2{dir2.x / len2, dir2.y / len2, dir2.z / len2};

    for (int i = 0; i < count1; ++i) {
        for (int j = 0; j < count2; ++j) {
            double dx = i * spacing1 * norm_dir1.x + j * spacing2 * norm_dir2.x;
            double dy = i * spacing1 * norm_dir1.y + j * spacing2 * norm_dir2.y;
            double dz = i * spacing1 * norm_dir1.z + j * spacing2 * norm_dir2.z;

            auto copy = translate(shape, dx, dy, dz);
            if (copy) {
                result.push_back(std::move(copy));
            }
        }
    }

    return result;
}

std::vector<std::unique_ptr<OcctShape>> circular_pattern(
    const OcctShape& shape,
    const Point3D& center,
    const Vector3D& axis,
    int count,
    double total_angle
) {
    std::vector<std::unique_ptr<OcctShape>> result;

    double angle_step = total_angle / count;

    for (int i = 0; i < count; ++i) {
        double angle = i * angle_step;
        auto copy = rotate_around(shape, center, axis, angle);
        if (copy) {
            result.push_back(std::move(copy));
        }
    }

    return result;
}

std::vector<std::unique_ptr<OcctShape>> polar_pattern(
    const OcctShape& shape,
    const Point3D& center,
    const Vector3D& axis,
    int count,
    double radius
) {
    std::vector<std::unique_ptr<OcctShape>> result;

    double angle_step = 2 * M_PI / count;

    // First translate shape to radius distance from center
    // Then apply circular pattern
    for (int i = 0; i < count; ++i) {
        double angle = i * angle_step;

        // Calculate position on circle
        // This assumes axis is Z and center is origin for simplicity
        // A full implementation would use proper coordinate transforms
        double x = center.x + radius * std::cos(angle);
        double y = center.y + radius * std::sin(angle);
        double z = center.z;

        auto copy = translate_to(shape, Point3D{x, y, z});
        if (copy) {
            // Also rotate to face outward
            copy = rotate_around(*copy, center, axis, angle);
            if (copy) {
                result.push_back(std::move(copy));
            }
        }
    }

    return result;
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

gp_Trsf make_translation(double dx, double dy, double dz) {
    gp_Trsf trsf;
    trsf.SetTranslation(gp_Vec(dx, dy, dz));
    return trsf;
}

gp_Trsf make_rotation(const Point3D& point, const Vector3D& axis, double angle) {
    gp_Ax1 ax1(to_gp_pnt(point), to_gp_dir(axis));
    gp_Trsf trsf;
    trsf.SetRotation(ax1, angle);
    return trsf;
}

gp_Trsf make_scale(const Point3D& center, double factor) {
    gp_Trsf trsf;
    trsf.SetScale(to_gp_pnt(center), factor);
    return trsf;
}

gp_Trsf compose(const gp_Trsf& t1, const gp_Trsf& t2) {
    return t1 * t2;
}

gp_Trsf invert(const gp_Trsf& t) {
    return t.Inverted();
}

} // namespace cadhy::transform
