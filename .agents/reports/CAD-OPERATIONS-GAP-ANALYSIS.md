# CAD Operations Gap Analysis

**Date:** 2025-12-21
**Purpose:** Identify which CAD operations exist in Rust but are NOT exposed to the UI

---

## ✅ Already Exposed (Working in UI)

### Primitives
- ✅ Box (`cad_create_box`, `cad_create_box_at`)
- ✅ Cylinder (`cad_create_cylinder`, `cad_create_cylinder_at`)
- ✅ Sphere (`cad_create_sphere`, `cad_create_sphere_at`)
- ✅ Cone (`cad_create_cone`)
- ✅ Torus (`cad_create_torus`)
- ✅ Wedge (`cad_create_wedge`)
- ✅ Helix (`cad_create_helix`)

### Boolean Operations
- ✅ Union/Fuse (`cad_boolean_fuse`)
- ✅ Difference/Cut (`cad_boolean_cut`)
- ✅ Intersection/Common (`cad_boolean_common`)

### Modify Operations
- ✅ Fillet all edges (`cad_fillet`)
- ✅ Chamfer all edges (`cad_chamfer`)
- ✅ Shell (hollow) (`cad_shell`)

### Transform Operations
- ✅ Translate (`cad_translate`)
- ✅ Rotate (`cad_rotate`)
- ✅ Scale (`cad_scale`)
- ✅ Mirror (`cad_mirror`)

### Advanced Modeling
- ✅ Extrude (`cad_extrude`)
- ✅ Revolve (`cad_revolve`)

### I/O
- ✅ Import/Export STEP
- ✅ Export STL, OBJ, GLB
- ✅ Tessellation

---

## ❌ NOT Exposed (Available in Rust, Missing in UI)

### HIGH PRIORITY - Advanced Modeling Operations

#### 1. **Loft** (CRITICAL)
**Rust Function:** `Operations::loft(&[&Shape], solid: bool, ruled: bool)`
**Impact:** ⭐⭐⭐⭐⭐
**Use Case:** Create smooth surfaces through multiple profiles (boat hulls, aircraft wings, organic shapes)

```rust
// Missing Tauri command
#[tauri::command]
pub fn cad_loft(profile_ids: Vec<String>, solid: bool, ruled: bool) -> Result<ShapeResult, String>
```

#### 2. **Pipe/Sweep** (CRITICAL)
**Rust Functions:**
- `Operations::pipe(profile: &Shape, spine: &Shape)`
- `Operations::pipe_shell(profile, spine, with_contact, with_correction)`

**Impact:** ⭐⭐⭐⭐⭐
**Use Case:** Create pipes, tubes, springs, complex swept geometries

```rust
// Missing Tauri commands
#[tauri::command]
pub fn cad_pipe(profile_id: String, spine_id: String) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_pipe_shell(profile_id: String, spine_id: String, with_contact: bool, with_correction: bool) -> Result<ShapeResult, String>
```

### MEDIUM PRIORITY - Selective Modifications

#### 3. **Selective Fillet/Chamfer**
**Rust Functions:**
- `Operations::fillet_edges(&Shape, edge_indices: &[i32], radii: &[f64])`
- `Operations::chamfer_edges(&Shape, edge_indices: &[i32], distances: &[f64])`

**Impact:** ⭐⭐⭐⭐
**Use Case:** Apply fillet/chamfer to specific edges only (not all edges)

```rust
// Missing Tauri commands
#[tauri::command]
pub fn cad_fillet_edges(shape_id: String, edge_indices: Vec<i32>, radii: Vec<f64>) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_chamfer_edges(shape_id: String, edge_indices: Vec<i32>, distances: Vec<f64>) -> Result<ShapeResult, String>
```

#### 4. **Offset**
**Rust Function:** `Operations::offset(&Shape, offset: f64)`
**Impact:** ⭐⭐⭐
**Use Case:** Grow/shrink solids uniformly

```rust
// Missing Tauri command
#[tauri::command]
pub fn cad_offset(shape_id: String, offset: f64) -> Result<ShapeResult, String>
```

### HIGH PRIORITY - Curve Creation (CRITICAL for CAD Workflow)

**Rust Module:** `Curves`
**Impact:** ⭐⭐⭐⭐⭐
**Problem:** **ZERO curve creation commands exposed!** Users cannot create profiles for extrude/revolve/loft/sweep.

#### 5. **Lines**
```rust
#[tauri::command]
pub fn cad_create_line(x1: f64, y1: f64, z1: f64, x2: f64, y2: f64, z2: f64) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_create_line_dir(x: f64, y: f64, z: f64, dx: f64, dy: f64, dz: f64, length: f64) -> Result<ShapeResult, String>
```

#### 6. **Circles & Arcs**
```rust
#[tauri::command]
pub fn cad_create_circle(cx: f64, cy: f64, cz: f64, nx: f64, ny: f64, nz: f64, radius: f64) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_create_arc(cx: f64, cy: f64, cz: f64, nx: f64, ny: f64, nz: f64, radius: f64, start_angle: f64, end_angle: f64) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_create_arc_3_points(x1: f64, y1: f64, z1: f64, x2: f64, y2: f64, z2: f64, x3: f64, y3: f64, z3: f64) -> Result<ShapeResult, String>
```

#### 7. **Rectangles**
```rust
#[tauri::command]
pub fn cad_create_rectangle(x: f64, y: f64, width: f64, height: f64) -> Result<ShapeResult, String>
```

#### 8. **Polygons**
```rust
#[tauri::command]
pub fn cad_create_polygon_2d(points: Vec<(f64, f64)>) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_create_regular_polygon(cx: f64, cy: f64, radius: f64, sides: u32) -> Result<ShapeResult, String>
```

#### 9. **Splines**
```rust
#[tauri::command]
pub fn cad_create_bspline(points: Vec<(f64, f64, f64)>, closed: bool) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_create_bezier(control_points: Vec<(f64, f64, f64)>) -> Result<ShapeResult, String>
```

#### 10. **Wire Operations** (CRITICAL)
```rust
#[tauri::command]
pub fn cad_create_wire_from_edges(edge_ids: Vec<String>) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_create_face_from_wire(wire_id: String) -> Result<ShapeResult, String>
```

### LOW PRIORITY - Batch Operations

#### 11. **Multi-shape Booleans**
```rust
#[tauri::command]
pub fn cad_fuse_many(shape_ids: Vec<String>) -> Result<ShapeResult, String>

#[tauri::command]
pub fn cad_cut_many(base_id: String, tool_ids: Vec<String>) -> Result<ShapeResult, String>
```

#### 12. **Exploded View**
```rust
#[tauri::command]
pub fn cad_explode(shape_id: String, level: i32, distance: f64, deflection: f64) -> Result<ExplodeResult, String>
```

---

## 📊 Summary Statistics

| Category | Total Available | Exposed | Missing | Coverage |
|----------|----------------|---------|---------|----------|
| **Primitives** | 7 | 7 | 0 | 100% ✅ |
| **Booleans** | 5 | 3 | 2 | 60% |
| **Modify** | 6 | 3 | 3 | 50% |
| **Transform** | 4 | 4 | 0 | 100% ✅ |
| **Advanced Modeling** | 4 | 2 | 2 | 50% ❌ |
| **Curves** | 15+ | 0 | 15+ | 0% ❌❌❌ |
| **Wire/Face** | 2 | 0 | 2 | 0% ❌❌ |
| **TOTAL** | **43+** | **19** | **24+** | **44%** |

---

## 🎯 Implementation Priority

### Phase 1: Critical Operations (Next 2-3 hours)
1. ✅ **Curve Creation** (15 commands) - BLOCKING for CAD workflow
   - Lines, circles, arcs, rectangles, polygons, splines
   - Wire/face creation
2. ✅ **Loft** - Critical advanced operation
3. ✅ **Pipe/Sweep** - Critical advanced operation

### Phase 2: Enhancement (1-2 hours)
4. Selective fillet/chamfer edges
5. Offset operation
6. Multi-shape booleans

### Phase 3: Polish (30 min)
7. Exploded view
8. Additional curve variants

---

## 🚀 Next Steps

1. **Create `curves.rs` command file** with all curve creation commands
2. **Add loft/pipe commands** to `cad.rs`
3. **Register commands** in `main.rs`
4. **Create UI components** for:
   - Sketch mode (2D curve drawing)
   - Loft creator
   - Sweep/Pipe creator
5. **Update modeller store** to support curve/wire objects (not just solids)

---

**Status:** Ready for implementation
**Estimated Effort:** 3-4 hours for Phase 1
**Impact:** Unlocks professional CAD workflow in CADHY
