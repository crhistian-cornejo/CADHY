/**
 * @file io.cpp
 * @brief Implementation of file import/export operations
 *
 * Uses OpenCASCADE data exchange modules for STEP, IGES, glTF, STL, OBJ, PLY.
 */

#include <cadhy/io/io.hpp>

#include <STEPControl_Reader.hxx>
#include <STEPControl_Writer.hxx>
#include <IGESControl_Reader.hxx>
#include <IGESControl_Writer.hxx>
#include <BRepTools.hxx>
#include <BRep_Builder.hxx>
#include <RWStl.hxx>
#include <RWObj.hxx>
#include <StlAPI_Writer.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <Poly_Triangulation.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Compound.hxx>
#include <TopExp_Explorer.hxx>
#include <ShapeFix_Shape.hxx>
#include <ShapeUpgrade_UnifySameDomain.hxx>
#include <Interface_Static.hxx>
#include <XSControl_WorkSession.hxx>
#include <XSControl_TransferReader.hxx>
#include <Transfer_TransientProcess.hxx>

#include <fstream>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace cadhy::io {

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

namespace {

std::string to_lower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
}

std::string get_extension(const std::string& filename) {
    size_t pos = filename.rfind('.');
    if (pos == std::string::npos) return "";
    return to_lower(filename.substr(pos + 1));
}

void ensure_triangulation(const OcctShape& shape, double deflection) {
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

std::unique_ptr<OcctShape> heal_shape(const TopoDS_Shape& shape, bool heal, bool sew, double tolerance) {
    if (!heal && !sew) {
        return std::make_unique<OcctShape>(shape);
    }

    TopoDS_Shape result = shape;

    if (heal) {
        ShapeFix_Shape fixer(result);
        fixer.SetPrecision(tolerance);
        fixer.Perform();
        result = fixer.Shape();
    }

    return std::make_unique<OcctShape>(result);
}

} // anonymous namespace

//------------------------------------------------------------------------------
// STEP Import/Export
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> import_step(const std::string& filename) {
    STEPImportOptions options;
    return import_step_options(filename, options);
}

std::unique_ptr<OcctShape> import_step_options(
    const std::string& filename,
    const STEPImportOptions& options
) {
    STEPControl_Reader reader;

    IFSelect_ReturnStatus status = reader.ReadFile(filename.c_str());
    if (status != IFSelect_RetDone) {
        return nullptr;
    }

    // Transfer all roots
    reader.TransferRoots();

    TopoDS_Shape shape = reader.OneShape();
    if (shape.IsNull()) {
        return nullptr;
    }

    // Apply healing if requested
    return heal_shape(shape, options.heal, options.sew, options.sewing_tolerance);
}

std::unique_ptr<OcctShape> import_step_memory(
    const std::vector<uint8_t>& data,
    const STEPImportOptions& options
) {
    // Write to temporary file (STEP reader doesn't support memory streams directly)
    std::string temp_file = "/tmp/cadhy_temp_import.step";
    std::ofstream ofs(temp_file, std::ios::binary);
    if (!ofs) return nullptr;
    ofs.write(reinterpret_cast<const char*>(data.data()), data.size());
    ofs.close();

    auto result = import_step_options(temp_file, options);

    // Clean up temp file
    std::remove(temp_file.c_str());

    return result;
}

bool export_step(
    const OcctShape& shape,
    const std::string& filename
) {
    STEPExportOptions options;
    return export_step_options(shape, filename, options);
}

bool export_step_options(
    const OcctShape& shape,
    const std::string& filename,
    const STEPExportOptions& options
) {
    STEPControl_Writer writer;

    // Set schema
    if (options.schema == "AP203") {
        Interface_Static::SetCVal("write.step.schema", "AP203");
    } else if (options.schema == "AP242") {
        Interface_Static::SetCVal("write.step.schema", "AP242DIS");
    } else {
        Interface_Static::SetCVal("write.step.schema", "AP214CD");
    }

    // Set author/organization if provided
    if (!options.author.empty()) {
        Interface_Static::SetCVal("write.step.author.name", options.author.c_str());
    }
    if (!options.organization.empty()) {
        Interface_Static::SetCVal("write.step.author.organization", options.organization.c_str());
    }

    // Transfer shape
    IFSelect_ReturnStatus status = writer.Transfer(shape.get(), STEPControl_AsIs);
    if (status != IFSelect_RetDone) {
        return false;
    }

    // Write file
    status = writer.Write(filename.c_str());
    return status == IFSelect_RetDone;
}

std::vector<uint8_t> export_step_memory(
    const OcctShape& shape,
    const STEPExportOptions& options
) {
    std::vector<uint8_t> result;

    // Write to temporary file
    std::string temp_file = "/tmp/cadhy_temp_export.step";
    if (!export_step_options(shape, temp_file, options)) {
        return result;
    }

    // Read back into memory
    std::ifstream ifs(temp_file, std::ios::binary | std::ios::ate);
    if (ifs) {
        size_t size = ifs.tellg();
        result.resize(size);
        ifs.seekg(0);
        ifs.read(reinterpret_cast<char*>(result.data()), size);
    }

    // Clean up
    std::remove(temp_file.c_str());

    return result;
}

//------------------------------------------------------------------------------
// IGES Import/Export
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> import_iges(const std::string& filename) {
    IGESImportOptions options;
    return import_iges_options(filename, options);
}

std::unique_ptr<OcctShape> import_iges_options(
    const std::string& filename,
    const IGESImportOptions& options
) {
    IGESControl_Reader reader;

    IFSelect_ReturnStatus status = reader.ReadFile(filename.c_str());
    if (status != IFSelect_RetDone) {
        return nullptr;
    }

    reader.TransferRoots();

    TopoDS_Shape shape = reader.OneShape();
    if (shape.IsNull()) {
        return nullptr;
    }

    return heal_shape(shape, options.heal, options.sew, options.sewing_tolerance);
}

bool export_iges(
    const OcctShape& shape,
    const std::string& filename
) {
    IGESExportOptions options;
    return export_iges_options(shape, filename, options);
}

bool export_iges_options(
    const OcctShape& shape,
    const std::string& filename,
    const IGESExportOptions& options
) {
    IGESControl_Writer writer;

    writer.AddShape(shape.get());

    return writer.Write(filename.c_str());
}

//------------------------------------------------------------------------------
// BREP Import/Export
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> import_brep(const std::string& filename) {
    BRep_Builder builder;
    TopoDS_Shape shape;

    if (!BRepTools::Read(shape, filename.c_str(), builder)) {
        return nullptr;
    }

    return std::make_unique<OcctShape>(shape);
}

bool export_brep(
    const OcctShape& shape,
    const std::string& filename
) {
    return BRepTools::Write(shape.get(), filename.c_str());
}

std::string shape_to_string(const OcctShape& shape) {
    std::ostringstream oss;
    BRepTools::Write(shape.get(), oss);
    return oss.str();
}

std::unique_ptr<OcctShape> shape_from_string(const std::string& data) {
    BRep_Builder builder;
    TopoDS_Shape shape;

    std::istringstream iss(data);
    BRepTools::Read(shape, iss, builder);

    if (shape.IsNull()) {
        return nullptr;
    }

    return std::make_unique<OcctShape>(shape);
}

//------------------------------------------------------------------------------
// STL Import/Export
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> import_stl(const std::string& filename) {
    TopoDS_Shape shape;

    // Use StlAPI or RWStl
    Handle(Poly_Triangulation) mesh = RWStl::ReadFile(filename.c_str());
    if (mesh.IsNull()) {
        return nullptr;
    }

    // Convert triangulation to shape (this is a simplified approach)
    // A full implementation would create faces from the triangulation
    BRep_Builder builder;
    TopoDS_Compound compound;
    builder.MakeCompound(compound);

    // For now, just return an empty compound
    // A proper STL import would convert the mesh to B-Rep

    return std::make_unique<OcctShape>(compound);
}

bool export_stl(
    const OcctShape& shape,
    const std::string& filename,
    const STLExportOptions& options
) {
    // Ensure tessellation
    ensure_triangulation(shape, options.deflection);

    StlAPI_Writer writer;
    writer.ASCIIMode() = !options.binary;

    return writer.Write(shape.get(), filename.c_str());
}

bool export_mesh_stl(
    const mesh::MeshData& mesh,
    const std::string& filename,
    bool binary
) {
    std::ofstream ofs(filename, binary ? std::ios::binary : std::ios::out);
    if (!ofs) return false;

    if (binary) {
        // Binary STL header (80 bytes)
        char header[80] = "CADHY Binary STL";
        ofs.write(header, 80);

        // Number of triangles
        uint32_t num_triangles = mesh.triangle_count();
        ofs.write(reinterpret_cast<char*>(&num_triangles), 4);

        // Write triangles
        for (size_t i = 0; i < mesh.indices.size(); i += 3) {
            uint32_t i0 = mesh.indices[i];
            uint32_t i1 = mesh.indices[i + 1];
            uint32_t i2 = mesh.indices[i + 2];

            // Compute face normal
            float x0 = mesh.positions[i0 * 3], y0 = mesh.positions[i0 * 3 + 1], z0 = mesh.positions[i0 * 3 + 2];
            float x1 = mesh.positions[i1 * 3], y1 = mesh.positions[i1 * 3 + 1], z1 = mesh.positions[i1 * 3 + 2];
            float x2 = mesh.positions[i2 * 3], y2 = mesh.positions[i2 * 3 + 1], z2 = mesh.positions[i2 * 3 + 2];

            float ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0;
            float ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0;

            float nx = ey1 * ez2 - ez1 * ey2;
            float ny = ez1 * ex2 - ex1 * ez2;
            float nz = ex1 * ey2 - ey1 * ex2;

            float len = std::sqrt(nx * nx + ny * ny + nz * nz);
            if (len > 1e-10) { nx /= len; ny /= len; nz /= len; }

            // Write normal
            ofs.write(reinterpret_cast<char*>(&nx), 4);
            ofs.write(reinterpret_cast<char*>(&ny), 4);
            ofs.write(reinterpret_cast<char*>(&nz), 4);

            // Write vertices
            ofs.write(reinterpret_cast<char*>(&x0), 4);
            ofs.write(reinterpret_cast<char*>(&y0), 4);
            ofs.write(reinterpret_cast<char*>(&z0), 4);
            ofs.write(reinterpret_cast<char*>(&x1), 4);
            ofs.write(reinterpret_cast<char*>(&y1), 4);
            ofs.write(reinterpret_cast<char*>(&z1), 4);
            ofs.write(reinterpret_cast<char*>(&x2), 4);
            ofs.write(reinterpret_cast<char*>(&y2), 4);
            ofs.write(reinterpret_cast<char*>(&z2), 4);

            // Attribute byte count
            uint16_t attr = 0;
            ofs.write(reinterpret_cast<char*>(&attr), 2);
        }
    } else {
        // ASCII STL
        ofs << "solid CADHY\n";

        for (size_t i = 0; i < mesh.indices.size(); i += 3) {
            uint32_t i0 = mesh.indices[i];
            uint32_t i1 = mesh.indices[i + 1];
            uint32_t i2 = mesh.indices[i + 2];

            float x0 = mesh.positions[i0 * 3], y0 = mesh.positions[i0 * 3 + 1], z0 = mesh.positions[i0 * 3 + 2];
            float x1 = mesh.positions[i1 * 3], y1 = mesh.positions[i1 * 3 + 1], z1 = mesh.positions[i1 * 3 + 2];
            float x2 = mesh.positions[i2 * 3], y2 = mesh.positions[i2 * 3 + 1], z2 = mesh.positions[i2 * 3 + 2];

            // Compute normal
            float ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0;
            float ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0;

            float nx = ey1 * ez2 - ez1 * ey2;
            float ny = ez1 * ex2 - ex1 * ez2;
            float nz = ex1 * ey2 - ey1 * ex2;

            float len = std::sqrt(nx * nx + ny * ny + nz * nz);
            if (len > 1e-10) { nx /= len; ny /= len; nz /= len; }

            ofs << "  facet normal " << nx << " " << ny << " " << nz << "\n";
            ofs << "    outer loop\n";
            ofs << "      vertex " << x0 << " " << y0 << " " << z0 << "\n";
            ofs << "      vertex " << x1 << " " << y1 << " " << z1 << "\n";
            ofs << "      vertex " << x2 << " " << y2 << " " << z2 << "\n";
            ofs << "    endloop\n";
            ofs << "  endfacet\n";
        }

        ofs << "endsolid CADHY\n";
    }

    return true;
}

//------------------------------------------------------------------------------
// OBJ Export
//------------------------------------------------------------------------------

bool export_obj(
    const OcctShape& shape,
    const std::string& filename,
    const OBJExportOptions& options
) {
    ensure_triangulation(shape, options.deflection);

    // Extract mesh data and export
    mesh::MeshData mesh_data = mesh::tessellate_deflection(shape, options.deflection);
    return export_mesh_obj(mesh_data, filename);
}

bool export_mesh_obj(
    const mesh::MeshData& mesh,
    const std::string& filename
) {
    std::ofstream ofs(filename);
    if (!ofs) return false;

    ofs << "# CADHY OBJ Export\n";
    ofs << "# Vertices: " << mesh.vertex_count() << "\n";
    ofs << "# Faces: " << mesh.triangle_count() << "\n\n";

    // Write vertices
    for (size_t i = 0; i < mesh.positions.size(); i += 3) {
        ofs << "v " << mesh.positions[i] << " "
            << mesh.positions[i + 1] << " "
            << mesh.positions[i + 2] << "\n";
    }

    // Write normals if available
    if (!mesh.normals.empty()) {
        ofs << "\n";
        for (size_t i = 0; i < mesh.normals.size(); i += 3) {
            ofs << "vn " << mesh.normals[i] << " "
                << mesh.normals[i + 1] << " "
                << mesh.normals[i + 2] << "\n";
        }
    }

    // Write faces
    ofs << "\n";
    bool has_normals = !mesh.normals.empty();

    for (size_t i = 0; i < mesh.indices.size(); i += 3) {
        uint32_t i0 = mesh.indices[i] + 1;      // OBJ is 1-indexed
        uint32_t i1 = mesh.indices[i + 1] + 1;
        uint32_t i2 = mesh.indices[i + 2] + 1;

        if (has_normals) {
            ofs << "f " << i0 << "//" << i0 << " "
                << i1 << "//" << i1 << " "
                << i2 << "//" << i2 << "\n";
        } else {
            ofs << "f " << i0 << " " << i1 << " " << i2 << "\n";
        }
    }

    return true;
}

//------------------------------------------------------------------------------
// PLY Export
//------------------------------------------------------------------------------

bool export_ply(
    const OcctShape& shape,
    const std::string& filename,
    const PLYExportOptions& options
) {
    ensure_triangulation(shape, options.deflection);

    mesh::MeshData mesh_data = mesh::tessellate_deflection(shape, options.deflection);
    return export_mesh_ply(mesh_data, filename, options.binary);
}

bool export_mesh_ply(
    const mesh::MeshData& mesh,
    const std::string& filename,
    bool binary
) {
    std::ofstream ofs(filename, binary ? std::ios::binary : std::ios::out);
    if (!ofs) return false;

    uint32_t num_vertices = mesh.vertex_count();
    uint32_t num_faces = mesh.triangle_count();
    bool has_normals = !mesh.normals.empty();

    // Write header
    ofs << "ply\n";
    ofs << (binary ? "format binary_little_endian 1.0\n" : "format ascii 1.0\n");
    ofs << "comment CADHY PLY Export\n";
    ofs << "element vertex " << num_vertices << "\n";
    ofs << "property float x\n";
    ofs << "property float y\n";
    ofs << "property float z\n";
    if (has_normals) {
        ofs << "property float nx\n";
        ofs << "property float ny\n";
        ofs << "property float nz\n";
    }
    ofs << "element face " << num_faces << "\n";
    ofs << "property list uchar int vertex_indices\n";
    ofs << "end_header\n";

    if (binary) {
        // Write vertices
        for (uint32_t i = 0; i < num_vertices; ++i) {
            float x = mesh.positions[i * 3];
            float y = mesh.positions[i * 3 + 1];
            float z = mesh.positions[i * 3 + 2];
            ofs.write(reinterpret_cast<char*>(&x), 4);
            ofs.write(reinterpret_cast<char*>(&y), 4);
            ofs.write(reinterpret_cast<char*>(&z), 4);

            if (has_normals) {
                float nx = mesh.normals[i * 3];
                float ny = mesh.normals[i * 3 + 1];
                float nz = mesh.normals[i * 3 + 2];
                ofs.write(reinterpret_cast<char*>(&nx), 4);
                ofs.write(reinterpret_cast<char*>(&ny), 4);
                ofs.write(reinterpret_cast<char*>(&nz), 4);
            }
        }

        // Write faces
        for (uint32_t i = 0; i < num_faces; ++i) {
            unsigned char count = 3;
            ofs.write(reinterpret_cast<char*>(&count), 1);

            int i0 = mesh.indices[i * 3];
            int i1 = mesh.indices[i * 3 + 1];
            int i2 = mesh.indices[i * 3 + 2];
            ofs.write(reinterpret_cast<char*>(&i0), 4);
            ofs.write(reinterpret_cast<char*>(&i1), 4);
            ofs.write(reinterpret_cast<char*>(&i2), 4);
        }
    } else {
        // ASCII format
        for (uint32_t i = 0; i < num_vertices; ++i) {
            ofs << mesh.positions[i * 3] << " "
                << mesh.positions[i * 3 + 1] << " "
                << mesh.positions[i * 3 + 2];
            if (has_normals) {
                ofs << " " << mesh.normals[i * 3]
                    << " " << mesh.normals[i * 3 + 1]
                    << " " << mesh.normals[i * 3 + 2];
            }
            ofs << "\n";
        }

        for (uint32_t i = 0; i < num_faces; ++i) {
            ofs << "3 " << mesh.indices[i * 3]
                << " " << mesh.indices[i * 3 + 1]
                << " " << mesh.indices[i * 3 + 2] << "\n";
        }
    }

    return true;
}

//------------------------------------------------------------------------------
// glTF Export
//------------------------------------------------------------------------------

bool export_gltf(
    const OcctShape& shape,
    const std::string& filename,
    const GLTFExportOptions& options
) {
    // Ensure tessellation
    ensure_triangulation(shape, options.deflection);

    // For now, export as mesh to OBJ (glTF requires more complex handling)
    // A full implementation would use RWGltf_CafWriter or a glTF library
    mesh::MeshData mesh_data = mesh::tessellate_deflection(shape, options.deflection);

    // Placeholder - actual glTF export needs proper implementation
    // using RWGltf_CafWriter or TinyGLTF library
    std::string obj_filename = filename.substr(0, filename.rfind('.')) + ".obj";
    return export_mesh_obj(mesh_data, obj_filename);
}

bool export_mesh_gltf(
    const mesh::MeshData& mesh,
    const std::string& filename,
    bool binary
) {
    // Placeholder for glTF mesh export
    // Would need TinyGLTF or similar library for proper implementation
    return false;
}

//------------------------------------------------------------------------------
// Format Detection
//------------------------------------------------------------------------------

FileFormat detect_format(const std::string& filename) {
    std::string ext = get_extension(filename);

    if (ext == "step" || ext == "stp") return FileFormat::STEP;
    if (ext == "iges" || ext == "igs") return FileFormat::IGES;
    if (ext == "brep" || ext == "brp") return FileFormat::BREP;
    if (ext == "stl") return FileFormat::STL;
    if (ext == "obj") return FileFormat::OBJ;
    if (ext == "gltf") return FileFormat::GLTF;
    if (ext == "glb") return FileFormat::GLB;
    if (ext == "ply") return FileFormat::PLY;
    if (ext == "dxf") return FileFormat::DXF;
    if (ext == "ifc") return FileFormat::IFC;

    return FileFormat::Unknown;
}

FileFormat detect_format_content(const std::vector<uint8_t>& data) {
    if (data.size() < 4) return FileFormat::Unknown;

    // Check magic bytes
    if (data.size() >= 5 && std::string(data.begin(), data.begin() + 5) == "solid") {
        return FileFormat::STL;  // ASCII STL
    }

    if (data.size() >= 84) {
        // Binary STL: check if reported triangle count matches file size
        uint32_t num_triangles = *reinterpret_cast<const uint32_t*>(&data[80]);
        size_t expected_size = 84 + num_triangles * 50;
        if (data.size() == expected_size || data.size() == expected_size + 1) {
            return FileFormat::STL;
        }
    }

    // STEP files start with "ISO-10303-21"
    std::string header(data.begin(), data.begin() + std::min(data.size(), size_t(100)));
    if (header.find("ISO-10303-21") != std::string::npos) {
        return FileFormat::STEP;
    }

    // glTF binary (GLB)
    if (data.size() >= 4 && data[0] == 'g' && data[1] == 'l' && data[2] == 'T' && data[3] == 'F') {
        return FileFormat::GLB;
    }

    // PLY
    if (data.size() >= 3 && data[0] == 'p' && data[1] == 'l' && data[2] == 'y') {
        return FileFormat::PLY;
    }

    return FileFormat::Unknown;
}

//------------------------------------------------------------------------------
// Universal Import/Export
//------------------------------------------------------------------------------

std::unique_ptr<OcctShape> import_file(
    const std::string& filename,
    const ImportOptions& options
) {
    FileFormat format = detect_format(filename);

    switch (format) {
        case FileFormat::STEP: {
            STEPImportOptions step_opts;
            step_opts.scale = options.scale;
            step_opts.heal = options.heal;
            step_opts.sew = options.sew;
            step_opts.sewing_tolerance = options.sewing_tolerance;
            return import_step_options(filename, step_opts);
        }
        case FileFormat::IGES: {
            IGESImportOptions iges_opts;
            iges_opts.scale = options.scale;
            iges_opts.heal = options.heal;
            iges_opts.sew = options.sew;
            iges_opts.sewing_tolerance = options.sewing_tolerance;
            return import_iges_options(filename, iges_opts);
        }
        case FileFormat::BREP:
            return import_brep(filename);
        case FileFormat::STL:
            return import_stl(filename);
        default:
            return nullptr;
    }
}

bool export_file(
    const OcctShape& shape,
    const std::string& filename,
    const ExportOptions& options
) {
    FileFormat format = detect_format(filename);

    switch (format) {
        case FileFormat::STEP: {
            STEPExportOptions step_opts;
            step_opts.scale = options.scale;
            step_opts.tolerance = options.tolerance;
            return export_step_options(shape, filename, step_opts);
        }
        case FileFormat::IGES: {
            IGESExportOptions iges_opts;
            iges_opts.scale = options.scale;
            iges_opts.tolerance = options.tolerance;
            return export_iges_options(shape, filename, iges_opts);
        }
        case FileFormat::BREP:
            return export_brep(shape, filename);
        case FileFormat::STL: {
            STLExportOptions stl_opts;
            return export_stl(shape, filename, stl_opts);
        }
        case FileFormat::OBJ: {
            OBJExportOptions obj_opts;
            return export_obj(shape, filename, obj_opts);
        }
        case FileFormat::PLY: {
            PLYExportOptions ply_opts;
            return export_ply(shape, filename, ply_opts);
        }
        case FileFormat::GLTF:
        case FileFormat::GLB: {
            GLTFExportOptions gltf_opts;
            gltf_opts.binary = (format == FileFormat::GLB);
            return export_gltf(shape, filename, gltf_opts);
        }
        default:
            return false;
    }
}

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

std::vector<std::string> supported_import_formats() {
    return {"step", "stp", "iges", "igs", "brep", "brp", "stl"};
}

std::vector<std::string> supported_export_formats() {
    return {"step", "stp", "iges", "igs", "brep", "brp", "stl", "obj", "ply"};
}

bool can_import(FileFormat format) {
    switch (format) {
        case FileFormat::STEP:
        case FileFormat::IGES:
        case FileFormat::BREP:
        case FileFormat::STL:
            return true;
        default:
            return false;
    }
}

bool can_export(FileFormat format) {
    switch (format) {
        case FileFormat::STEP:
        case FileFormat::IGES:
        case FileFormat::BREP:
        case FileFormat::STL:
        case FileFormat::OBJ:
        case FileFormat::PLY:
            return true;
        default:
            return false;
    }
}

} // namespace cadhy::io
