//! 3D Geometry generation commands for channels
//!
//! Commands for generating 3D meshes from hydraulic channel definitions
//! and exporting to various formats (STL, STEP).

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Import from cadhy crates
use cadhy_hydraulics::{
    Alignment,
    BaffleBlockInput,
    ChuteBlockInput,
    // Chute types
    ChuteGeometryInput,
    ChuteTypeInput,
    Corridor,
    CorridorGenerator,
    EndSillInput,
    Point3,
    SectionType,
    StationSection,
    StillingBasinInput,
    StillingBasinTypeInput,
    TransitionGeometryInput,
    TransitionType,
};

/// Section definition from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ChannelSectionDef {
    Rectangular {
        width: f64,
        depth: f64,
    },
    Trapezoidal {
        bottom_width: f64,
        depth: f64,
        side_slope: f64,
    },
    Triangular {
        depth: f64,
        side_slope: f64,
    },
}

/// Channel definition from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelGeometryInput {
    /// Channel name
    pub name: String,
    /// Section definition
    pub section: ChannelSectionDef,
    /// Manning's n coefficient
    pub manning_n: f64,
    /// Channel bed slope (m/m)
    pub slope: f64,
    /// Channel length (m)
    pub length: f64,
    /// Starting invert elevation (m) - defaults to 0
    #[serde(default)]
    pub start_elevation: f64,
    /// Mesh resolution (m) - distance between cross-sections
    #[serde(default = "default_resolution")]
    pub resolution: f64,
    /// Wall thickness (m) - defaults to 0.15
    #[serde(default = "default_wall_thickness")]
    pub wall_thickness: f64,
    /// Floor thickness (m) - defaults to 0.15
    #[serde(default = "default_floor_thickness")]
    pub floor_thickness: f64,
}

fn default_wall_thickness() -> f64 {
    0.15 // 15 cm default wall thickness
}

fn default_floor_thickness() -> f64 {
    0.15 // 15 cm default floor thickness
}

fn default_resolution() -> f64 {
    1.0 // 1 meter default resolution
}

fn default_depth() -> f64 {
    1.5 // 1.5 meter default channel depth
}

fn default_width() -> f64 {
    2.0 // 2 meter default channel width
}

/// 3D Mesh result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshResult {
    /// Vertices as flat array [x1, y1, z1, x2, y2, z2, ...]
    pub vertices: Vec<f64>,
    /// Triangle indices as flat array [i1, i2, i3, i4, i5, i6, ...]
    pub indices: Vec<u32>,
    /// Normals as flat array (optional)
    pub normals: Option<Vec<f64>>,
    /// Number of vertices
    pub vertex_count: usize,
    /// Number of triangles
    pub triangle_count: usize,
}

/// Generate 3D mesh for a channel
#[tauri::command]
pub fn generate_channel_mesh(input: ChannelGeometryInput) -> Result<MeshResult, String> {
    // Convert section definition to cadhy_hydraulics SectionType
    // Use actual depth values from frontend
    let section_type = match input.section {
        ChannelSectionDef::Rectangular { width, depth } => SectionType::rectangular(width, depth),
        ChannelSectionDef::Trapezoidal {
            bottom_width,
            depth,
            side_slope,
        } => SectionType::trapezoidal(bottom_width, depth, side_slope),
        ChannelSectionDef::Triangular { depth, side_slope } => SectionType::Triangular {
            depth,
            left_slope: side_slope,
            right_slope: side_slope,
        },
    };

    // Create alignment using the straight helper - channel goes in X direction
    // The alignment is HORIZONTAL - slope only affects the BED ELEVATION, not the geometry
    // This is the correct hydraulic behavior: cross-sections stay perpendicular to flow
    let start = Point3::new(0.0, 0.0, 0.0);
    let end = Point3::new(input.length, 0.0, 0.0); // Z=0 for horizontal alignment

    let mut alignment = Alignment::straight(&input.name, start, end)
        .map_err(|e| format!("Failed to create alignment: {}", e))?;

    // Set start elevation and slope on the alignment
    // The alignment's elevation_at() method will calculate correct bed elevations
    // Formula: elevation = start_elevation + station * base_slope (negative slope = descending)
    alignment.start_elevation = input.start_elevation;
    alignment.set_base_slope(-input.slope); // Negative because positive slope = descending channel

    // Create corridor
    let mut corridor = Corridor::new(&input.name, alignment);

    // Add section at start using the builder pattern with wall/floor thickness
    let start_section = StationSection::new(0.0, section_type.clone())
        .with_manning(input.manning_n)
        .with_wall_thickness(input.wall_thickness)
        .with_floor_thickness(input.floor_thickness);
    corridor.add_section(start_section);

    // Add section at end (same section for uniform channel)
    let end_section = StationSection::new(input.length, section_type)
        .with_manning(input.manning_n)
        .with_wall_thickness(input.wall_thickness)
        .with_floor_thickness(input.floor_thickness);
    corridor.add_section(end_section);

    // Generate mesh
    let result = CorridorGenerator::generate(&corridor, input.resolution)
        .map_err(|e| format!("Failed to generate mesh: {}", e))?;

    // Flatten vertices
    let vertices: Vec<f64> = result
        .vertices
        .iter()
        .flat_map(|v| vec![v[0], v[1], v[2]])
        .collect();

    // Flatten normals
    let normals: Option<Vec<f64>> = result
        .normals
        .map(|n| n.iter().flat_map(|v| vec![v[0], v[1], v[2]]).collect());

    let vertex_count = result.vertices.len();
    let triangle_count = result.indices.len() / 3;

    Ok(MeshResult {
        vertices,
        indices: result.indices,
        normals,
        vertex_count,
        triangle_count,
    })
}

/// Export format options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Stl,
    Obj,
    Step,
}

/// Export mesh to file
#[tauri::command]
pub async fn export_mesh_to_file(
    mesh: MeshResult,
    file_path: String,
    format: ExportFormat,
) -> Result<String, String> {
    let path = PathBuf::from(&file_path);

    match format {
        ExportFormat::Stl => {
            export_to_stl(&mesh, &path)?;
        }
        ExportFormat::Obj => {
            export_to_obj(&mesh, &path)?;
        }
        ExportFormat::Step => {
            return Err("STEP export requires OpenCASCADE integration (coming soon)".to_string());
        }
    }

    Ok(file_path)
}

/// Export mesh to STL format (ASCII)
fn export_to_stl(mesh: &MeshResult, path: &PathBuf) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    let mut file = File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    // Write ASCII STL header
    writeln!(file, "solid channel").map_err(|e| format!("Write error: {}", e))?;

    // Write triangles
    let num_triangles = mesh.indices.len() / 3;
    for i in 0..num_triangles {
        let i0 = mesh.indices[i * 3] as usize;
        let i1 = mesh.indices[i * 3 + 1] as usize;
        let i2 = mesh.indices[i * 3 + 2] as usize;

        // Get vertices
        let v0 = [
            mesh.vertices[i0 * 3],
            mesh.vertices[i0 * 3 + 1],
            mesh.vertices[i0 * 3 + 2],
        ];
        let v1 = [
            mesh.vertices[i1 * 3],
            mesh.vertices[i1 * 3 + 1],
            mesh.vertices[i1 * 3 + 2],
        ];
        let v2 = [
            mesh.vertices[i2 * 3],
            mesh.vertices[i2 * 3 + 1],
            mesh.vertices[i2 * 3 + 2],
        ];

        // Calculate normal
        let edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        let edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        let normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0],
        ];
        let len = (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();
        let normal = if len > 0.0 {
            [normal[0] / len, normal[1] / len, normal[2] / len]
        } else {
            [0.0, 0.0, 1.0]
        };

        writeln!(
            file,
            "  facet normal {} {} {}",
            normal[0], normal[1], normal[2]
        )
        .map_err(|e| format!("Write error: {}", e))?;
        writeln!(file, "    outer loop").map_err(|e| format!("Write error: {}", e))?;
        writeln!(file, "      vertex {} {} {}", v0[0], v0[1], v0[2])
            .map_err(|e| format!("Write error: {}", e))?;
        writeln!(file, "      vertex {} {} {}", v1[0], v1[1], v1[2])
            .map_err(|e| format!("Write error: {}", e))?;
        writeln!(file, "      vertex {} {} {}", v2[0], v2[1], v2[2])
            .map_err(|e| format!("Write error: {}", e))?;
        writeln!(file, "    endloop").map_err(|e| format!("Write error: {}", e))?;
        writeln!(file, "  endfacet").map_err(|e| format!("Write error: {}", e))?;
    }

    writeln!(file, "endsolid channel").map_err(|e| format!("Write error: {}", e))?;

    Ok(())
}

/// Export mesh to OBJ format
fn export_to_obj(mesh: &MeshResult, path: &PathBuf) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    let mut file = File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    // Write header
    writeln!(file, "# CADHY Channel Export").map_err(|e| format!("Write error: {}", e))?;
    writeln!(file, "# Vertices: {}", mesh.vertex_count)
        .map_err(|e| format!("Write error: {}", e))?;
    writeln!(file, "# Triangles: {}", mesh.triangle_count)
        .map_err(|e| format!("Write error: {}", e))?;

    // Write vertices
    for i in 0..mesh.vertex_count {
        writeln!(
            file,
            "v {} {} {}",
            mesh.vertices[i * 3],
            mesh.vertices[i * 3 + 1],
            mesh.vertices[i * 3 + 2]
        )
        .map_err(|e| format!("Write error: {}", e))?;
    }

    // Write normals if available
    if let Some(ref normals) = mesh.normals {
        for i in 0..mesh.vertex_count {
            writeln!(
                file,
                "vn {} {} {}",
                normals[i * 3],
                normals[i * 3 + 1],
                normals[i * 3 + 2]
            )
            .map_err(|e| format!("Write error: {}", e))?;
        }
    }

    // Write faces (OBJ indices are 1-based)
    let num_triangles = mesh.indices.len() / 3;
    for i in 0..num_triangles {
        let i0 = mesh.indices[i * 3] + 1;
        let i1 = mesh.indices[i * 3 + 1] + 1;
        let i2 = mesh.indices[i * 3 + 2] + 1;

        if mesh.normals.is_some() {
            writeln!(file, "f {}//{} {}//{} {}//{}", i0, i0, i1, i1, i2, i2)
                .map_err(|e| format!("Write error: {}", e))?;
        } else {
            writeln!(file, "f {} {} {}", i0, i1, i2).map_err(|e| format!("Write error: {}", e))?;
        }
    }

    Ok(())
}

/// Get mesh statistics
#[tauri::command]
pub fn get_mesh_stats(mesh: MeshResult) -> Result<MeshStats, String> {
    // Calculate bounding box
    let mut min = [f64::MAX, f64::MAX, f64::MAX];
    let mut max = [f64::MIN, f64::MIN, f64::MIN];

    for i in 0..mesh.vertex_count {
        let x = mesh.vertices[i * 3];
        let y = mesh.vertices[i * 3 + 1];
        let z = mesh.vertices[i * 3 + 2];

        min[0] = min[0].min(x);
        min[1] = min[1].min(y);
        min[2] = min[2].min(z);
        max[0] = max[0].max(x);
        max[1] = max[1].max(y);
        max[2] = max[2].max(z);
    }

    let dimensions = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];

    Ok(MeshStats {
        vertex_count: mesh.vertex_count,
        triangle_count: mesh.triangle_count,
        bounding_box_min: min,
        bounding_box_max: max,
        dimensions,
    })
}

/// Mesh statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshStats {
    pub vertex_count: usize,
    pub triangle_count: usize,
    pub bounding_box_min: [f64; 3],
    pub bounding_box_max: [f64; 3],
    pub dimensions: [f64; 3],
}

// =============================================================================
// TRANSITION GEOMETRY
// =============================================================================

/// Transition type from frontend
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransitionTypeDef {
    Linear,
    Warped,
    Cylindrical,
    Inlet,
    Outlet,
}

impl From<TransitionTypeDef> for TransitionType {
    fn from(def: TransitionTypeDef) -> Self {
        match def {
            TransitionTypeDef::Linear => TransitionType::Linear,
            TransitionTypeDef::Warped => TransitionType::Warped,
            TransitionTypeDef::Cylindrical => TransitionType::Cylindrical,
            TransitionTypeDef::Inlet => TransitionType::Inlet,
            TransitionTypeDef::Outlet => TransitionType::Outlet,
        }
    }
}

/// Transition section definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionSectionDef {
    /// Section type: "rectangular", "trapezoidal", "triangular"
    #[serde(default = "default_section_type")]
    pub section_type: String,
    /// Bottom width (or width for rectangular)
    #[serde(default = "default_width")]
    pub width: f64,
    /// Section depth
    #[serde(default = "default_depth")]
    pub depth: f64,
    /// Side slope (H:V) - only for trapezoidal/triangular
    #[serde(default)]
    pub side_slope: f64,
    /// Wall thickness (m)
    #[serde(default = "default_wall_thickness")]
    pub wall_thickness: f64,
    /// Floor thickness (m)
    #[serde(default = "default_floor_thickness")]
    pub floor_thickness: f64,
}

fn default_section_type() -> String {
    "trapezoidal".to_string()
}

/// Transition geometry input from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionGeometryDef {
    /// Transition name
    pub name: String,
    /// Transition type
    pub transition_type: TransitionTypeDef,
    /// Transition length (m)
    pub length: f64,
    /// Mesh resolution (m)
    #[serde(default = "default_resolution")]
    pub resolution: f64,
    /// Start station (progressive position)
    pub start_station: f64,
    /// Start elevation (invert)
    pub start_elevation: f64,
    /// End elevation (invert)
    pub end_elevation: f64,
    /// Inlet section (upstream)
    pub inlet: TransitionSectionDef,
    /// Outlet section (downstream)
    pub outlet: TransitionSectionDef,
}

/// Generate 3D mesh for a channel transition
#[tauri::command]
pub fn generate_transition_mesh(input: TransitionGeometryDef) -> Result<MeshResult, String> {
    // Create TransitionGeometryInput for the corridor generator
    let transition_input = TransitionGeometryInput {
        transition_type: input.transition_type.into(),
        length: input.length,
        resolution: input.resolution,
        start_station: input.start_station,
        start_elevation: input.start_elevation,
        end_elevation: input.end_elevation,
        inlet_section_type: input.inlet.section_type.clone(),
        inlet_width: input.inlet.width,
        inlet_depth: input.inlet.depth,
        inlet_side_slope: input.inlet.side_slope,
        inlet_wall_thickness: input.inlet.wall_thickness,
        inlet_floor_thickness: input.inlet.floor_thickness,
        outlet_section_type: input.outlet.section_type.clone(),
        outlet_width: input.outlet.width,
        outlet_depth: input.outlet.depth,
        outlet_side_slope: input.outlet.side_slope,
        outlet_wall_thickness: input.outlet.wall_thickness,
        outlet_floor_thickness: input.outlet.floor_thickness,
    };

    // Generate transition mesh
    let result = CorridorGenerator::generate_transition(&transition_input)
        .map_err(|e| format!("Failed to generate transition mesh: {}", e))?;

    // Flatten vertices
    let vertices: Vec<f64> = result
        .vertices
        .iter()
        .flat_map(|v| vec![v[0], v[1], v[2]])
        .collect();

    // Flatten normals
    let normals: Option<Vec<f64>> = result
        .normals
        .map(|n| n.iter().flat_map(|v| vec![v[0], v[1], v[2]]).collect());

    let vertex_count = result.vertices.len();
    let triangle_count = result.indices.len() / 3;

    Ok(MeshResult {
        vertices,
        indices: result.indices,
        normals,
        vertex_count,
        triangle_count,
    })
}

// =============================================================================
// CHUTE GEOMETRY
// =============================================================================

/// Chute type from frontend
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChuteTypeDef {
    Smooth,
    Stepped,
    Baffled,
    Ogee,
    Converging,
}

impl From<ChuteTypeDef> for ChuteTypeInput {
    fn from(def: ChuteTypeDef) -> Self {
        match def {
            ChuteTypeDef::Smooth => ChuteTypeInput::Smooth,
            ChuteTypeDef::Stepped => ChuteTypeInput::Stepped,
            ChuteTypeDef::Baffled => ChuteTypeInput::Baffled,
            ChuteTypeDef::Ogee => ChuteTypeInput::Ogee,
            ChuteTypeDef::Converging => ChuteTypeInput::Converging,
        }
    }
}

/// Stilling basin type from frontend
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum StillingBasinTypeDef {
    None,
    TypeI,
    TypeIi,
    TypeIii,
    TypeIv,
    Saf,
}

impl From<StillingBasinTypeDef> for StillingBasinTypeInput {
    fn from(def: StillingBasinTypeDef) -> Self {
        match def {
            StillingBasinTypeDef::None => StillingBasinTypeInput::None,
            StillingBasinTypeDef::TypeI => StillingBasinTypeInput::TypeI,
            StillingBasinTypeDef::TypeIi => StillingBasinTypeInput::TypeIi,
            StillingBasinTypeDef::TypeIii => StillingBasinTypeInput::TypeIii,
            StillingBasinTypeDef::TypeIv => StillingBasinTypeInput::TypeIv,
            StillingBasinTypeDef::Saf => StillingBasinTypeInput::Saf,
        }
    }
}

/// Chute block config from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChuteBlockDef {
    pub count: usize,
    pub width: f64,
    pub height: f64,
    pub thickness: f64,
    pub spacing: f64,
}

/// Baffle block config from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaffleBlockDef {
    pub rows: usize,
    #[serde(rename = "blocksPerRow")]
    pub blocks_per_row: usize,
    pub width: f64,
    pub height: f64,
    pub thickness: f64,
    #[serde(rename = "distanceFromInlet")]
    pub distance_from_inlet: f64,
    #[serde(rename = "rowSpacing")]
    pub row_spacing: f64,
}

/// End sill config from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndSillDef {
    #[serde(rename = "type")]
    pub sill_type: String,
    pub height: f64,
    #[serde(rename = "toothWidth")]
    pub tooth_width: Option<f64>,
    #[serde(rename = "toothSpacing")]
    pub tooth_spacing: Option<f64>,
}

/// Stilling basin config from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StillingBasinDef {
    #[serde(rename = "type")]
    pub basin_type: StillingBasinTypeDef,
    pub length: f64,
    pub depth: f64,
    #[serde(rename = "floorThickness")]
    pub floor_thickness: f64,
    #[serde(rename = "chuteBlocks")]
    pub chute_blocks: Option<ChuteBlockDef>,
    #[serde(rename = "baffleBlocks")]
    pub baffle_blocks: Option<BaffleBlockDef>,
    #[serde(rename = "endSill")]
    pub end_sill: Option<EndSillDef>,
    #[serde(rename = "wingwallAngle", default)]
    pub wingwall_angle: f64,
}

/// Chute geometry input from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChuteGeometryDef {
    /// Chute name
    pub name: String,
    /// Chute surface type
    #[serde(rename = "chuteType", default)]
    pub chute_type: ChuteTypeDef,
    /// Inlet section length (m)
    #[serde(rename = "inletLength", default)]
    pub inlet_length: f64,
    /// Inlet section slope (m/m)
    #[serde(rename = "inletSlope", default)]
    pub inlet_slope: f64,
    /// Main chute horizontal length (m)
    pub length: f64,
    /// Main chute elevation drop (m)
    pub drop: f64,
    /// Channel width at bottom (m)
    pub width: f64,
    /// Channel depth (m)
    pub depth: f64,
    /// Side slope (H:V) - 0 for rectangular
    #[serde(rename = "sideSlope", default)]
    pub side_slope: f64,
    /// Wall/floor thickness (m)
    #[serde(default = "default_chute_thickness")]
    pub thickness: f64,
    /// Start station (progressive position)
    #[serde(rename = "startStation")]
    pub start_station: f64,
    /// Start elevation (invert at top)
    #[serde(rename = "startElevation")]
    pub start_elevation: f64,
    /// Mesh resolution (m)
    #[serde(default = "default_chute_resolution")]
    pub resolution: f64,
    /// Step height for stepped chutes (m)
    #[serde(rename = "stepHeight", default)]
    pub step_height: f64,
    /// Step length for stepped chutes (m) - if 0, calculated from length/steps
    #[serde(rename = "stepLength", default)]
    pub step_length: f64,
    /// Baffle spacing for baffled chutes (m)
    #[serde(rename = "baffleSpacing", default)]
    pub baffle_spacing: f64,
    /// Baffle height for baffled chutes (m)
    #[serde(rename = "baffleHeight", default)]
    pub baffle_height: f64,
    /// Stilling basin configuration
    #[serde(rename = "stillingBasin")]
    pub stilling_basin: Option<StillingBasinDef>,
}

impl Default for ChuteTypeDef {
    fn default() -> Self {
        Self::Smooth
    }
}

fn default_chute_thickness() -> f64 {
    0.2
}

fn default_chute_resolution() -> f64 {
    0.5
}

/// Generate 3D mesh for a chute (rapida)
#[tauri::command]
pub fn generate_chute_mesh(input: ChuteGeometryDef) -> Result<MeshResult, String> {
    // Convert frontend definition to Rust input type
    let stilling_basin = input.stilling_basin.map(|sb| StillingBasinInput {
        basin_type: sb.basin_type.into(),
        length: sb.length,
        depth: sb.depth,
        floor_thickness: sb.floor_thickness,
        chute_blocks: sb.chute_blocks.map(|cb| ChuteBlockInput {
            count: cb.count,
            width: cb.width,
            height: cb.height,
            thickness: cb.thickness,
            spacing: cb.spacing,
        }),
        baffle_blocks: sb.baffle_blocks.map(|bb| BaffleBlockInput {
            rows: bb.rows,
            blocks_per_row: bb.blocks_per_row,
            width: bb.width,
            height: bb.height,
            thickness: bb.thickness,
            distance_from_inlet: bb.distance_from_inlet,
            row_spacing: bb.row_spacing,
        }),
        end_sill: sb.end_sill.map(|es| EndSillInput {
            sill_type: es.sill_type,
            height: es.height,
            tooth_width: es.tooth_width,
            tooth_spacing: es.tooth_spacing,
        }),
        wingwall_angle: sb.wingwall_angle,
    });

    let chute_input = ChuteGeometryInput {
        name: input.name,
        chute_type: input.chute_type.into(),
        inlet_length: input.inlet_length,
        inlet_slope: input.inlet_slope,
        length: input.length,
        drop: input.drop,
        width: input.width,
        depth: input.depth,
        side_slope: input.side_slope,
        thickness: input.thickness,
        start_station: input.start_station,
        start_elevation: input.start_elevation,
        resolution: input.resolution,
        step_height: input.step_height,
        step_length: input.step_length,
        baffle_spacing: input.baffle_spacing,
        baffle_height: input.baffle_height,
        stilling_basin,
    };

    // Generate chute mesh
    let result = CorridorGenerator::generate_chute(&chute_input)
        .map_err(|e| format!("Failed to generate chute mesh: {}", e))?;

    // Flatten vertices
    let vertices: Vec<f64> = result
        .vertices
        .iter()
        .flat_map(|v| vec![v[0], v[1], v[2]])
        .collect();

    // Flatten normals
    let normals: Option<Vec<f64>> = result
        .normals
        .map(|n| n.iter().flat_map(|v| vec![v[0], v[1], v[2]]).collect());

    let vertex_count = result.vertices.len();
    let triangle_count = result.indices.len() / 3;

    Ok(MeshResult {
        vertices,
        indices: result.indices,
        normals,
        vertex_count,
        triangle_count,
    })
}
