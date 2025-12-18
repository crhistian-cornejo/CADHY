//! Shape wrapper for TopoDS_Shape
//!
//! Provides a safe Rust interface to OpenCASCADE shapes.

use cxx::UniquePtr;

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi::{self, OcctShape};
use crate::mesh::MeshData;

/// A B-Rep shape from OpenCASCADE
///
/// This is the fundamental type for representing 3D geometry.
/// Shapes are immutable once created.
///
/// # Safety
///
/// We implement Send and Sync for Shape because:
/// 1. OpenCASCADE shapes are immutable once created
/// 2. All OCCT operations in cadhy-cad are designed to be called from a single thread
/// 3. The engine is designed to be used from a single thread with async/await
///
/// If you need to use shapes from multiple threads, wrap them in Arc<Mutex<>>.
pub struct Shape {
    inner: UniquePtr<OcctShape>,
}

// SAFETY: OcctShape is immutable after creation and we ensure single-threaded access
// at the engine level. OCCT itself is not thread-safe, but our wrapper ensures
// that all operations happen on the same thread.
unsafe impl Send for Shape {}
unsafe impl Sync for Shape {}

impl Shape {
    /// Create a Shape from a raw OcctShape pointer
    pub(crate) fn from_ptr(ptr: UniquePtr<OcctShape>) -> OcctResult<Self> {
        if ptr.is_null() {
            return Err(OcctError::NullShape);
        }
        Ok(Shape { inner: ptr })
    }

    /// Get reference to inner shape for FFI operations
    pub(crate) fn inner(&self) -> &OcctShape {
        &self.inner
    }

    /// Check if the shape is valid
    pub fn is_valid(&self) -> bool {
        ffi::is_valid(&self.inner)
    }

    /// Tessellate the shape into a triangle mesh
    ///
    /// # Arguments
    /// * `deflection` - Maximum chord deviation (smaller = more triangles)
    ///
    /// # Example
    /// ```no_run
    /// let shape = cadhy_cad::Primitives::make_box(10.0, 10.0, 10.0).unwrap();
    /// let mesh = shape.tessellate(0.1).unwrap();
    /// ```
    pub fn tessellate(&self, deflection: f64) -> OcctResult<MeshData> {
        let result = ffi::tessellate(&self.inner, deflection);

        if result.vertices.is_empty() {
            return Err(OcctError::TessellationFailed(
                "No vertices generated".to_string(),
            ));
        }

        Ok(MeshData::from_ffi_result(result))
    }

    /// Tessellate with default deflection (0.1)
    pub fn tessellate_default(&self) -> OcctResult<MeshData> {
        self.tessellate(0.1)
    }

    // =========================================================================
    // BREP I/O
    // =========================================================================

    /// Serialize shape to BRep format (in-memory)
    ///
    /// Returns the shape data as a byte vector that can be stored
    /// and later loaded with `from_brep`.
    pub fn to_brep(&self) -> OcctResult<Vec<u8>> {
        let data = ffi::write_brep(&self.inner);
        if data.is_empty() {
            return Err(OcctError::IoError(
                "Failed to serialize shape to BRep".to_string(),
            ));
        }
        Ok(data)
    }

    /// Deserialize shape from BRep format (in-memory)
    ///
    /// Loads a shape from BRep data previously created with `to_brep`.
    pub fn from_brep(data: &[u8]) -> OcctResult<Self> {
        let ptr = ffi::read_brep(data);
        if ptr.is_null() {
            return Err(OcctError::IoError("Failed to parse BRep data".to_string()));
        }
        Ok(Shape { inner: ptr })
    }

    /// Write shape to a BRep file
    pub fn write_brep_file(&self, filename: &str) -> OcctResult<()> {
        if ffi::write_brep_file(&self.inner, filename) {
            Ok(())
        } else {
            Err(OcctError::IoError(format!(
                "Failed to write BRep file: {}",
                filename
            )))
        }
    }

    /// Read shape from a BRep file
    pub fn read_brep_file(filename: &str) -> OcctResult<Self> {
        let ptr = ffi::read_brep_file(filename);
        if ptr.is_null() {
            return Err(OcctError::IoError(format!(
                "Failed to read BRep file: {}",
                filename
            )));
        }
        Ok(Shape { inner: ptr })
    }

    /// Write shape to a STEP file
    pub fn write_step(&self, filename: &str) -> OcctResult<()> {
        if ffi::write_step(&self.inner, filename) {
            Ok(())
        } else {
            Err(OcctError::IoError(format!(
                "Failed to write STEP file: {}",
                filename
            )))
        }
    }

    /// Read shape from a STEP file
    pub fn read_step(filename: &str) -> OcctResult<Self> {
        let ptr = ffi::read_step(filename);
        if ptr.is_null() {
            return Err(OcctError::IoError(format!(
                "Failed to read STEP file: {}",
                filename
            )));
        }
        Ok(Shape { inner: ptr })
    }
}

impl Clone for Shape {
    fn clone(&self) -> Self {
        let cloned = ffi::clone_shape(&self.inner);
        Shape { inner: cloned }
    }
}

impl std::fmt::Debug for Shape {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Shape")
            .field("valid", &self.is_valid())
            .finish()
    }
}
