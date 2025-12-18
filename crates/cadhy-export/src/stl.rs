//! STL Export Module
//!
//! Supports both ASCII and binary STL formats.

use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

use crate::{ExportMesh, Result};

/// Export mesh to ASCII STL format
pub fn export_ascii<P: AsRef<Path>>(mesh: &ExportMesh, path: P) -> Result<()> {
    mesh.validate()?;

    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);

    writeln!(writer, "solid cadhy_mesh")?;

    // Process triangles from indices
    for tri in mesh.indices.chunks(3) {
        let v0 = mesh.vertices[tri[0] as usize];
        let v1 = mesh.vertices[tri[1] as usize];
        let v2 = mesh.vertices[tri[2] as usize];

        let normal = compute_normal(&v0, &v1, &v2);

        writeln!(
            writer,
            "  facet normal {} {} {}",
            normal[0], normal[1], normal[2]
        )?;
        writeln!(writer, "    outer loop")?;
        writeln!(writer, "      vertex {} {} {}", v0[0], v0[1], v0[2])?;
        writeln!(writer, "      vertex {} {} {}", v1[0], v1[1], v1[2])?;
        writeln!(writer, "      vertex {} {} {}", v2[0], v2[1], v2[2])?;
        writeln!(writer, "    endloop")?;
        writeln!(writer, "  endfacet")?;
    }

    writeln!(writer, "endsolid cadhy_mesh")?;

    Ok(())
}

/// Export mesh to binary STL format
pub fn export_binary<P: AsRef<Path>>(mesh: &ExportMesh, path: P) -> Result<()> {
    mesh.validate()?;

    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);

    // 80-byte header
    let mut header = [0u8; 80];
    let header_text = b"CADHY Binary STL";
    header[..header_text.len()].copy_from_slice(header_text);
    writer.write_all(&header)?;

    // Number of triangles (u32 little-endian)
    let num_triangles = (mesh.indices.len() / 3) as u32;
    writer.write_all(&num_triangles.to_le_bytes())?;

    // Write triangles
    for tri in mesh.indices.chunks(3) {
        let v0 = mesh.vertices[tri[0] as usize];
        let v1 = mesh.vertices[tri[1] as usize];
        let v2 = mesh.vertices[tri[2] as usize];

        let normal = compute_normal(&v0, &v1, &v2);

        // Write normal (3x f32)
        writer.write_all(&(normal[0] as f32).to_le_bytes())?;
        writer.write_all(&(normal[1] as f32).to_le_bytes())?;
        writer.write_all(&(normal[2] as f32).to_le_bytes())?;

        // Write vertices (3x 3x f32)
        writer.write_all(&(v0[0] as f32).to_le_bytes())?;
        writer.write_all(&(v0[1] as f32).to_le_bytes())?;
        writer.write_all(&(v0[2] as f32).to_le_bytes())?;

        writer.write_all(&(v1[0] as f32).to_le_bytes())?;
        writer.write_all(&(v1[1] as f32).to_le_bytes())?;
        writer.write_all(&(v1[2] as f32).to_le_bytes())?;

        writer.write_all(&(v2[0] as f32).to_le_bytes())?;
        writer.write_all(&(v2[1] as f32).to_le_bytes())?;
        writer.write_all(&(v2[2] as f32).to_le_bytes())?;

        // Attribute byte count (unused, set to 0)
        writer.write_all(&[0u8, 0u8])?;
    }

    Ok(())
}

/// Compute normal vector for a triangle
fn compute_normal(v0: &[f64; 3], v1: &[f64; 3], v2: &[f64; 3]) -> [f64; 3] {
    let e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    let e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    // Cross product
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];

    let len = (nx * nx + ny * ny + nz * nz).sqrt();

    if len > 1e-10 {
        [nx / len, ny / len, nz / len]
    } else {
        [0.0, 0.0, 1.0]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_mesh() -> ExportMesh {
        ExportMesh::new(
            vec![[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.5, 1.0, 0.0]],
            vec![0, 1, 2],
        )
    }

    #[test]
    fn test_export_stl_ascii() {
        let mesh = make_test_mesh();
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("test.stl");

        export_ascii(&mesh, &path).unwrap();

        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("solid cadhy_mesh"));
        assert!(content.contains("facet normal"));
        assert!(content.contains("endsolid cadhy_mesh"));
    }

    #[test]
    fn test_export_stl_binary() {
        let mesh = make_test_mesh();
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("test_binary.stl");

        export_binary(&mesh, &path).unwrap();

        let data = std::fs::read(&path).unwrap();
        // Header (80) + num triangles (4) + 1 triangle (50 bytes each)
        assert_eq!(data.len(), 80 + 4 + 50);
    }

    #[test]
    fn test_compute_normal() {
        let v0 = [0.0, 0.0, 0.0];
        let v1 = [1.0, 0.0, 0.0];
        let v2 = [0.0, 1.0, 0.0];

        let normal = compute_normal(&v0, &v1, &v2);
        // Normal should point in +Z direction
        assert!((normal[2] - 1.0).abs() < 1e-6);
    }
}
