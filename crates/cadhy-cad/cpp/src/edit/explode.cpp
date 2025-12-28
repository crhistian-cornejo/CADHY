/**
 * @file explode.cpp
 * @brief Implementation of shape decomposition and explode operations
 */

#include "../../include/cadhy/edit/explode.hpp"
#include "../../include/cadhy/mesh/mesh.hpp"

#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <gp_Vec.hxx>
#include <cmath>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Utility Implementations
//------------------------------------------------------------------------------

TopAbs_ShapeEnum level_to_shape_type(ExplodeLevel level) {
    switch (level) {
        case ExplodeLevel::Solid: return TopAbs_SOLID;
        case ExplodeLevel::Shell: return TopAbs_SHELL;
        case ExplodeLevel::Face:  return TopAbs_FACE;
        default: return TopAbs_SOLID;
    }
}

Point3D get_shape_centroid(const OcctShape& shape) {
    if (shape.is_null()) {
        return Point3D{0, 0, 0};
    }

    try {
        GProp_GProps props;
        BRepGProp::VolumeProperties(shape.get(), props);
        gp_Pnt center = props.CentreOfMass();
        return Point3D{center.X(), center.Y(), center.Z()};
    } catch (...) {
        return Point3D{0, 0, 0};
    }
}

Vector3D calculate_explode_direction(
    const Point3D& parent_center,
    const Point3D& part_center
) {
    double dx = part_center.x - parent_center.x;
    double dy = part_center.y - parent_center.y;
    double dz = part_center.z - parent_center.z;

    double mag = std::sqrt(dx*dx + dy*dy + dz*dz);

    // If centers are coincident, use default X direction
    if (mag < 1e-5) {
        return Vector3D{1.0, 0.0, 0.0};
    }

    return Vector3D{dx / mag, dy / mag, dz / mag};
}

//------------------------------------------------------------------------------
// Component Counting
//------------------------------------------------------------------------------

int32_t count_shape_components(
    const OcctShape& shape,
    ExplodeLevel level
) {
    if (shape.is_null()) {
        return 0;
    }

    TopAbs_ShapeEnum sub_type = level_to_shape_type(level);
    TopExp_Explorer exp(shape.get(), sub_type);

    int32_t count = 0;
    while (exp.More()) {
        count++;
        exp.Next();
    }
    return count;
}

//------------------------------------------------------------------------------
// Explode Implementation
//------------------------------------------------------------------------------

ExplodeResult explode_shape(
    const OcctShape& shape,
    ExplodeLevel level,
    double distance,
    double deflection
) {
    ExplodeResult result;
    result.success = false;
    result.level = level;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopAbs_ShapeEnum sub_type = level_to_shape_type(level);
        TopExp_Explorer exp(shape.get(), sub_type);

        // Calculate overall center
        GProp_GProps global_props;
        BRepGProp::VolumeProperties(shape.get(), global_props);
        gp_Pnt global_center = global_props.CentreOfMass();
        result.parent_center_x = global_center.X();
        result.parent_center_y = global_center.Y();
        result.parent_center_z = global_center.Z();

        uint32_t index = 0;
        while (exp.More()) {
            TopoDS_Shape sub = exp.Current();

            // Get sub-center
            GProp_GProps sub_props;
            if (sub.ShapeType() == TopAbs_FACE) {
                BRepGProp::SurfaceProperties(sub, sub_props);
            } else {
                BRepGProp::VolumeProperties(sub, sub_props);
            }
            gp_Pnt sub_center = sub_props.CentreOfMass();

            // Calculate direction and offset
            Point3D parent_pt{global_center.X(), global_center.Y(), global_center.Z()};
            Point3D part_pt{sub_center.X(), sub_center.Y(), sub_center.Z()};
            Vector3D direction = calculate_explode_direction(parent_pt, part_pt);

            // Create exploded part
            ExplodedPart part;
            part.index = index++;
            part.shape_type = static_cast<int32_t>(sub.ShapeType());
            part.center_x = sub_center.X();
            part.center_y = sub_center.Y();
            part.center_z = sub_center.Z();
            part.offset_x = direction.x * distance;
            part.offset_y = direction.y * distance;
            part.offset_z = direction.z * distance;

            // Tessellate part
            OcctShape sub_shape(sub);
            auto mesh = cadhy::mesh::tessellate_deflection(sub_shape, deflection);

            // Convert mesh data
            size_t vertex_count = mesh.positions.size() / 3;
            part.vertices.reserve(vertex_count);
            part.normals.reserve(vertex_count);

            for (size_t i = 0; i < vertex_count; i++) {
                part.vertices.push_back(Point3D{
                    mesh.positions[i * 3],
                    mesh.positions[i * 3 + 1],
                    mesh.positions[i * 3 + 2]
                });
                part.normals.push_back(Vector3D{
                    mesh.normals[i * 3],
                    mesh.normals[i * 3 + 1],
                    mesh.normals[i * 3 + 2]
                });
            }

            part.indices = std::move(mesh.indices);

            result.parts.push_back(std::move(part));
            exp.Next();
        }

        result.total_parts = static_cast<int32_t>(result.parts.size());
        result.success = true;
    } catch (...) {
        result.success = false;
    }

    return result;
}

std::vector<ExplodedPart> get_shape_components(
    const OcctShape& shape,
    ExplodeLevel level,
    double deflection
) {
    auto explode_result = explode_shape(shape, level, 0.0, deflection);
    return std::move(explode_result.parts);
}

} // namespace cadhy::edit
