/**
 * @file selection.cpp
 * @brief Implementation of geometry selection operations
 */

#include "../../include/cadhy/edit/selection.hpp"

#include <BRepBuilderAPI_MakeVertex.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_IndexedDataMapOfShapeListOfShape.hxx>
#include <BRep_Tool.hxx>
#include <BRepGProp.hxx>
#include <BRepGProp_Face.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepExtrema_DistShapeShape.hxx>
#include <GProp_GProps.hxx>
#include <GeomLProp_SLProps.hxx>
#include <Geom_Surface.hxx>
#include <ShapeAnalysis_Surface.hxx>
#include <BRepClass_FaceClassifier.hxx>
#include <gp_Pnt2d.hxx>
#include <Precision.hxx>
#include <Standard_Failure.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Face Selection & Information
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> get_face_by_index(
    const OcctShape& shape,
    int32_t index
) {
    if (shape.is_null() || index < 0) {
        return nullptr;
    }

    try {
        TopTools_IndexedMapOfShape face_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

        if (index >= face_map.Extent()) {
            return nullptr;
        }

        // Map is 1-indexed
        const TopoDS_Shape& face = face_map.FindKey(index + 1);
        return std::make_unique<OcctShape>(face);
    } catch (const Standard_Failure& e) {
        std::cerr << "get_face_by_index error: " << e.GetMessageString() << std::endl;
        return nullptr;
    } catch (...) {
        return nullptr;
    }
}

FaceInfo get_face_info(
    const OcctShape& shape,
    int32_t face_index
) {
    FaceInfo info;
    info.index = face_index;

    auto face_shape = get_face_by_index(shape, face_index);
    if (!face_shape || face_shape->is_null()) {
        return info;
    }

    try {
        TopoDS_Face face = TopoDS::Face(face_shape->get());

        // Calculate area and centroid using GProp
        GProp_GProps props;
        BRepGProp::SurfaceProperties(face, props);
        info.area = props.Mass();

        gp_Pnt centroid = props.CentreOfMass();
        info.center = Point3D(centroid);

        // Get normal at center
        BRepAdaptor_Surface surface(face);

        // Get UV at center
        double u_mid = (surface.FirstUParameter() + surface.LastUParameter()) / 2.0;
        double v_mid = (surface.FirstVParameter() + surface.LastVParameter()) / 2.0;

        gp_Pnt pnt;
        gp_Vec d1u, d1v;
        surface.D1(u_mid, v_mid, pnt, d1u, d1v);

        gp_Vec normal = d1u.Crossed(d1v);
        if (normal.Magnitude() > Precision::Confusion()) {
            normal.Normalize();
            // Account for face orientation
            if (face.Orientation() == TopAbs_REVERSED) {
                normal.Reverse();
            }
            info.normal = Vector3D(normal);
        }

        // Count edges
        int edge_count = 0;
        for (TopExp_Explorer exp(face, TopAbs_EDGE); exp.More(); exp.Next()) {
            ++edge_count;
        }
        info.edge_count = edge_count;

        // Check if planar
        info.is_planar = (surface.GetType() == GeomAbs_Plane);

    } catch (const Standard_Failure& e) {
        std::cerr << "get_face_info error: " << e.GetMessageString() << std::endl;
    } catch (...) {
        // Return partial info
    }

    return info;
}

std::array<double, 3> get_face_normal(
    const OcctShape& shape,
    int32_t face_index
) {
    FaceInfo info = get_face_info(shape, face_index);
    return {info.normal.x, info.normal.y, info.normal.z};
}

std::array<double, 3> get_face_center(
    const OcctShape& shape,
    int32_t face_index
) {
    FaceInfo info = get_face_info(shape, face_index);
    return {info.center.x, info.center.y, info.center.z};
}

double get_face_area(
    const OcctShape& shape,
    int32_t face_index
) {
    auto face_shape = get_face_by_index(shape, face_index);
    if (!face_shape || face_shape->is_null()) {
        return 0.0;
    }

    try {
        TopoDS_Face face = TopoDS::Face(face_shape->get());
        GProp_GProps props;
        BRepGProp::SurfaceProperties(face, props);
        return props.Mass();
    } catch (...) {
        return 0.0;
    }
}

std::vector<FaceInfo> get_all_faces_info(const OcctShape& shape) {
    std::vector<FaceInfo> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape face_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

        result.reserve(face_map.Extent());
        for (int i = 0; i < face_map.Extent(); ++i) {
            result.push_back(get_face_info(shape, i));
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

//------------------------------------------------------------------------------
// Edge Selection & Information
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> get_edge_by_index(
    const OcctShape& shape,
    int32_t index
) {
    if (shape.is_null() || index < 0) {
        return nullptr;
    }

    try {
        TopTools_IndexedMapOfShape edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        if (index >= edge_map.Extent()) {
            return nullptr;
        }

        const TopoDS_Shape& edge = edge_map.FindKey(index + 1);
        return std::make_unique<OcctShape>(edge);
    } catch (...) {
        return nullptr;
    }
}

EdgeInfo get_edge_info(
    const OcctShape& shape,
    int32_t edge_index
) {
    EdgeInfo info;
    info.index = edge_index;

    auto edge_shape = get_edge_by_index(shape, edge_index);
    if (!edge_shape || edge_shape->is_null()) {
        return info;
    }

    try {
        TopoDS_Edge edge = TopoDS::Edge(edge_shape->get());

        // Get curve parameters
        double first, last;
        Handle(Geom_Curve) curve = BRep_Tool::Curve(edge, first, last);

        if (!curve.IsNull()) {
            // Start and end points
            gp_Pnt start_pnt = curve->Value(first);
            gp_Pnt end_pnt = curve->Value(last);
            gp_Pnt mid_pnt = curve->Value((first + last) / 2.0);

            info.start = Point3D(start_pnt);
            info.end = Point3D(end_pnt);
            info.mid = Point3D(mid_pnt);

            // Check if closed
            info.is_closed = BRep_Tool::IsClosed(edge);
        }

        // Calculate length
        BRepAdaptor_Curve adaptor(edge);
        GProp_GProps props;
        BRepGProp::LinearProperties(edge, props);
        info.length = props.Mass();

        // Determine curve type
        GeomAbs_CurveType curve_type = adaptor.GetType();
        switch (curve_type) {
            case GeomAbs_Line: info.curve_type = 0; break;
            case GeomAbs_Circle: info.curve_type = 1; break;
            case GeomAbs_Ellipse: info.curve_type = 2; break;
            case GeomAbs_Hyperbola: info.curve_type = 3; break;
            case GeomAbs_Parabola: info.curve_type = 4; break;
            case GeomAbs_BezierCurve: info.curve_type = 5; break;
            case GeomAbs_BSplineCurve: info.curve_type = 6; break;
            default: info.curve_type = 99; break;
        }

    } catch (...) {
        // Return partial info
    }

    return info;
}

std::vector<EdgeInfo> get_all_edges_info(const OcctShape& shape) {
    std::vector<EdgeInfo> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        result.reserve(edge_map.Extent());
        for (int i = 0; i < edge_map.Extent(); ++i) {
            result.push_back(get_edge_info(shape, i));
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

std::vector<int32_t> get_face_edges(
    const OcctShape& shape,
    int32_t face_index
) {
    std::vector<int32_t> result;

    auto face_shape = get_face_by_index(shape, face_index);
    if (!face_shape || face_shape->is_null()) {
        return result;
    }

    try {
        // Build edge map for the whole shape to get consistent indices
        TopTools_IndexedMapOfShape edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        // Iterate edges of the face
        TopoDS_Face face = TopoDS::Face(face_shape->get());
        for (TopExp_Explorer exp(face, TopAbs_EDGE); exp.More(); exp.Next()) {
            const TopoDS_Edge& edge = TopoDS::Edge(exp.Current());
            int idx = edge_map.FindIndex(edge);
            if (idx > 0) {
                result.push_back(idx - 1);  // Convert to 0-based
            }
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

//------------------------------------------------------------------------------
// Vertex Selection & Information
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> get_vertex_by_index(
    const OcctShape& shape,
    int32_t index
) {
    if (shape.is_null() || index < 0) {
        return nullptr;
    }

    try {
        TopTools_IndexedMapOfShape vertex_map;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertex_map);

        if (index >= vertex_map.Extent()) {
            return nullptr;
        }

        const TopoDS_Shape& vertex = vertex_map.FindKey(index + 1);
        return std::make_unique<OcctShape>(vertex);
    } catch (...) {
        return nullptr;
    }
}

VertexInfo get_vertex_info(
    const OcctShape& shape,
    int32_t vertex_index
) {
    VertexInfo info;
    info.index = vertex_index;

    auto vertex_shape = get_vertex_by_index(shape, vertex_index);
    if (!vertex_shape || vertex_shape->is_null()) {
        return info;
    }

    try {
        TopoDS_Vertex vertex = TopoDS::Vertex(vertex_shape->get());
        gp_Pnt pnt = BRep_Tool::Pnt(vertex);
        info.position = Point3D(pnt);

        // Count connected edges using adjacency map
        TopTools_IndexedDataMapOfShapeListOfShape vertex_edge_map;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, vertex_edge_map);

        int idx = vertex_edge_map.FindIndex(vertex);
        if (idx > 0) {
            const TopTools_ListOfShape& edges = vertex_edge_map.FindFromIndex(idx);
            info.edge_count = edges.Extent();
        }

    } catch (...) {
        // Return partial info
    }

    return info;
}

std::vector<VertexInfo> get_all_vertices_info(const OcctShape& shape) {
    std::vector<VertexInfo> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape vertex_map;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertex_map);

        result.reserve(vertex_map.Extent());
        for (int i = 0; i < vertex_map.Extent(); ++i) {
            result.push_back(get_vertex_info(shape, i));
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

//------------------------------------------------------------------------------
// Adjacency Queries
//------------------------------------------------------------------------------

std::vector<int32_t> get_adjacent_faces_for_edge(
    const OcctShape& shape,
    int32_t edge_index
) {
    std::vector<int32_t> result;

    auto edge_shape = get_edge_by_index(shape, edge_index);
    if (!edge_shape || edge_shape->is_null()) {
        return result;
    }

    try {
        // Build face map
        TopTools_IndexedMapOfShape face_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

        // Build edge-to-face adjacency map
        TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

        TopoDS_Edge edge = TopoDS::Edge(edge_shape->get());
        int idx = edge_face_map.FindIndex(edge);
        if (idx > 0) {
            const TopTools_ListOfShape& faces = edge_face_map.FindFromIndex(idx);
            for (TopTools_ListIteratorOfListOfShape it(faces); it.More(); it.Next()) {
                int face_idx = face_map.FindIndex(it.Value());
                if (face_idx > 0) {
                    result.push_back(face_idx - 1);
                }
            }
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

std::vector<int32_t> get_adjacent_edges_for_vertex(
    const OcctShape& shape,
    int32_t vertex_index
) {
    std::vector<int32_t> result;

    auto vertex_shape = get_vertex_by_index(shape, vertex_index);
    if (!vertex_shape || vertex_shape->is_null()) {
        return result;
    }

    try {
        // Build edge map
        TopTools_IndexedMapOfShape edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        // Build vertex-to-edge adjacency map
        TopTools_IndexedDataMapOfShapeListOfShape vertex_edge_map;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, vertex_edge_map);

        TopoDS_Vertex vertex = TopoDS::Vertex(vertex_shape->get());
        int idx = vertex_edge_map.FindIndex(vertex);
        if (idx > 0) {
            const TopTools_ListOfShape& edges = vertex_edge_map.FindFromIndex(idx);
            for (TopTools_ListIteratorOfListOfShape it(edges); it.More(); it.Next()) {
                int edge_idx = edge_map.FindIndex(it.Value());
                if (edge_idx > 0) {
                    result.push_back(edge_idx - 1);
                }
            }
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

std::vector<int32_t> get_adjacent_faces_for_vertex(
    const OcctShape& shape,
    int32_t vertex_index
) {
    std::vector<int32_t> result;

    auto vertex_shape = get_vertex_by_index(shape, vertex_index);
    if (!vertex_shape || vertex_shape->is_null()) {
        return result;
    }

    try {
        // Build face map
        TopTools_IndexedMapOfShape face_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

        // Build vertex-to-face adjacency map
        TopTools_IndexedDataMapOfShapeListOfShape vertex_face_map;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_FACE, vertex_face_map);

        TopoDS_Vertex vertex = TopoDS::Vertex(vertex_shape->get());
        int idx = vertex_face_map.FindIndex(vertex);
        if (idx > 0) {
            const TopTools_ListOfShape& faces = vertex_face_map.FindFromIndex(idx);
            for (TopTools_ListIteratorOfListOfShape it(faces); it.More(); it.Next()) {
                int face_idx = face_map.FindIndex(it.Value());
                if (face_idx > 0) {
                    result.push_back(face_idx - 1);
                }
            }
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

//------------------------------------------------------------------------------
// Selection Utilities
//------------------------------------------------------------------------------

int32_t find_face_at_point(
    const OcctShape& shape,
    const Point3D& point,
    double tolerance
) {
    if (shape.is_null()) {
        return -1;
    }

    try {
        gp_Pnt test_point = point.to_gp_pnt();

        TopTools_IndexedMapOfShape face_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

        for (int i = 1; i <= face_map.Extent(); ++i) {
            TopoDS_Face face = TopoDS::Face(face_map.FindKey(i));

            // Use BRepClass_FaceClassifier to check if point is on face
            BRepAdaptor_Surface surface(face);
            Handle(Geom_Surface) geom_surface = BRep_Tool::Surface(face);

            if (!geom_surface.IsNull()) {
                ShapeAnalysis_Surface sas(geom_surface);
                gp_Pnt2d uv = sas.ValueOfUV(test_point, tolerance);

                BRepClass_FaceClassifier classifier(face, uv, tolerance);
                if (classifier.State() == TopAbs_ON || classifier.State() == TopAbs_IN) {
                    return i - 1;  // Convert to 0-based
                }
            }
        }
    } catch (...) {
        // Return not found
    }

    return -1;
}

int32_t find_nearest_edge(
    const OcctShape& shape,
    const Point3D& point,
    double max_distance
) {
    if (shape.is_null()) {
        return -1;
    }

    try {
        gp_Pnt test_point = point.to_gp_pnt();
        TopoDS_Vertex test_vertex = BRepBuilderAPI_MakeVertex(test_point);

        TopTools_IndexedMapOfShape edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        int32_t nearest_idx = -1;
        double min_dist = max_distance;

        for (int i = 1; i <= edge_map.Extent(); ++i) {
            TopoDS_Edge edge = TopoDS::Edge(edge_map.FindKey(i));

            BRepExtrema_DistShapeShape dist_calc(test_vertex, edge);
            if (dist_calc.IsDone() && dist_calc.NbSolution() > 0) {
                double dist = dist_calc.Value();
                if (dist < min_dist) {
                    min_dist = dist;
                    nearest_idx = i - 1;
                }
            }
        }

        return nearest_idx;
    } catch (...) {
        return -1;
    }
}

int32_t find_nearest_vertex(
    const OcctShape& shape,
    const Point3D& point,
    double max_distance
) {
    if (shape.is_null()) {
        return -1;
    }

    try {
        gp_Pnt test_point = point.to_gp_pnt();

        TopTools_IndexedMapOfShape vertex_map;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertex_map);

        int32_t nearest_idx = -1;
        double min_dist = max_distance;

        for (int i = 1; i <= vertex_map.Extent(); ++i) {
            TopoDS_Vertex vertex = TopoDS::Vertex(vertex_map.FindKey(i));
            gp_Pnt vtx_point = BRep_Tool::Pnt(vertex);

            double dist = test_point.Distance(vtx_point);
            if (dist < min_dist) {
                min_dist = dist;
                nearest_idx = i - 1;
            }
        }

        return nearest_idx;
    } catch (...) {
        return -1;
    }
}

} // namespace cadhy::edit
