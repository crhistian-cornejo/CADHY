/**
 * @file types.hpp
 * @brief Core types and utilities for CADHY CAD operations
 *
 * This file defines the fundamental types used throughout the CADHY CAD library,
 * following the modular architecture inspired by Blender's source structure.
 */

#pragma once

#include <memory>
#include <vector>
#include <array>
#include <optional>
#include <cmath>
#include <limits>
#include <mutex>

// OpenCASCADE Foundation
#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopoDS_Solid.hxx>
#include <TopoDS_Shell.hxx>
#include <TopoDS_Compound.hxx>
#include <TopoDS.hxx>

#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Dir.hxx>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Trsf.hxx>
#include <gp_Pln.hxx>

#include <TopExp_Explorer.hxx>
#include <TopAbs_ShapeEnum.hxx>

namespace cadhy {

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

constexpr double TOLERANCE = 1e-7;
constexpr double ANGULAR_TOLERANCE = 1e-4;

//------------------------------------------------------------------------------
// Basic Geometric Types
//------------------------------------------------------------------------------

struct Point3D {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;

    Point3D() = default;
    Point3D(double x_, double y_, double z_) : x(x_), y(y_), z(z_) {}

    explicit Point3D(const gp_Pnt& pnt)
        : x(pnt.X()), y(pnt.Y()), z(pnt.Z()) {}

    gp_Pnt to_gp_pnt() const { return gp_Pnt(x, y, z); }

    double distance_to(const Point3D& other) const {
        double dx = x - other.x;
        double dy = y - other.y;
        double dz = z - other.z;
        return std::sqrt(dx*dx + dy*dy + dz*dz);
    }
};

struct Vector3D {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;

    Vector3D() = default;
    Vector3D(double x_, double y_, double z_) : x(x_), y(y_), z(z_) {}

    explicit Vector3D(const gp_Vec& vec)
        : x(vec.X()), y(vec.Y()), z(vec.Z()) {}

    explicit Vector3D(const gp_Dir& dir)
        : x(dir.X()), y(dir.Y()), z(dir.Z()) {}

    gp_Vec to_gp_vec() const { return gp_Vec(x, y, z); }
    gp_Dir to_gp_dir() const { return gp_Dir(x, y, z); }

    double magnitude() const {
        return std::sqrt(x*x + y*y + z*z);
    }

    Vector3D normalized() const {
        double mag = magnitude();
        if (mag < TOLERANCE) return Vector3D(0, 0, 1);
        return Vector3D(x/mag, y/mag, z/mag);
    }

    Vector3D operator*(double scalar) const {
        return Vector3D(x * scalar, y * scalar, z * scalar);
    }

    Vector3D operator+(const Vector3D& other) const {
        return Vector3D(x + other.x, y + other.y, z + other.z);
    }

    static Vector3D cross(const Vector3D& a, const Vector3D& b) {
        return Vector3D(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    static double dot(const Vector3D& a, const Vector3D& b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
};

//------------------------------------------------------------------------------
// Bounding Box
//------------------------------------------------------------------------------

struct BoundingBox3D {
    Point3D min;
    Point3D max;

    BoundingBox3D() = default;
    BoundingBox3D(const Point3D& min_, const Point3D& max_)
        : min(min_), max(max_) {}

    Point3D center() const {
        return Point3D(
            (min.x + max.x) / 2.0,
            (min.y + max.y) / 2.0,
            (min.z + max.z) / 2.0
        );
    }

    Vector3D dimensions() const {
        return Vector3D(
            max.x - min.x,
            max.y - min.y,
            max.z - min.z
        );
    }

    double diagonal() const {
        return min.distance_to(max);
    }
};

//------------------------------------------------------------------------------
// Shape Wrapper with Caching
//------------------------------------------------------------------------------

/**
 * @brief Wrapper around TopoDS_Shape with optional mesh caching
 *
 * This class provides:
 * - Ownership semantics for OCCT shapes
 * - Thread-safe mesh caching for performance
 * - Utility methods for shape queries
 */
class OcctShape {
public:
    OcctShape() = default;

    explicit OcctShape(const TopoDS_Shape& shape)
        : shape_(shape) {}

    // Non-copyable and non-movable due to mutex
    OcctShape(const OcctShape&) = delete;
    OcctShape& operator=(const OcctShape&) = delete;
    OcctShape(OcctShape&&) = delete;
    OcctShape& operator=(OcctShape&&) = delete;

    // Access underlying shape
    const TopoDS_Shape& get() const { return shape_; }
    TopoDS_Shape& get() { return shape_; }

    // Validity checks
    bool is_null() const { return shape_.IsNull(); }
    bool is_valid() const { return !shape_.IsNull(); }

    // Shape type queries
    TopAbs_ShapeEnum shape_type() const { return shape_.ShapeType(); }
    bool is_solid() const { return shape_type() == TopAbs_SOLID; }
    bool is_shell() const { return shape_type() == TopAbs_SHELL; }
    bool is_face() const { return shape_type() == TopAbs_FACE; }
    bool is_wire() const { return shape_type() == TopAbs_WIRE; }
    bool is_edge() const { return shape_type() == TopAbs_EDGE; }
    bool is_vertex() const { return shape_type() == TopAbs_VERTEX; }
    bool is_compound() const { return shape_type() == TopAbs_COMPOUND; }

    // Topology counting
    int count_faces() const { return count_subshapes(TopAbs_FACE); }
    int count_edges() const { return count_subshapes(TopAbs_EDGE); }
    int count_vertices() const { return count_subshapes(TopAbs_VERTEX); }

    // Cache invalidation (call after modifying operations)
    void invalidate_cache() const {
        std::lock_guard<std::mutex> lock(cache_mutex_);
        cached_bbox_.reset();
        mesh_dirty_ = true;
    }

    // Bounding box (cached)
    std::optional<BoundingBox3D> get_bounding_box() const;

private:
    TopoDS_Shape shape_;

    // Mutable for const caching
    mutable std::mutex cache_mutex_;
    mutable std::optional<BoundingBox3D> cached_bbox_;
    mutable bool mesh_dirty_ = true;

    int count_subshapes(TopAbs_ShapeEnum type) const {
        int count = 0;
        for (TopExp_Explorer exp(shape_, type); exp.More(); exp.Next()) {
            ++count;
        }
        return count;
    }
};

//------------------------------------------------------------------------------
// Topology Information Structures
//------------------------------------------------------------------------------

/**
 * @brief Information about a face in a shape
 */
struct FaceInfo {
    int32_t index = -1;
    Point3D center;
    Vector3D normal;
    double area = 0.0;
    int32_t edge_count = 0;
    bool is_planar = false;
};

/**
 * @brief Information about an edge in a shape
 */
struct EdgeInfo {
    int32_t index = -1;
    Point3D start;
    Point3D end;
    Point3D mid;
    double length = 0.0;
    int32_t curve_type = 0;  // 0=Line, 1=Circle, 2=Ellipse, etc.
    bool is_closed = false;
};

/**
 * @brief Information about a vertex in a shape
 */
struct VertexInfo {
    int32_t index = -1;
    Point3D position;
    int32_t edge_count = 0;  // Number of edges connected
};

//------------------------------------------------------------------------------
// Result Types
//------------------------------------------------------------------------------

/**
 * @brief Result of an operation that may fail
 */
template<typename T>
struct OperationResult {
    std::unique_ptr<T> value;
    bool success = false;
    std::string error_message;

    static OperationResult<T> ok(std::unique_ptr<T> val) {
        return {std::move(val), true, ""};
    }

    static OperationResult<T> error(const std::string& msg) {
        return {nullptr, false, msg};
    }
};

//------------------------------------------------------------------------------
// Selection Types
//------------------------------------------------------------------------------

/**
 * @brief Type of geometry selection
 */
enum class SelectionType {
    None,
    Vertex,
    Edge,
    Face,
    Solid
};

/**
 * @brief A selection of geometry elements
 */
struct GeometrySelection {
    SelectionType type = SelectionType::None;
    std::vector<int32_t> indices;

    bool is_empty() const { return indices.empty(); }
    size_t count() const { return indices.size(); }
};

} // namespace cadhy
