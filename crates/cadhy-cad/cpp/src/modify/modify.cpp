/**
 * @file modify.cpp
 * @brief Implementation of modify operations (fillet, chamfer, offset, shell, draft)
 *
 * Uses OpenCASCADE BRepFilletAPI, BRepOffsetAPI for shape modification.
 */

#include <cadhy/modify/modify.hpp>

#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <BRepOffsetAPI_MakeOffset.hxx>
#include <BRepOffsetAPI_MakeOffsetShape.hxx>
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepOffsetAPI_DraftAngle.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepBuilderAPI_MakeSolid.hxx>
#include <BRepBuilderAPI_Sewing.hxx>
#include <ShapeUpgrade_UnifySameDomain.hxx>
#include <ShapeFix_Shape.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_ListOfShape.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <Geom_Surface.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <GeomAbs_SurfaceType.hxx>
#include <gp_Dir.hxx>
#include <gp_Pln.hxx>

namespace cadhy::modify {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

inline gp_Dir to_gp_dir(const Vector3D& v) {
    double len = std::sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    if (len < 1e-10) return gp_Dir(0, 0, 1);
    return gp_Dir(v.x/len, v.y/len, v.z/len);
}

inline gp_Pnt to_gp_pnt(const Point3D& p) {
    return gp_Pnt(p.x, p.y, p.z);
}

GeomAbs_JoinType convert_join_type(JoinType type) {
    switch (type) {
        case JoinType::Arc:         return GeomAbs_Arc;
        case JoinType::Tangent:     return GeomAbs_Tangent;
        case JoinType::Intersection: return GeomAbs_Intersection;
        default:                    return GeomAbs_Arc;
    }
}

ChFi3d_FilletShape convert_fillet_type(FilletType type) {
    switch (type) {
        case FilletType::Rational:     return ChFi3d_Rational;
        case FilletType::QuasiAngular: return ChFi3d_QuasiAngular;
        case FilletType::Polynomial:   return ChFi3d_Polynomial;
        default:                       return ChFi3d_Rational;
    }
}

inline const TopoDS_Shape& get_shape(const OcctShape& s) {
    return s.get();
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Fillet Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> fillet_all_edges(
    const OcctShape& shape,
    double radius
) {
    if (radius <= 0) return nullptr;

    BRepFilletAPI_MakeFillet maker(get_shape(shape));

    TopExp_Explorer exp(get_shape(shape), TopAbs_EDGE);
    for (; exp.More(); exp.Next()) {
        maker.Add(radius, TopoDS::Edge(exp.Current()));
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> fillet_edges(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double radius
) {
    if (radius <= 0 || edge_indices.empty()) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    BRepFilletAPI_MakeFillet maker(get_shape(shape));

    for (int32_t idx : edge_indices) {
        if (idx >= 1 && idx <= edge_map.Extent()) {
            maker.Add(radius, TopoDS::Edge(edge_map(idx)));
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> fillet_edges_varied(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    const std::vector<double>& radii
) {
    if (edge_indices.empty() || radii.empty()) return nullptr;
    if (edge_indices.size() != radii.size()) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    BRepFilletAPI_MakeFillet maker(get_shape(shape));

    for (size_t i = 0; i < edge_indices.size(); ++i) {
        int32_t idx = edge_indices[i];
        double r = radii[i];
        if (idx >= 1 && idx <= edge_map.Extent() && r > 0) {
            maker.Add(r, TopoDS::Edge(edge_map(idx)));
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> fillet_variable(
    const OcctShape& shape,
    int32_t edge_index,
    double radius_start,
    double radius_end
) {
    if (radius_start <= 0 || radius_end <= 0) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    if (edge_index < 1 || edge_index > edge_map.Extent()) return nullptr;

    TopoDS_Edge edge = TopoDS::Edge(edge_map(edge_index));

    BRepFilletAPI_MakeFillet maker(get_shape(shape));

    TColgp_Array1OfPnt2d params(1, 2);
    params(1) = gp_Pnt2d(0.0, radius_start);
    params(2) = gp_Pnt2d(1.0, radius_end);

    maker.Add(params, edge);

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> fillet_advanced(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    const std::vector<double>& radii,
    FilletType type
) {
    if (edge_indices.empty() || radii.empty()) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    BRepFilletAPI_MakeFillet maker(get_shape(shape), convert_fillet_type(type));

    for (size_t i = 0; i < edge_indices.size(); ++i) {
        int32_t idx = edge_indices[i];
        double r = (i < radii.size()) ? radii[i] : radii.back();
        if (idx >= 1 && idx <= edge_map.Extent() && r > 0) {
            maker.Add(r, TopoDS::Edge(edge_map(idx)));
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

//------------------------------------------------------------------------------
// Chamfer Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> chamfer_all_edges(
    const OcctShape& shape,
    double distance
) {
    if (distance <= 0) return nullptr;

    BRepFilletAPI_MakeChamfer maker(get_shape(shape));

    TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
    TopExp::MapShapesAndAncestors(get_shape(shape), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

    for (int i = 1; i <= edge_face_map.Extent(); ++i) {
        TopoDS_Edge edge = TopoDS::Edge(edge_face_map.FindKey(i));
        const TopTools_ListOfShape& faces = edge_face_map.FindFromIndex(i);
        if (!faces.IsEmpty()) {
            TopoDS_Face face = TopoDS::Face(faces.First());
            // Use symmetric chamfer (same distance on both sides)
            maker.Add(distance, distance, edge, face);
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> chamfer_edges(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double distance
) {
    if (distance <= 0 || edge_indices.empty()) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
    TopExp::MapShapesAndAncestors(get_shape(shape), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

    BRepFilletAPI_MakeChamfer maker(get_shape(shape));

    for (int32_t idx : edge_indices) {
        if (idx >= 1 && idx <= edge_map.Extent()) {
            TopoDS_Edge edge = TopoDS::Edge(edge_map(idx));
            const TopTools_ListOfShape& faces = edge_face_map.FindFromKey(edge);
            if (!faces.IsEmpty()) {
                TopoDS_Face face = TopoDS::Face(faces.First());
                // Use symmetric chamfer (same distance on both sides)
                maker.Add(distance, distance, edge, face);
            }
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> chamfer_edges_asymmetric(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double distance1,
    double distance2
) {
    if (distance1 <= 0 || distance2 <= 0 || edge_indices.empty()) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
    TopExp::MapShapesAndAncestors(get_shape(shape), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

    BRepFilletAPI_MakeChamfer maker(get_shape(shape));

    for (int32_t idx : edge_indices) {
        if (idx >= 1 && idx <= edge_map.Extent()) {
            TopoDS_Edge edge = TopoDS::Edge(edge_map(idx));
            const TopTools_ListOfShape& faces = edge_face_map.FindFromKey(edge);
            if (!faces.IsEmpty()) {
                TopoDS_Face face = TopoDS::Face(faces.First());
                maker.Add(distance1, distance2, edge, face);
            }
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> chamfer_edges_angle(
    const OcctShape& shape,
    const std::vector<int32_t>& edge_indices,
    double distance,
    double angle
) {
    if (distance <= 0 || edge_indices.empty()) return nullptr;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_EDGE, edge_map);

    TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
    TopExp::MapShapesAndAncestors(get_shape(shape), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

    BRepFilletAPI_MakeChamfer maker(get_shape(shape));

    for (int32_t idx : edge_indices) {
        if (idx >= 1 && idx <= edge_map.Extent()) {
            TopoDS_Edge edge = TopoDS::Edge(edge_map(idx));
            const TopTools_ListOfShape& faces = edge_face_map.FindFromKey(edge);
            if (!faces.IsEmpty()) {
                TopoDS_Face face = TopoDS::Face(faces.First());
                maker.AddDA(distance, angle, edge, face);
            }
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

//------------------------------------------------------------------------------
// Offset Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> offset_shape(
    const OcctShape& shape,
    double offset
) {
    BRepOffsetAPI_MakeOffsetShape maker;
    maker.PerformBySimple(get_shape(shape), offset);

    if (maker.IsDone()) {
        return std::make_unique<OcctShape>(maker.Shape());
    }
    return nullptr;
}

std::unique_ptr<OcctShape> offset_shape_advanced(
    const OcctShape& shape,
    double offset,
    JoinType join,
    bool remove_internal_edges
) {
    BRepOffsetAPI_MakeOffsetShape maker;
    maker.PerformByJoin(
        get_shape(shape),
        offset,
        1e-7,  // Tolerance
        BRepOffset_Skin,
        Standard_False,
        Standard_False,
        convert_join_type(join),
        remove_internal_edges
    );

    if (maker.IsDone()) {
        return std::make_unique<OcctShape>(maker.Shape());
    }
    return nullptr;
}

std::unique_ptr<OcctShape> offset_faces(
    const OcctShape& shape,
    const std::vector<int32_t>& face_indices,
    double offset
) {
    // For face offset, use MakeThickSolid which can offset specific faces
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_FACE, face_map);

    TopTools_ListOfShape faces_to_offset;
    for (int32_t idx : face_indices) {
        if (idx >= 1 && idx <= face_map.Extent()) {
            faces_to_offset.Append(face_map(idx));
        }
    }

    if (faces_to_offset.IsEmpty()) return nullptr;

    BRepOffsetAPI_MakeThickSolid maker;
    maker.MakeThickSolidByJoin(
        get_shape(shape),
        faces_to_offset,
        offset,
        1e-7
    );

    if (maker.IsDone()) {
        return std::make_unique<OcctShape>(maker.Shape());
    }
    return nullptr;
}

//------------------------------------------------------------------------------
// Shell Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> make_shell(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    double thickness
) {
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(get_shape(solid), TopAbs_FACE, face_map);

    TopTools_ListOfShape faces;
    for (int32_t idx : faces_to_remove) {
        if (idx >= 1 && idx <= face_map.Extent()) {
            faces.Append(face_map(idx));
        }
    }

    if (faces.IsEmpty()) return nullptr;

    BRepOffsetAPI_MakeThickSolid maker;
    maker.MakeThickSolidByJoin(
        get_shape(solid),
        faces,
        thickness,
        1e-7
    );

    if (maker.IsDone()) {
        return std::make_unique<OcctShape>(maker.Shape());
    }
    return nullptr;
}

std::unique_ptr<OcctShape> make_shell_varied(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    const std::vector<int32_t>& face_indices,
    const std::vector<double>& thicknesses
) {
    // For variable thickness, use the default thickness for now
    // More advanced implementation would use BRepOffset_MakeOffset directly
    double avg_thickness = 0;
    for (double t : thicknesses) {
        avg_thickness += t;
    }
    if (!thicknesses.empty()) {
        avg_thickness /= thicknesses.size();
    }

    return make_shell(solid, faces_to_remove, avg_thickness);
}

std::unique_ptr<OcctShape> shell_inward(
    const OcctShape& solid,
    const std::vector<int32_t>& faces_to_remove,
    double thickness
) {
    // Inward shell has negative thickness
    return make_shell(solid, faces_to_remove, -std::abs(thickness));
}

//------------------------------------------------------------------------------
// Draft Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> draft_faces(
    const OcctShape& shape,
    const std::vector<int32_t>& face_indices,
    const Vector3D& direction,
    double angle,
    const Point3D& neutral_plane_point
) {
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_FACE, face_map);

    gp_Dir dir = to_gp_dir(direction);
    gp_Pln neutral_plane(to_gp_pnt(neutral_plane_point), dir);

    BRepOffsetAPI_DraftAngle maker(get_shape(shape));

    for (int32_t idx : face_indices) {
        if (idx >= 1 && idx <= face_map.Extent()) {
            TopoDS_Face face = TopoDS::Face(face_map(idx));
            maker.Add(face, dir, angle, neutral_plane);
        }
    }

    try {
        maker.Build();
        if (maker.IsDone()) {
            return std::make_unique<OcctShape>(maker.Shape());
        }
    } catch (...) {
    }
    return nullptr;
}

std::unique_ptr<OcctShape> draft_all(
    const OcctShape& shape,
    const Vector3D& direction,
    double angle,
    const Point3D& neutral_plane_point
) {
    std::vector<int32_t> all_faces;
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(get_shape(shape), TopAbs_FACE, face_map);

    for (int i = 1; i <= face_map.Extent(); ++i) {
        all_faces.push_back(i);
    }

    return draft_faces(shape, all_faces, direction, angle, neutral_plane_point);
}

//------------------------------------------------------------------------------
// Thicken Operations
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> thicken_surface(
    const OcctShape& surface,
    double thickness
) {
    BRepOffsetAPI_MakeOffsetShape maker;
    maker.PerformBySimple(get_shape(surface), thickness);

    if (maker.IsDone()) {
        return std::make_unique<OcctShape>(maker.Shape());
    }

    // Alternative approach using prism for planar faces
    if (get_shape(surface).ShapeType() == TopAbs_FACE) {
        TopoDS_Face face = TopoDS::Face(get_shape(surface));
        BRepAdaptor_Surface adaptor(face);

        if (adaptor.GetType() == GeomAbs_Plane) {
            gp_Dir normal = adaptor.Plane().Axis().Direction();
            if (face.Orientation() == TopAbs_REVERSED) {
                normal.Reverse();
            }
            gp_Vec extrude_vec(normal);
            extrude_vec.Multiply(thickness);

            BRepPrimAPI_MakePrism prism(face, extrude_vec);
            if (prism.IsDone()) {
                return std::make_unique<OcctShape>(prism.Shape());
            }
        }
    }

    return nullptr;
}

std::unique_ptr<OcctShape> thicken_surface_asymmetric(
    const OcctShape& surface,
    double thickness_positive,
    double thickness_negative
) {
    // Create offset in positive direction
    auto offset_pos = offset_shape(surface, thickness_positive);
    if (!offset_pos) return nullptr;

    // Create offset in negative direction
    auto offset_neg = offset_shape(surface, -thickness_negative);
    if (!offset_neg) return nullptr;

    // Create solid between the two surfaces
    BRepBuilderAPI_Sewing sew;
    sew.Add(get_shape(*offset_pos));
    sew.Add(get_shape(*offset_neg));
    sew.Add(get_shape(surface));
    sew.Perform();

    TopoDS_Shape sewn = sew.SewedShape();
    if (sewn.IsNull()) return nullptr;

    // Try to make a solid
    if (sewn.ShapeType() == TopAbs_SHELL) {
        BRepBuilderAPI_MakeSolid solid_maker;
        solid_maker.Add(TopoDS::Shell(sewn));
        if (solid_maker.IsDone()) {
            return std::make_unique<OcctShape>(solid_maker.Solid());
        }
    }

    return std::make_unique<OcctShape>(sewn);
}

} // namespace cadhy::modify
