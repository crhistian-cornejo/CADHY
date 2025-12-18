//! Mesh generator - main entry point for mesh generation
//!
//! Uses OpenCASCADE TKMesh for surface tessellation.

use std::path::Path;
use tracing::info;

use crate::error::{MeshError, Result};
use crate::ffi;
use crate::params::MeshParams;
use crate::types::{MeshMetadata, SurfaceMesh, Triangle, Vertex};

/// Main mesh generator interface
///
/// Uses OpenCASCADE's BRepMesh_IncrementalMesh for surface tessellation.
pub struct MeshGenerator {
    initialized: bool,
}

impl MeshGenerator {
    /// Create a new mesh generator
    pub fn new() -> Result<Self> {
        let success = ffi::mesh_init();
        if !success {
            return Err(MeshError::InitializationFailed(
                "Failed to initialize OCCT mesh library".to_string(),
            ));
        }

        Ok(Self { initialized: true })
    }

    /// Check available backends
    pub fn available_backends(&self) -> Vec<&'static str> {
        vec!["occt"]
    }

    /// Generate surface mesh from STL file
    pub fn mesh_from_stl<P: AsRef<Path>>(
        &self,
        stl_path: P,
        params: &MeshParams,
    ) -> Result<SurfaceMesh> {
        let path_str = stl_path.as_ref().to_string_lossy();
        info!("Loading mesh from STL: {}", path_str);

        let result = ffi::mesh_from_stl(
            &path_str,
            params.linear_deflection,
            params.angular_deflection,
        );

        if !result.success {
            return Err(MeshError::GenerationFailed(result.error_message));
        }

        convert_ffi_result(result, "stl-import")
    }

    /// Generate surface mesh from BREP file
    pub fn mesh_from_brep<P: AsRef<Path>>(
        &self,
        brep_path: P,
        params: &MeshParams,
    ) -> Result<SurfaceMesh> {
        let path_str = brep_path.as_ref().to_string_lossy();
        info!("Tessellating BREP: {}", path_str);

        let result = ffi::mesh_from_brep(
            &path_str,
            params.linear_deflection,
            params.angular_deflection,
        );

        if !result.success {
            return Err(MeshError::GenerationFailed(result.error_message));
        }

        convert_ffi_result(result, "brep-tessellation")
    }

    /// Generate surface mesh from STEP file
    pub fn mesh_from_step<P: AsRef<Path>>(
        &self,
        step_path: P,
        params: &MeshParams,
    ) -> Result<SurfaceMesh> {
        let path_str = step_path.as_ref().to_string_lossy();
        info!("Tessellating STEP: {}", path_str);

        let result = ffi::mesh_from_step(
            &path_str,
            params.linear_deflection,
            params.angular_deflection,
        );

        if !result.success {
            return Err(MeshError::GenerationFailed(result.error_message));
        }

        convert_ffi_result(result, "step-tessellation")
    }

    /// Tessellate shape data (serialized BREP)
    pub fn tessellate_shape_data(
        &self,
        brep_data: &[u8],
        params: &MeshParams,
    ) -> Result<SurfaceMesh> {
        info!("Tessellating shape data ({} bytes)", brep_data.len());

        let result = ffi::tessellate_shape(
            brep_data,
            params.linear_deflection,
            params.angular_deflection,
        );

        if !result.success {
            return Err(MeshError::GenerationFailed(result.error_message));
        }

        convert_ffi_result(result, "shape-tessellation")
    }
}

impl Drop for MeshGenerator {
    fn drop(&mut self) {
        if self.initialized {
            ffi::mesh_cleanup();
        }
    }
}

impl Default for MeshGenerator {
    fn default() -> Self {
        Self::new().unwrap_or(Self { initialized: false })
    }
}

/// Convert FFI result to SurfaceMesh
fn convert_ffi_result(result: ffi::MeshResultFfi, generator: &str) -> Result<SurfaceMesh> {
    // Convert vertices
    let vertices: Vec<Vertex> = result
        .vertices
        .chunks(3)
        .map(|chunk| Vertex::new(chunk[0], chunk[1], chunk[2]))
        .collect();

    // Convert triangles (indices come as flat array)
    let triangles: Vec<Triangle> = result
        .indices
        .chunks(3)
        .map(|chunk| Triangle::new(chunk[0], chunk[1], chunk[2]))
        .collect();

    // Convert normals if present
    let normals: Option<Vec<[f32; 3]>> = if !result.normals.is_empty() {
        Some(
            result
                .normals
                .chunks(3)
                .map(|chunk| [chunk[0] as f32, chunk[1] as f32, chunk[2] as f32])
                .collect(),
        )
    } else {
        None
    };

    // Get counts before moving
    let vertex_count = vertices.len();
    let triangle_count = triangles.len();

    Ok(SurfaceMesh {
        vertices,
        triangles,
        normals,
        metadata: MeshMetadata {
            generator: Some(generator.to_string()),
            vertex_count,
            triangle_count,
            ..Default::default()
        },
    })
}
