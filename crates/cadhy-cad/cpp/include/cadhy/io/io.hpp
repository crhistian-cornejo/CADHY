/**
 * @file io.hpp
 * @brief Import/Export operations (STEP, IGES, glTF, STL, OBJ, etc.)
 *
 * High-performance file I/O using OpenCASCADE data exchange modules.
 */

#pragma once

#include "../core/types.hpp"
#include "../mesh/mesh.hpp"

#include <STEPControl_Reader.hxx>
#include <STEPControl_Writer.hxx>
#include <IGESControl_Reader.hxx>
#include <IGESControl_Writer.hxx>
#include <BRepTools.hxx>
#include <RWStl.hxx>
#include <RWObj.hxx>
#include <RWGltf_CafWriter.hxx>
#include <RWPly_CafWriter.hxx>

namespace cadhy::io {

//------------------------------------------------------------------------------
// Import Options
//------------------------------------------------------------------------------

struct ImportOptions {
    double scale = 1.0;             // Scale factor
    bool heal = true;               // Run shape healing
    bool sew = true;                // Sew faces
    double sewing_tolerance = 1e-6;
    bool compute_normals = true;
};

struct STEPImportOptions : ImportOptions {
    bool read_colors = true;
    bool read_names = true;
    bool read_layers = true;
    bool read_assembly = true;
};

struct IGESImportOptions : ImportOptions {
    bool read_colors = true;
    bool read_names = true;
    bool promote_to_solid = true;
};

//------------------------------------------------------------------------------
// Export Options
//------------------------------------------------------------------------------

struct ExportOptions {
    double scale = 1.0;
    double tolerance = 1e-7;
};

struct STEPExportOptions : ExportOptions {
    std::string author;
    std::string organization;
    std::string schema = "AP214";  // AP203, AP214, AP242
    bool write_colors = true;
    bool write_names = true;
    bool write_assembly = true;
};

struct IGESExportOptions : ExportOptions {
    int brep_mode = 0;  // 0=faces, 1=brep
    bool write_colors = true;
};

struct GLTFExportOptions {
    double deflection = 0.1;
    bool binary = true;            // .glb vs .gltf
    bool embed_textures = true;
    bool write_normals = true;
    bool write_uvs = true;
    bool draco_compression = false;
    int draco_quality = 7;
};

struct STLExportOptions {
    double deflection = 0.1;
    bool binary = true;
    bool relative_deflection = false;
};

struct OBJExportOptions {
    double deflection = 0.1;
    bool write_normals = true;
    bool write_uvs = true;
    bool write_materials = true;
};

struct PLYExportOptions {
    double deflection = 0.1;
    bool binary = true;
    bool write_colors = true;
    bool write_normals = true;
};

//------------------------------------------------------------------------------
// STEP Import/Export
//------------------------------------------------------------------------------

/// Import STEP file
std::unique_ptr<OcctShape> import_step(const std::string& filename);

/// Import STEP with options
std::unique_ptr<OcctShape> import_step_options(
    const std::string& filename,
    const STEPImportOptions& options
);

/// Import STEP from memory
std::unique_ptr<OcctShape> import_step_memory(
    const std::vector<uint8_t>& data,
    const STEPImportOptions& options = {}
);

/// Export shape to STEP file
bool export_step(
    const OcctShape& shape,
    const std::string& filename
);

/// Export with options
bool export_step_options(
    const OcctShape& shape,
    const std::string& filename,
    const STEPExportOptions& options
);

/// Export to STEP in memory
std::vector<uint8_t> export_step_memory(
    const OcctShape& shape,
    const STEPExportOptions& options = {}
);

//------------------------------------------------------------------------------
// IGES Import/Export
//------------------------------------------------------------------------------

/// Import IGES file
std::unique_ptr<OcctShape> import_iges(const std::string& filename);

/// Import IGES with options
std::unique_ptr<OcctShape> import_iges_options(
    const std::string& filename,
    const IGESImportOptions& options
);

/// Export shape to IGES file
bool export_iges(
    const OcctShape& shape,
    const std::string& filename
);

/// Export with options
bool export_iges_options(
    const OcctShape& shape,
    const std::string& filename,
    const IGESExportOptions& options
);

//------------------------------------------------------------------------------
// BREP Import/Export (Native OpenCASCADE)
//------------------------------------------------------------------------------

/// Import BREP file
std::unique_ptr<OcctShape> import_brep(const std::string& filename);

/// Export to BREP file
bool export_brep(
    const OcctShape& shape,
    const std::string& filename
);

/// Serialize shape to string
std::string shape_to_string(const OcctShape& shape);

/// Deserialize shape from string
std::unique_ptr<OcctShape> shape_from_string(const std::string& data);

//------------------------------------------------------------------------------
// glTF Export
//------------------------------------------------------------------------------

/// Export to glTF/glb file
bool export_gltf(
    const OcctShape& shape,
    const std::string& filename,
    const GLTFExportOptions& options = {}
);

/// Export mesh data to glTF
bool export_mesh_gltf(
    const mesh::MeshData& mesh,
    const std::string& filename,
    bool binary = true
);

//------------------------------------------------------------------------------
// STL Import/Export
//------------------------------------------------------------------------------

/// Import STL file
std::unique_ptr<OcctShape> import_stl(const std::string& filename);

/// Export to STL file
bool export_stl(
    const OcctShape& shape,
    const std::string& filename,
    const STLExportOptions& options = {}
);

/// Export mesh to STL
bool export_mesh_stl(
    const mesh::MeshData& mesh,
    const std::string& filename,
    bool binary = true
);

//------------------------------------------------------------------------------
// OBJ Export
//------------------------------------------------------------------------------

/// Export to OBJ file
bool export_obj(
    const OcctShape& shape,
    const std::string& filename,
    const OBJExportOptions& options = {}
);

/// Export mesh to OBJ
bool export_mesh_obj(
    const mesh::MeshData& mesh,
    const std::string& filename
);

//------------------------------------------------------------------------------
// PLY Export
//------------------------------------------------------------------------------

/// Export to PLY file
bool export_ply(
    const OcctShape& shape,
    const std::string& filename,
    const PLYExportOptions& options = {}
);

/// Export mesh to PLY
bool export_mesh_ply(
    const mesh::MeshData& mesh,
    const std::string& filename,
    bool binary = true
);

//------------------------------------------------------------------------------
// Format Detection
//------------------------------------------------------------------------------

/// Detected file format
enum class FileFormat {
    Unknown,
    STEP,
    IGES,
    BREP,
    STL,
    OBJ,
    GLTF,
    GLB,
    PLY,
    DXF,
    IFC
};

/// Detect format from filename
FileFormat detect_format(const std::string& filename);

/// Detect format from file content (magic bytes)
FileFormat detect_format_content(const std::vector<uint8_t>& data);

//------------------------------------------------------------------------------
// Universal Import/Export
//------------------------------------------------------------------------------

/// Import any supported format
std::unique_ptr<OcctShape> import_file(
    const std::string& filename,
    const ImportOptions& options = {}
);

/// Export to any supported format (based on extension)
bool export_file(
    const OcctShape& shape,
    const std::string& filename,
    const ExportOptions& options = {}
);

//------------------------------------------------------------------------------
// Utility Functions
//------------------------------------------------------------------------------

/// Get list of supported import formats
std::vector<std::string> supported_import_formats();

/// Get list of supported export formats
std::vector<std::string> supported_export_formats();

/// Check if format is supported for import
bool can_import(FileFormat format);

/// Check if format is supported for export
bool can_export(FileFormat format);

} // namespace cadhy::io
