/**
 * @file face_ops.hpp
 * @brief Face editing operations inspired by Plasticity and Blender
 *
 * This module implements face-level editing operations:
 *
 * From Plasticity:
 * - Push/Pull (Offset Face): Move face along its normal
 * - Extrude: Create volume by extending face
 * - Boolean integration: Merge/subtract results automatically
 *
 * From Blender BMesh:
 * - Inset Individual: Create smaller face inside with border
 * - Inset Region: Inset multiple connected faces
 * - Extrude Face Region: Extend face(s) to create volume
 *
 * OpenCASCADE implementations:
 * - BRepPrimAPI_MakePrism for extrusion
 * - BRepOffsetAPI_MakeOffset for 2D offset (inset)
 * - BRepAlgoAPI_Fuse/Cut for boolean merging
 */

#pragma once

#include "../core/types.hpp"
#include "selection.hpp"

#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepOffsetAPI_MakeOffset.hxx>
#include <BRepOffsetAPI_MakeOffsetShape.hxx>
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_Sewing.hxx>
#include <TopTools_ListOfShape.hxx>
#include <ShapeUpgrade_UnifySameDomain.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Push/Pull Operations (Like Plasticity's Offset Face)
//------------------------------------------------------------------------------

/**
 * @brief Push or pull a face along its normal direction
 *
 * This is the equivalent of:
 * - Plasticity: Selecting a face automatically activates Offset Face
 * - SketchUp: Push/Pull tool
 *
 * When boolean_merge is true:
 * - Positive distance: Creates extrusion and fuses with original
 * - Negative distance: Creates extrusion and cuts from original
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to push/pull
 * @param distance Distance to move (positive = outward, negative = inward)
 * @param boolean_merge If true, merge result with original solid
 * @return Modified shape, or nullptr on failure
 *
 * @example
 * ```cpp
 * // Push top face of a box outward by 10 units
 * auto result = push_pull_face(box, top_face_idx, 10.0, true);
 * ```
 */
std::unique_ptr<OcctShape> push_pull_face(
    const OcctShape& solid,
    int32_t face_index,
    double distance,
    bool boolean_merge = true
);

/**
 * @brief Push/pull multiple faces simultaneously
 *
 * All faces are moved by the same distance along their respective normals.
 *
 * @param solid The source solid shape
 * @param face_indices Indices of faces to push/pull
 * @param distance Distance to move (positive = outward, negative = inward)
 * @param boolean_merge If true, merge result with original solid
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> push_pull_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double distance,
    bool boolean_merge = true
);

//------------------------------------------------------------------------------
// Extrude Operations (Like Plasticity/Blender Extrude)
//------------------------------------------------------------------------------

/**
 * @brief Extrude a face in a specific direction
 *
 * Unlike push_pull_face which uses the face normal, this allows
 * specifying an arbitrary extrusion direction.
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to extrude
 * @param dx X component of extrusion direction
 * @param dy Y component of extrusion direction
 * @param dz Z component of extrusion direction
 * @param boolean_merge If true, merge with original (union or cut based on direction)
 * @return Modified shape, or nullptr on failure
 *
 * @example
 * ```cpp
 * // Extrude face at 45 degrees
 * auto result = extrude_face(box, face_idx, 10.0, 0.0, 10.0, true);
 * ```
 */
std::unique_ptr<OcctShape> extrude_face(
    const OcctShape& solid,
    int32_t face_index,
    double dx, double dy, double dz,
    bool boolean_merge = true
);

/**
 * @brief Extrude multiple faces in a direction
 *
 * @param solid The source solid shape
 * @param face_indices Indices of faces to extrude
 * @param dx X component of extrusion direction
 * @param dy Y component of extrusion direction
 * @param dz Z component of extrusion direction
 * @param boolean_merge If true, merge with original
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> extrude_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double dx, double dy, double dz,
    bool boolean_merge = true
);

/**
 * @brief Extrude face with taper angle (like Plasticity's angle option)
 *
 * Creates a tapered extrusion where the face shrinks or grows
 * as it's extruded.
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to extrude
 * @param distance Extrusion distance along face normal
 * @param taper_angle Taper angle in radians (0 = straight, positive = inward taper)
 * @param boolean_merge If true, merge with original
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> extrude_face_tapered(
    const OcctShape& solid,
    int32_t face_index,
    double distance,
    double taper_angle,
    bool boolean_merge = true
);

//------------------------------------------------------------------------------
// Inset Operations (Like Blender's Inset)
//------------------------------------------------------------------------------

/**
 * @brief Inset a face - create a smaller face inside with border
 *
 * This is equivalent to Blender's bmesh.ops.inset_individual.
 * Creates a new smaller face inside the original, connected by
 * border faces.
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to inset
 * @param thickness Distance to inset the boundary inward (border width)
 * @param depth Optional depth to extrude the inner face (0 = flat inset)
 * @return Modified shape, or nullptr on failure
 *
 * @example
 * ```cpp
 * // Create 5mm inset with 10mm depth (like a pocket)
 * auto result = inset_face(box, face_idx, 5.0, -10.0);
 * ```
 */
std::unique_ptr<OcctShape> inset_face(
    const OcctShape& solid,
    int32_t face_index,
    double thickness,
    double depth = 0.0
);

/**
 * @brief Inset multiple faces individually
 *
 * Each face gets its own inset operation.
 *
 * @param solid The source solid shape
 * @param face_indices Indices of faces to inset
 * @param thickness Distance to inset the boundary inward
 * @param depth Optional depth to extrude inner faces
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> inset_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double thickness,
    double depth = 0.0
);

/**
 * @brief Inset with outset option (like Blender's use_outset)
 *
 * When outset is true, the original face boundary moves outward
 * and the inset face replaces the original position.
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to inset
 * @param thickness Inset/outset distance
 * @param depth Depth of inner face
 * @param outset If true, expand outward instead of inward
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> inset_face_advanced(
    const OcctShape& solid,
    int32_t face_index,
    double thickness,
    double depth,
    bool outset
);

//------------------------------------------------------------------------------
// Offset Face Operations
//------------------------------------------------------------------------------

/**
 * @brief Offset a face without creating new volume
 *
 * Moves the face along its normal while adjusting adjacent faces
 * to maintain a valid solid. Different from push_pull in that it
 * doesn't create new extrusion volume.
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to offset
 * @param distance Offset distance (positive = outward)
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> offset_face(
    const OcctShape& solid,
    int32_t face_index,
    double distance
);

/**
 * @brief Offset multiple faces
 *
 * @param solid The source solid shape
 * @param face_indices Indices of faces to offset
 * @param distances Corresponding offset distances for each face
 * @return Modified shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> offset_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    const std::vector<double>& distances
);

//------------------------------------------------------------------------------
// Face Removal & Shell Operations
//------------------------------------------------------------------------------

/**
 * @brief Remove faces to create an open shell
 *
 * Like BRepOffsetAPI_MakeThickSolid with thickness=0.
 * Removes specified faces leaving an open shell.
 *
 * @param solid The source solid shape
 * @param face_indices Indices of faces to remove
 * @return Open shell shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> remove_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices
);

/**
 * @brief Create thick shell by removing faces and offsetting remainder
 *
 * This is the classic "shell" or "hollow" operation.
 *
 * @param solid The source solid shape
 * @param face_indices Indices of faces to remove (openings)
 * @param thickness Wall thickness (positive = inward, negative = outward)
 * @return Hollowed shape, or nullptr on failure
 */
std::unique_ptr<OcctShape> shell_from_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double thickness
);

//------------------------------------------------------------------------------
// Face Splitting & Subdivision
//------------------------------------------------------------------------------

/**
 * @brief Split a face with a plane
 *
 * @param solid The source solid shape
 * @param face_index Index of the face to split
 * @param plane_origin Origin point of splitting plane
 * @param plane_normal Normal vector of splitting plane
 * @return Modified shape with split face, or nullptr on failure
 */
std::unique_ptr<OcctShape> split_face_with_plane(
    const OcctShape& solid,
    int32_t face_index,
    const Point3D& plane_origin,
    const Vector3D& plane_normal
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/**
 * @brief Check if a face can be extruded
 *
 * Some faces (like internal faces or degenerate faces) may not
 * be suitable for extrusion.
 *
 * @param shape The source shape
 * @param face_index Index of the face to check
 * @return true if extrusion is possible
 */
bool can_extrude_face(
    const OcctShape& shape,
    int32_t face_index
);

/**
 * @brief Check if a face can be inset
 *
 * @param shape The source shape
 * @param face_index Index of the face to check
 * @param thickness Proposed inset thickness
 * @return true if inset is possible without self-intersection
 */
bool can_inset_face(
    const OcctShape& shape,
    int32_t face_index,
    double thickness
);

/**
 * @brief Compute maximum safe inset thickness for a face
 *
 * @param shape The source shape
 * @param face_index Index of the face
 * @return Maximum thickness that won't cause self-intersection
 */
double max_inset_thickness(
    const OcctShape& shape,
    int32_t face_index
);

} // namespace cadhy::edit
