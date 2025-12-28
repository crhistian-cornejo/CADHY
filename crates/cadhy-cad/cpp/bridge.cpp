// OpenCASCADE C++ Bridge for cadhy-cad
//
// This file implements the FFI bridge between Rust and OpenCASCADE.
// This is a thin wrapper layer that delegates to modular C++ components.
//
// Architecture:
// - FFI functions (this file) -> Modular components (cadhy::primitives, etc.)
// - All business logic is in modular components for better maintainability
// - This file should remain < 1000 lines (only FFI wrappers and adapters)

#include "include/bridge.h"
#include "cadhy-cad/src/ffi.rs.h"

// Include modular CADHY components
#include <cadhy/cadhy.hpp>

#include <thread>
#include <future>
#include <mutex>
#include <atomic>
#include <vector>
#include <algorithm>
#include <cmath>

namespace cadhy_cad {

// ============================================================
// Helper Functions: Type Conversion
// ============================================================

// Convert cadhy_cad::OcctShape to cadhy::OcctShape
inline cadhy::OcctShape to_cadhy_shape(const OcctShape& shape) {
    return cadhy::OcctShape(shape.get());
}

// Convert cadhy::OcctShape to cadhy_cad::OcctShape
inline std::unique_ptr<OcctShape> from_cadhy_shape(std::unique_ptr<cadhy::OcctShape> result) {
    if (!result) return nullptr;
    return std::make_unique<OcctShape>(result->get());
}

// Convert rust::Slice<Vertex> to std::vector<Point3D>
inline std::vector<cadhy::Point3D> vertex_slice_to_points(rust::Slice<const Vertex> vertices) {
    std::vector<cadhy::Point3D> points;
    points.reserve(vertices.size());
    for (const auto& v : vertices) {
        points.emplace_back(v.x, v.y, v.z);
    }
    return points;
}

// ============================================================
// PRIMITIVE CREATION
// ============================================================

std::unique_ptr<OcctShape> make_box(double dx, double dy, double dz) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_box(dx, dy, dz));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_box_at(double x, double y, double z, double dx, double dy, double dz) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_box_at(x, y, z, dx, dy, dz));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_box_centered(double dx, double dy, double dz) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_box_centered(dx, dy, dz));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_cylinder(double radius, double height) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_cylinder(radius, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_cylinder_at(double x, double y, double z, double ax, double ay, double az, double radius, double height) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_cylinder_at(x, y, z, ax, ay, az, radius, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_cylinder_centered(double radius, double height) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_cylinder_centered(radius, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_sphere(double radius) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_sphere(radius));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_sphere_at(double x, double y, double z, double radius) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_sphere_at(x, y, z, radius));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_cone(double r1, double r2, double height) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_cone(r1, r2, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_cone_at(double x, double y, double z, double ax, double ay, double az, double r1, double r2, double height) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_cone_at(x, y, z, ax, ay, az, r1, r2, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_cone_centered(double r1, double r2, double height) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_cone_centered(r1, r2, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_torus(double major_radius, double minor_radius) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_torus(major_radius, minor_radius));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_torus_at(double x, double y, double z, double ax, double ay, double az, double major_radius, double minor_radius) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_torus_at(x, y, z, ax, ay, az, major_radius, minor_radius));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_wedge(double dx, double dy, double dz, double ltx) {
    try {
        return from_cadhy_shape(cadhy::primitives::make_wedge(dx, dy, dz, ltx));
    } catch (...) { return nullptr; }
}

// Special primitives
std::unique_ptr<OcctShape> make_helix(double radius, double pitch, double height, bool clockwise) {
    try {
        bool left_handed = !clockwise;
        auto helix_wire = cadhy::sweep::make_helix(radius, pitch, height, left_handed);
        if (!helix_wire) return nullptr;
        // Transform to position/axis if needed - for now return wire at origin
        return from_cadhy_shape(std::move(helix_wire));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_helix_at(double x, double y, double z, double ax, double ay, double az, double radius, double pitch, double height, bool clockwise) {
    try {
        bool left_handed = !clockwise;
        auto helix_wire = cadhy::sweep::make_helix(radius, pitch, height, left_handed);
        if (!helix_wire) return nullptr;
        
        // Create axis from origin and direction
        gp_Pnt origin(x, y, z);
        gp_Dir dir(ax, ay, az);
        gp_Ax2 axis(origin, dir);
        
        // Transform the helix to the target position and orientation
        gp_Trsf trsf;
        trsf.SetTransformation(axis, gp_Ax2(gp_Pnt(0,0,0), gp_Dir(0,0,1)));
        
        BRepBuilderAPI_Transform transformer(helix_wire->get(), trsf);
        if (!transformer.IsDone()) return from_cadhy_shape(std::move(helix_wire));
        
        return std::make_unique<OcctShape>(transformer.Shape());
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_pyramid(double x, double y, double z, double px, double py, double pz, double dx, double dy, double dz) {
    try {
        // Calculate base size (x, y are the full widths, so we use max for initial primitive)
        double base_size = std::max(x, y);
        double height = z;
        
        // Use 4-sided pyramid
        auto pyramid = cadhy::primitives::make_pyramid(4, base_size, height);
        if (!pyramid) return nullptr;

        // Scale base non-uniformly if x != y
        if (std::abs(x - y) > 1e-7) {
            cadhy::Point3D center{0, 0, 0};
            pyramid = cadhy::transform::scale_xyz_from(*pyramid, center, x/base_size, y/base_size, 1.0);
        }

        // Transform to position and orientation
        gp_Pnt origin(px, py, pz);
        gp_Dir dir(dx, dy, dz);
        gp_Ax2 axis(origin, dir);
        
        gp_Trsf trsf;
        trsf.SetTransformation(axis, gp_Ax2(gp_Pnt(0,0,0), gp_Dir(0,0,1)));
        
        BRepBuilderAPI_Transform transformer(pyramid->get(), trsf);
        if (!transformer.IsDone()) return from_cadhy_shape(std::move(pyramid));
        
        return std::make_unique<OcctShape>(transformer.Shape());
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_ellipsoid(double cx, double cy, double cz, double rx, double ry, double rz) {
    try {
        // Create ellipsoid by scaling a sphere
        double max_radius = std::max({rx, ry, rz});
        auto sphere = cadhy::primitives::make_sphere_at(cx, cy, cz, max_radius);
        if (!sphere) return nullptr;
        // Scale non-uniformly - need to get shape first, then transform
        cadhy::Point3D center{cx, cy, cz};
        auto scaled = cadhy::transform::scale_xyz_from(*sphere, center, rx/max_radius, ry/max_radius, rz/max_radius);
        return from_cadhy_shape(std::move(scaled));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_vertex(double x, double y, double z) {
    try {
        return from_cadhy_shape(cadhy::wire::make_vertex(x, y, z));
    } catch (...) { return nullptr; }
}

// ============================================================
// SHAPE OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> simplify_shape(const OcctShape& shape, bool unify_edges, bool unify_faces) {
    try {
        // Use ShapeUpgrade_UnifySameDomain from OpenCASCADE directly
        ShapeUpgrade_UnifySameDomain unifier(shape.get(), unify_edges, unify_faces);
        unifier.Build();
        TopoDS_Shape result = unifier.Shape();
        if (result.IsNull()) return nullptr;
        return std::make_unique<OcctShape>(result);
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> combine_shapes(rust::Slice<const OcctShape* const> shapes) {
    try {
        if (shapes.empty()) return nullptr;
        BRep_Builder builder;
        TopoDS_Compound compound;
        builder.MakeCompound(compound);
        for (size_t i = 0; i < shapes.size(); i++) {
            if (shapes[i] && !shapes[i]->is_null()) {
                builder.Add(compound, shapes[i]->get());
            }
        }
        return std::make_unique<OcctShape>(compound);
    } catch (...) { return nullptr; }
}

// ============================================================
// BOOLEAN OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> boolean_fuse(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        auto s1 = to_cadhy_shape(shape1);
        auto s2 = to_cadhy_shape(shape2);
        return from_cadhy_shape(cadhy::boolean::fuse(s1, s2));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> boolean_cut(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        auto s1 = to_cadhy_shape(shape1);
        auto s2 = to_cadhy_shape(shape2);
        return from_cadhy_shape(cadhy::boolean::cut(s1, s2));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> boolean_common(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        auto s1 = to_cadhy_shape(shape1);
        auto s2 = to_cadhy_shape(shape2);
        return from_cadhy_shape(cadhy::boolean::common(s1, s2));
    } catch (...) { return nullptr; }
}

// ============================================================
// MODIFICATION OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> fillet_all_edges(const OcctShape& shape, double radius) {
    try {
        return from_cadhy_shape(cadhy::modify::fillet_all_edges(to_cadhy_shape(shape), radius));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> chamfer_all_edges(const OcctShape& shape, double distance) {
    try {
        return from_cadhy_shape(cadhy::modify::chamfer_all_edges(to_cadhy_shape(shape), distance));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_shell(const OcctShape& shape, double thickness) {
    try {
        auto s = to_cadhy_shape(shape);
        std::vector<int32_t> faces_to_remove;
        TopTools_IndexedMapOfShape face_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);
        if (face_map.Extent() > 0) {
            faces_to_remove.push_back(0);
        }
        return from_cadhy_shape(cadhy::modify::make_shell(s, faces_to_remove, thickness));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> offset_solid(const OcctShape& shape, double offset) {
    try {
        return from_cadhy_shape(cadhy::modify::offset_shape(to_cadhy_shape(shape), offset));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> fillet_edges(const OcctShape& shape, rust::Slice<const int32_t> edge_indices, rust::Slice<const double> radii) {
    try {
        if (edge_indices.size() != radii.size() || edge_indices.empty()) {
            return edge_indices.empty() ? std::make_unique<OcctShape>(shape.get()) : nullptr;
        }
        std::vector<int32_t> edge_vec(edge_indices.begin(), edge_indices.end());
        std::vector<double> radii_vec(radii.begin(), radii.end());
        auto s = to_cadhy_shape(shape);
        
        bool uniform = radii_vec.size() == 1 || std::all_of(radii_vec.begin() + 1, radii_vec.end(),
            [&](double r) { return std::abs(r - radii_vec[0]) < 1e-9; });
        
        if (uniform) {
            return from_cadhy_shape(cadhy::modify::fillet_edges(s, edge_vec, radii_vec[0]));
        }
        return from_cadhy_shape(cadhy::modify::fillet_edges_varied(s, edge_vec, radii_vec));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> chamfer_edges(const OcctShape& shape, rust::Slice<const int32_t> edge_indices, rust::Slice<const double> distances) {
    try {
        if (edge_indices.size() != distances.size() || edge_indices.empty()) {
            return edge_indices.empty() ? std::make_unique<OcctShape>(shape.get()) : nullptr;
        }
        std::vector<int32_t> edge_vec(edge_indices.begin(), edge_indices.end());
        std::vector<double> dist_vec(distances.begin(), distances.end());
        auto s = to_cadhy_shape(shape);
        
        bool uniform = dist_vec.size() == 1 || std::all_of(dist_vec.begin() + 1, dist_vec.end(),
            [&](double d) { return std::abs(d - dist_vec[0]) < 1e-9; });
        
        if (uniform) {
            return from_cadhy_shape(cadhy::modify::chamfer_edges(s, edge_vec, dist_vec[0]));
        }
        // For varied distances, keep original implementation temporarily
        TopTools_IndexedMapOfShape edgeMap;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edgeMap);
        BRepFilletAPI_MakeChamfer chamfer(shape.get());
        for (size_t i = 0; i < edge_indices.size(); i++) {
            int32_t idx = edge_indices[i] + 1;
            if (idx >= 1 && idx <= edgeMap.Extent()) {
                chamfer.Add(dist_vec[i], TopoDS::Edge(edgeMap(idx)));
            }
        }
        chamfer.Build();
        return chamfer.IsDone() ? std::make_unique<OcctShape>(chamfer.Shape()) : nullptr;
    } catch (...) { return nullptr; }
}

// Advanced modify operations
std::unique_ptr<OcctShape> fillet_edges_advanced(const OcctShape& shape, rust::Slice<const int32_t> edge_indices, rust::Slice<const double> radii, int32_t continuity) {
    try {
        if (edge_indices.size() != radii.size() || edge_indices.empty()) return nullptr;
        std::vector<int32_t> edge_vec(edge_indices.begin(), edge_indices.end());
        std::vector<double> radii_vec(radii.begin(), radii.end());
        auto s = to_cadhy_shape(shape);
        
        cadhy::modify::FilletType type = cadhy::modify::FilletType::Rational;
        if (continuity == 2) {
            type = cadhy::modify::FilletType::QuasiAngular;
        } else if (continuity == 0) {
            type = cadhy::modify::FilletType::Polynomial;
        }
        
        return from_cadhy_shape(cadhy::modify::fillet_advanced(s, edge_vec, radii_vec, type));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> chamfer_edges_two_distances(const OcctShape& shape, rust::Slice<const int32_t> edge_indices, rust::Slice<const double> distances1, rust::Slice<const double> distances2) {
    try {
        if (edge_indices.size() != distances1.size() || edge_indices.size() != distances2.size() || edge_indices.empty()) return nullptr;
        std::vector<int32_t> edge_vec(edge_indices.begin(), edge_indices.end());
        auto s = to_cadhy_shape(shape);
        
        // Use asymmetric chamfer - need to handle per-edge
        // For now, use first distance pair for all edges
        if (!edge_vec.empty() && !distances1.empty() && !distances2.empty()) {
            return from_cadhy_shape(cadhy::modify::chamfer_edges_asymmetric(s, edge_vec, distances1[0], distances2[0]));
        }
        return nullptr;
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> chamfer_edges_distance_angle(const OcctShape& shape, rust::Slice<const int32_t> edge_indices, rust::Slice<const double> distances, rust::Slice<const double> angles) {
    try {
        if (edge_indices.size() != distances.size() || edge_indices.size() != angles.size() || edge_indices.empty()) return nullptr;
        std::vector<int32_t> edge_vec(edge_indices.begin(), edge_indices.end());
        auto s = to_cadhy_shape(shape);
        
        // Use angle chamfer - need to handle per-edge
        // For now, use first distance/angle pair for all edges
        if (!edge_vec.empty() && !distances.empty() && !angles.empty()) {
            return from_cadhy_shape(cadhy::modify::chamfer_edges_angle(s, edge_vec, distances[0], angles[0]));
        }
        return nullptr;
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> add_draft(const OcctShape& shape, double angle, double dir_x, double dir_y, double dir_z, double neutral_x, double neutral_y, double neutral_z) {
    try {
        cadhy::Vector3D direction{dir_x, dir_y, dir_z};
        cadhy::Point3D neutral_point{neutral_x, neutral_y, neutral_z};
        return from_cadhy_shape(cadhy::modify::draft_all(to_cadhy_shape(shape), direction, angle, neutral_point));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> thicken(const OcctShape& shape, double thickness, bool both_sides) {
    try {
        auto s = to_cadhy_shape(shape);
        if (both_sides) {
            // Thicken both sides - use asymmetric with same thickness on both sides
            return from_cadhy_shape(cadhy::modify::thicken_surface_asymmetric(s, thickness, thickness));
        } else {
            return from_cadhy_shape(cadhy::modify::thicken_surface(s, thickness));
        }
    } catch (...) { return nullptr; }
}

// ============================================================
// TRANSFORM OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> translate(const OcctShape& shape, double dx, double dy, double dz) {
    try {
        return from_cadhy_shape(cadhy::transform::translate(to_cadhy_shape(shape), dx, dy, dz));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> rotate(const OcctShape& shape, double ox, double oy, double oz, double ax, double ay, double az, double angle) {
    try {
        cadhy::Point3D origin{ox, oy, oz};
        cadhy::Vector3D axis{ax, ay, az};
        return from_cadhy_shape(cadhy::transform::rotate_around(to_cadhy_shape(shape), origin, axis, angle));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> scale_uniform(const OcctShape& shape, double cx, double cy, double cz, double factor) {
    try {
        cadhy::Point3D center{cx, cy, cz};
        return from_cadhy_shape(cadhy::transform::scale_from(to_cadhy_shape(shape), center, factor));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> scale_xyz(const OcctShape& shape, double cx, double cy, double cz, double fx, double fy, double fz) {
    try {
        cadhy::Point3D center{cx, cy, cz};
        return from_cadhy_shape(cadhy::transform::scale_xyz_from(to_cadhy_shape(shape), center, fx, fy, fz));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> mirror(const OcctShape& shape, double ox, double oy, double oz, double nx, double ny, double nz) {
    try {
        cadhy::Point3D origin{ox, oy, oz};
        cadhy::Vector3D normal{nx, ny, nz};
        return from_cadhy_shape(cadhy::transform::mirror_plane(to_cadhy_shape(shape), origin, normal));
    } catch (...) { return nullptr; }
}

// ============================================================
// SURFACE/SOLID GENERATION (SWEEP)
// ============================================================

std::unique_ptr<OcctShape> extrude(const OcctShape& shape, double dx, double dy, double dz) {
    try {
        return from_cadhy_shape(cadhy::sweep::extrude(to_cadhy_shape(shape), dx, dy, dz));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> revolve(const OcctShape& shape, double ox, double oy, double oz, double ax, double ay, double az, double angle) {
    try {
        cadhy::Point3D origin{ox, oy, oz};
        cadhy::Vector3D direction{ax, ay, az};
        return from_cadhy_shape(cadhy::sweep::revolve(to_cadhy_shape(shape), origin, direction, angle));
    } catch (...) { return nullptr; }
}

// ============================================================
// LOFT/SWEEP OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> make_loft(rust::Slice<const OcctShape* const> profiles, size_t count, bool solid, bool ruled) {
    try {
        if (count < 2) return nullptr;
        // Use original implementation since OcctShape is not movable
        BRepOffsetAPI_ThruSections loft(solid, ruled);
        for (size_t i = 0; i < count; i++) {
            if (profiles[i] == nullptr || profiles[i]->is_null()) return nullptr;
            const TopoDS_Shape& shape = profiles[i]->get();
            if (shape.ShapeType() == TopAbs_WIRE) {
                loft.AddWire(TopoDS::Wire(shape));
            } else if (shape.ShapeType() == TopAbs_EDGE) {
                BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(shape));
                wireMaker.Build();
                if (wireMaker.IsDone()) {
                    loft.AddWire(wireMaker.Wire());
                } else {
                    return nullptr;
                }
            } else if (shape.ShapeType() == TopAbs_VERTEX) {
                loft.AddVertex(TopoDS::Vertex(shape));
            } else {
                return nullptr;
            }
        }
        loft.Build();
        if (!loft.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(loft.Shape());
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_pipe(const OcctShape& profile, const OcctShape& spine) {
    try {
        return from_cadhy_shape(cadhy::sweep::pipe(to_cadhy_shape(profile), to_cadhy_shape(spine)));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_pipe_shell(const OcctShape& profile, const OcctShape& spine, bool with_contact, bool with_correction) {
    try {
        // Get spine as wire
        TopoDS_Wire spineWire;
        if (spine.get().ShapeType() == TopAbs_WIRE) {
            spineWire = TopoDS::Wire(spine.get());
        } else if (spine.get().ShapeType() == TopAbs_EDGE) {
            BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(spine.get()));
            wireMaker.Build();
            if (!wireMaker.IsDone()) return nullptr;
            spineWire = wireMaker.Wire();
        } else {
            return nullptr;
        }

        // Get profile as wire
        TopoDS_Wire profileWire;
        if (profile.get().ShapeType() == TopAbs_WIRE) {
            profileWire = TopoDS::Wire(profile.get());
        } else if (profile.get().ShapeType() == TopAbs_EDGE) {
            BRepBuilderAPI_MakeWire wireMaker(TopoDS::Edge(profile.get()));
            wireMaker.Build();
            if (!wireMaker.IsDone()) return nullptr;
            profileWire = wireMaker.Wire();
        } else {
            return nullptr;
        }

        BRepOffsetAPI_MakePipeShell pipeShell(spineWire);
        if (with_contact) {
            pipeShell.SetMode(true);
        }
        if (with_correction) {
            pipeShell.SetForceApproxC1(true);
        }
        pipeShell.Add(profileWire);
        pipeShell.Build();
        if (!pipeShell.IsDone()) return nullptr;
        if (pipeShell.MakeSolid()) {
            return std::make_unique<OcctShape>(pipeShell.Shape());
        }
        return std::make_unique<OcctShape>(pipeShell.Shape());
    } catch (...) { return nullptr; }
}

// ============================================================
// WIRE/SKETCH OPERATIONS
// ============================================================

std::unique_ptr<OcctShape> make_line(double x1, double y1, double z1, double x2, double y2, double z2) {
    try {
        cadhy::Point3D p1{x1, y1, z1};
        cadhy::Point3D p2{x2, y2, z2};
        return from_cadhy_shape(cadhy::wire::make_line(p1, p2));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_circle(double cx, double cy, double cz, double nx, double ny, double nz, double radius) {
    try {
        cadhy::Point3D center{cx, cy, cz};
        cadhy::Vector3D normal{nx, ny, nz};
        return from_cadhy_shape(cadhy::wire::make_circle_normal(center, normal, radius));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_arc(double cx, double cy, double cz, double nx, double ny, double nz, double radius, double start_angle, double end_angle) {
    try {
        cadhy::Point3D center{cx, cy, cz};
        return from_cadhy_shape(cadhy::wire::make_arc_angles(center, radius, start_angle, end_angle));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_rectangle(double x, double y, double width, double height) {
    try {
        cadhy::Point3D corner{x, y, 0.0};
        return from_cadhy_shape(cadhy::wire::make_rectangle_at(corner, width, height));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_face_from_wire(const OcctShape& wire) {
    try {
        return from_cadhy_shape(cadhy::wire::make_face(to_cadhy_shape(wire)));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_wire_from_edges(rust::Slice<const OcctShape* const> edges, size_t count) {
    try {
        BRepBuilderAPI_MakeWire wireBuilder;
        for (size_t i = 0; i < count && i < edges.size(); i++) {
            if (edges[i] == nullptr || edges[i]->is_null()) continue;
            TopoDS_Edge edge = TopoDS::Edge(edges[i]->get());
            wireBuilder.Add(edge);
        }
        wireBuilder.Build();
        if (!wireBuilder.IsDone()) return nullptr;
        return std::make_unique<OcctShape>(wireBuilder.Wire());
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_polygon_wire(rust::Slice<const Vertex> points) {
    try {
        auto points_vec = vertex_slice_to_points(points);
        return from_cadhy_shape(cadhy::wire::make_polygon_points(points_vec, true));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_polygon_wire_3d(rust::Slice<const Vertex> points) {
    try {
        auto points_vec = vertex_slice_to_points(points);
        return from_cadhy_shape(cadhy::wire::make_polygon_points(points_vec, true));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_ellipse(double cx, double cy, double cz, double nx, double ny, double nz, double major_radius, double minor_radius, double rotation) {
    try {
        cadhy::Point3D center{cx, cy, cz};
        cadhy::Vector3D normal{nx, ny, nz};
        return from_cadhy_shape(cadhy::wire::make_ellipse_at(center, normal, major_radius, minor_radius, rotation));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_arc_3_points(double x1, double y1, double z1, double x2, double y2, double z2, double x3, double y3, double z3) {
    try {
        cadhy::Point3D p1{x1, y1, z1};
        cadhy::Point3D p2{x2, y2, z2};
        cadhy::Point3D p3{x3, y3, z3};
        return from_cadhy_shape(cadhy::wire::make_arc_3_points(p1, p2, p3));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_bspline_interpolate(rust::Slice<const Vertex> points, bool closed) {
    try {
        auto points_vec = vertex_slice_to_points(points);
        return from_cadhy_shape(cadhy::wire::make_spline(points_vec, closed));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> make_bezier(rust::Slice<const Vertex> control_points) {
    try {
        auto points_vec = vertex_slice_to_points(control_points);
        return from_cadhy_shape(cadhy::wire::make_bezier(points_vec));
    } catch (...) { return nullptr; }
}

// ============================================================
// TESSELLATION
// ============================================================

MeshResult tessellate(const OcctShape& shape, double deflection) {
    MeshResult result;
    try {
        auto mesh = cadhy::mesh::tessellate_deflection(to_cadhy_shape(shape), deflection);
        // Convert cadhy::mesh::MeshData to MeshResult
        // mesh.positions is flat [x0,y0,z0, x1,y1,z1, ...]
        size_t vertex_count = mesh.positions.size() / 3;
        result.vertices.reserve(vertex_count);
        for (size_t i = 0; i < vertex_count; i++) {
                Vertex v;
            v.x = mesh.positions[i * 3];
            v.y = mesh.positions[i * 3 + 1];
            v.z = mesh.positions[i * 3 + 2];
                result.vertices.push_back(v);
        }
        size_t normal_count = mesh.normals.size() / 3;
        result.normals.reserve(normal_count);
        for (size_t i = 0; i < normal_count; i++) {
            Vertex n;
            n.x = mesh.normals[i * 3];
            n.y = mesh.normals[i * 3 + 1];
            n.z = mesh.normals[i * 3 + 2];
                result.normals.push_back(n);
            }
        result.triangles.reserve(mesh.indices.size() / 3);
        for (size_t i = 0; i < mesh.indices.size(); i += 3) {
                Triangle t;
            t.v1 = mesh.indices[i];
            t.v2 = mesh.indices[i + 1];
            t.v3 = mesh.indices[i + 2];
                result.triangles.push_back(t);
            }
        result.face_ids.reserve(mesh.face_ids.size());
        for (int32_t id : mesh.face_ids) {
            result.face_ids.push_back(static_cast<uint32_t>(id));
        }
    } catch (...) {}
    return result;
}

MeshResult tessellate_with_angle(const OcctShape& shape, double deflection, double angle) {
    MeshResult result;
    try {
        cadhy::mesh::MeshQuality quality;
        quality.linear_deflection = deflection;
        quality.angular_deflection = angle;
        auto mesh = cadhy::mesh::tessellate_quality(to_cadhy_shape(shape), quality);
        // Convert as above
        size_t vertex_count = mesh.positions.size() / 3;
        result.vertices.reserve(vertex_count);
        for (size_t i = 0; i < vertex_count; i++) {
                Vertex v;
            v.x = mesh.positions[i * 3];
            v.y = mesh.positions[i * 3 + 1];
            v.z = mesh.positions[i * 3 + 2];
                result.vertices.push_back(v);
        }
        size_t normal_count = mesh.normals.size() / 3;
        result.normals.reserve(normal_count);
        for (size_t i = 0; i < normal_count; i++) {
            Vertex n;
            n.x = mesh.normals[i * 3];
            n.y = mesh.normals[i * 3 + 1];
            n.z = mesh.normals[i * 3 + 2];
                result.normals.push_back(n);
            }
        result.triangles.reserve(mesh.indices.size() / 3);
        for (size_t i = 0; i < mesh.indices.size(); i += 3) {
                Triangle t;
            t.v1 = mesh.indices[i];
            t.v2 = mesh.indices[i + 1];
            t.v3 = mesh.indices[i + 2];
                result.triangles.push_back(t);
            }
        result.face_ids.reserve(mesh.face_ids.size());
        for (int32_t id : mesh.face_ids) {
            result.face_ids.push_back(static_cast<uint32_t>(id));
        }
    } catch (...) {}
    return result;
}

MeshResult tessellate_parallel(const OcctShape& shape, double deflection, int32_t num_threads) {
    MeshResult result;
    try {
        auto mesh = cadhy::mesh::tessellate_parallel(to_cadhy_shape(shape), deflection, num_threads);
        // Convert as above
        size_t vertex_count = mesh.positions.size() / 3;
        result.vertices.reserve(vertex_count);
        for (size_t i = 0; i < vertex_count; i++) {
        Vertex v;
            v.x = mesh.positions[i * 3];
            v.y = mesh.positions[i * 3 + 1];
            v.z = mesh.positions[i * 3 + 2];
        result.vertices.push_back(v);
        }
        size_t normal_count = mesh.normals.size() / 3;
        result.normals.reserve(normal_count);
        for (size_t i = 0; i < normal_count; i++) {
            Vertex n;
            n.x = mesh.normals[i * 3];
            n.y = mesh.normals[i * 3 + 1];
            n.z = mesh.normals[i * 3 + 2];
        result.normals.push_back(n);
    }
        result.triangles.reserve(mesh.indices.size() / 3);
        for (size_t i = 0; i < mesh.indices.size(); i += 3) {
        Triangle t;
            t.v1 = mesh.indices[i];
            t.v2 = mesh.indices[i + 1];
            t.v3 = mesh.indices[i + 2];
        result.triangles.push_back(t);
        }
        result.face_ids.reserve(mesh.face_ids.size());
        for (int32_t id : mesh.face_ids) {
            result.face_ids.push_back(static_cast<uint32_t>(id));
        }
    } catch (...) {}
    return result;
}

LODMeshResult generate_lods_parallel(const OcctShape& shape, double high_deflection, double medium_deflection, double low_deflection, double preview_deflection) {
    LODMeshResult result;
    try {
        auto high_future = std::async(std::launch::async, [&]() {
            return tessellate_parallel(shape, high_deflection, 0);
        });
        auto medium_future = std::async(std::launch::async, [&]() {
            return tessellate_parallel(shape, medium_deflection, 0);
        });
        auto low_future = std::async(std::launch::async, [&]() {
            return tessellate_parallel(shape, low_deflection, 0);
        });
        auto preview_future = std::async(std::launch::async, [&]() {
            return tessellate_parallel(shape, preview_deflection, 0);
        });
        result.high = high_future.get();
        result.medium = medium_future.get();
        result.low = low_future.get();
        result.preview = preview_future.get();
    } catch (...) {}
    return result;
}

// ============================================================
// BREP I/O
// ============================================================

rust::Vec<uint8_t> write_brep(const OcctShape& shape) {
    rust::Vec<uint8_t> result;
    try {
        if (shape.is_null()) return result;
        std::string data = cadhy::io::shape_to_string(to_cadhy_shape(shape));
        result.reserve(data.size());
        for (char c : data) {
            result.push_back(static_cast<uint8_t>(c));
        }
    } catch (...) {}
    return result;
}

std::unique_ptr<OcctShape> read_brep(rust::Slice<const uint8_t> data) {
    try {
        if (data.empty()) return nullptr;
        std::string str(reinterpret_cast<const char*>(data.data()), data.size());
        return from_cadhy_shape(cadhy::io::shape_from_string(str));
    } catch (...) { return nullptr; }
}

bool write_brep_file(const OcctShape& shape, rust::Str filename) {
    try {
        if (shape.is_null()) return false;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_brep(to_cadhy_shape(shape), path);
    } catch (...) { return false; }
}

std::unique_ptr<OcctShape> read_brep_file(rust::Str filename) {
    try {
        std::string path(filename.data(), filename.size());
        return from_cadhy_shape(cadhy::io::import_brep(path));
    } catch (...) { return nullptr; }
}

// ============================================================
// STEP/IGES I/O
// ============================================================

std::unique_ptr<OcctShape> read_step(rust::Str filename) {
    try {
        std::string path(filename.data(), filename.size());
        return from_cadhy_shape(cadhy::io::import_step(path));
    } catch (...) { return nullptr; }
}

bool write_step(const OcctShape& shape, rust::Str filename) {
    try {
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_step(to_cadhy_shape(shape), path);
    } catch (...) { return false; }
}

	std::unique_ptr<OcctShape> read_iges(rust::Str filename) {
	    try {
	        std::string path(filename.data(), filename.size());
        return from_cadhy_shape(cadhy::io::import_iges(path));
    } catch (...) { return nullptr; }
	}

	bool write_iges(const OcctShape& shape, rust::Str filename) {
	    try {
	        if (shape.is_null()) return false;
	        std::string path(filename.data(), filename.size());
        return cadhy::io::export_iges(to_cadhy_shape(shape), path);
    } catch (...) { return false; }
	}

// ============================================================
// MODERN FORMAT EXPORT
// ============================================================

bool write_stl(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        cadhy::io::STLExportOptions opts;
        opts.deflection = deflection;
        opts.binary = false;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_stl(to_cadhy_shape(shape), path, opts);
    } catch (...) { return false; }
}

bool write_stl_binary(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        cadhy::io::STLExportOptions opts;
        opts.deflection = deflection;
        opts.binary = true;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_stl(to_cadhy_shape(shape), path, opts);
    } catch (...) { return false; }
}

bool write_gltf(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        cadhy::io::GLTFExportOptions opts;
        opts.deflection = deflection;
        opts.binary = false;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_gltf(to_cadhy_shape(shape), path, opts);
    } catch (...) { return false; }
}

bool write_glb(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        cadhy::io::GLTFExportOptions opts;
        opts.deflection = deflection;
        opts.binary = true;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_gltf(to_cadhy_shape(shape), path, opts);
    } catch (...) { return false; }
}

bool write_obj(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        cadhy::io::OBJExportOptions opts;
        opts.deflection = deflection;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_obj(to_cadhy_shape(shape), path, opts);
    } catch (...) { return false; }
}

bool write_ply(const OcctShape& shape, rust::Str filename, double deflection) {
    try {
        if (shape.is_null()) return false;
        cadhy::io::PLYExportOptions opts;
        opts.deflection = deflection;
        std::string path(filename.data(), filename.size());
        return cadhy::io::export_ply(to_cadhy_shape(shape), path, opts);
    } catch (...) { return false; }
}

// ============================================================
// SHAPE ANALYSIS & VALIDATION
// ============================================================

ShapeAnalysisResult analyze_shape(const OcctShape& shape) {
    ShapeAnalysisResult result;
    try {
        auto s = to_cadhy_shape(shape);
        auto validation = cadhy::analysis::validate(s);
        
        result.is_valid = validation.is_valid;
        
        // Get counts from topology analysis module
        auto stats = cadhy::analysis::count_topology(s);
        result.num_solids = stats.solids;
        result.num_shells = stats.shells;
        result.num_faces = stats.faces;
        result.num_edges = stats.edges;
        result.num_vertices = stats.vertices;
        
        // Fill more detailed diagnostics
        result.is_closed = validation.is_closed;
        result.is_manifold = validation.is_manifold;
        result.issue_count = static_cast<int32_t>(validation.issues.size());
        
        // If there are issues, use first one as message
        if (!validation.issues.empty()) {
            result.message = rust::String(validation.issues[0].description);
        } else {
            result.message = rust::String("Shape is valid");
        }
    } catch (...) {}
    return result;
}

bool check_shape_validity(const OcctShape& shape) {
    try {
        return cadhy::analysis::is_valid(to_cadhy_shape(shape));
    } catch (...) { return false; }
}

double get_shape_tolerance(const OcctShape& shape) {
    try {
        // Get tolerance from first face if available
        TopExp_Explorer exp(shape.get(), TopAbs_FACE);
        if (exp.More()) {
            return BRep_Tool::Tolerance(TopoDS::Face(exp.Current()));
        }
        // Otherwise get from first edge
        TopExp_Explorer expEdge(shape.get(), TopAbs_EDGE);
        if (expEdge.More()) {
            return BRep_Tool::Tolerance(TopoDS::Edge(expEdge.Current()));
        }
        return 1e-7; // Default tolerance
    } catch (...) { return 0.0; }
}

std::unique_ptr<OcctShape> fix_shape_advanced(const OcctShape& shape, bool fix_small_faces, bool fix_small_edges, bool fix_degenerated, bool fix_self_intersection, double tolerance) {
    try {
        cadhy::analysis::RepairOptions options;
        options.tolerance = tolerance;
        options.fix_small_face = fix_small_faces;
        options.fix_small_edge = fix_small_edges;
        options.fix_degenerated = fix_degenerated;
        return from_cadhy_shape(cadhy::analysis::repair(to_cadhy_shape(shape), options));
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> sew_shapes(rust::Slice<const OcctShape* const> shapes, size_t count, double tolerance) {
    try {
        // Use BRepBuilderAPI_Sewing directly since OcctShape is not movable
        BRepBuilderAPI_Sewing sewer(tolerance);
        for (size_t i = 0; i < count; i++) {
            if (shapes[i] == nullptr || shapes[i]->is_null()) continue;
            sewer.Add(shapes[i]->get());
        }
        sewer.Perform();
        TopoDS_Shape result = sewer.SewedShape();
        if (result.IsNull()) return nullptr;
        return std::make_unique<OcctShape>(result);
    } catch (...) { return nullptr; }
}

// ============================================================
// ADVANCED DISTANCE MEASUREMENT
// ============================================================

DistanceResult compute_minimum_distance(const OcctShape& shape1, const OcctShape& shape2) {
    DistanceResult result;
    try {
        auto s1 = to_cadhy_shape(shape1);
        auto s2 = to_cadhy_shape(shape2);
        auto dist_result = cadhy::analysis::distance_detailed(s1, s2);
        result.distance = dist_result.distance;
        result.point1_x = dist_result.point1.x;
        result.point1_y = dist_result.point1.y;
        result.point1_z = dist_result.point1.z;
        result.point2_x = dist_result.point2.x;
        result.point2_y = dist_result.point2.y;
        result.point2_z = dist_result.point2.z;
    } catch (...) {}
    return result;
}

DistanceResult compute_point_to_shape_distance(double px, double py, double pz, const OcctShape& shape) {
    DistanceResult result;
    try {
        cadhy::Point3D point{px, py, pz};
        auto s = to_cadhy_shape(shape);
        auto dist_result = cadhy::analysis::point_to_shape_distance(point, s);
        result.distance = dist_result.distance;
    result.point1_x = px;
    result.point1_y = py;
    result.point1_z = pz;
        result.point2_x = dist_result.point2.x;
        result.point2_y = dist_result.point2.y;
        result.point2_z = dist_result.point2.z;
    } catch (...) {}
    return result;
}

// ============================================================
// MEASUREMENT/PROPERTIES
// ============================================================

BoundingBoxResult get_bounding_box(const OcctShape& shape) {
    BoundingBoxResult result;
    try {
        auto bbox = cadhy::analysis::bounding_box(to_cadhy_shape(shape));
        result.min_x = bbox.min.x;
        result.min_y = bbox.min.y;
        result.min_z = bbox.min.z;
        result.max_x = bbox.max.x;
        result.max_y = bbox.max.y;
        result.max_z = bbox.max.z;
    } catch (...) {}
    return result;
}

ShapeProperties get_shape_properties(const OcctShape& shape) {
    ShapeProperties result;
    try {
        auto props = cadhy::analysis::mass_properties(to_cadhy_shape(shape));
        result.volume = props.mass; // For solids, mass is volume
        result.surface_area = cadhy::analysis::surface_area(to_cadhy_shape(shape));
        result.center_x = props.center_of_gravity.x;
        result.center_y = props.center_of_gravity.y;
        result.center_z = props.center_of_gravity.z;
    } catch (...) {}
    return result;
}

double measure_distance(const OcctShape& shape1, const OcctShape& shape2) {
    try {
        return cadhy::analysis::min_distance(to_cadhy_shape(shape1), to_cadhy_shape(shape2));
    } catch (...) { return 0.0; }
}

rust::Vec<EdgeInfo> get_edges(const OcctShape& shape) {
    rust::Vec<EdgeInfo> result;
    try {
        auto all_edges = cadhy::edit::get_all_edges_info(to_cadhy_shape(shape));
        result.reserve(all_edges.size());
        for (const auto& e : all_edges) {
            EdgeInfo info;
            info.index = e.index;
            info.length = e.length;
            info.is_closed = e.is_closed;
            info.start_x = e.start.x;
            info.start_y = e.start.y;
            info.start_z = e.start.z;
            info.end_x = e.end.x;
            info.end_y = e.end.y;
            info.end_z = e.end.z;
            result.push_back(info);
        }
    } catch (...) {}
    return result;
}

// ============================================================
// SHAPE UTILITIES
// ============================================================

bool is_valid(const OcctShape& shape) {
    return !shape.is_null();
}

bool is_null(const OcctShape& shape) {
    return shape.is_null();
}

std::unique_ptr<OcctShape> clone_shape(const OcctShape& shape) {
    try {
        return std::make_unique<OcctShape>(shape.get());
    } catch (...) { return nullptr; }
}

std::unique_ptr<OcctShape> fix_shape(const OcctShape& shape) {
    try {
        return from_cadhy_shape(cadhy::analysis::heal(to_cadhy_shape(shape), 1e-7));
    } catch (...) { return clone_shape(shape); }
}

int32_t get_shape_type(const OcctShape& shape) {
    return static_cast<int32_t>(shape.get().ShapeType());
}

// ============================================================
// HLR PROJECTION (2D Technical Drawings)
// ============================================================

HLRProjectionResult compute_hlr_projection(const OcctShape& shape, double dir_x, double dir_y, double dir_z, double up_x, double up_y, double up_z, double scale) {
    HLRProjectionResult result;
    try {
        cadhy::Vector3D direction{dir_x, dir_y, dir_z};
        cadhy::projection::HLROptions options;
        auto hlr_result = cadhy::projection::compute_hlr_direction(to_cadhy_shape(shape), direction, options);
        // Convert HLRResult to HLRProjectionResult
        result.lines.reserve(hlr_result.lines.size());
        for (const auto& line : hlr_result.lines) {
            Line2DFFI l;
            l.start_x = line.x1;
            l.start_y = line.y1;
            l.end_x = line.x2;
            l.end_y = line.y2;
            l.line_type = static_cast<int32_t>(line.type);
            result.lines.push_back(l);
        }
        // Set bounding box
        result.min_x = hlr_result.view_box.min.x;
        result.min_y = hlr_result.view_box.min.y;
        result.max_x = hlr_result.view_box.max.x;
        result.max_y = hlr_result.view_box.max.y;
    } catch (...) {}
            return result;
        }

HLRProjectionResultV2 compute_hlr_projection_v2(const OcctShape& shape, double dir_x, double dir_y, double dir_z, double up_x, double up_y, double up_z, double scale, double deflection) {
    (void)up_x; (void)up_y; (void)up_z; // Suppress unused warnings if not used yet
    HLRProjectionResultV2 result;
    try {
        cadhy::Vector3D direction{dir_x, dir_y, dir_z};
        // Use custom direction HLR
        cadhy::projection::HLROptions opts;
        opts.poly_deflection = deflection;
        opts.use_poly_algo = true;
        
        auto hlr_result = cadhy::projection::compute_hlr_direction(to_cadhy_shape(shape), direction, opts);
        
        // Convert simple lines
        for (const auto& line : hlr_result.lines) {
            Curve2DFFI c;
            c.curve_type = 0; // Line
            c.line_type = static_cast<int32_t>(line.type);
            c.start_x = line.x1;
            c.start_y = line.y1;
            c.end_x = line.x2;
            c.end_y = line.y2;
            result.curves.push_back(c);
        }
        
        // Convert complex curves (polylines)
        for (const auto& curve : hlr_result.curves) {
            Polyline2DFFI p;
            p.line_type = static_cast<int32_t>(curve.type);
            p.points.reserve(curve.points.size());
            for (const auto& pt : curve.points) {
                TessPoint2D tpt;
                tpt.x = pt.first;
                tpt.y = pt.second;
                p.points.push_back(tpt);
            }
            result.polylines.push_back(p);
        }
        
        // Set metadata
        result.num_edges = static_cast<int32_t>(hlr_result.lines.size() + hlr_result.curves.size());
        result.num_lines = static_cast<int32_t>(hlr_result.lines.size());
        result.num_arcs = 0; // Standard HLR doesn't explicitly return arcs in curves yet
        result.num_polylines = static_cast<int32_t>(hlr_result.curves.size());
        
        result.min_x = hlr_result.view_box.min.x;
        result.min_y = hlr_result.view_box.min.y;
        result.max_x = hlr_result.view_box.max.x;
        result.max_y = hlr_result.view_box.max.y;
        
        // Set bounding box
        result.min_x = hlr_result.view_box.min.x;
        result.min_y = hlr_result.view_box.min.y;
        result.max_x = hlr_result.view_box.max.x;
        result.max_y = hlr_result.view_box.max.y;
        
        // Set metadata
        result.num_edges = static_cast<int32_t>(hlr_result.lines.size() + hlr_result.curves.size());
        result.num_lines = static_cast<int32_t>(hlr_result.lines.size());
        result.num_arcs = 0; 
        result.num_polylines = static_cast<int32_t>(hlr_result.curves.size());
    } catch (...) {}
    return result;
}

std::unique_ptr<OcctShape> compute_section(const OcctShape& shape, double origin_x, double origin_y, double origin_z, double normal_x, double normal_y, double normal_z) {
    try {
        cadhy::Point3D origin{origin_x, origin_y, origin_z};
        cadhy::Vector3D normal{normal_x, normal_y, normal_z};
        cadhy::projection::SectionPlane plane{origin, normal};
        auto section_result = cadhy::projection::section_by_plane(to_cadhy_shape(shape), plane);
        if (!section_result.section_shape) return nullptr;
        return from_cadhy_shape(std::move(section_result.section_shape));
    } catch (...) { return nullptr; }
}

SectionWithHatchResult compute_section_with_hatch(const OcctShape& shape, double origin_x, double origin_y, double origin_z, double normal_x, double normal_y, double normal_z, double up_x, double up_y, double up_z, double hatch_angle, double hatch_spacing) {
    (void)up_x; (void)up_y; (void)up_z; // Suppress unused warnings
    SectionWithHatchResult result;
    try {
        cadhy::Point3D origin{origin_x, origin_y, origin_z};
        cadhy::Vector3D normal{normal_x, normal_y, normal_z};
        cadhy::projection::SectionPlane plane{origin, normal};
        
        cadhy::projection::SectionViewOptions opts;
        opts.show_hatching = true;
        opts.hatch_angle = hatch_angle * M_PI / 180.0;
        opts.hatch_spacing = hatch_spacing;
        
        // Determine view direction based on normal
        cadhy::projection::ViewDirection view = cadhy::projection::ViewDirection::Custom;
        
        auto section_view = cadhy::projection::generate_section_view(to_cadhy_shape(shape), plane, view, opts);
        
        // Convert curves
        result.curves.reserve(section_view.section.outlines.size());
        for (const auto& curve : section_view.section.outlines) {
            SectionCurveFFI c;
            c.is_closed = true;
            for (const auto& pt : curve.points) {
                TessPoint2D tpt;
                tpt.x = pt.first;
                tpt.y = pt.second;
                c.points.push_back(tpt);
            }
            result.curves.push_back(c);
        }
        
        // Convert hatch lines
        // For technical reasons, we group hatch lines into regions if possible, 
        // or just return as one big region for simplicity in FFI
        if (!section_view.hatch_lines.empty()) {
            HatchRegionFFI region;
            region.is_outer = true;
            region.area = section_view.section.section_area;
            
            // Fill boundary from the first outline as a simplified representation
            if (!section_view.section.outlines.empty()) {
                for (const auto& pt : section_view.section.outlines[0].points) {
                    TessPoint2D tpt;
                    tpt.x = pt.first;
                    tpt.y = pt.second;
                    region.boundary.push_back(tpt);
                }
            }
            
            region.hatch_lines.reserve(section_view.hatch_lines.size());
            for (const auto& line : section_view.hatch_lines) {
                HatchLineFFI hl;
                hl.start_x = line.x1;
                hl.start_y = line.y1;
                hl.end_x = line.x2;
                hl.end_y = line.y2;
                region.hatch_lines.push_back(hl);
            }
            result.regions.push_back(region);
        }
        
        // Set metadata
        result.num_regions = static_cast<int32_t>(result.regions.size());
        result.num_hatch_lines = static_cast<int32_t>(section_view.hatch_lines.size());
        
        // Compute bounding box from outlines
        double min_x = 1e10, min_y = 1e10, max_x = -1e10, max_y = -1e10;
        bool has_pts = false;
        for (const auto& c : result.curves) {
            for (const auto& p : c.points) {
                min_x = std::min(min_x, p.x);
                min_y = std::min(min_y, p.y);
                max_x = std::max(max_x, p.x);
                max_y = std::max(max_y, p.y);
                has_pts = true;
            }
        }
        if (has_pts) {
            result.min_x = min_x;
            result.min_y = min_y;
            result.max_x = max_x;
            result.max_y = max_y;
        }
        
    } catch (...) {}
    return result;
}

// ============================================================
// TOPOLOGY EXTRACTION
// ============================================================

// These functions delegate to the modular cadhy::edit::topology module
// and convert results to FFI types

rust::Vec<VertexInfo> get_topology_vertices(const OcctShape& shape) {
    rust::Vec<VertexInfo> result;
    try {
        auto vertices = cadhy::edit::get_topology_vertices(to_cadhy_shape(shape));
        result.reserve(vertices.size());
        for (const auto& v : vertices) {
            VertexInfo info;
            info.index = v.index;
            info.x = v.x;
            info.y = v.y;
            info.z = v.z;
            info.tolerance = v.tolerance;
            info.num_edges = v.num_edges;
            result.push_back(info);
        }
    } catch (...) {}
    return result;
}

rust::Vec<EdgeTessellation> tessellate_edges(const OcctShape& shape, double deflection) {
    rust::Vec<EdgeTessellation> result;
    try {
        auto edges = cadhy::edit::tessellate_edges(to_cadhy_shape(shape), deflection);
        result.reserve(edges.size());
        for (const auto& e : edges) {
            EdgeTessellation tess;
            tess.index = e.index;
            tess.curve_type = e.curve_type;
            tess.length = e.length;
            tess.is_degenerated = e.is_degenerated;
            tess.start_vertex = e.start_vertex;
            tess.end_vertex = e.end_vertex;

            // Convert points
            tess.points.reserve(e.points.size());
            for (const auto& pt : e.points) {
                EdgePoint ep;
                ep.x = pt.x;
                ep.y = pt.y;
                ep.z = pt.z;
                ep.parameter = pt.parameter;
                tess.points.push_back(ep);
            }

            // Convert adjacent faces
            for (uint32_t f_idx : e.adjacent_faces) {
                tess.adjacent_faces.push_back(f_idx);
            }

            result.push_back(tess);
        }
    } catch (...) {}
    return result;
}

TopologyResult get_full_topology(const OcctShape& shape, double edge_deflection) {
    TopologyResult result;
    try {
        // Delegate to modular topology module
        auto topo = cadhy::edit::get_full_topology(to_cadhy_shape(shape), edge_deflection);

        // Convert vertices
        result.vertices.reserve(topo.vertices.size());
        for (const auto& v : topo.vertices) {
            VertexInfo info;
            info.index = v.index;
            info.x = v.x;
            info.y = v.y;
            info.z = v.z;
            info.tolerance = v.tolerance;
            info.num_edges = v.num_edges;
            result.vertices.push_back(info);
        }

        // Convert edges
        result.edges.reserve(topo.edges.size());
        for (const auto& e : topo.edges) {
            EdgeTessellation tess;
            tess.index = e.index;
            tess.curve_type = e.curve_type;
            tess.length = e.length;
            tess.is_degenerated = e.is_degenerated;
            tess.start_vertex = e.start_vertex;
            tess.end_vertex = e.end_vertex;

            for (const auto& pt : e.points) {
                EdgePoint ep;
                ep.x = pt.x;
                ep.y = pt.y;
                ep.z = pt.z;
                ep.parameter = pt.parameter;
                tess.points.push_back(ep);
            }

            for (uint32_t f_idx : e.adjacent_faces) {
                tess.adjacent_faces.push_back(f_idx);
            }

            result.edges.push_back(tess);
        }

        // Convert faces
        result.faces.reserve(topo.faces.size());
        for (const auto& f : topo.faces) {
            FaceTopologyInfo info;
            info.index = f.index;
            info.surface_type = f.surface_type;
            info.area = f.area;
            info.is_reversed = f.is_reversed;
            info.center_x = f.center_x;
            info.center_y = f.center_y;
            info.center_z = f.center_z;
            info.normal_x = f.normal_x;
            info.normal_y = f.normal_y;
            info.normal_z = f.normal_z;
            info.num_edges = f.num_edges;

            for (uint32_t e_idx : f.boundary_edges) {
                info.boundary_edges.push_back(e_idx);
            }

            result.faces.push_back(info);
        }

        // Copy CSR adjacency arrays
        for (uint32_t offset : topo.vertex_to_edges_offset) {
            result.vertex_to_edges_offset.push_back(offset);
        }
        for (uint32_t edge : topo.vertex_to_edges) {
            result.vertex_to_edges.push_back(edge);
        }
        for (uint32_t offset : topo.edge_to_faces_offset) {
            result.edge_to_faces_offset.push_back(offset);
        }
        for (uint32_t face : topo.edge_to_faces) {
            result.edge_to_faces.push_back(face);
        }
    } catch (...) {}
    return result;
}

// ============================================================
// EXPLODE OPERATIONS
// ============================================================

// Helper to convert int32_t level to ExplodeLevel enum
inline cadhy::edit::ExplodeLevel int_to_explode_level(int32_t level) {
    switch (level) {
        case 1: return cadhy::edit::ExplodeLevel::Shell;
        case 2: return cadhy::edit::ExplodeLevel::Face;
        default: return cadhy::edit::ExplodeLevel::Solid;
    }
}

ExplodeResult explode_shape(const OcctShape& shape, int32_t level, double distance, double deflection) {
    ExplodeResult result;
    result.success = false;
    try {
        // Delegate to modular explode module
        auto explode = cadhy::edit::explode_shape(
            to_cadhy_shape(shape),
            int_to_explode_level(level),
            distance,
            deflection
        );

        result.success = explode.success;
        result.parent_center_x = explode.parent_center_x;
        result.parent_center_y = explode.parent_center_y;
        result.parent_center_z = explode.parent_center_z;

        // Convert parts
        result.parts.reserve(explode.parts.size());
        for (const auto& p : explode.parts) {
            ExplodedPart part;
            part.index = p.index;
            part.shape_type = p.shape_type;
            part.center_x = p.center_x;
            part.center_y = p.center_y;
            part.center_z = p.center_z;
            part.offset_x = p.offset_x;
            part.offset_y = p.offset_y;
            part.offset_z = p.offset_z;

            // Convert vertices
            part.vertices.reserve(p.vertices.size());
            for (const auto& v : p.vertices) {
                Vertex vtx;
                vtx.x = v.x;
                vtx.y = v.y;
                vtx.z = v.z;
                part.vertices.push_back(vtx);
            }

            // Convert normals
            part.normals.reserve(p.normals.size());
            for (const auto& n : p.normals) {
                Vertex nrm;
                nrm.x = n.x;
                nrm.y = n.y;
                nrm.z = n.z;
                part.normals.push_back(nrm);
            }

            // Convert triangles
            size_t tri_count = p.indices.size() / 3;
            part.triangles.reserve(tri_count);
            for (size_t i = 0; i < p.indices.size(); i += 3) {
                Triangle t;
                t.v1 = p.indices[i];
                t.v2 = p.indices[i + 1];
                t.v3 = p.indices[i + 2];
                part.triangles.push_back(t);
            }

            result.parts.push_back(std::move(part));
        }
    } catch (...) {
        result.success = false;
    }
    return result;
}

rust::Vec<ExplodedPart> get_shape_components(const OcctShape& shape, int32_t level, double deflection) {
    auto explode = explode_shape(shape, level, 0.0, deflection);
    return std::move(explode.parts);
}

int32_t count_shape_components(const OcctShape& shape, int32_t level) {
    return cadhy::edit::count_shape_components(
        to_cadhy_shape(shape),
        int_to_explode_level(level)
    );
}

} // namespace cadhy_cad
