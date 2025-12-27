/**
 * @file mesh.cpp
 * @brief Implementation of mesh generation and manipulation
 *
 * High-performance tessellation using OpenCASCADE BRepMesh.
 */

#include <cadhy/mesh/mesh.hpp>

#include <BRepMesh_IncrementalMesh.hxx>
#include <BRepTools.hxx>
#include <BRep_Tool.hxx>
#include <Poly_Triangulation.hxx>
#include <Poly_Connect.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <Bnd_Box.hxx>
#include <BRepBndLib.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Dir.hxx>
#include <TColgp_Array1OfPnt.hxx>
#include <GCPnts_TangentialDeflection.hxx>
#include <Geom_Surface.hxx>
#include <GeomLProp_SLProps.hxx>
#include <Standard_Mutex.hxx>

#include <algorithm>
#include <unordered_map>

namespace cadhy::mesh {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

Point3D from_gp_pnt(const gp_Pnt& p) {
    return Point3D{p.X(), p.Y(), p.Z()};
}

Vector3D from_gp_dir(const gp_Dir& d) {
    return Vector3D{d.X(), d.Y(), d.Z()};
}

void ensure_triangulation(const OcctShape& shape, double deflection) {
    // Check if already tessellated with sufficient quality
    bool needs_mesh = false;

    for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) {
        TopoDS_Face face = TopoDS::Face(exp.Current());
        TopLoc_Location loc;
        Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, loc);

        if (tri.IsNull()) {
            needs_mesh = true;
            break;
        }
    }

    if (needs_mesh) {
        BRepMesh_IncrementalMesh mesher(shape.get(), deflection, false, 0.5, true);
        mesher.Perform();
    }
}

} // anonymous namespace

//------------------------------------------------------------------------------
// Basic Tessellation
//------------------------------------------------------------------------------

MeshData tessellate(const OcctShape& shape) {
    return tessellate_deflection(shape, 0.1);
}

MeshData tessellate_deflection(
    const OcctShape& shape,
    double deflection
) {
    MeshData result;

    // Perform tessellation
    BRepMesh_IncrementalMesh mesher(shape.get(), deflection, false, 0.5, true);
    mesher.Perform();

    // Build face map for face IDs
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

    // Vertex index offset per face
    uint32_t vertex_offset = 0;

    // Process each face
    for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) {
        TopoDS_Face face = TopoDS::Face(exp.Current());
        int face_id = face_map.FindIndex(face);

        TopLoc_Location loc;
        Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, loc);

        if (tri.IsNull()) continue;

        bool reversed = (face.Orientation() == TopAbs_REVERSED);
        gp_Trsf trsf = loc.Transformation();

        // Get nodes
        int num_nodes = tri->NbNodes();
        for (int i = 1; i <= num_nodes; ++i) {
            gp_Pnt pt = tri->Node(i).Transformed(trsf);
            result.positions.push_back(static_cast<float>(pt.X()));
            result.positions.push_back(static_cast<float>(pt.Y()));
            result.positions.push_back(static_cast<float>(pt.Z()));
        }

        // Get triangles
        int num_triangles = tri->NbTriangles();
        for (int i = 1; i <= num_triangles; ++i) {
            const Poly_Triangle& triangle = tri->Triangle(i);
            int n1, n2, n3;
            triangle.Get(n1, n2, n3);

            // Adjust for reversed faces and vertex offset
            if (reversed) {
                result.indices.push_back(vertex_offset + n1 - 1);
                result.indices.push_back(vertex_offset + n3 - 1);
                result.indices.push_back(vertex_offset + n2 - 1);
            } else {
                result.indices.push_back(vertex_offset + n1 - 1);
                result.indices.push_back(vertex_offset + n2 - 1);
                result.indices.push_back(vertex_offset + n3 - 1);
            }

            result.face_ids.push_back(face_id);
        }

        // Compute normals if available
        if (tri->HasNormals()) {
            for (int i = 1; i <= num_nodes; ++i) {
                gp_Dir normal = tri->Normal(i);
                if (reversed) normal.Reverse();
                // Transform normal
                normal = normal.IsParallel(gp_Dir(0, 0, 1), 1e-10) ?
                         gp_Dir(0, 0, reversed ? -1 : 1) :
                         normal.IsParallel(gp_Dir(1, 0, 0), 1e-10) ?
                         gp_Dir(reversed ? -1 : 1, 0, 0) :
                         normal;

                result.normals.push_back(static_cast<float>(normal.X()));
                result.normals.push_back(static_cast<float>(normal.Y()));
                result.normals.push_back(static_cast<float>(normal.Z()));
            }
        }

        vertex_offset += num_nodes;
    }

    // If no normals were provided, compute them
    if (result.normals.empty() && !result.indices.empty()) {
        result = compute_smooth_normals(result);
    }

    return result;
}

MeshData tessellate_quality(
    const OcctShape& shape,
    const MeshQuality& quality
) {
    // Perform tessellation with quality settings
    BRepMesh_IncrementalMesh mesher(
        shape.get(),
        quality.linear_deflection,
        quality.relative,
        quality.angular_deflection,
        quality.parallel
    );
    mesher.Perform();

    // Use standard extraction
    return tessellate_deflection(shape, quality.linear_deflection);
}

FaceMesh tessellate_face(
    const OcctShape& shape,
    int32_t face_index,
    double deflection
) {
    FaceMesh result;
    result.face_index = face_index;

    // Ensure tessellation
    ensure_triangulation(shape, deflection);

    // Find the face
    TopTools_IndexedMapOfShape face_map;
    TopExp::MapShapes(shape.get(), TopAbs_FACE, face_map);

    if (face_index < 1 || face_index > face_map.Extent()) {
        return result;
    }

    TopoDS_Face face = TopoDS::Face(face_map(face_index));
    TopLoc_Location loc;
    Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, loc);

    if (tri.IsNull()) return result;

    bool reversed = (face.Orientation() == TopAbs_REVERSED);
    gp_Trsf trsf = loc.Transformation();

    // Extract vertices
    int num_nodes = tri->NbNodes();
    result.vertices.reserve(num_nodes);

    for (int i = 1; i <= num_nodes; ++i) {
        gp_Pnt pt = tri->Node(i).Transformed(trsf);
        result.vertices.push_back(from_gp_pnt(pt));
    }

    // Extract normals
    if (tri->HasNormals()) {
        result.normals.reserve(num_nodes);
        for (int i = 1; i <= num_nodes; ++i) {
            gp_Dir normal = tri->Normal(i);
            if (reversed) normal.Reverse();
            result.normals.push_back(from_gp_dir(normal));
        }
    }

    // Extract UVs
    if (tri->HasUVNodes()) {
        result.uvs.reserve(num_nodes);
        for (int i = 1; i <= num_nodes; ++i) {
            gp_Pnt2d uv = tri->UVNode(i);
            result.uvs.push_back({uv.X(), uv.Y()});
        }
    }

    // Extract triangles
    int num_triangles = tri->NbTriangles();
    result.triangles.reserve(num_triangles);

    for (int i = 1; i <= num_triangles; ++i) {
        const Poly_Triangle& triangle = tri->Triangle(i);
        int n1, n2, n3;
        triangle.Get(n1, n2, n3);

        Triangle t;
        if (reversed) {
            t.v0 = n1 - 1;
            t.v1 = n3 - 1;
            t.v2 = n2 - 1;
        } else {
            t.v0 = n1 - 1;
            t.v1 = n2 - 1;
            t.v2 = n3 - 1;
        }
        result.triangles.push_back(t);
    }

    return result;
}

//------------------------------------------------------------------------------
// Adaptive Tessellation
//------------------------------------------------------------------------------

MeshData tessellate_adaptive(
    const OcctShape& shape,
    double min_deflection,
    double max_deflection,
    double curvature_factor
) {
    // Use bounding box to determine appropriate deflection
    Bnd_Box bbox;
    BRepBndLib::Add(shape.get(), bbox);
    double xmin, ymin, zmin, xmax, ymax, zmax;
    bbox.Get(xmin, ymin, zmin, xmax, ymax, zmax);

    double diagonal = std::sqrt(
        (xmax - xmin) * (xmax - xmin) +
        (ymax - ymin) * (ymax - ymin) +
        (zmax - zmin) * (zmax - zmin)
    );

    double deflection = std::clamp(
        diagonal * 0.001 * curvature_factor,
        min_deflection,
        max_deflection
    );

    return tessellate_deflection(shape, deflection);
}

MeshData tessellate_edge_length(
    const OcctShape& shape,
    double min_edge_length,
    double max_edge_length
) {
    // Approximate deflection from edge length
    double deflection = min_edge_length / 2;
    return tessellate_deflection(shape, deflection);
}

//------------------------------------------------------------------------------
// LOD Generation
//------------------------------------------------------------------------------

LODMesh generate_lods(
    const OcctShape& shape,
    double high_deflection,
    double medium_deflection,
    double low_deflection,
    double preview_deflection
) {
    LODMesh result;
    result.high = tessellate_deflection(shape, high_deflection);
    result.medium = tessellate_deflection(shape, medium_deflection);
    result.low = tessellate_deflection(shape, low_deflection);
    result.preview = tessellate_deflection(shape, preview_deflection);
    return result;
}

MeshQuality auto_quality(const OcctShape& shape) {
    MeshQuality quality;

    Bnd_Box bbox;
    BRepBndLib::Add(shape.get(), bbox);
    double xmin, ymin, zmin, xmax, ymax, zmax;
    bbox.Get(xmin, ymin, zmin, xmax, ymax, zmax);

    double diagonal = std::sqrt(
        (xmax - xmin) * (xmax - xmin) +
        (ymax - ymin) * (ymax - ymin) +
        (zmax - zmin) * (zmax - zmin)
    );

    // Adaptive quality based on size
    quality.linear_deflection = diagonal * 0.001;
    quality.angular_deflection = 0.5;  // ~28 degrees
    quality.relative = false;
    quality.parallel = true;

    return quality;
}

//------------------------------------------------------------------------------
// Mesh Extraction
//------------------------------------------------------------------------------

MeshData extract_mesh(const OcctShape& shape) {
    return tessellate_deflection(shape, 0.1);
}

MeshData extract_mesh_with_faces(const OcctShape& shape) {
    MeshData result = tessellate_deflection(shape, 0.1);

    // Already includes face_ids in tessellate_deflection
    return result;
}

bool is_tessellated(const OcctShape& shape) {
    for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) {
        TopoDS_Face face = TopoDS::Face(exp.Current());
        TopLoc_Location loc;
        Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, loc);
        if (tri.IsNull()) {
            return false;
        }
    }
    return true;
}

double get_tessellation_deflection(const OcctShape& shape) {
    double max_deflection = 0;

    for (TopExp_Explorer exp(shape.get(), TopAbs_FACE); exp.More(); exp.Next()) {
        TopoDS_Face face = TopoDS::Face(exp.Current());
        TopLoc_Location loc;
        Handle(Poly_Triangulation) tri = BRep_Tool::Triangulation(face, loc);
        if (!tri.IsNull()) {
            max_deflection = std::max(max_deflection, tri->Deflection());
        }
    }

    return max_deflection;
}

//------------------------------------------------------------------------------
// Wireframe Mesh
//------------------------------------------------------------------------------

WireframeMesh extract_wireframe(
    const OcctShape& shape,
    double deflection
) {
    WireframeMesh result;

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

    for (int i = 1; i <= edge_map.Extent(); ++i) {
        TopoDS_Edge edge = TopoDS::Edge(edge_map(i));
        BRepAdaptor_Curve curve(edge);

        GCPnts_TangentialDeflection discretizer(curve, deflection, 0.1);

        for (int j = 1; j < discretizer.NbPoints(); ++j) {
            gp_Pnt p1 = discretizer.Value(j);
            gp_Pnt p2 = discretizer.Value(j + 1);

            result.line_positions.push_back(static_cast<float>(p1.X()));
            result.line_positions.push_back(static_cast<float>(p1.Y()));
            result.line_positions.push_back(static_cast<float>(p1.Z()));
            result.line_positions.push_back(static_cast<float>(p2.X()));
            result.line_positions.push_back(static_cast<float>(p2.Y()));
            result.line_positions.push_back(static_cast<float>(p2.Z()));

            result.edge_ids.push_back(i);
            result.edge_types.push_back(0);  // Sharp by default
        }
    }

    return result;
}

WireframeMesh extract_sharp_edges(
    const OcctShape& shape,
    double angle_threshold
) {
    WireframeMesh result;

    TopTools_IndexedDataMapOfShapeListOfShape edge_face_map;
    TopExp::MapShapesAndAncestors(shape.get(), TopAbs_EDGE, TopAbs_FACE, edge_face_map);

    TopTools_IndexedMapOfShape edge_map;
    TopExp::MapShapes(shape.get(), TopAbs_EDGE, edge_map);

    for (int i = 1; i <= edge_map.Extent(); ++i) {
        TopoDS_Edge edge = TopoDS::Edge(edge_map(i));
        const TopTools_ListOfShape& faces = edge_face_map.FindFromKey(edge);

        bool is_sharp = false;

        if (faces.Extent() == 1) {
            is_sharp = true;  // Boundary edge
        } else if (faces.Extent() == 2) {
            // Check dihedral angle
            TopoDS_Face face1 = TopoDS::Face(faces.First());
            TopoDS_Face face2 = TopoDS::Face(faces.Last());

            BRepAdaptor_Surface surf1(face1);
            BRepAdaptor_Surface surf2(face2);

            // Get mid-point of edge to evaluate normals
            BRepAdaptor_Curve curve(edge);
            double mid = (curve.FirstParameter() + curve.LastParameter()) / 2;
            gp_Pnt mid_point = curve.Value(mid);

            // This is simplified - proper implementation would project point to surfaces
            if (surf1.GetType() == GeomAbs_Plane && surf2.GetType() == GeomAbs_Plane) {
                gp_Dir n1 = surf1.Plane().Axis().Direction();
                gp_Dir n2 = surf2.Plane().Axis().Direction();

                double angle = n1.Angle(n2);
                is_sharp = (angle > angle_threshold && angle < M_PI - angle_threshold);
            }
        }

        if (is_sharp) {
            BRepAdaptor_Curve curve(edge);
            GCPnts_TangentialDeflection discretizer(curve, 0.1, 0.1);

            for (int j = 1; j < discretizer.NbPoints(); ++j) {
                gp_Pnt p1 = discretizer.Value(j);
                gp_Pnt p2 = discretizer.Value(j + 1);

                result.line_positions.push_back(static_cast<float>(p1.X()));
                result.line_positions.push_back(static_cast<float>(p1.Y()));
                result.line_positions.push_back(static_cast<float>(p1.Z()));
                result.line_positions.push_back(static_cast<float>(p2.X()));
                result.line_positions.push_back(static_cast<float>(p2.Y()));
                result.line_positions.push_back(static_cast<float>(p2.Z()));

                result.edge_ids.push_back(i);
                result.edge_types.push_back(0);  // Sharp
            }
        }
    }

    return result;
}

//------------------------------------------------------------------------------
// Mesh Optimization
//------------------------------------------------------------------------------

MeshData optimize_for_rendering(const MeshData& mesh) {
    // Simple vertex cache optimization using a linear reordering
    // A full implementation would use a proper vertex cache optimizer

    MeshData result = mesh;

    // For now, just return the mesh as-is
    // A proper implementation would reorder triangles for better cache utilization

    return result;
}

MeshData merge_vertices(
    const MeshData& mesh,
    double tolerance
) {
    MeshData result;

    // Build a map of unique vertices
    std::vector<uint32_t> index_remap(mesh.vertex_count());
    std::unordered_map<std::string, uint32_t> vertex_map;

    auto vertex_key = [tolerance](float x, float y, float z) {
        int ix = static_cast<int>(x / tolerance);
        int iy = static_cast<int>(y / tolerance);
        int iz = static_cast<int>(z / tolerance);
        return std::to_string(ix) + "_" + std::to_string(iy) + "_" + std::to_string(iz);
    };

    uint32_t new_index = 0;
    for (uint32_t i = 0; i < mesh.vertex_count(); ++i) {
        float x = mesh.positions[i * 3];
        float y = mesh.positions[i * 3 + 1];
        float z = mesh.positions[i * 3 + 2];

        std::string key = vertex_key(x, y, z);
        auto it = vertex_map.find(key);

        if (it == vertex_map.end()) {
            vertex_map[key] = new_index;
            index_remap[i] = new_index;

            result.positions.push_back(x);
            result.positions.push_back(y);
            result.positions.push_back(z);

            if (!mesh.normals.empty()) {
                result.normals.push_back(mesh.normals[i * 3]);
                result.normals.push_back(mesh.normals[i * 3 + 1]);
                result.normals.push_back(mesh.normals[i * 3 + 2]);
            }

            ++new_index;
        } else {
            index_remap[i] = it->second;
        }
    }

    // Remap indices
    result.indices.reserve(mesh.indices.size());
    for (uint32_t idx : mesh.indices) {
        result.indices.push_back(index_remap[idx]);
    }

    result.face_ids = mesh.face_ids;

    return result;
}

MeshData compute_smooth_normals(
    const MeshData& mesh,
    double angle_threshold
) {
    MeshData result = mesh;
    result.normals.resize(mesh.positions.size(), 0);

    // Accumulate face normals to vertices
    for (size_t i = 0; i < mesh.indices.size(); i += 3) {
        uint32_t i0 = mesh.indices[i];
        uint32_t i1 = mesh.indices[i + 1];
        uint32_t i2 = mesh.indices[i + 2];

        // Get vertices
        float x0 = mesh.positions[i0 * 3], y0 = mesh.positions[i0 * 3 + 1], z0 = mesh.positions[i0 * 3 + 2];
        float x1 = mesh.positions[i1 * 3], y1 = mesh.positions[i1 * 3 + 1], z1 = mesh.positions[i1 * 3 + 2];
        float x2 = mesh.positions[i2 * 3], y2 = mesh.positions[i2 * 3 + 1], z2 = mesh.positions[i2 * 3 + 2];

        // Compute face normal
        float ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0;
        float ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0;

        float nx = ey1 * ez2 - ez1 * ey2;
        float ny = ez1 * ex2 - ex1 * ez2;
        float nz = ex1 * ey2 - ey1 * ex2;

        // Normalize
        float len = std::sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 1e-10) {
            nx /= len; ny /= len; nz /= len;
        }

        // Add to vertex normals
        result.normals[i0 * 3] += nx; result.normals[i0 * 3 + 1] += ny; result.normals[i0 * 3 + 2] += nz;
        result.normals[i1 * 3] += nx; result.normals[i1 * 3 + 1] += ny; result.normals[i1 * 3 + 2] += nz;
        result.normals[i2 * 3] += nx; result.normals[i2 * 3 + 1] += ny; result.normals[i2 * 3 + 2] += nz;
    }

    // Normalize all normals
    for (size_t i = 0; i < result.normals.size(); i += 3) {
        float nx = result.normals[i], ny = result.normals[i + 1], nz = result.normals[i + 2];
        float len = std::sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 1e-10) {
            result.normals[i] = nx / len;
            result.normals[i + 1] = ny / len;
            result.normals[i + 2] = nz / len;
        } else {
            result.normals[i] = 0;
            result.normals[i + 1] = 0;
            result.normals[i + 2] = 1;
        }
    }

    return result;
}

MeshData compute_flat_normals(const MeshData& mesh) {
    MeshData result;

    // Create unique vertices per triangle for flat shading
    for (size_t i = 0; i < mesh.indices.size(); i += 3) {
        uint32_t i0 = mesh.indices[i];
        uint32_t i1 = mesh.indices[i + 1];
        uint32_t i2 = mesh.indices[i + 2];

        // Get vertices
        float x0 = mesh.positions[i0 * 3], y0 = mesh.positions[i0 * 3 + 1], z0 = mesh.positions[i0 * 3 + 2];
        float x1 = mesh.positions[i1 * 3], y1 = mesh.positions[i1 * 3 + 1], z1 = mesh.positions[i1 * 3 + 2];
        float x2 = mesh.positions[i2 * 3], y2 = mesh.positions[i2 * 3 + 1], z2 = mesh.positions[i2 * 3 + 2];

        // Compute face normal
        float ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0;
        float ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0;

        float nx = ey1 * ez2 - ez1 * ey2;
        float ny = ez1 * ex2 - ex1 * ez2;
        float nz = ex1 * ey2 - ey1 * ex2;

        float len = std::sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 1e-10) {
            nx /= len; ny /= len; nz /= len;
        }

        // Add vertices with flat normal
        uint32_t base_idx = static_cast<uint32_t>(result.positions.size() / 3);

        result.positions.insert(result.positions.end(), {x0, y0, z0, x1, y1, z1, x2, y2, z2});
        result.normals.insert(result.normals.end(), {nx, ny, nz, nx, ny, nz, nx, ny, nz});
        result.indices.insert(result.indices.end(), {base_idx, base_idx + 1, base_idx + 2});

        if (i / 3 < mesh.face_ids.size()) {
            result.face_ids.push_back(mesh.face_ids[i / 3]);
        }
    }

    return result;
}

//------------------------------------------------------------------------------
// Mesh Analysis
//------------------------------------------------------------------------------

MeshStats analyze_mesh(const MeshData& mesh) {
    MeshStats stats = {};

    stats.vertices = mesh.vertex_count();
    stats.triangles = mesh.triangle_count();

    // Compute surface area
    stats.surface_area = 0;
    for (size_t i = 0; i < mesh.indices.size(); i += 3) {
        uint32_t i0 = mesh.indices[i];
        uint32_t i1 = mesh.indices[i + 1];
        uint32_t i2 = mesh.indices[i + 2];

        float x0 = mesh.positions[i0 * 3], y0 = mesh.positions[i0 * 3 + 1], z0 = mesh.positions[i0 * 3 + 2];
        float x1 = mesh.positions[i1 * 3], y1 = mesh.positions[i1 * 3 + 1], z1 = mesh.positions[i1 * 3 + 2];
        float x2 = mesh.positions[i2 * 3], y2 = mesh.positions[i2 * 3 + 1], z2 = mesh.positions[i2 * 3 + 2];

        float ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0;
        float ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0;

        float cx = ey1 * ez2 - ez1 * ey2;
        float cy = ez1 * ex2 - ex1 * ez2;
        float cz = ex1 * ey2 - ey1 * ex2;

        stats.surface_area += 0.5 * std::sqrt(cx * cx + cy * cy + cz * cz);
    }

    // Edge statistics (simplified)
    stats.min_edge_length = 1e10;
    stats.max_edge_length = 0;
    stats.avg_edge_length = 0;
    int edge_count = 0;

    for (size_t i = 0; i < mesh.indices.size(); i += 3) {
        for (int e = 0; e < 3; ++e) {
            uint32_t i0 = mesh.indices[i + e];
            uint32_t i1 = mesh.indices[i + (e + 1) % 3];

            float dx = mesh.positions[i1 * 3] - mesh.positions[i0 * 3];
            float dy = mesh.positions[i1 * 3 + 1] - mesh.positions[i0 * 3 + 1];
            float dz = mesh.positions[i1 * 3 + 2] - mesh.positions[i0 * 3 + 2];

            double len = std::sqrt(dx * dx + dy * dy + dz * dz);
            stats.min_edge_length = std::min(stats.min_edge_length, len);
            stats.max_edge_length = std::max(stats.max_edge_length, len);
            stats.avg_edge_length += len;
            ++edge_count;
        }
    }

    if (edge_count > 0) {
        stats.avg_edge_length /= edge_count;
    }
    stats.edges = edge_count / 2;  // Each edge counted twice

    return stats;
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

BoundingBox3D mesh_bounding_box(const MeshData& mesh) {
    BoundingBox3D bbox;
    bbox.min = {1e10, 1e10, 1e10};
    bbox.max = {-1e10, -1e10, -1e10};

    for (size_t i = 0; i < mesh.positions.size(); i += 3) {
        float x = mesh.positions[i];
        float y = mesh.positions[i + 1];
        float z = mesh.positions[i + 2];

        bbox.min.x = std::min(bbox.min.x, static_cast<double>(x));
        bbox.min.y = std::min(bbox.min.y, static_cast<double>(y));
        bbox.min.z = std::min(bbox.min.z, static_cast<double>(z));
        bbox.max.x = std::max(bbox.max.x, static_cast<double>(x));
        bbox.max.y = std::max(bbox.max.y, static_cast<double>(y));
        bbox.max.z = std::max(bbox.max.z, static_cast<double>(z));
    }

    return bbox;
}

MeshData flip_normals(const MeshData& mesh) {
    MeshData result = mesh;

    for (size_t i = 0; i < result.normals.size(); ++i) {
        result.normals[i] = -result.normals[i];
    }

    return result;
}

MeshData reverse_winding(const MeshData& mesh) {
    MeshData result = mesh;

    for (size_t i = 0; i < result.indices.size(); i += 3) {
        std::swap(result.indices[i + 1], result.indices[i + 2]);
    }

    return result;
}

} // namespace cadhy::mesh
