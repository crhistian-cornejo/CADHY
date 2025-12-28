/**
 * @file explode.hpp
 * @brief Shape decomposition and explode view operations
 *
 * This module provides functions for decomposing complex shapes into
 * their constituent parts (solids, shells, faces) with calculated
 * explosion offsets for visualization.
 *
 * Similar to Blender's "Explode" modifier and CAD assembly explode views.
 */

#pragma once

#include "../core/types.hpp"
#include "../mesh/mesh.hpp"

#include <TopExp_Explorer.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Explode Types
//------------------------------------------------------------------------------

/**
 * @brief Decomposition level for explode operations
 */
enum class ExplodeLevel {
    Solid = 0,   // Decompose into solids
    Shell = 1,   // Decompose into shells
    Face = 2     // Decompose into faces
};

/**
 * @brief A single part from an exploded shape
 */
struct ExplodedPart {
    uint32_t index = 0;
    int32_t shape_type = 0;      // TopAbs_ShapeEnum value

    // Geometry center (centroid)
    double center_x = 0.0;
    double center_y = 0.0;
    double center_z = 0.0;

    // Explosion offset (direction * distance)
    double offset_x = 0.0;
    double offset_y = 0.0;
    double offset_z = 0.0;

    // Tessellated mesh data
    std::vector<Point3D> vertices;
    std::vector<Vector3D> normals;
    std::vector<uint32_t> indices;  // Triangle indices (v0, v1, v2, ...)
};

/**
 * @brief Result of an explode operation
 */
struct ExplodeResult {
    bool success = false;

    // Parent shape center (for calculating directions)
    double parent_center_x = 0.0;
    double parent_center_y = 0.0;
    double parent_center_z = 0.0;

    // Decomposed parts with offsets
    std::vector<ExplodedPart> parts;

    // Metadata
    int32_t total_parts = 0;
    ExplodeLevel level = ExplodeLevel::Solid;
};

//------------------------------------------------------------------------------
// Explode Functions
//------------------------------------------------------------------------------

/**
 * @brief Explode a shape into its constituent parts
 *
 * This function:
 * 1. Calculates the overall center of mass
 * 2. Decomposes the shape into sub-shapes at the specified level
 * 3. For each part, calculates a direction vector from center
 * 4. Tessellates each part for visualization
 * 5. Applies the explosion distance as an offset
 *
 * @param shape Source shape to explode
 * @param level Decomposition level (Solid, Shell, or Face)
 * @param distance Explosion distance (how far parts move out)
 * @param deflection Tessellation deflection for meshes
 * @return ExplodeResult with all parts and offsets
 */
ExplodeResult explode_shape(
    const OcctShape& shape,
    ExplodeLevel level,
    double distance,
    double deflection = 0.1
);

/**
 * @brief Get shape components without explosion (distance = 0)
 *
 * Useful for iterating over sub-shapes without visualization.
 *
 * @param shape Source shape
 * @param level Decomposition level
 * @param deflection Tessellation deflection
 * @return Vector of exploded parts (with zero offsets)
 */
std::vector<ExplodedPart> get_shape_components(
    const OcctShape& shape,
    ExplodeLevel level,
    double deflection = 0.1
);

/**
 * @brief Count components at a specific level
 *
 * @param shape Source shape
 * @param level Decomposition level
 * @return Number of components
 */
int32_t count_shape_components(
    const OcctShape& shape,
    ExplodeLevel level
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/**
 * @brief Calculate center of mass for a shape
 *
 * @param shape Source shape
 * @return Center of mass point
 */
Point3D get_shape_centroid(const OcctShape& shape);

/**
 * @brief Calculate direction vector from parent center to part center
 *
 * @param parent_center Center of the parent shape
 * @param part_center Center of the part
 * @return Normalized direction vector (defaults to X axis if coincident)
 */
Vector3D calculate_explode_direction(
    const Point3D& parent_center,
    const Point3D& part_center
);

/**
 * @brief Convert TopAbs_ShapeEnum to ExplodeLevel
 *
 * @param level Explode level enum
 * @return Corresponding TopAbs_ShapeEnum
 */
TopAbs_ShapeEnum level_to_shape_type(ExplodeLevel level);

} // namespace cadhy::edit
