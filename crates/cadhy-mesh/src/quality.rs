//! Surface mesh quality metrics and validation

use crate::error::Result;
use crate::types::{SurfaceMesh, Vertex};
use serde::{Deserialize, Serialize};

/// Surface mesh quality metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurfaceMeshQuality {
    /// Overall quality score (0.0 - 1.0)
    pub overall_score: f64,

    /// Triangle quality statistics
    pub triangle_quality: QualityStats,

    /// Aspect ratio statistics
    pub aspect_ratio: QualityStats,

    /// Area statistics
    pub area: QualityStats,

    /// Number of triangles with poor quality
    pub poor_quality_count: usize,

    /// Number of degenerate triangles (zero area)
    pub degenerate_count: usize,
}

impl SurfaceMeshQuality {
    /// Check if mesh quality is acceptable for visualization
    pub fn is_acceptable(&self) -> bool {
        self.degenerate_count == 0 && self.aspect_ratio.max < 50.0
    }
}

/// Statistics for a quality metric
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QualityStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub std_dev: f64,
    /// Histogram buckets (10 buckets from 0-1 or appropriate range)
    pub histogram: Vec<usize>,
}

/// Quality thresholds for validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurfaceQualityThresholds {
    /// Maximum acceptable aspect ratio
    pub max_aspect_ratio: f64,
    /// Minimum acceptable triangle area
    pub min_area: f64,
    /// Minimum acceptable quality score
    pub min_quality: f64,
}

impl Default for SurfaceQualityThresholds {
    fn default() -> Self {
        Self {
            max_aspect_ratio: 50.0,
            min_area: 1e-12,
            min_quality: 0.1,
        }
    }
}

impl SurfaceQualityThresholds {
    /// Strict thresholds for high-quality visualization
    pub fn strict() -> Self {
        Self {
            max_aspect_ratio: 20.0,
            min_area: 1e-10,
            min_quality: 0.3,
        }
    }

    /// Relaxed thresholds for quick preview
    pub fn relaxed() -> Self {
        Self {
            max_aspect_ratio: 100.0,
            min_area: 1e-15,
            min_quality: 0.01,
        }
    }
}

/// Compute surface mesh quality metrics
pub fn compute_surface_quality(mesh: &SurfaceMesh) -> SurfaceMeshQuality {
    if mesh.triangles.is_empty() {
        return SurfaceMeshQuality {
            overall_score: 0.0,
            triangle_quality: QualityStats::default(),
            aspect_ratio: QualityStats::default(),
            area: QualityStats::default(),
            poor_quality_count: 0,
            degenerate_count: 0,
        };
    }

    let mut quality_values = Vec::with_capacity(mesh.triangles.len());
    let mut aspect_ratios = Vec::with_capacity(mesh.triangles.len());
    let mut areas = Vec::with_capacity(mesh.triangles.len());
    let mut degenerate_count = 0;

    for tri in &mesh.triangles {
        let v0 = &mesh.vertices[tri.i0 as usize];
        let v1 = &mesh.vertices[tri.i1 as usize];
        let v2 = &mesh.vertices[tri.i2 as usize];

        let (quality, aspect, area) = compute_triangle_quality(v0, v1, v2);

        if area < 1e-15 {
            degenerate_count += 1;
        }

        quality_values.push(quality);
        aspect_ratios.push(aspect);
        areas.push(area);
    }

    let quality_stats = compute_stats(&quality_values);
    let aspect_stats = compute_stats(&aspect_ratios);
    let area_stats = compute_stats(&areas);

    let poor_quality_count = quality_values.iter().filter(|&&q| q < 0.2).count();

    SurfaceMeshQuality {
        overall_score: quality_stats.mean,
        triangle_quality: quality_stats,
        aspect_ratio: aspect_stats,
        area: area_stats,
        poor_quality_count,
        degenerate_count,
    }
}

/// Compute quality metrics for a single triangle
///
/// Returns (quality, aspect_ratio, area)
/// - quality: 0.0 (degenerate) to 1.0 (equilateral)
/// - aspect_ratio: ratio of longest to shortest edge
/// - area: triangle area
fn compute_triangle_quality(v0: &Vertex, v1: &Vertex, v2: &Vertex) -> (f64, f64, f64) {
    // Edge vectors
    let e0 = Vertex::new(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
    let e1 = Vertex::new(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    let e2 = Vertex::new(v0.x - v2.x, v0.y - v2.y, v0.z - v2.z);

    // Edge lengths
    let l0 = length(&e0);
    let l1 = length(&e1);
    let l2 = length(&e2);

    let max_edge = l0.max(l1).max(l2);
    let min_edge = l0.min(l1).min(l2);

    // Aspect ratio
    let aspect_ratio = if min_edge > 1e-15 {
        max_edge / min_edge
    } else {
        f64::MAX
    };

    // Cross product for area
    let e01 = Vertex::new(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
    let e02 = Vertex::new(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
    let cross = Vertex::new(
        e01.y * e02.z - e01.z * e02.y,
        e01.z * e02.x - e01.x * e02.z,
        e01.x * e02.y - e01.y * e02.x,
    );
    let area = length(&cross) / 2.0;

    // Quality: based on how close to equilateral
    // For equilateral triangle: all edges equal, aspect_ratio = 1
    // Quality = 1 / aspect_ratio (clamped to [0, 1])
    let quality = if aspect_ratio > 1e-10 {
        (1.0 / aspect_ratio).min(1.0)
    } else {
        0.0
    };

    (quality, aspect_ratio, area)
}

/// Compute statistics from a vector of values
fn compute_stats(values: &[f64]) -> QualityStats {
    if values.is_empty() {
        return QualityStats::default();
    }

    let n = values.len() as f64;
    let sum: f64 = values.iter().sum();
    let mean = sum / n;

    let min = values.iter().cloned().fold(f64::MAX, f64::min);
    let max = values.iter().cloned().fold(f64::MIN, f64::max);

    let variance: f64 = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n;
    let std_dev = variance.sqrt();

    // Histogram (10 buckets)
    let mut histogram = vec![0usize; 10];
    let range = (max - min).max(1e-10);
    for &v in values {
        let bucket = (((v - min) / range) * 9.0).floor() as usize;
        let bucket = bucket.min(9);
        histogram[bucket] += 1;
    }

    QualityStats {
        min,
        max,
        mean,
        std_dev,
        histogram,
    }
}

/// Validate surface mesh against quality thresholds
pub fn validate_surface_mesh(
    mesh: &SurfaceMesh,
    thresholds: &SurfaceQualityThresholds,
) -> Result<SurfaceMeshQuality> {
    let quality = compute_surface_quality(mesh);

    if quality.degenerate_count > 0 {
        return Err(crate::error::MeshError::QualityCheckFailed(format!(
            "{} degenerate triangles found",
            quality.degenerate_count
        )));
    }

    if quality.aspect_ratio.max > thresholds.max_aspect_ratio {
        return Err(crate::error::MeshError::QualityCheckFailed(format!(
            "Maximum aspect ratio {} exceeds threshold {}",
            quality.aspect_ratio.max, thresholds.max_aspect_ratio
        )));
    }

    if quality.area.min < thresholds.min_area {
        return Err(crate::error::MeshError::QualityCheckFailed(format!(
            "Minimum triangle area {} is below threshold {}",
            quality.area.min, thresholds.min_area
        )));
    }

    Ok(quality)
}

// Vector helper
fn length(v: &Vertex) -> f64 {
    (v.x * v.x + v.y * v.y + v.z * v.z).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Triangle;

    fn make_equilateral_mesh() -> SurfaceMesh {
        // Equilateral triangle with side = 1
        let h = (3.0_f64).sqrt() / 2.0;
        SurfaceMesh {
            vertices: vec![
                Vertex::new(0.0, 0.0, 0.0),
                Vertex::new(1.0, 0.0, 0.0),
                Vertex::new(0.5, h, 0.0),
            ],
            triangles: vec![Triangle::new(0, 1, 2)],
            normals: None,
            metadata: Default::default(),
        }
    }

    #[test]
    fn test_equilateral_quality() {
        let mesh = make_equilateral_mesh();
        let quality = compute_surface_quality(&mesh);

        // Equilateral triangle should have quality close to 1.0
        assert!(quality.overall_score > 0.9);
        assert!(quality.aspect_ratio.max < 1.1);
        assert_eq!(quality.degenerate_count, 0);
    }

    #[test]
    fn test_validation() {
        let mesh = make_equilateral_mesh();
        let result = validate_surface_mesh(&mesh, &SurfaceQualityThresholds::default());
        assert!(result.is_ok());
    }
}
