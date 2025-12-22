# Phase 2: Missing CAD Operations - Implementation Plan

**Date:** 2025-12-22
**Status:** ✅ C++ Complete, ⏳ FFI Pending
**Commit:** Ready for FFI/Rust/Frontend integration

---

## ✅ Completed: C++ Implementation

### Added C++ Functions (bridge.cpp)

1. **`make_pyramid()`** ✅ - Create pyramid primitive (square base → apex)
2. **`make_ellipsoid()`** ✅ - Create 3D ellipsoid with different radii
3. **`make_vertex()`** ✅ - Create point/vertex
4. **`simplify_shape()`** ✅ - Shape simplification (CRITICAL for boolean ops)
5. **`combine_shapes()`** ✅ - Create compound from multiple shapes

### Updated Files

- ✅ `crates/cadhy-cad/cpp/bridge.cpp` (+200 lines)
- ✅ `crates/cadhy-cad/cpp/include/bridge.h` (+50 lines, added includes and declarations)
- ✅ All code compiles successfully

---

## ⏳ Next Steps: Rust FFI Integration

### Step 1: Update `ffi.rs`

Add FFI bindings for new C++ functions:

```rust
#[cxx::bridge]
mod ffi {
    unsafe extern "C++" {
        // ... existing code ...

        // New primitives
        fn make_pyramid(
            x: f64, y: f64, z: f64,
            px: f64, py: f64, pz: f64,
            dx: f64, dy: f64, dz: f64
        ) -> UniquePtr<OcctShape>;

        fn make_ellipsoid(
            cx: f64, cy: f64, cz: f64,
            rx: f64, ry: f64, rz: f64
        ) -> UniquePtr<OcctShape>;

        fn make_vertex(x: f64, y: f64, z: f64) -> UniquePtr<OcctShape>;

        // Shape operations
        fn simplify_shape(
            shape: &OcctShape,
            unify_edges: bool,
            unify_faces: bool
        ) -> UniquePtr<OcctShape>;

        fn combine_shapes(shapes: &[*const OcctShape]) -> UniquePtr<OcctShape>;
    }
}
```

### Step 2: Add Rust Wrappers (`primitives.rs` and `operations.rs`)

**primitives.rs:**
```rust
impl Primitives {
    pub fn make_pyramid(
        x: f64, y: f64, z: f64,
        px: f64, py: f64, pz: f64,
        dx: f64, dy: f64, dz: f64
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_pyramid(x, y, z, px, py, pz, dx, dy, dz);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::PrimitiveCreationFailed("Pyramid creation failed".to_string()))
    }

    pub fn make_ellipsoid(
        cx: f64, cy: f64, cz: f64,
        rx: f64, ry: f64, rz: f64
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_ellipsoid(cx, cy, cz, rx, ry, rz);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::PrimitiveCreationFailed("Ellipsoid creation failed".to_string()))
    }

    pub fn make_vertex(x: f64, y: f64, z: f64) -> OcctResult<Shape> {
        let ptr = ffi::make_vertex(x, y, z);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::PrimitiveCreationFailed("Vertex creation failed".to_string()))
    }
}
```

**operations.rs:**
```rust
impl Operations {
    pub fn simplify(shape: &Shape, unify_edges: bool, unify_faces: bool) -> OcctResult<Shape> {
        let ptr = ffi::simplify_shape(shape.inner(), unify_edges, unify_faces);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Simplify shape failed".to_string()))
    }

    pub fn combine(shapes: &[&Shape]) -> OcctResult<Shape> {
        let shape_ptrs: Vec<*const ffi::OcctShape> = shapes
            .iter()
            .map(|s| s.inner() as *const ffi::OcctShape)
            .collect();

        let ptr = ffi::combine_shapes(&shape_ptrs);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Combine shapes failed".to_string()))
    }
}
```

### Step 3: Add Tauri Commands (`commands/cad.rs`)

```rust
#[tauri::command]
pub fn cad_create_pyramid(
    x: f64, y: f64, z: f64,
    px: f64, py: f64, pz: f64,
    dx: f64, dy: f64, dz: f64
) -> Result<ShapeResult, String> {
    let shape = Primitives::make_pyramid(x, y, z, px, py, pz, dx, dy, dz)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

#[tauri::command]
pub fn cad_create_ellipsoid(
    cx: f64, cy: f64, cz: f64,
    rx: f64, ry: f64, rz: f64
) -> Result<ShapeResult, String> {
    let shape = Primitives::make_ellipsoid(cx, cy, cz, rx, ry, rz)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

#[tauri::command]
pub fn cad_create_vertex(x: f64, y: f64, z: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_vertex(x, y, z)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

#[tauri::command]
pub fn cad_simplify(
    shape_id: String,
    unify_edges: bool,
    unify_faces: bool
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;
    let result = Operations::simplify(&shape, unify_edges, unify_faces)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

#[tauri::command]
pub fn cad_combine(shape_ids: Vec<String>) -> Result<ShapeResult, String> {
    let shapes: Result<Vec<Shape>, String> = shape_ids
        .iter()
        .map(|id| get_shape(id))
        .collect();
    let shapes = shapes?;
    let shape_refs: Vec<&Shape> = shapes.iter().collect();

    let result = Operations::combine(&shape_refs)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}
```

### Step 4: Register Commands (`lib.rs`)

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...

    // New primitives
    commands::cad::cad_create_pyramid,
    commands::cad::cad_create_ellipsoid,
    commands::cad::cad_create_vertex,

    // New operations
    commands::cad::cad_simplify,
    commands::cad::cad_combine,

    // ... rest of commands ...
])
```

### Step 5: Add Frontend Functions (`cad-service.ts`)

```typescript
// ============================================================================
// NEW PRIMITIVES
// ============================================================================

export async function createPyramid(
  x: number, y: number, z: number,
  px: number, py: number, pz: number,
  dx: number, dy: number, dz: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_pyramid", {
    x, y, z, px, py, pz, dx, dy, dz
  })
}

export async function createEllipsoid(
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_ellipsoid", {
    cx, cy, cz, rx, ry, rz
  })
}

export async function createVertex(
  x: number, y: number, z: number
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_create_vertex", { x, y, z })
}

// ============================================================================
// NEW OPERATIONS
// ============================================================================

export async function simplify(
  shapeId: string,
  unifyEdges: boolean = true,
  unifyFaces: boolean = true
): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_simplify", {
    shape_id: shapeId,
    unify_edges: unifyEdges,
    unify_faces: unifyFaces,
  })
}

export async function combine(shapeIds: string[]): Promise<ShapeResult> {
  return invoke<ShapeResult>("cad_combine", { shape_ids: shapeIds })
}
```

---

## 🎯 Implementation Strategy

Execute in this order:

1. ✅ **C++ Implementation** (DONE)
2. ⏳ **FFI Bindings** - Update `ffi.rs`
3. ⏳ **Rust Wrappers** - Update `primitives.rs` and `operations.rs`
4. ⏳ **Tauri Commands** - Update `commands/cad.rs` and `lib.rs`
5. ⏳ **Frontend** - Update `cad-service.ts`
6. ⏳ **UI Integration** - Add to FloatingCreatePanel
7. ⏳ **Testing** - Test each operation

---

## 📊 Expected Results

After full implementation:
- ✅ Pyramid primitive available
- ✅ Ellipsoid primitive available
- ✅ Vertex/point creation
- ✅ **Shape simplification (CRITICAL)** - cleaner geometry after booleans
- ✅ Compound creation for assemblies

This will complete 100% parity with Chilli3D's essential operations!

---

**Status:** C++ ✅ Complete | Ready for FFI integration
