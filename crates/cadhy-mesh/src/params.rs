//! Mesh generation parameters for OCCT surface tessellation

use serde::{Deserialize, Serialize};

/// Parameters for surface mesh generation (tessellation)
///
/// These parameters control how OpenCASCADE's BRepMesh_IncrementalMesh
/// generates triangular approximations of BREP surfaces.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshParams {
    /// Linear deflection - maximum distance between mesh and actual surface
    /// Smaller values = more triangles, better approximation
    /// Typical range: 0.001 to 1.0
    pub linear_deflection: f64,

    /// Angular deflection in radians - maximum angle between adjacent triangle normals
    /// Smaller values = smoother curved surfaces
    /// Typical range: 0.1 to 0.5 radians (about 6° to 30°)
    pub angular_deflection: f64,

    /// Whether to use relative deflection (deflection = linear_deflection * bounding_box_size)
    pub relative: bool,

    /// Minimum number of points on any edge
    pub min_points_per_edge: u32,

    /// Whether to parallelize mesh generation
    pub parallel: bool,
}

impl Default for MeshParams {
    fn default() -> Self {
        Self {
            linear_deflection: 0.1,
            angular_deflection: 0.5, // ~30 degrees
            relative: false,
            min_points_per_edge: 2,
            parallel: true,
        }
    }
}

impl MeshParams {
    /// Create a new builder
    pub fn builder() -> MeshParamsBuilder {
        MeshParamsBuilder::default()
    }

    /// Preset for visualization (fast, lower quality)
    pub fn visualization() -> Self {
        Self {
            linear_deflection: 0.5,
            angular_deflection: 0.8, // ~45 degrees
            relative: true,
            min_points_per_edge: 2,
            parallel: true,
        }
    }

    /// Preset for standard quality (balanced)
    pub fn standard() -> Self {
        Self::default()
    }

    /// Preset for high quality (slower, more triangles)
    pub fn high_quality() -> Self {
        Self {
            linear_deflection: 0.01,
            angular_deflection: 0.2, // ~12 degrees
            relative: false,
            min_points_per_edge: 3,
            parallel: true,
        }
    }

    /// Preset for export (highest quality)
    pub fn export_quality() -> Self {
        Self {
            linear_deflection: 0.001,
            angular_deflection: 0.1, // ~6 degrees
            relative: false,
            min_points_per_edge: 4,
            parallel: true,
        }
    }

    /// Preset for 3D printing (very fine mesh)
    pub fn printing() -> Self {
        Self {
            linear_deflection: 0.05, // 0.05mm typically
            angular_deflection: 0.15,
            relative: false,
            min_points_per_edge: 3,
            parallel: true,
        }
    }
}

/// Builder for MeshParams
#[derive(Debug, Default)]
pub struct MeshParamsBuilder {
    params: MeshParams,
}

impl MeshParamsBuilder {
    pub fn linear_deflection(mut self, deflection: f64) -> Self {
        self.params.linear_deflection = deflection.max(0.0001);
        self
    }

    pub fn angular_deflection(mut self, deflection: f64) -> Self {
        self.params.angular_deflection = deflection.clamp(0.01, std::f64::consts::PI);
        self
    }

    pub fn relative(mut self, relative: bool) -> Self {
        self.params.relative = relative;
        self
    }

    pub fn min_points_per_edge(mut self, points: u32) -> Self {
        self.params.min_points_per_edge = points.max(1);
        self
    }

    pub fn parallel(mut self, parallel: bool) -> Self {
        self.params.parallel = parallel;
        self
    }

    pub fn build(self) -> MeshParams {
        self.params
    }
}

/// Quality preset levels for mesh generation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QualityPreset {
    /// Fast visualization (lowest quality)
    Visualization,
    /// Standard quality (default)
    Standard,
    /// High quality
    High,
    /// Export quality (highest)
    Export,
    /// 3D printing quality
    Printing,
}

impl QualityPreset {
    /// Convert to MeshParams
    pub fn to_params(self) -> MeshParams {
        match self {
            QualityPreset::Visualization => MeshParams::visualization(),
            QualityPreset::Standard => MeshParams::standard(),
            QualityPreset::High => MeshParams::high_quality(),
            QualityPreset::Export => MeshParams::export_quality(),
            QualityPreset::Printing => MeshParams::printing(),
        }
    }
}

impl Default for QualityPreset {
    fn default() -> Self {
        QualityPreset::Standard
    }
}
