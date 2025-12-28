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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum QualityPreset {
    /// Fast visualization (lowest quality)
    Visualization,
    /// Standard quality (default)
    #[default]
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

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================
    // MeshParams Default Tests
    // ============================================================

    #[test]
    fn default_params_have_sensible_values() {
        let params = MeshParams::default();

        assert!(params.linear_deflection > 0.0, "linear_deflection should be positive");
        assert!(params.angular_deflection > 0.0, "angular_deflection should be positive");
        assert!(params.min_points_per_edge >= 1, "min_points should be at least 1");
    }

    #[test]
    fn default_params_match_standard() {
        let default = MeshParams::default();
        let standard = MeshParams::standard();

        assert_eq!(default.linear_deflection, standard.linear_deflection);
        assert_eq!(default.angular_deflection, standard.angular_deflection);
        assert_eq!(default.relative, standard.relative);
        assert_eq!(default.min_points_per_edge, standard.min_points_per_edge);
        assert_eq!(default.parallel, standard.parallel);
    }

    // ============================================================
    // Preset Quality Ordering Tests
    // ============================================================

    #[test]
    fn visualization_has_largest_deflection() {
        let vis = MeshParams::visualization();
        let std = MeshParams::standard();
        let high = MeshParams::high_quality();
        let export = MeshParams::export_quality();

        assert!(
            vis.linear_deflection >= std.linear_deflection,
            "Visualization should have equal or larger deflection than standard"
        );
        assert!(
            std.linear_deflection >= high.linear_deflection,
            "Standard should have equal or larger deflection than high"
        );
        assert!(
            high.linear_deflection >= export.linear_deflection,
            "High should have equal or larger deflection than export"
        );
    }

    #[test]
    fn export_has_smallest_deflection() {
        let export = MeshParams::export_quality();

        // Export should have the finest mesh
        assert!(
            export.linear_deflection <= 0.01,
            "Export should have very fine linear deflection"
        );
        assert!(
            export.angular_deflection <= 0.2,
            "Export should have fine angular deflection"
        );
    }

    #[test]
    fn all_presets_have_positive_deflection() {
        let presets = [
            MeshParams::visualization(),
            MeshParams::standard(),
            MeshParams::high_quality(),
            MeshParams::export_quality(),
            MeshParams::printing(),
        ];

        for params in presets {
            assert!(params.linear_deflection > 0.0);
            assert!(params.angular_deflection > 0.0);
        }
    }

    // ============================================================
    // Builder Tests
    // ============================================================

    #[test]
    fn builder_creates_default_params() {
        let built = MeshParams::builder().build();
        let default = MeshParams::default();

        assert_eq!(built.linear_deflection, default.linear_deflection);
    }

    #[test]
    fn builder_linear_deflection_clamps_to_minimum() {
        let params = MeshParams::builder()
            .linear_deflection(0.00001) // Very small
            .build();

        // Should be clamped to minimum
        assert!(params.linear_deflection >= 0.0001);
    }

    #[test]
    fn builder_angular_deflection_clamps_range() {
        // Test lower bound
        let params_low = MeshParams::builder()
            .angular_deflection(0.001) // Too small
            .build();
        assert!(params_low.angular_deflection >= 0.01);

        // Test upper bound
        let params_high = MeshParams::builder()
            .angular_deflection(10.0) // Too large
            .build();
        assert!(params_high.angular_deflection <= std::f64::consts::PI);
    }

    #[test]
    fn builder_min_points_clamps_to_one() {
        let params = MeshParams::builder()
            .min_points_per_edge(0) // Should be clamped to 1
            .build();

        assert!(params.min_points_per_edge >= 1);
    }

    #[test]
    fn builder_chain_all_options() {
        let params = MeshParams::builder()
            .linear_deflection(0.05)
            .angular_deflection(0.3)
            .relative(true)
            .min_points_per_edge(3)
            .parallel(false)
            .build();

        assert!((params.linear_deflection - 0.05).abs() < 1e-10);
        assert!((params.angular_deflection - 0.3).abs() < 1e-10);
        assert!(params.relative);
        assert_eq!(params.min_points_per_edge, 3);
        assert!(!params.parallel);
    }

    // ============================================================
    // QualityPreset Tests
    // ============================================================

    #[test]
    fn quality_preset_default_is_standard() {
        let default = QualityPreset::default();
        assert_eq!(default, QualityPreset::Standard);
    }

    #[test]
    fn quality_preset_to_params_returns_correct_type() {
        assert_eq!(
            QualityPreset::Visualization.to_params().linear_deflection,
            MeshParams::visualization().linear_deflection
        );
        assert_eq!(
            QualityPreset::Standard.to_params().linear_deflection,
            MeshParams::standard().linear_deflection
        );
        assert_eq!(
            QualityPreset::High.to_params().linear_deflection,
            MeshParams::high_quality().linear_deflection
        );
        assert_eq!(
            QualityPreset::Export.to_params().linear_deflection,
            MeshParams::export_quality().linear_deflection
        );
        assert_eq!(
            QualityPreset::Printing.to_params().linear_deflection,
            MeshParams::printing().linear_deflection
        );
    }

    #[test]
    fn quality_preset_all_variants() {
        let presets = [
            QualityPreset::Visualization,
            QualityPreset::Standard,
            QualityPreset::High,
            QualityPreset::Export,
            QualityPreset::Printing,
        ];

        for preset in presets {
            let params = preset.to_params();
            assert!(params.linear_deflection > 0.0);
        }
    }

    // ============================================================
    // Printing Preset Tests
    // ============================================================

    #[test]
    fn printing_preset_suitable_for_3d_print() {
        let printing = MeshParams::printing();

        // 3D printing typically needs fine mesh (0.01-0.1mm tolerance)
        assert!(
            printing.linear_deflection <= 0.1,
            "Printing should have fine deflection for quality output"
        );
        assert!(
            printing.min_points_per_edge >= 2,
            "Printing should have enough edge points"
        );
    }

    // ============================================================
    // Serialization Tests (Serde)
    // ============================================================

    #[test]
    fn mesh_params_serialization_roundtrip() {
        let original = MeshParams::builder()
            .linear_deflection(0.02)
            .angular_deflection(0.25)
            .relative(true)
            .min_points_per_edge(4)
            .parallel(false)
            .build();

        let json = serde_json::to_string(&original).expect("should serialize");
        let deserialized: MeshParams = serde_json::from_str(&json).expect("should deserialize");

        assert!((original.linear_deflection - deserialized.linear_deflection).abs() < 1e-10);
        assert!((original.angular_deflection - deserialized.angular_deflection).abs() < 1e-10);
        assert_eq!(original.relative, deserialized.relative);
        assert_eq!(original.min_points_per_edge, deserialized.min_points_per_edge);
        assert_eq!(original.parallel, deserialized.parallel);
    }

    #[test]
    fn quality_preset_serialization_roundtrip() {
        let presets = [
            QualityPreset::Visualization,
            QualityPreset::Standard,
            QualityPreset::High,
            QualityPreset::Export,
            QualityPreset::Printing,
        ];

        for preset in presets {
            let json = serde_json::to_string(&preset).expect("should serialize");
            let deserialized: QualityPreset =
                serde_json::from_str(&json).expect("should deserialize");
            assert_eq!(preset, deserialized);
        }
    }
}
