/**
 * @file cadhy.hpp
 * @brief Master header for CADHY CAD library
 *
 * This is the main include file that provides access to all CADHY CAD
 * functionality. Include this single header to get all modules.
 *
 * Architecture inspired by Blender's source structure:
 * - core/      : Core types and utilities (like blenlib)
 * - edit/      : Face/edge editing operations (like bmesh)
 * - primitives/: Basic shape creation (like blenkernel primitives)
 * - boolean/   : Boolean operations
 * - modify/    : Fillet, chamfer, offset (like modifiers)
 * - transform/ : Translation, rotation, scaling
 * - sweep/     : Extrude, revolve, loft, pipe
 * - wire/      : Wire and sketch operations
 * - mesh/      : Tessellation and mesh generation
 * - io/        : Import/export (like blender io/)
 * - projection/: HLR and technical drawing projection
 * - analysis/  : Validation and measurement
 *
 * @example
 * ```cpp
 * #include <cadhy/cadhy.hpp>
 *
 * // Create a box
 * auto box = cadhy::primitives::make_box(10, 10, 10);
 *
 * // Add fillet to all edges
 * auto filleted = cadhy::modify::fillet_all(*box, 1.0);
 *
 * // Push/pull the top face
 * auto result = cadhy::edit::push_pull_face(*filleted, top_face_idx, 5.0);
 *
 * // Export to STEP
 * cadhy::io::export_step(*result, "part.step");
 * ```
 */

#pragma once

// Version information
#define CADHY_VERSION_MAJOR 1
#define CADHY_VERSION_MINOR 3
#define CADHY_VERSION_PATCH 0
#define CADHY_VERSION_STRING "1.3.0"

//==============================================================================
// Core types (always needed)
//==============================================================================
#include "core/types.hpp"

//==============================================================================
// Edit operations (face/edge manipulation like Plasticity/Blender)
//==============================================================================
#include "edit/selection.hpp"
#include "edit/face_ops.hpp"

//==============================================================================
// Primitives (box, cylinder, sphere, cone, torus)
//==============================================================================
#include "primitives/primitives.hpp"

//==============================================================================
// Boolean operations (fuse, cut, common)
//==============================================================================
#include "boolean/boolean.hpp"

//==============================================================================
// Modify operations (fillet, chamfer, offset, shell, draft)
//==============================================================================
#include "modify/modify.hpp"

//==============================================================================
// Transform operations (translate, rotate, scale, mirror, patterns)
//==============================================================================
#include "transform/transform.hpp"

//==============================================================================
// Sweep operations (extrude, revolve, loft, pipe, helix)
//==============================================================================
#include "sweep/sweep.hpp"

//==============================================================================
// Wire operations (sketch: lines, arcs, circles, splines, faces)
//==============================================================================
#include "wire/wire.hpp"

//==============================================================================
// Mesh operations (tessellation, LOD, simplification, quad meshing)
//==============================================================================
#include "mesh/mesh.hpp"

//==============================================================================
// I/O operations (STEP, IGES, BREP, glTF, STL, OBJ, PLY)
//==============================================================================
#include "io/io.hpp"

//==============================================================================
// Projection operations (HLR, sections, silhouettes, unfolding)
//==============================================================================
#include "projection/projection.hpp"

//==============================================================================
// Analysis operations (validation, measurement, curvature)
//==============================================================================
#include "analysis/analysis.hpp"

namespace cadhy {

/**
 * @brief Get CADHY version string
 */
inline const char* version() {
    return CADHY_VERSION_STRING;
}

/**
 * @brief Get CADHY version as integers
 */
inline void version_info(int& major, int& minor, int& patch) {
    major = CADHY_VERSION_MAJOR;
    minor = CADHY_VERSION_MINOR;
    patch = CADHY_VERSION_PATCH;
}

/**
 * @brief Initialize CADHY library
 *
 * Call this once at application startup to initialize OpenCASCADE
 * and set up any required global state.
 */
void initialize();

/**
 * @brief Shutdown CADHY library
 *
 * Call this before application exit to clean up resources.
 */
void shutdown();

/**
 * @brief Set global tolerance for geometric operations
 */
void set_tolerance(double tolerance);

/**
 * @brief Get current global tolerance
 */
double get_tolerance();

/**
 * @brief Enable/disable parallel processing
 */
void set_parallel(bool enable);

/**
 * @brief Check if parallel processing is enabled
 */
bool is_parallel();

} // namespace cadhy
