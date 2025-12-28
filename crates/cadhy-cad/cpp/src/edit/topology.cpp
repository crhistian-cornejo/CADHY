/**
 * @file topology.cpp
 * @brief Implementation of topology extraction and adjacency analysis
 */

#include "../../include/cadhy/edit/topology.hpp"
#include "../../include/cadhy/analysis/analysis.hpp"

#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopTools_IndexedDataMapOfShapeListOfShape.hxx>
#include <TopTools_ListIteratorOfListOfShape.hxx>
#include <BRep_Tool.hxx>
#include <BRepGProp.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <GProp_GProps.hxx>
#include <GCPnts_TangentialDeflection.hxx>
#include <TopoDS.hxx>
#include <gp_Vec.hxx>
#include <Precision.hxx>

namespace cadhy::edit {

//------------------------------------------------------------------------------
// Topology Extraction Implementation
//------------------------------------------------------------------------------

std::vector<TopologyVertexInfo> get_topology_vertices(const OcctShape& shape) {
    std::vector<TopologyVertexInfo> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape vertex_map;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, vertex_map);

        // Build adjacency for edge count
        TopTools_IndexedDataMapOfShapeListOfShape vertex_edge_map;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, vertex_edge_map);

        result.reserve(vertex_map.Extent());
        for (int i = 1; i <= vertex_map.Extent(); i++) {
            TopoDS_Vertex v = TopoDS::Vertex(vertex_map(i));
            gp_Pnt p = BRep_Tool::Pnt(v);

            TopologyVertexInfo info;
            info.index = static_cast<uint32_t>(i - 1);
            info.x = p.X();
            info.y = p.Y();
            info.z = p.Z();
            info.tolerance = BRep_Tool::Tolerance(v);

            // Get adjacent edge count
            int idx = vertex_edge_map.FindIndex(v);
            if (idx > 0) {
                info.num_edges = vertex_edge_map.FindFromIndex(idx).Extent();
            }

            result.push_back(info);
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

std::vector<EdgeTessellation> tessellate_edges(
    const OcctShape& shape,
    double deflection
) {
    std::vector<EdgeTessellation> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        result.reserve(edge_map.Extent());
        for (int i = 1; i <= edge_map.Extent(); i++) {
            TopoDS_Edge edge = TopoDS::Edge(edge_map(i));
            EdgeTessellation tess;
            tess.index = static_cast<uint32_t>(i - 1);

            // Analyze curve type
            BRepAdaptor_Curve adaptor(edge);
            tess.curve_type = static_cast<int32_t>(adaptor.GetType());
            tess.length = cadhy::analysis::length(cadhy::OcctShape(edge));
            tess.is_degenerated = BRep_Tool::Degenerated(edge);

            // Get start/end vertices (indices set by get_full_topology)
            TopoDS_Vertex v1, v2;
            TopExp::Vertices(edge, v1, v2);

            // Tessellate if not degenerated
            if (!tess.is_degenerated) {
                GCPnts_TangentialDeflection sampler(adaptor, deflection, 0.1);
                tess.points.reserve(sampler.NbPoints());
                for (int j = 1; j <= sampler.NbPoints(); j++) {
                    gp_Pnt p = sampler.Value(j);
                    EdgePoint ep;
                    ep.x = p.X();
                    ep.y = p.Y();
                    ep.z = p.Z();
                    ep.parameter = sampler.Parameter(j);
                    tess.points.push_back(ep);
                }
            }

            result.push_back(tess);
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

std::vector<FaceTopologyInfo> get_face_topology(const OcctShape& shape) {
    std::vector<FaceTopologyInfo> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape face_map, edge_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

        result.reserve(face_map.Extent());
        for (int i = 1; i <= face_map.Extent(); i++) {
            TopoDS_Face face = TopoDS::Face(face_map(i));
            FaceTopologyInfo info;
            info.index = static_cast<uint32_t>(i - 1);

            BRepAdaptor_Surface adaptor(face);
            info.surface_type = static_cast<int32_t>(adaptor.GetType());
            info.area = cadhy::analysis::surface_area(cadhy::OcctShape(face));
            info.is_reversed = (face.Orientation() == TopAbs_REVERSED);

            // Get center of mass
            GProp_GProps props;
            BRepGProp::SurfaceProperties(face, props);
            gp_Pnt center = props.CentreOfMass();
            info.center_x = center.X();
            info.center_y = center.Y();
            info.center_z = center.Z();

            // Compute normal at center
            double u_mid = (adaptor.FirstUParameter() + adaptor.LastUParameter()) / 2.0;
            double v_mid = (adaptor.FirstVParameter() + adaptor.LastVParameter()) / 2.0;

            gp_Pnt pnt;
            gp_Vec d1u, d1v;
            adaptor.D1(u_mid, v_mid, pnt, d1u, d1v);

            gp_Vec normal = d1u.Crossed(d1v);
            if (normal.Magnitude() > Precision::Confusion()) {
                normal.Normalize();
                if (face.Orientation() == TopAbs_REVERSED) {
                    normal.Reverse();
                }
                info.normal_x = normal.X();
                info.normal_y = normal.Y();
                info.normal_z = normal.Z();
            }

            // Get boundary edges
            TopExp_Explorer e_exp(face, TopAbs_EDGE);
            while (e_exp.More()) {
                int edge_idx = edge_map.FindIndex(e_exp.Current());
                if (edge_idx > 0) {
                    info.boundary_edges.push_back(static_cast<uint32_t>(edge_idx - 1));
                }
                e_exp.Next();
            }
            info.num_edges = static_cast<int32_t>(info.boundary_edges.size());

            result.push_back(info);
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

TopologyResult get_full_topology(
    const OcctShape& shape,
    double edge_deflection
) {
    TopologyResult result;

    if (shape.is_null()) {
        return result;
    }

    try {
        // 1. Map all elements
        TopTools_IndexedMapOfShape v_map, e_map, f_map;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, v_map);
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, e_map);
        TopExp::MapShapes(shape.get(), TopAbs_FACE, f_map);

        // 2. Compute Adjacency
        TopTools_IndexedDataMapOfShapeListOfShape v_e_adj, e_f_adj;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, v_e_adj);
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, e_f_adj);

        // 3. Fill Vertices with CSR adjacency
        result.vertices.reserve(v_map.Extent());
        for (int i = 1; i <= v_map.Extent(); i++) {
            TopoDS_Vertex v = TopoDS::Vertex(v_map(i));
            gp_Pnt p = BRep_Tool::Pnt(v);

            TopologyVertexInfo info;
            info.index = static_cast<uint32_t>(i - 1);
            info.x = p.X();
            info.y = p.Y();
            info.z = p.Z();
            info.tolerance = BRep_Tool::Tolerance(v);

            int adj_idx = v_e_adj.FindIndex(v);
            if (adj_idx > 0) {
                info.num_edges = v_e_adj.FindFromIndex(adj_idx).Extent();
            }
            result.vertices.push_back(info);

            // Fill CSR adjacency
            result.vertex_to_edges_offset.push_back(
                static_cast<uint32_t>(result.vertex_to_edges.size())
            );
            if (adj_idx > 0) {
                const auto& adj_edges = v_e_adj.FindFromIndex(adj_idx);
                for (TopTools_ListIteratorOfListOfShape it(adj_edges); it.More(); it.Next()) {
                    int edge_idx = e_map.FindIndex(it.Value());
                    if (edge_idx > 0) {
                        result.vertex_to_edges.push_back(static_cast<uint32_t>(edge_idx - 1));
                    }
                }
            }
        }
        result.vertex_to_edges_offset.push_back(
            static_cast<uint32_t>(result.vertex_to_edges.size())
        );

        // 4. Fill Edges with tessellation and CSR adjacency
        result.edges.reserve(e_map.Extent());
        for (int i = 1; i <= e_map.Extent(); i++) {
            TopoDS_Edge edge = TopoDS::Edge(e_map(i));
            EdgeTessellation tess;
            tess.index = static_cast<uint32_t>(i - 1);

            BRepAdaptor_Curve adaptor(edge);
            tess.curve_type = static_cast<int32_t>(adaptor.GetType());
            tess.length = cadhy::analysis::length(cadhy::OcctShape(edge));
            tess.is_degenerated = BRep_Tool::Degenerated(edge);

            // Get vertex indices
            TopoDS_Vertex sv, ev;
            TopExp::Vertices(edge, sv, ev);
            tess.start_vertex = sv.IsNull() ? 0xFFFFFFFF : static_cast<uint32_t>(v_map.FindIndex(sv) - 1);
            tess.end_vertex = ev.IsNull() ? 0xFFFFFFFF : static_cast<uint32_t>(v_map.FindIndex(ev) - 1);

            // Tessellate
            if (!tess.is_degenerated) {
                GCPnts_TangentialDeflection sampler(adaptor, edge_deflection, 0.1);
                tess.points.reserve(sampler.NbPoints());
                for (int j = 1; j <= sampler.NbPoints(); j++) {
                    gp_Pnt p = sampler.Value(j);
                    EdgePoint ep;
                    ep.x = p.X();
                    ep.y = p.Y();
                    ep.z = p.Z();
                    ep.parameter = sampler.Parameter(j);
                    tess.points.push_back(ep);
                }
            }

            // Fill face adjacency (in EdgeTessellation)
            int adj_idx = e_f_adj.FindIndex(edge);
            if (adj_idx > 0) {
                const auto& adj_faces = e_f_adj.FindFromIndex(adj_idx);
                for (TopTools_ListIteratorOfListOfShape it(adj_faces); it.More(); it.Next()) {
                    int face_idx = f_map.FindIndex(it.Value());
                    if (face_idx > 0) {
                        tess.adjacent_faces.push_back(static_cast<uint32_t>(face_idx - 1));
                    }
                }
            }

            // Fill CSR adjacency for global map
            result.edge_to_faces_offset.push_back(
                static_cast<uint32_t>(result.edge_to_faces.size())
            );
            for (uint32_t f_idx : tess.adjacent_faces) {
                result.edge_to_faces.push_back(f_idx);
            }

            result.edges.push_back(tess);
        }
        result.edge_to_faces_offset.push_back(
            static_cast<uint32_t>(result.edge_to_faces.size())
        );

        // 5. Fill Faces
        result.faces.reserve(f_map.Extent());
        for (int i = 1; i <= f_map.Extent(); i++) {
            TopoDS_Face face = TopoDS::Face(f_map(i));
            FaceTopologyInfo info;
            info.index = static_cast<uint32_t>(i - 1);

            BRepAdaptor_Surface adaptor(face);
            info.surface_type = static_cast<int32_t>(adaptor.GetType());
            info.area = cadhy::analysis::surface_area(cadhy::OcctShape(face));
            info.is_reversed = (face.Orientation() == TopAbs_REVERSED);

            GProp_GProps props;
            BRepGProp::SurfaceProperties(face, props);
            gp_Pnt center = props.CentreOfMass();
            info.center_x = center.X();
            info.center_y = center.Y();
            info.center_z = center.Z();

            // Normal at center
            double u_mid = (adaptor.FirstUParameter() + adaptor.LastUParameter()) / 2.0;
            double v_mid = (adaptor.FirstVParameter() + adaptor.LastVParameter()) / 2.0;

            gp_Pnt pnt;
            gp_Vec d1u, d1v;
            adaptor.D1(u_mid, v_mid, pnt, d1u, d1v);

            gp_Vec normal = d1u.Crossed(d1v);
            if (normal.Magnitude() > Precision::Confusion()) {
                normal.Normalize();
                if (face.Orientation() == TopAbs_REVERSED) {
                    normal.Reverse();
                }
                info.normal_x = normal.X();
                info.normal_y = normal.Y();
                info.normal_z = normal.Z();
            }

            // Boundary edges
            TopExp_Explorer e_exp(face, TopAbs_EDGE);
            while (e_exp.More()) {
                int edge_idx = e_map.FindIndex(e_exp.Current());
                if (edge_idx > 0) {
                    info.boundary_edges.push_back(static_cast<uint32_t>(edge_idx - 1));
                }
                e_exp.Next();
            }
            info.num_edges = static_cast<int32_t>(info.boundary_edges.size());

            result.faces.push_back(info);
        }
    } catch (...) {
        // Return what we have
    }

    return result;
}

//------------------------------------------------------------------------------
// Adjacency Query Implementation
//------------------------------------------------------------------------------

std::vector<std::vector<int32_t>> build_vertex_edge_adjacency(const OcctShape& shape) {
    std::vector<std::vector<int32_t>> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape v_map, e_map;
        TopExp::MapShapes(shape.get(), TopAbs_VERTEX, v_map);
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, e_map);

        TopTools_IndexedDataMapOfShapeListOfShape v_e_adj;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_VERTEX, TopAbs_EDGE, v_e_adj);

        result.resize(v_map.Extent());
        for (int i = 1; i <= v_map.Extent(); i++) {
            int adj_idx = v_e_adj.FindIndex(v_map(i));
            if (adj_idx > 0) {
                const auto& edges = v_e_adj.FindFromIndex(adj_idx);
                for (TopTools_ListIteratorOfListOfShape it(edges); it.More(); it.Next()) {
                    int edge_idx = e_map.FindIndex(it.Value());
                    if (edge_idx > 0) {
                        result[i - 1].push_back(edge_idx - 1);
                    }
                }
            }
        }
    } catch (...) {
        // Return empty
    }

    return result;
}

std::vector<std::vector<int32_t>> build_edge_face_adjacency(const OcctShape& shape) {
    std::vector<std::vector<int32_t>> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape e_map, f_map;
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, e_map);
        TopExp::MapShapes(shape.get(), TopAbs_FACE, f_map);

        TopTools_IndexedDataMapOfShapeListOfShape e_f_adj;
        TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, e_f_adj);

        result.resize(e_map.Extent());
        for (int i = 1; i <= e_map.Extent(); i++) {
            int adj_idx = e_f_adj.FindIndex(e_map(i));
            if (adj_idx > 0) {
                const auto& faces = e_f_adj.FindFromIndex(adj_idx);
                for (TopTools_ListIteratorOfListOfShape it(faces); it.More(); it.Next()) {
                    int face_idx = f_map.FindIndex(it.Value());
                    if (face_idx > 0) {
                        result[i - 1].push_back(face_idx - 1);
                    }
                }
            }
        }
    } catch (...) {
        // Return empty
    }

    return result;
}

std::vector<std::vector<int32_t>> build_face_edge_adjacency(const OcctShape& shape) {
    std::vector<std::vector<int32_t>> result;

    if (shape.is_null()) {
        return result;
    }

    try {
        TopTools_IndexedMapOfShape f_map, e_map;
        TopExp::MapShapes(shape.get(), TopAbs_FACE, f_map);
        TopExp::MapShapes(shape.get(), TopAbs_EDGE, e_map);

        result.resize(f_map.Extent());
        for (int i = 1; i <= f_map.Extent(); i++) {
            TopoDS_Face face = TopoDS::Face(f_map(i));
            TopExp_Explorer exp(face, TopAbs_EDGE);
            while (exp.More()) {
                int edge_idx = e_map.FindIndex(exp.Current());
                if (edge_idx > 0) {
                    result[i - 1].push_back(edge_idx - 1);
                }
                exp.Next();
            }
        }
    } catch (...) {
        // Return empty
    }

    return result;
}

} // namespace cadhy::edit
