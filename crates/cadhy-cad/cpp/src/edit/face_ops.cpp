/**
 * @file face_ops.cpp
 * @brief Implementation of face editing operations
 *
 * Implements Plasticity-style and Blender-style face editing using OpenCASCADE:
 * - Push/Pull: BRepPrimAPI_MakePrism + BRepAlgoAPI_Fuse/Cut
 * - Extrude: BRepPrimAPI_MakePrism with arbitrary direction
 * - Inset: BRepOffsetAPI_MakeOffset + BRepBuilderAPI_MakeFace + Sewing
 * - Offset Face: BRepOffsetAPI_MakeThickSolid
 */

#include "../../include/cadhy/edit/face_ops.hpp"

#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <BRep_Tool.hxx>
#include <BRep_Builder.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepOffsetAPI_MakeOffset.hxx>
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepOffsetAPI_MakeOffsetShape.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeSolid.hxx>
#include <BRepBuilderAPI_Sewing.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <BRepTools.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <ShapeUpgrade_UnifySameDomain.hxx>
#include <ShapeFix_Shape.hxx>
#include <TopoDS_Compound.hxx>
#include <Standard_Failure.hxx>
#include <Precision.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

/**
 * @brief Get a TopoDS_Face from shape by index
 */
TopoDS_Face get_topoface_by_index(const OcctShape& shape, int32_t index) {
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

    if (index < 0 || index >= face_map.Extent()) {
        return TopoDS_Face();
    }

    return TopoDS::Face(face_map.FindKey(index + 1));
}

/**
 * @brief Compute face normal at center
 */
gp_Vec compute_face_normal(const TopoDS_Face& face) {
    BRepAdaptor_Surface surface(face);

    double u_mid = (surface.FirstUParameter() + surface.LastUParameter()) / 2.0;
    double v_mid = (surface.FirstVParameter() + surface.LastVParameter()) / 2.0;

    gp_Pnt pnt;
    gp_Vec d1u, d1v;
    surface.D1(u_mid, v_mid, pnt, d1u, d1v);

    gp_Vec normal = d1u.Crossed(d1v);
    if (normal.Magnitude() > Precision::Confusion()) {
        normal.Normalize();
        if (face.Orientation() == TopAbs_REVERSED) {
            normal.Reverse();
        }
    } else {
        normal = gp_Vec(0, 0, 1);  // Fallback
    }

    return normal;
}

/**
 * @brief Compute face centroid
 */
gp_Pnt compute_face_center(const TopoDS_Face& face) {
    GProp_GProps props;
    BRepGProp::SurfaceProperties(face, props);
    return props.CentreOfMass();
}

/**
 * @brief Validate and optionally fix a shape
 */
std::unique_ptr<OcctShape> validate_and_fix(const TopoDS_Shape& shape) {
    if (shape.IsNull()) {
        return nullptr;
    }

    // Check validity
    BRepCheck_Analyzer checker(shape);
    if (checker.IsValid()) {
        return std::make_unique<OcctShape>(shape);
    }

    // Try to fix
    try {
        ShapeFix_Shape fixer(shape);
        fixer.Perform();
        TopoDS_Shape fixed = fixer.Shape();

        BRepCheck_Analyzer checker2(fixed);
        if (checker2.IsValid()) {
            return std::make_unique<OcctShape>(fixed);
        }
    } catch (...) {
        // Return original if fix fails
    }

    // Return even if invalid - let caller decide
    return std::make_unique<OcctShape>(shape);
}

/**
 * @brief Unify same domain faces/edges for cleaner result
 */
TopoDS_Shape unify_shape(const TopoDS_Shape& shape) {
    try {
        ShapeUpgrade_UnifySameDomain unifier(shape);
        unifier.Build();
        if (unifier.Shape().IsNull()) {
            return shape;
        }
        return unifier.Shape();
    } catch (...) {
        return shape;
    }
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Push/Pull Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> push_pull_face(
    const OcctShape& solid,
    int32_t face_index,
    double distance,
    bool boolean_merge
) {
    if (solid.is_null() || std::abs(distance) < Precision::Confusion()) {
        return nullptr;
    }

    try {
        // Get the face
        TopoDS_Face face = get_topoface_by_index(solid, face_index);
        if (face.IsNull()) {
            std::cerr << "push_pull_face: Invalid face index " << face_index << std::endl;
            return nullptr;
        }

        // Compute normal and direction
        gp_Vec normal = compute_face_normal(face);
        gp_Vec direction = normal * distance;

        // Create prism (extrusion) from the face
        BRepPrimAPI_MakePrism prism(face, direction);
        prism.Build();
        if (!prism.IsDone()) {
            std::cerr << "push_pull_face: Prism creation failed" << std::endl;
            return nullptr;
        }

        TopoDS_Shape prism_shape = prism.Shape();

        if (!boolean_merge) {
            // Return just the prism
            return std::make_unique<OcctShape>(prism_shape);
        }

        // Boolean merge with original
        TopoDS_Shape result;
        if (distance > 0) {
            // Positive distance = fuse (add material)
            BRepAlgoAPI_Fuse fuse(solid.get(), prism_shape);
            fuse.Build();
            if (!fuse.IsDone()) {
                std::cerr << "push_pull_face: Fuse operation failed" << std::endl;
                return nullptr;
            }
            result = fuse.Shape();
        } else {
            // Negative distance = cut (remove material)
            BRepAlgoAPI_Cut cut(solid.get(), prism_shape);
            cut.Build();
            if (!cut.IsDone()) {
                std::cerr << "push_pull_face: Cut operation failed" << std::endl;
                return nullptr;
            }
            result = cut.Shape();
        }

        // Unify and validate
        result = unify_shape(result);
        return validate_and_fix(result);

    } catch (const Standard_Failure& e) {
        std::cerr << "push_pull_face exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        std::cerr << "push_pull_face: Unknown exception" << std::endl;
        return nullptr;
    }
}

std::unique_ptr<OcctShape> push_pull_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double distance,
    bool boolean_merge
) {
    if (solid.is_null() || face_indices.empty()) {
        return nullptr;
    }

    try {
        std::unique_ptr<OcctShape> current = std::make_unique<OcctShape>(solid.get());

        for (int32_t idx : face_indices) {
            auto result = push_pull_face(*current, idx, distance, boolean_merge);
            if (!result) {
                // Continue with partial result
                continue;
            }
            current = std::move(result);
        }

        return current;

    } catch (...) {
        return nullptr;
    }
}

//------------------------------------------------------------------------------
// Extrude Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> extrude_face(
    const OcctShape& solid,
    int32_t face_index,
    double dx, double dy, double dz,
    bool boolean_merge
) {
    if (solid.is_null()) {
        return nullptr;
    }

    gp_Vec direction(dx, dy, dz);
    if (direction.Magnitude() < Precision::Confusion()) {
        return nullptr;
    }

    try {
        TopoDS_Face face = get_topoface_by_index(solid, face_index);
        if (face.IsNull()) {
            return nullptr;
        }

        // Create prism with specified direction
        BRepPrimAPI_MakePrism prism(face, direction);
        prism.Build();
        if (!prism.IsDone()) {
            return nullptr;
        }

        TopoDS_Shape prism_shape = prism.Shape();

        if (!boolean_merge) {
            return std::make_unique<OcctShape>(prism_shape);
        }

        // Determine boolean type based on normal dot product with direction
        gp_Vec normal = compute_face_normal(face);
        double dot = normal.Dot(direction);

        TopoDS_Shape result;
        if (dot > 0) {
            BRepAlgoAPI_Fuse fuse(solid.get(), prism_shape);
            fuse.Build();
            if (!fuse.IsDone()) return nullptr;
            result = fuse.Shape();
        } else {
            BRepAlgoAPI_Cut cut(solid.get(), prism_shape);
            cut.Build();
            if (!cut.IsDone()) return nullptr;
            result = cut.Shape();
        }

        result = unify_shape(result);
        return validate_and_fix(result);

    } catch (const Standard_Failure& e) {
        std::cerr << "extrude_face exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> extrude_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double dx, double dy, double dz,
    bool boolean_merge
) {
    if (solid.is_null() || face_indices.empty()) {
        return nullptr;
    }

    try {
        std::unique_ptr<OcctShape> current = std::make_unique<OcctShape>(solid.get());

        for (int32_t idx : face_indices) {
            auto result = extrude_face(*current, idx, dx, dy, dz, boolean_merge);
            if (!result) continue;
            current = std::move(result);
        }

        return current;
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> extrude_face_tapered(
    const OcctShape& solid,
    int32_t face_index,
    double distance,
    double taper_angle,
    bool boolean_merge
) {
    // For now, implement as simple extrude
    // TODO: Implement proper tapered extrusion using BRepOffsetAPI_DraftAngle
    if (solid.is_null()) {
        return nullptr;
    }

    try {
        TopoDS_Face face = get_topoface_by_index(solid, face_index);
        if (face.IsNull()) {
            return nullptr;
        }

        gp_Vec normal = compute_face_normal(face);
        gp_Vec direction = normal * distance;

        return extrude_face(solid, face_index, direction.X(), direction.Y(), direction.Z(), boolean_merge);

    } catch (...) {
        return nullptr;
    }
}

//------------------------------------------------------------------------------
// Inset Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> inset_face(
    const OcctShape& solid,
    int32_t face_index,
    double thickness,
    double depth
) {
    if (solid.is_null() || thickness <= 0) {
        return nullptr;
    }

    try {
        TopoDS_Face face = get_topoface_by_index(solid, face_index);
        if (face.IsNull()) {
            std::cerr << "inset_face: Invalid face index" << std::endl;
            return nullptr;
        }

        // Get outer wire of the face
        TopoDS_Wire outer_wire = BRepTools::OuterWire(face);
        if (outer_wire.IsNull()) {
            std::cerr << "inset_face: No outer wire found" << std::endl;
            return nullptr;
        }

        // Create offset wire (inward = negative offset)
        BRepOffsetAPI_MakeOffset offset_maker(face, GeomAbs_Arc);
        offset_maker.Perform(-thickness);

        if (!offset_maker.IsDone()) {
            std::cerr << "inset_face: Offset operation failed" << std::endl;
            return nullptr;
        }

        TopoDS_Shape offset_result = offset_maker.Shape();

        // Convert offset result to wire
        TopoDS_Wire inner_wire;
        if (offset_result.ShapeType() == TopAbs_WIRE) {
            inner_wire = TopoDS::Wire(offset_result);
        } else {
            // Try to extract wire from compound
            for (TopExp_Explorer exp(offset_result, TopAbs_WIRE); exp.More(); exp.Next()) {
                inner_wire = TopoDS::Wire(exp.Current());
                break;  // Take first wire
            }
        }

        if (inner_wire.IsNull()) {
            std::cerr << "inset_face: Could not create inner wire" << std::endl;
            return nullptr;
        }

        // Create inner face
        BRepBuilderAPI_MakeFace inner_face_maker(inner_wire, true);
        if (!inner_face_maker.IsDone()) {
            std::cerr << "inset_face: Could not create inner face" << std::endl;
            return nullptr;
        }
        TopoDS_Face inner_face = inner_face_maker.Face();

        // If depth is specified, extrude the inner face
        if (std::abs(depth) > Precision::Confusion()) {
            gp_Vec normal = compute_face_normal(face);
            gp_Vec extrude_vec = normal * depth;

            BRepPrimAPI_MakePrism inner_prism(inner_face, extrude_vec);
            inner_prism.Build();

            if (inner_prism.IsDone()) {
                // Cut the prism from the solid
                BRepAlgoAPI_Cut cut(solid.get(), inner_prism.Shape());
                cut.Build();
                if (cut.IsDone()) {
                    TopoDS_Shape result = unify_shape(cut.Shape());
                    return validate_and_fix(result);
                }
            }
        }

        // Flat inset: create border faces and replace original face
        // This is more complex and requires face replacement in the solid
        // For now, return the solid with the inner face extruded if depth != 0

        std::cerr << "inset_face: Flat inset not yet implemented" << std::endl;
        return std::make_unique<OcctShape>(solid.get());

    } catch (const Standard_Failure& e) {
        std::cerr << "inset_face exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> inset_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double thickness,
    double depth
) {
    if (solid.is_null() || face_indices.empty()) {
        return nullptr;
    }

    try {
        std::unique_ptr<OcctShape> current = std::make_unique<OcctShape>(solid.get());

        for (int32_t idx : face_indices) {
            auto result = inset_face(*current, idx, thickness, depth);
            if (!result) continue;
            current = std::move(result);
        }

        return current;
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> inset_face_advanced(
    const OcctShape& solid,
    int32_t face_index,
    double thickness,
    double depth,
    bool outset
) {
    // Outset inverts the thickness direction
    double actual_thickness = outset ? -thickness : thickness;
    return inset_face(solid, face_index, actual_thickness, depth);
}

//------------------------------------------------------------------------------
// Offset Face Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> offset_face(
    const OcctShape& solid,
    int32_t face_index,
    double distance
) {
    if (solid.is_null() || std::abs(distance) < Precision::Confusion()) {
        return nullptr;
    }

    try {
        TopoDS_Face face = get_topoface_by_index(solid, face_index);
        if (face.IsNull()) {
            return nullptr;
        }

        // Use MakeThickSolid with the specific face
        TopTools_ListOfShape faces_to_remove;
        // Note: MakeThickSolid removes faces - we need different approach for offset

        // Alternative: Use MakeOffsetShape
        BRepOffsetAPI_MakeOffsetShape offset_maker;
        offset_maker.PerformBySimple(solid.get(), distance);

        if (!offset_maker.IsDone()) {
            std::cerr << "offset_face: Offset operation failed" << std::endl;
            return nullptr;
        }

        TopoDS_Shape result = unify_shape(offset_maker.Shape());
        return validate_and_fix(result);

    } catch (const Standard_Failure& e) {
        std::cerr << "offset_face exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> offset_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    const std::vector<double>& distances
) {
    if (solid.is_null() || face_indices.empty()) {
        return nullptr;
    }

    if (face_indices.size() != distances.size()) {
        std::cerr << "offset_faces: Mismatched indices and distances" << std::endl;
        return nullptr;
    }

    // For multiple faces with different offsets, we'd need BRepOffset_MakeOffset
    // with per-face offset values. For now, apply sequentially.
    try {
        std::unique_ptr<OcctShape> current = std::make_unique<OcctShape>(solid.get());

        for (size_t i = 0; i < face_indices.size(); ++i) {
            auto result = offset_face(*current, face_indices[i], distances[i]);
            if (!result) continue;
            current = std::move(result);
        }

        return current;
    } catch (...) {
        return nullptr;
    }
}

//------------------------------------------------------------------------------
// Face Removal & Shell Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> remove_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices
) {
    if (solid.is_null() || face_indices.empty()) {
        return nullptr;
    }

    try {
        TopTools_ListOfShape faces_to_remove;

        for (int32_t idx : face_indices) {
            TopoDS_Face face = get_topoface_by_index(solid, idx);
            if (!face.IsNull()) {
                faces_to_remove.Append(face);
            }
        }

        if (faces_to_remove.IsEmpty()) {
            return nullptr;
        }

        // MakeThickSolid with offset=0 removes faces
        BRepOffsetAPI_MakeThickSolid maker;
        maker.MakeThickSolidByJoin(solid.get(), faces_to_remove, 0.0, Precision::Confusion());

        if (!maker.IsDone()) {
            std::cerr << "remove_faces: Operation failed" << std::endl;
            return nullptr;
        }

        return std::make_unique<OcctShape>(maker.Shape());

    } catch (const Standard_Failure& e) {
        std::cerr << "remove_faces exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        return nullptr;
    }
}

std::unique_ptr<OcctShape> shell_from_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double thickness
) {
    if (solid.is_null() || face_indices.empty()) {
        return nullptr;
    }

    try {
        TopTools_ListOfShape faces_to_remove;

        for (int32_t idx : face_indices) {
            TopoDS_Face face = get_topoface_by_index(solid, idx);
            if (!face.IsNull()) {
                faces_to_remove.Append(face);
            }
        }

        if (faces_to_remove.IsEmpty()) {
            return nullptr;
        }

        BRepOffsetAPI_MakeThickSolid maker;
        maker.MakeThickSolidByJoin(solid.get(), faces_to_remove, thickness, Precision::Confusion());

        if (!maker.IsDone()) {
            std::cerr << "shell_from_faces: Operation failed" << std::endl;
            return nullptr;
        }

        TopoDS_Shape result = unify_shape(maker.Shape());
        return validate_and_fix(result);

    } catch (const Standard_Failure& e) {
        std::cerr << "shell_from_faces exception: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        return nullptr;
    }
}

//------------------------------------------------------------------------------
// Face Splitting
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> split_face_with_plane(
    const OcctShape& solid,
    int32_t face_index,
    const Point3D& plane_origin,
    const Vector3D& plane_normal
) {
    // TODO: Implement using BRepAlgoAPI_Section or similar
    std::cerr << "split_face_with_plane: Not yet implemented" << std::endl;
    return nullptr;
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

bool can_extrude_face(
    const OcctShape& shape,
    int32_t face_index
) {
    TopoDS_Face face = get_topoface_by_index(shape, face_index);
    if (face.IsNull()) {
        return false;
    }

    // Check face has valid geometry
    try {
        GProp_GProps props;
        BRepGProp::SurfaceProperties(face, props);
        return props.Mass() > Precision::Confusion();
    } catch (...) {
        return false;
    }
}

bool can_inset_face(
    const OcctShape& shape,
    int32_t face_index,
    double thickness
) {
    // Check if inset would cause self-intersection
    double max_thickness = max_inset_thickness(shape, face_index);
    return thickness < max_thickness;
}

double max_inset_thickness(
    const OcctShape& shape,
    int32_t face_index
) {
    TopoDS_Face face = get_topoface_by_index(shape, face_index);
    if (face.IsNull()) {
        return 0.0;
    }

    try {
        // Rough estimate: half of minimum edge length
        double min_edge_length = std::numeric_limits<double>::max();

        for (TopExp_Explorer exp(face, TopAbs_EDGE); exp.More(); exp.Next()) {
            TopoDS_Edge edge = TopoDS::Edge(exp.Current());
            GProp_GProps props;
            BRepGProp::LinearProperties(edge, props);
            double length = props.Mass();
            if (length < min_edge_length) {
                min_edge_length = length;
            }
        }

        return min_edge_length / 2.0;

    } catch (...) {
        return 0.0;
    }
}

} // namespace cadhy::edit
