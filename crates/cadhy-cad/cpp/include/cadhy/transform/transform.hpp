/**
 * @file transform.hpp
 * @brief Transform operations (translate, rotate, scale, mirror)
 *
 * High-performance transformation operations using OpenCASCADE gp_Trsf.
 * All transforms can be applied in-place or create new shapes.
 */

#pragma once

#include "../core/types.hpp"

#include <gp_Trsf.hxx>
#include <gp_GTrsf.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepBuilderAPI_GTransform.hxx>

namespace cadhy::transform {

//------------------------------------------------------------------------------
// Translation
//------------------------------------------------------------------------------

/// Translate shape by vector
std::unique_ptr<OcctShape> translate(
    const OcctShape& shape,
    double dx, double dy, double dz
);

/// Translate shape by vector
std::unique_ptr<OcctShape> translate_vec(
    const OcctShape& shape,
    const Vector3D& vec
);

/// Translate to absolute position (moves center to point)
std::unique_ptr<OcctShape> translate_to(
    const OcctShape& shape,
    const Point3D& target
);

//------------------------------------------------------------------------------
// Rotation
//------------------------------------------------------------------------------

/// Rotate around axis through origin
std::unique_ptr<OcctShape> rotate(
    const OcctShape& shape,
    double ax, double ay, double az,  // Axis direction
    double angle  // In radians
);

/// Rotate around axis at point
std::unique_ptr<OcctShape> rotate_around(
    const OcctShape& shape,
    const Point3D& point,
    const Vector3D& axis,
    double angle  // In radians
);

/// Rotate using Euler angles (XYZ order)
std::unique_ptr<OcctShape> rotate_euler(
    const OcctShape& shape,
    double rx, double ry, double rz  // In radians
);

/// Rotate using quaternion
std::unique_ptr<OcctShape> rotate_quaternion(
    const OcctShape& shape,
    double qw, double qx, double qy, double qz
);

//------------------------------------------------------------------------------
// Scaling
//------------------------------------------------------------------------------

/// Uniform scale from origin
std::unique_ptr<OcctShape> scale(
    const OcctShape& shape,
    double factor
);

/// Uniform scale from point
std::unique_ptr<OcctShape> scale_from(
    const OcctShape& shape,
    const Point3D& center,
    double factor
);

/// Non-uniform scale (requires gp_GTrsf)
std::unique_ptr<OcctShape> scale_xyz(
    const OcctShape& shape,
    double sx, double sy, double sz
);

/// Non-uniform scale from point
std::unique_ptr<OcctShape> scale_xyz_from(
    const OcctShape& shape,
    const Point3D& center,
    double sx, double sy, double sz
);

//------------------------------------------------------------------------------
// Mirror
//------------------------------------------------------------------------------

/// Mirror across XY plane (Z=0)
std::unique_ptr<OcctShape> mirror_xy(const OcctShape& shape);

/// Mirror across XZ plane (Y=0)
std::unique_ptr<OcctShape> mirror_xz(const OcctShape& shape);

/// Mirror across YZ plane (X=0)
std::unique_ptr<OcctShape> mirror_yz(const OcctShape& shape);

/// Mirror across plane at point
std::unique_ptr<OcctShape> mirror_plane(
    const OcctShape& shape,
    const Point3D& point,
    const Vector3D& normal
);

/// Mirror across point (inversion)
std::unique_ptr<OcctShape> mirror_point(
    const OcctShape& shape,
    const Point3D& center
);

/// Mirror across line (axis)
std::unique_ptr<OcctShape> mirror_axis(
    const OcctShape& shape,
    const Point3D& point,
    const Vector3D& direction
);

//------------------------------------------------------------------------------
// Combined Transforms
//------------------------------------------------------------------------------

/// Apply 4x4 transformation matrix (row-major)
std::unique_ptr<OcctShape> transform_matrix(
    const OcctShape& shape,
    const std::array<double, 16>& matrix
);

/// Apply gp_Trsf directly
std::unique_ptr<OcctShape> transform(
    const OcctShape& shape,
    const gp_Trsf& trsf
);

/// Apply general transformation (gp_GTrsf - allows non-uniform scale)
std::unique_ptr<OcctShape> transform_general(
    const OcctShape& shape,
    const gp_GTrsf& gtrsf
);

//------------------------------------------------------------------------------
// Alignment Operations
//------------------------------------------------------------------------------

/// Align shape to coordinate system
std::unique_ptr<OcctShape> align_to_axis(
    const OcctShape& shape,
    const Point3D& origin,
    const Vector3D& x_dir,
    const Vector3D& z_dir
);

/// Move shape so bounding box min is at origin
std::unique_ptr<OcctShape> move_to_origin(const OcctShape& shape);

/// Center shape at origin
std::unique_ptr<OcctShape> center_at_origin(const OcctShape& shape);

/// Align two shapes (move shape2 to align with shape1)
std::unique_ptr<OcctShape> align_shapes(
    const OcctShape& target,
    const OcctShape& shape_to_move,
    const Point3D& target_point,
    const Point3D& source_point
);

//------------------------------------------------------------------------------
// Pattern Operations
//------------------------------------------------------------------------------

/// Create linear pattern (array)
std::vector<std::unique_ptr<OcctShape>> linear_pattern(
    const OcctShape& shape,
    const Vector3D& direction,
    double spacing,
    int count
);

/// Create rectangular pattern (grid)
std::vector<std::unique_ptr<OcctShape>> rectangular_pattern(
    const OcctShape& shape,
    const Vector3D& dir1, double spacing1, int count1,
    const Vector3D& dir2, double spacing2, int count2
);

/// Create circular pattern
std::vector<std::unique_ptr<OcctShape>> circular_pattern(
    const OcctShape& shape,
    const Point3D& center,
    const Vector3D& axis,
    int count,
    double total_angle = 2 * M_PI  // Full circle by default
);

/// Create polar pattern (circular with radial offset)
std::vector<std::unique_ptr<OcctShape>> polar_pattern(
    const OcctShape& shape,
    const Point3D& center,
    const Vector3D& axis,
    int count,
    double radius
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Create transformation matrix for translation
gp_Trsf make_translation(double dx, double dy, double dz);

/// Create transformation matrix for rotation
gp_Trsf make_rotation(const Point3D& point, const Vector3D& axis, double angle);

/// Create transformation matrix for scaling
gp_Trsf make_scale(const Point3D& center, double factor);

/// Compose two transformations
gp_Trsf compose(const gp_Trsf& t1, const gp_Trsf& t2);

/// Invert transformation
gp_Trsf invert(const gp_Trsf& t);

} // namespace cadhy::transform
