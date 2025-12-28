/**
 * @file helpers.hpp
 * @brief FFI conversion helpers for Rust-C++ interoperability
 *
 * This header provides inline conversion functions between:
 * - CADHY internal types (cadhy::Point3D, cadhy::OcctShape)
 * - FFI types used in bridge.cpp (from ffi.rs.h)
 * - OpenCASCADE types (gp_Pnt, gp_Vec, TopoDS_Shape)
 *
 * These helpers keep the bridge.cpp clean and make the conversion
 * logic reusable for other interfaces (Python, C#, etc.).
 */

#pragma once

#include "../core/types.hpp"
#include "../mesh/mesh.hpp"

#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Dir.hxx>
#include <gp_Ax2.hxx>
#include <gp_Trsf.hxx>
#include <TopoDS_Shape.hxx>

#include <vector>
#include <memory>
#include <string>

namespace cadhy::ffi {

//------------------------------------------------------------------------------
// Type Conversion: OCCT <-> cadhy
//------------------------------------------------------------------------------

/**
 * @brief Convert gp_Pnt to Point3D
 */
inline Point3D from_gp_pnt(const gp_Pnt& pnt) {
    return Point3D{pnt.X(), pnt.Y(), pnt.Z()};
}

/**
 * @brief Convert Point3D to gp_Pnt
 */
inline gp_Pnt to_gp_pnt(const Point3D& pt) {
    return gp_Pnt(pt.x, pt.y, pt.z);
}

/**
 * @brief Convert gp_Vec to Vector3D
 */
inline Vector3D from_gp_vec(const gp_Vec& vec) {
    return Vector3D{vec.X(), vec.Y(), vec.Z()};
}

/**
 * @brief Convert Vector3D to gp_Vec
 */
inline gp_Vec to_gp_vec(const Vector3D& vec) {
    return gp_Vec(vec.x, vec.y, vec.z);
}

/**
 * @brief Convert Vector3D to gp_Dir (normalized)
 */
inline gp_Dir to_gp_dir(const Vector3D& vec) {
    return gp_Dir(vec.x, vec.y, vec.z);
}

/**
 * @brief Create gp_Ax2 from origin and direction
 */
inline gp_Ax2 make_axis(const Point3D& origin, const Vector3D& direction) {
    return gp_Ax2(to_gp_pnt(origin), to_gp_dir(direction));
}

//------------------------------------------------------------------------------
// Shape Wrapper Conversion
//------------------------------------------------------------------------------

/**
 * @brief Wrap TopoDS_Shape in OcctShape unique_ptr
 */
inline std::unique_ptr<OcctShape> wrap_shape(const TopoDS_Shape& shape) {
    if (shape.IsNull()) return nullptr;
    return std::make_unique<OcctShape>(shape);
}

/**
 * @brief Unwrap OcctShape to TopoDS_Shape reference
 */
inline const TopoDS_Shape& unwrap_shape(const OcctShape& shape) {
    return shape.get();
}

//------------------------------------------------------------------------------
// Mesh Data Conversion
//------------------------------------------------------------------------------

/**
 * @brief Convert flat position array to Point3D vector
 *
 * @param positions Flat array [x0,y0,z0, x1,y1,z1, ...]
 * @return Vector of Point3D
 */
inline std::vector<Point3D> positions_to_points(const std::vector<float>& positions) {
    std::vector<Point3D> points;
    size_t count = positions.size() / 3;
    points.reserve(count);
    for (size_t i = 0; i < count; i++) {
        points.emplace_back(
            static_cast<double>(positions[i * 3]),
            static_cast<double>(positions[i * 3 + 1]),
            static_cast<double>(positions[i * 3 + 2])
        );
    }
    return points;
}

/**
 * @brief Convert flat normal array to Vector3D vector
 */
inline std::vector<Vector3D> normals_to_vectors(const std::vector<float>& normals) {
    std::vector<Vector3D> vectors;
    size_t count = normals.size() / 3;
    vectors.reserve(count);
    for (size_t i = 0; i < count; i++) {
        vectors.emplace_back(
            static_cast<double>(normals[i * 3]),
            static_cast<double>(normals[i * 3 + 1]),
            static_cast<double>(normals[i * 3 + 2])
        );
    }
    return vectors;
}

/**
 * @brief Convert Point3D vector to flat float array
 */
inline std::vector<float> points_to_positions(const std::vector<Point3D>& points) {
    std::vector<float> positions;
    positions.reserve(points.size() * 3);
    for (const auto& pt : points) {
        positions.push_back(static_cast<float>(pt.x));
        positions.push_back(static_cast<float>(pt.y));
        positions.push_back(static_cast<float>(pt.z));
    }
    return positions;
}

//------------------------------------------------------------------------------
// Transform Helpers
//------------------------------------------------------------------------------

/**
 * @brief Create translation transform
 */
inline gp_Trsf make_translation(double dx, double dy, double dz) {
    gp_Trsf trsf;
    trsf.SetTranslation(gp_Vec(dx, dy, dz));
    return trsf;
}

/**
 * @brief Create rotation transform
 */
inline gp_Trsf make_rotation(const Point3D& origin, const Vector3D& axis, double angle) {
    gp_Trsf trsf;
    trsf.SetRotation(gp_Ax1(to_gp_pnt(origin), to_gp_dir(axis)), angle);
    return trsf;
}

/**
 * @brief Create scale transform
 */
inline gp_Trsf make_scale(const Point3D& center, double factor) {
    gp_Trsf trsf;
    trsf.SetScale(to_gp_pnt(center), factor);
    return trsf;
}

/**
 * @brief Create mirror transform
 */
inline gp_Trsf make_mirror_plane(const Point3D& origin, const Vector3D& normal) {
    gp_Trsf trsf;
    trsf.SetMirror(gp_Ax2(to_gp_pnt(origin), to_gp_dir(normal)));
    return trsf;
}

//------------------------------------------------------------------------------
// String Conversion
//------------------------------------------------------------------------------

/**
 * @brief Convert std::string to byte vector (for Rust Vec<u8>)
 */
inline std::vector<uint8_t> string_to_bytes(const std::string& str) {
    return std::vector<uint8_t>(str.begin(), str.end());
}

/**
 * @brief Convert byte span to std::string
 */
inline std::string bytes_to_string(const uint8_t* data, size_t len) {
    return std::string(reinterpret_cast<const char*>(data), len);
}

//------------------------------------------------------------------------------
// Error Handling
//------------------------------------------------------------------------------

/**
 * @brief Safe wrapper for OCCT operations that may throw
 *
 * Usage:
 *   auto result = safe_call([&]() {
 *       return some_occt_operation();
 *   });
 */
template<typename Func>
auto safe_call(Func&& func) -> decltype(func()) {
    try {
        return func();
    } catch (...) {
        return decltype(func())();  // Return default-constructed value
    }
}

/**
 * @brief Safe wrapper that returns nullptr on exception
 */
template<typename T, typename Func>
std::unique_ptr<T> safe_call_ptr(Func&& func) {
    try {
        return func();
    } catch (...) {
        return nullptr;
    }
}

} // namespace cadhy::ffi
