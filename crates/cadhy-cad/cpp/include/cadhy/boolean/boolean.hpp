/**
 * @file boolean.hpp
 * @brief Boolean operations (fuse, cut, common, section)
 *
 * High-performance boolean operations using OpenCASCADE BRepAlgoAPI.
 * Includes advanced features like fuzzy tolerance and parallel processing.
 */

#pragma once

#include "../core/types.hpp"

#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepAlgoAPI_Section.hxx>
#include <BRepAlgoAPI_Splitter.hxx>
#include <BOPAlgo_Builder.hxx>
#include <BOPAlgo_MakerVolume.hxx>

namespace cadhy::boolean {

//------------------------------------------------------------------------------
// Configuration
//------------------------------------------------------------------------------

/// Boolean operation options
struct BooleanOptions {
    double fuzzy_tolerance = 1e-7;  // Tolerance for coincident geometry
    bool parallel = true;           // Use parallel processing
    bool check_inverted = true;     // Check for inverted solids
    bool non_destructive = false;   // Keep original shapes
    bool glue = false;              // Use glue mode for touching faces
};

//------------------------------------------------------------------------------
// Basic Boolean Operations
//------------------------------------------------------------------------------

/// Fuse (union) two shapes
std::unique_ptr<OcctShape> fuse(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Fuse with options
std::unique_ptr<OcctShape> fuse_with_options(
    const OcctShape& shape1,
    const OcctShape& shape2,
    const BooleanOptions& options
);

/// Cut (difference) shape2 from shape1
std::unique_ptr<OcctShape> cut(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Cut with options
std::unique_ptr<OcctShape> cut_with_options(
    const OcctShape& shape1,
    const OcctShape& shape2,
    const BooleanOptions& options
);

/// Common (intersection) of two shapes
std::unique_ptr<OcctShape> common(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Common with options
std::unique_ptr<OcctShape> common_with_options(
    const OcctShape& shape1,
    const OcctShape& shape2,
    const BooleanOptions& options
);

//------------------------------------------------------------------------------
// Multi-Shape Boolean Operations
//------------------------------------------------------------------------------

/// Fuse multiple shapes
std::unique_ptr<OcctShape> fuse_many(
    const std::vector<const OcctShape*>& shapes
);

/// Cut multiple shapes from base
std::unique_ptr<OcctShape> cut_many(
    const OcctShape& base,
    const std::vector<const OcctShape*>& tools
);

/// Common of multiple shapes
std::unique_ptr<OcctShape> common_many(
    const std::vector<const OcctShape*>& shapes
);

//------------------------------------------------------------------------------
// Section Operations
//------------------------------------------------------------------------------

/// Create section (intersection curve/wire) of two shapes
std::unique_ptr<OcctShape> section(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Section a shape with a plane
std::unique_ptr<OcctShape> section_with_plane(
    const OcctShape& shape,
    const Point3D& plane_origin,
    const Vector3D& plane_normal
);

/// Get multiple section curves at regular intervals
std::vector<std::unique_ptr<OcctShape>> multi_section(
    const OcctShape& shape,
    const Vector3D& direction,
    double spacing,
    int count
);

//------------------------------------------------------------------------------
// Split Operations
//------------------------------------------------------------------------------

/// Split shape with tool shapes
std::unique_ptr<OcctShape> split(
    const OcctShape& shape,
    const std::vector<const OcctShape*>& tools
);

/// Split shape with a plane
std::unique_ptr<OcctShape> split_with_plane(
    const OcctShape& shape,
    const Point3D& plane_origin,
    const Vector3D& plane_normal
);

/// Get parts after split
std::vector<std::unique_ptr<OcctShape>> split_to_parts(
    const OcctShape& shape,
    const OcctShape& tool
);

//------------------------------------------------------------------------------
// Volume Operations
//------------------------------------------------------------------------------

/// Make volume from multiple shells
std::unique_ptr<OcctShape> make_volume(
    const std::vector<const OcctShape*>& shells
);

/// Fill holes between shapes
std::unique_ptr<OcctShape> fill_between(
    const OcctShape& shape1,
    const OcctShape& shape2
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Check if two shapes intersect
bool shapes_intersect(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Get intersection type
enum class IntersectionType {
    None,
    Touch,      // Shapes touch at faces/edges
    Overlap,    // Shapes have common volume
    Contains,   // Shape1 contains shape2
    Contained   // Shape1 is contained by shape2
};

IntersectionType get_intersection_type(
    const OcctShape& shape1,
    const OcctShape& shape2
);

/// Check if boolean operation would succeed
bool can_perform_boolean(
    const OcctShape& shape1,
    const OcctShape& shape2
);

} // namespace cadhy::boolean
