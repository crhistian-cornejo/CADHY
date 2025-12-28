# CADHY Full CAD Implementation Plan

> **Objetivo**: Implementar un CAD modelador completo como Plasticity usando OpenCASCADE
> **Fecha**: 2025-12-21
> **Estado**: PLAN MAESTRO
> **Referencia**: Plasticity patterns + OpenCASCADE 7.9.2

---

## Resumen Ejecutivo

Este documento define la implementación completa de todas las funcionalidades CAD necesarias para que CADHY sea un modelador 3D profesional comparable a Plasticity, aprovechando al máximo OpenCASCADE.

---

## 1. Estado Actual vs Objetivo

### 1.1 Análisis de Capacidades

| Categoría | CADHY Actual | Plasticity | OpenCASCADE Disponible | Acción |
|-----------|--------------|------------|------------------------|--------|
| **Primitivos Sólidos** | 8 tipos | 3 tipos | 15+ tipos | ✅ Ya superamos |
| **Curvas 2D/3D** | Básico (line, circle, arc, polygon) | 20+ tipos | 50+ tipos | 🔴 Expandir |
| **Sketching** | No | Completo | Geom2d_*, BRepBuilderAPI | 🔴 Implementar |
| **Boolean** | 3 ops | 3 ops | 3 ops + Section | ⚠️ Agregar Section |
| **Fillet/Chamfer** | All + Selective | Variable radius | Variable + Conic | ⚠️ Expandir |
| **Draft (Taper)** | En bridge.h pero no expuesto | Sí | BRepOffsetAPI_DraftAngle | 🔴 Exponer |
| **Shell/Offset** | Sí | Sí | Completo | ✅ Listo |
| **Extrude** | Básico | Con taper + twist | BRepPrimAPI_MakePrism + Draft | ⚠️ Expandir |
| **Revolve** | Básico | Completo | BRepPrimAPI_MakeRevol | ✅ Listo |
| **Loft** | Sí | Multi-section | BRepOffsetAPI_ThruSections | ✅ Listo |
| **Sweep/Pipe** | Sí | Frenet + Binormal | BRepOffsetAPI_MakePipeShell | ⚠️ Expandir |
| **Face Operations** | No | Offset, Remove, Modify | Disponible | 🔴 Implementar |
| **Edge Operations** | Fillet/Chamfer select | Remove, Bridge | Disponible | 🔴 Implementar |
| **Arrays/Patterns** | No | Linear, Radial | Transform-based | 🔴 Implementar |
| **Curve Operations** | No | Trim, Offset, Join, Bridge | Geom*API | 🔴 Implementar |
| **Topology Query** | Básico | Completo | TopExp_Explorer | ⚠️ Expandir |
| **Selection** | Solo objetos | Face/Edge/Vertex/CP | Raycasting | 🔴 Implementar |
| **Snaps** | No | Completo | Extrema, Project | 🔴 Implementar |

### 1.2 Prioridades

```
🔴 CRÍTICO (Bloqueante para CAD profesional)
⚠️ IMPORTANTE (Mejora significativa)
✅ LISTO (Ya implementado)
🟢 OPCIONAL (Nice to have)
```

---

## 2. Fase 1: Curvas y Sketching (4 semanas)

### 2.1 Backend Rust - Curvas Básicas

**Archivo**: `crates/cadhy-cad/src/curves.rs` (NUEVO)

```rust
//! Curve creation and manipulation
//! 
//! Provides functions for creating 2D and 3D curves including
//! lines, arcs, circles, ellipses, splines, and NURBS.

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Factory for creating curve shapes (wires/edges)
pub struct Curves;

impl Curves {
    // ═══════════════════════════════════════════════════════════
    // LÍNEAS
    // ═══════════════════════════════════════════════════════════
    
    /// Create a line segment between two points
    pub fn make_line(
        x1: f64, y1: f64, z1: f64,
        x2: f64, y2: f64, z2: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_line(x1, y1, z1, x2, y2, z2);
        Shape::from_ptr(ptr)
    }
    
    /// Create a line from point and direction with length
    pub fn make_line_dir(
        x: f64, y: f64, z: f64,
        dx: f64, dy: f64, dz: f64,
        length: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_line_dir(x, y, z, dx, dy, dz, length);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // CÍRCULOS Y ARCOS
    // ═══════════════════════════════════════════════════════════
    
    /// Create a full circle
    pub fn make_circle(
        cx: f64, cy: f64, cz: f64,  // center
        nx: f64, ny: f64, nz: f64,  // normal
        radius: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_circle(cx, cy, cz, nx, ny, nz, radius);
        Shape::from_ptr(ptr)
    }
    
    /// Create a circle through 3 points
    pub fn make_circle_3_points(
        x1: f64, y1: f64, z1: f64,
        x2: f64, y2: f64, z2: f64,
        x3: f64, y3: f64, z3: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_circle_3_points(x1, y1, z1, x2, y2, z2, x3, y3, z3);
        Shape::from_ptr(ptr)
    }
    
    /// Create an arc from center, radius, and angles
    pub fn make_arc_center(
        cx: f64, cy: f64, cz: f64,  // center
        nx: f64, ny: f64, nz: f64,  // normal
        radius: f64,
        start_angle: f64,  // radians
        end_angle: f64,    // radians
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_arc(cx, cy, cz, nx, ny, nz, radius, start_angle, end_angle);
        Shape::from_ptr(ptr)
    }
    
    /// Create an arc through 3 points
    pub fn make_arc_3_points(
        x1: f64, y1: f64, z1: f64,  // start
        x2: f64, y2: f64, z2: f64,  // mid
        x3: f64, y3: f64, z3: f64,  // end
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_arc_3_points(x1, y1, z1, x2, y2, z2, x3, y3, z3);
        Shape::from_ptr(ptr)
    }
    
    /// Create an arc from start, end, and tangent at start
    pub fn make_arc_tangent(
        x1: f64, y1: f64, z1: f64,  // start
        tx: f64, ty: f64, tz: f64,  // tangent at start
        x2: f64, y2: f64, z2: f64,  // end
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_arc_tangent(x1, y1, z1, tx, ty, tz, x2, y2, z2);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // ELIPSES
    // ═══════════════════════════════════════════════════════════
    
    /// Create an ellipse
    pub fn make_ellipse(
        cx: f64, cy: f64, cz: f64,  // center
        nx: f64, ny: f64, nz: f64,  // normal
        major_radius: f64,
        minor_radius: f64,
        rotation: f64,  // rotation of major axis (radians)
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_ellipse(cx, cy, cz, nx, ny, nz, major_radius, minor_radius, rotation);
        Shape::from_ptr(ptr)
    }
    
    /// Create an ellipse arc
    pub fn make_ellipse_arc(
        cx: f64, cy: f64, cz: f64,
        nx: f64, ny: f64, nz: f64,
        major_radius: f64,
        minor_radius: f64,
        start_angle: f64,
        end_angle: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_ellipse_arc(cx, cy, cz, nx, ny, nz, major_radius, minor_radius, start_angle, end_angle);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // SPLINES Y NURBS
    // ═══════════════════════════════════════════════════════════
    
    /// Create a B-Spline curve through points (interpolation)
    pub fn make_bspline_interpolate(
        points: &[(f64, f64, f64)],
        periodic: bool,
    ) -> OcctResult<Shape> {
        let vertices = points_to_vertices(points);
        let ptr = ffi::make_bspline_interpolate(&vertices, periodic);
        Shape::from_ptr(ptr)
    }
    
    /// Create a B-Spline curve with control points (approximation)
    pub fn make_bspline_control_points(
        control_points: &[(f64, f64, f64)],
        degree: u32,
        periodic: bool,
    ) -> OcctResult<Shape> {
        let vertices = points_to_vertices(control_points);
        let ptr = ffi::make_bspline_control(vertices, degree as i32, periodic);
        Shape::from_ptr(ptr)
    }
    
    /// Create a NURBS curve with weights
    pub fn make_nurbs(
        control_points: &[(f64, f64, f64)],
        weights: &[f64],
        knots: &[f64],
        degree: u32,
    ) -> OcctResult<Shape> {
        let vertices = points_to_vertices(control_points);
        let ptr = ffi::make_nurbs(vertices, weights, knots, degree as i32);
        Shape::from_ptr(ptr)
    }
    
    /// Create a Bezier curve
    pub fn make_bezier(
        control_points: &[(f64, f64, f64)],
    ) -> OcctResult<Shape> {
        let vertices = points_to_vertices(control_points);
        let ptr = ffi::make_bezier(&vertices);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // RECTÁNGULOS Y POLÍGONOS
    // ═══════════════════════════════════════════════════════════
    
    /// Create a rectangle in the XY plane
    pub fn make_rectangle_xy(
        x: f64, y: f64,
        width: f64, height: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_rectangle(x, y, width, height);
        Shape::from_ptr(ptr)
    }
    
    /// Create a rectangle on an arbitrary plane
    pub fn make_rectangle_plane(
        cx: f64, cy: f64, cz: f64,  // center
        nx: f64, ny: f64, nz: f64,  // normal
        width: f64, height: f64,
        rotation: f64,  // rotation around normal
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_rectangle_plane(cx, cy, cz, nx, ny, nz, width, height, rotation);
        Shape::from_ptr(ptr)
    }
    
    /// Create a regular polygon
    pub fn make_regular_polygon(
        cx: f64, cy: f64, cz: f64,  // center
        nx: f64, ny: f64, nz: f64,  // normal
        radius: f64,  // circumradius
        sides: u32,
        rotation: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_regular_polygon(cx, cy, cz, nx, ny, nz, radius, sides as i32, rotation);
        Shape::from_ptr(ptr)
    }
    
    /// Create a polygon from arbitrary points
    pub fn make_polygon(
        points: &[(f64, f64, f64)],
        close: bool,
    ) -> OcctResult<Shape> {
        let vertices = points_to_vertices(points);
        let ptr = if close {
            ffi::make_polygon_wire_3d(&vertices)
        } else {
            ffi::make_polyline_3d(&vertices)
        };
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // CURVAS ESPECIALES
    // ═══════════════════════════════════════════════════════════
    
    /// Create a spiral (2D in XY plane)
    pub fn make_spiral(
        cx: f64, cy: f64,
        start_radius: f64,
        end_radius: f64,
        turns: f64,
        clockwise: bool,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_spiral(cx, cy, start_radius, end_radius, turns, clockwise);
        Shape::from_ptr(ptr)
    }
    
    /// Create an involute curve (for gears)
    pub fn make_involute(
        cx: f64, cy: f64, cz: f64,
        base_radius: f64,
        start_angle: f64,
        end_angle: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_involute(cx, cy, cz, base_radius, start_angle, end_angle);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // WIRE OPERATIONS
    // ═══════════════════════════════════════════════════════════
    
    /// Join multiple edges/wires into a single wire
    pub fn join_wires(wires: &[&Shape]) -> OcctResult<Shape> {
        let ptrs: Vec<*const _> = wires.iter().map(|s| s.inner() as *const _).collect();
        let ptr = ffi::join_wires(&ptrs, ptrs.len());
        Shape::from_ptr(ptr)
    }
    
    /// Create a wire from ordered edges
    pub fn make_wire(edges: &[&Shape]) -> OcctResult<Shape> {
        let ptrs: Vec<*const _> = edges.iter().map(|s| s.inner() as *const _).collect();
        let ptr = ffi::make_wire_from_edges(&ptrs, ptrs.len());
        Shape::from_ptr(ptr)
    }
}

fn points_to_vertices(points: &[(f64, f64, f64)]) -> Vec<ffi::Vertex> {
    points.iter().map(|(x, y, z)| ffi::Vertex { x: *x, y: *y, z: *z }).collect()
}
```

### 2.2 Backend Rust - Operaciones de Curvas

**Archivo**: `crates/cadhy-cad/src/curve_operations.rs` (NUEVO)

```rust
//! Curve manipulation operations
//!
//! Trim, offset, extend, bridge, and modify curves.

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Operations on curves
pub struct CurveOperations;

impl CurveOperations {
    // ═══════════════════════════════════════════════════════════
    // TRIM Y SPLIT
    // ═══════════════════════════════════════════════════════════
    
    /// Trim a curve between two parameters
    /// Parameters are normalized (0.0 = start, 1.0 = end)
    pub fn trim(curve: &Shape, param1: f64, param2: f64) -> OcctResult<Shape> {
        let ptr = ffi::trim_curve(curve.inner(), param1, param2);
        Shape::from_ptr(ptr)
    }
    
    /// Split a curve at a parameter
    /// Returns two curves
    pub fn split(curve: &Shape, param: f64) -> OcctResult<(Shape, Shape)> {
        let result = ffi::split_curve(curve.inner(), param);
        let shape1 = Shape::from_ptr(result.first)?;
        let shape2 = Shape::from_ptr(result.second)?;
        Ok((shape1, shape2))
    }
    
    /// Trim curve at intersection with another curve
    pub fn trim_at_intersection(
        curve: &Shape,
        cutter: &Shape,
        keep_side: bool,  // true = keep first part
    ) -> OcctResult<Shape> {
        let ptr = ffi::trim_at_intersection(curve.inner(), cutter.inner(), keep_side);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // OFFSET
    // ═══════════════════════════════════════════════════════════
    
    /// Offset a planar curve
    pub fn offset_curve(
        curve: &Shape,
        distance: f64,
        plane_normal: (f64, f64, f64),
    ) -> OcctResult<Shape> {
        let (nx, ny, nz) = plane_normal;
        let ptr = ffi::offset_curve(curve.inner(), distance, nx, ny, nz);
        Shape::from_ptr(ptr)
    }
    
    /// Offset a curve with different distances at start and end
    pub fn offset_curve_variable(
        curve: &Shape,
        start_distance: f64,
        end_distance: f64,
        plane_normal: (f64, f64, f64),
    ) -> OcctResult<Shape> {
        let (nx, ny, nz) = plane_normal;
        let ptr = ffi::offset_curve_variable(curve.inner(), start_distance, end_distance, nx, ny, nz);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // EXTEND
    // ═══════════════════════════════════════════════════════════
    
    /// Extend a curve by a distance
    pub fn extend(
        curve: &Shape,
        distance: f64,
        at_start: bool,  // true = extend at start, false = at end
    ) -> OcctResult<Shape> {
        let ptr = ffi::extend_curve(curve.inner(), distance, at_start);
        Shape::from_ptr(ptr)
    }
    
    /// Extend curve to meet a target curve/surface
    pub fn extend_to(
        curve: &Shape,
        target: &Shape,
        at_start: bool,
    ) -> OcctResult<Shape> {
        let ptr = ffi::extend_curve_to(curve.inner(), target.inner(), at_start);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // BRIDGE Y BLEND
    // ═══════════════════════════════════════════════════════════
    
    /// Create a bridge curve between two curves
    /// continuity: 0=G0 (position), 1=G1 (tangent), 2=G2 (curvature)
    pub fn bridge(
        curve1: &Shape,
        at_end1: bool,
        curve2: &Shape,
        at_start2: bool,
        continuity: i32,
    ) -> OcctResult<Shape> {
        let ptr = ffi::bridge_curves(curve1.inner(), at_end1, curve2.inner(), at_start2, continuity);
        Shape::from_ptr(ptr)
    }
    
    /// Create a fillet (rounded corner) between two curves
    pub fn fillet_curves(
        curve1: &Shape,
        curve2: &Shape,
        radius: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::fillet_curves(curve1.inner(), curve2.inner(), radius);
        Shape::from_ptr(ptr)
    }
    
    /// Create a chamfer (bevel) between two curves
    pub fn chamfer_curves(
        curve1: &Shape,
        curve2: &Shape,
        distance: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::chamfer_curves(curve1.inner(), curve2.inner(), distance);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // MODIFICACIÓN
    // ═══════════════════════════════════════════════════════════
    
    /// Project a curve onto a surface
    pub fn project_to_surface(
        curve: &Shape,
        surface: &Shape,
    ) -> OcctResult<Shape> {
        let ptr = ffi::project_curve_to_surface(curve.inner(), surface.inner());
        Shape::from_ptr(ptr)
    }
    
    /// Project a curve onto a plane
    pub fn project_to_plane(
        curve: &Shape,
        ox: f64, oy: f64, oz: f64,  // point on plane
        nx: f64, ny: f64, nz: f64,  // normal
    ) -> OcctResult<Shape> {
        let ptr = ffi::project_curve_to_plane(curve.inner(), ox, oy, oz, nx, ny, nz);
        Shape::from_ptr(ptr)
    }
    
    /// Reverse curve direction
    pub fn reverse(curve: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::reverse_curve(curve.inner());
        Shape::from_ptr(ptr)
    }
    
    /// Smooth a polyline into a spline
    pub fn smooth(
        polyline: &Shape,
        tolerance: f64,
        degree: u32,
    ) -> OcctResult<Shape> {
        let ptr = ffi::smooth_polyline(polyline.inner(), tolerance, degree as i32);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // ANÁLISIS
    // ═══════════════════════════════════════════════════════════
    
    /// Get curve length
    pub fn length(curve: &Shape) -> f64 {
        ffi::curve_length(curve.inner())
    }
    
    /// Get point at parameter (0.0 to 1.0)
    pub fn point_at(curve: &Shape, param: f64) -> (f64, f64, f64) {
        let p = ffi::curve_point_at(curve.inner(), param);
        (p.x, p.y, p.z)
    }
    
    /// Get tangent at parameter
    pub fn tangent_at(curve: &Shape, param: f64) -> (f64, f64, f64) {
        let t = ffi::curve_tangent_at(curve.inner(), param);
        (t.x, t.y, t.z)
    }
    
    /// Get curvature at parameter
    pub fn curvature_at(curve: &Shape, param: f64) -> f64 {
        ffi::curve_curvature_at(curve.inner(), param)
    }
    
    /// Find closest point on curve to a point
    pub fn closest_point(
        curve: &Shape,
        px: f64, py: f64, pz: f64,
    ) -> (f64, f64, f64, f64) {  // (x, y, z, param)
        let result = ffi::curve_closest_point(curve.inner(), px, py, pz);
        (result.x, result.y, result.z, result.param)
    }
    
    /// Find intersections with another curve
    pub fn intersect(
        curve1: &Shape,
        curve2: &Shape,
    ) -> Vec<(f64, f64, f64)> {
        let result = ffi::curve_intersect(curve1.inner(), curve2.inner());
        result.iter().map(|p| (p.x, p.y, p.z)).collect()
    }
}
```

### 2.3 C++ FFI Additions

**Archivo**: Agregar a `crates/cadhy-cad/cpp/include/bridge.h`

```cpp
// ============================================================
// CURVE CREATION (Extended)
// ============================================================

/// Create a line from point and direction with length
std::unique_ptr<OcctShape> make_line_dir(
    double x, double y, double z,
    double dx, double dy, double dz,
    double length
);

/// Create a circle through 3 points
std::unique_ptr<OcctShape> make_circle_3_points(
    double x1, double y1, double z1,
    double x2, double y2, double z2,
    double x3, double y3, double z3
);

/// Create an arc through 3 points  
std::unique_ptr<OcctShape> make_arc_3_points(
    double x1, double y1, double z1,
    double x2, double y2, double z2,
    double x3, double y3, double z3
);

/// Create an arc from start point, tangent direction, and end point
std::unique_ptr<OcctShape> make_arc_tangent(
    double x1, double y1, double z1,
    double tx, double ty, double tz,
    double x2, double y2, double z2
);

/// Create an ellipse
std::unique_ptr<OcctShape> make_ellipse(
    double cx, double cy, double cz,
    double nx, double ny, double nz,
    double major_radius,
    double minor_radius,
    double rotation
);

/// Create an ellipse arc
std::unique_ptr<OcctShape> make_ellipse_arc(
    double cx, double cy, double cz,
    double nx, double ny, double nz,
    double major_radius,
    double minor_radius,
    double start_angle,
    double end_angle
);

/// Create a B-Spline by interpolating through points
std::unique_ptr<OcctShape> make_bspline_interpolate(
    rust::Slice<const Vertex> points,
    bool periodic
);

/// Create a B-Spline from control points
std::unique_ptr<OcctShape> make_bspline_control(
    rust::Slice<const Vertex> control_points,
    int32_t degree,
    bool periodic
);

/// Create a NURBS curve
std::unique_ptr<OcctShape> make_nurbs(
    rust::Slice<const Vertex> control_points,
    rust::Slice<const double> weights,
    rust::Slice<const double> knots,
    int32_t degree
);

/// Create a Bezier curve
std::unique_ptr<OcctShape> make_bezier(
    rust::Slice<const Vertex> control_points
);

/// Create a rectangle on an arbitrary plane
std::unique_ptr<OcctShape> make_rectangle_plane(
    double cx, double cy, double cz,
    double nx, double ny, double nz,
    double width, double height,
    double rotation
);

/// Create a regular polygon
std::unique_ptr<OcctShape> make_regular_polygon(
    double cx, double cy, double cz,
    double nx, double ny, double nz,
    double radius,
    int32_t sides,
    double rotation
);

/// Create a spiral
std::unique_ptr<OcctShape> make_spiral(
    double cx, double cy,
    double start_radius,
    double end_radius,
    double turns,
    bool clockwise
);

// ============================================================
// CURVE OPERATIONS
// ============================================================

/// Trim a curve between parameters (0-1 normalized)
std::unique_ptr<OcctShape> trim_curve(
    const OcctShape& curve,
    double param1,
    double param2
);

/// Split a curve at parameter
struct SplitResult {
    std::unique_ptr<OcctShape> first;
    std::unique_ptr<OcctShape> second;
};
SplitResult split_curve(const OcctShape& curve, double param);

/// Offset a planar curve
std::unique_ptr<OcctShape> offset_curve(
    const OcctShape& curve,
    double distance,
    double nx, double ny, double nz
);

/// Extend a curve
std::unique_ptr<OcctShape> extend_curve(
    const OcctShape& curve,
    double distance,
    bool at_start
);

/// Bridge two curves
std::unique_ptr<OcctShape> bridge_curves(
    const OcctShape& curve1,
    bool at_end1,
    const OcctShape& curve2,
    bool at_start2,
    int32_t continuity
);

/// Fillet between two curves
std::unique_ptr<OcctShape> fillet_curves(
    const OcctShape& curve1,
    const OcctShape& curve2,
    double radius
);

/// Join multiple wires
std::unique_ptr<OcctShape> join_wires(
    rust::Slice<const OcctShape* const> wires,
    size_t count
);

/// Get curve length
double curve_length(const OcctShape& curve);

/// Get point on curve at parameter
Vertex curve_point_at(const OcctShape& curve, double param);

/// Get tangent at parameter
Vertex curve_tangent_at(const OcctShape& curve, double param);

/// Find intersections between curves
rust::Vec<Vertex> curve_intersect(
    const OcctShape& curve1,
    const OcctShape& curve2
);
```

---

## 3. Fase 2: Face/Edge Operations (3 semanas)

### 3.1 Backend Rust - Face Operations

**Archivo**: `crates/cadhy-cad/src/face_operations.rs` (NUEVO)

```rust
//! Face-level operations on solids
//!
//! Operations that modify individual faces of a solid.

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Operations on faces
pub struct FaceOperations;

impl FaceOperations {
    // ═══════════════════════════════════════════════════════════
    // OFFSET FACES
    // ═══════════════════════════════════════════════════════════
    
    /// Offset selected faces of a solid
    pub fn offset_faces(
        shape: &Shape,
        face_indices: &[i32],
        distance: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::offset_faces(shape.inner(), face_indices, distance);
        Shape::from_ptr(ptr)
    }
    
    /// Offset all faces of a solid (thicken)
    pub fn offset_all_faces(shape: &Shape, distance: f64) -> OcctResult<Shape> {
        let ptr = ffi::offset_solid(shape.inner(), distance);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // MOVE/TRANSLATE FACES
    // ═══════════════════════════════════════════════════════════
    
    /// Move selected faces
    pub fn move_faces(
        shape: &Shape,
        face_indices: &[i32],
        dx: f64, dy: f64, dz: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::move_faces(shape.inner(), face_indices, dx, dy, dz);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // REMOVE FACES
    // ═══════════════════════════════════════════════════════════
    
    /// Remove faces from solid (creates a shell)
    pub fn remove_faces(
        shape: &Shape,
        face_indices: &[i32],
    ) -> OcctResult<Shape> {
        let ptr = ffi::remove_faces(shape.inner(), face_indices);
        Shape::from_ptr(ptr)
    }
    
    /// Remove face and heal the gap
    pub fn remove_faces_heal(
        shape: &Shape,
        face_indices: &[i32],
    ) -> OcctResult<Shape> {
        let ptr = ffi::remove_faces_heal(shape.inner(), face_indices);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // DRAFT (TAPER) FACES
    // ═══════════════════════════════════════════════════════════
    
    /// Add draft angle to faces
    pub fn draft_faces(
        shape: &Shape,
        face_indices: &[i32],
        angle: f64,  // radians
        pull_direction: (f64, f64, f64),
        neutral_plane: (f64, f64, f64, f64, f64, f64),  // point + normal
    ) -> OcctResult<Shape> {
        let (dx, dy, dz) = pull_direction;
        let (px, py, pz, nx, ny, nz) = neutral_plane;
        let ptr = ffi::draft_faces(shape.inner(), face_indices, angle, dx, dy, dz, px, py, pz, nx, ny, nz);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // FACE REPLACEMENT
    // ═══════════════════════════════════════════════════════════
    
    /// Replace a face with a new surface
    pub fn replace_face(
        shape: &Shape,
        face_index: i32,
        new_face: &Shape,
    ) -> OcctResult<Shape> {
        let ptr = ffi::replace_face(shape.inner(), face_index, new_face.inner());
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // FACE QUERIES
    // ═══════════════════════════════════════════════════════════
    
    /// Get face area
    pub fn face_area(shape: &Shape, face_index: i32) -> f64 {
        ffi::face_area(shape.inner(), face_index)
    }
    
    /// Get face normal at a point
    pub fn face_normal_at(
        shape: &Shape,
        face_index: i32,
        u: f64, v: f64,  // surface parameters
    ) -> (f64, f64, f64) {
        let n = ffi::face_normal_at(shape.inner(), face_index, u, v);
        (n.x, n.y, n.z)
    }
    
    /// Get face centroid
    pub fn face_centroid(shape: &Shape, face_index: i32) -> (f64, f64, f64) {
        let c = ffi::face_centroid(shape.inner(), face_index);
        (c.x, c.y, c.z)
    }
    
    /// Check if two faces are adjacent
    pub fn faces_adjacent(
        shape: &Shape,
        face1: i32,
        face2: i32,
    ) -> bool {
        ffi::faces_adjacent(shape.inner(), face1, face2)
    }
    
    /// Get edges of a face
    pub fn face_edges(shape: &Shape, face_index: i32) -> Vec<i32> {
        ffi::face_edge_indices(shape.inner(), face_index)
    }
}
```

### 3.2 Backend Rust - Edge Operations

**Archivo**: `crates/cadhy-cad/src/edge_operations.rs` (NUEVO)

```rust
//! Edge-level operations on solids
//!
//! Operations that modify individual edges of a solid.

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Operations on edges
pub struct EdgeOperations;

impl EdgeOperations {
    // ═══════════════════════════════════════════════════════════
    // FILLET/CHAMFER (Ya existentes, añadir variantes)
    // ═══════════════════════════════════════════════════════════
    
    /// Variable radius fillet
    pub fn fillet_variable(
        shape: &Shape,
        edge_index: i32,
        radii: &[(f64, f64)],  // (parameter, radius) pairs
    ) -> OcctResult<Shape> {
        let ptr = ffi::fillet_variable(shape.inner(), edge_index, radii);
        Shape::from_ptr(ptr)
    }
    
    /// Asymmetric chamfer (different distances on each face)
    pub fn chamfer_asymmetric(
        shape: &Shape,
        edge_indices: &[i32],
        distance1: f64,
        distance2: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::chamfer_asymmetric(shape.inner(), edge_indices, distance1, distance2);
        Shape::from_ptr(ptr)
    }
    
    /// Chamfer with angle
    pub fn chamfer_angle(
        shape: &Shape,
        edge_indices: &[i32],
        distance: f64,
        angle: f64,  // radians
    ) -> OcctResult<Shape> {
        let ptr = ffi::chamfer_angle(shape.inner(), edge_indices, distance, angle);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // REMOVE EDGES
    // ═══════════════════════════════════════════════════════════
    
    /// Remove edge and merge adjacent faces
    pub fn remove_edge(
        shape: &Shape,
        edge_index: i32,
    ) -> OcctResult<Shape> {
        let ptr = ffi::remove_edge(shape.inner(), edge_index);
        Shape::from_ptr(ptr)
    }
    
    /// Remove multiple edges
    pub fn remove_edges(
        shape: &Shape,
        edge_indices: &[i32],
    ) -> OcctResult<Shape> {
        let ptr = ffi::remove_edges(shape.inner(), edge_indices);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════
    // EDGE QUERIES
    // ═══════════════════════════════════════════════════════════
    
    /// Get edge length
    pub fn edge_length(shape: &Shape, edge_index: i32) -> f64 {
        ffi::edge_length(shape.inner(), edge_index)
    }
    
    /// Get edge type (line, circle, ellipse, bspline, etc.)
    pub fn edge_type(shape: &Shape, edge_index: i32) -> EdgeType {
        ffi::edge_type(shape.inner(), edge_index).into()
    }
    
    /// Get vertices of an edge
    pub fn edge_vertices(shape: &Shape, edge_index: i32) -> (i32, i32) {
        let result = ffi::edge_vertex_indices(shape.inner(), edge_index);
        (result.start, result.end)
    }
    
    /// Get faces adjacent to an edge
    pub fn edge_faces(shape: &Shape, edge_index: i32) -> Vec<i32> {
        ffi::edge_face_indices(shape.inner(), edge_index)
    }
    
    /// Check if edge is convex or concave
    pub fn edge_convexity(shape: &Shape, edge_index: i32) -> Convexity {
        ffi::edge_convexity(shape.inner(), edge_index).into()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EdgeType {
    Line,
    Circle,
    Ellipse,
    Hyperbola,
    Parabola,
    BezierCurve,
    BSplineCurve,
    OffsetCurve,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Convexity {
    Convex,
    Concave,
    Flat,
    Unknown,
}
```

---

## 4. Fase 3: Operaciones Avanzadas (3 semanas)

### 4.1 Extrude Avanzado

```rust
// En operations.rs - Ampliar
impl Operations {
    /// Extrude with draft angle (tapered extrude)
    pub fn extrude_draft(
        profile: &Shape,
        direction: (f64, f64, f64),
        length: f64,
        draft_angle: f64,  // radians, inward if positive
    ) -> OcctResult<Shape> {
        let (dx, dy, dz) = direction;
        let ptr = ffi::extrude_draft(profile.inner(), dx, dy, dz, length, draft_angle);
        Shape::from_ptr(ptr)
    }
    
    /// Extrude with twist
    pub fn extrude_twist(
        profile: &Shape,
        direction: (f64, f64, f64),
        length: f64,
        twist_angle: f64,  // total twist in radians
    ) -> OcctResult<Shape> {
        let (dx, dy, dz) = direction;
        let ptr = ffi::extrude_twist(profile.inner(), dx, dy, dz, length, twist_angle);
        Shape::from_ptr(ptr)
    }
    
    /// Extrude up to a target shape
    pub fn extrude_to(
        profile: &Shape,
        target: &Shape,
        direction: (f64, f64, f64),
    ) -> OcctResult<Shape> {
        let (dx, dy, dz) = direction;
        let ptr = ffi::extrude_to(profile.inner(), target.inner(), dx, dy, dz);
        Shape::from_ptr(ptr)
    }
    
    /// Extrude between two surfaces (from-to)
    pub fn extrude_between(
        profile: &Shape,
        from_surface: &Shape,
        to_surface: &Shape,
    ) -> OcctResult<Shape> {
        let ptr = ffi::extrude_between(profile.inner(), from_surface.inner(), to_surface.inner());
        Shape::from_ptr(ptr)
    }
}
```

### 4.2 Sweep Avanzado

```rust
impl Operations {
    /// Sweep with auxiliary spine (for twist control)
    pub fn sweep_auxiliary(
        profile: &Shape,
        spine: &Shape,
        auxiliary: &Shape,  // controls twist/scaling
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_pipe_auxiliary(profile.inner(), spine.inner(), auxiliary.inner());
        Shape::from_ptr(ptr)
    }
    
    /// Sweep with scaling (profile scales along path)
    pub fn sweep_scaled(
        profile: &Shape,
        spine: &Shape,
        scale_law: &[(f64, f64)],  // (param, scale) pairs
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_pipe_scaled(profile.inner(), spine.inner(), scale_law);
        Shape::from_ptr(ptr)
    }
    
    /// Multi-section sweep (loft along path)
    pub fn sweep_sections(
        sections: &[&Shape],
        spine: &Shape,
    ) -> OcctResult<Shape> {
        let ptrs: Vec<*const _> = sections.iter().map(|s| s.inner() as *const _).collect();
        let ptr = ffi::make_pipe_sections(&ptrs, ptrs.len(), spine.inner());
        Shape::from_ptr(ptr)
    }
}
```

### 4.3 Arrays/Patterns

**Archivo**: `crates/cadhy-cad/src/patterns.rs` (NUEVO)

```rust
//! Pattern operations (arrays)
//!
//! Create linear, rectangular, and polar patterns of shapes.

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Pattern operations
pub struct Patterns;

impl Patterns {
    // ═══════════════════════════════════════════════════════════
    // LINEAR ARRAY
    // ═══════════════════════════════════════════════════════════
    
    /// Create a linear array of copies
    pub fn linear_array(
        shape: &Shape,
        direction: (f64, f64, f64),
        count: u32,
        spacing: f64,
    ) -> OcctResult<Vec<Shape>> {
        let (dx, dy, dz) = direction;
        let norm = (dx*dx + dy*dy + dz*dz).sqrt();
        let (ux, uy, uz) = (dx/norm, dy/norm, dz/norm);
        
        let mut result = vec![shape.clone()];
        for i in 1..count {
            let offset = spacing * i as f64;
            let copy = Operations::translate(shape, ux*offset, uy*offset, uz*offset)?;
            result.push(copy);
        }
        Ok(result)
    }
    
    /// Create linear array and fuse into single shape
    pub fn linear_array_fused(
        shape: &Shape,
        direction: (f64, f64, f64),
        count: u32,
        spacing: f64,
    ) -> OcctResult<Shape> {
        let shapes = Self::linear_array(shape, direction, count, spacing)?;
        let refs: Vec<&Shape> = shapes.iter().collect();
        Operations::fuse_many(&refs)
    }

    // ═══════════════════════════════════════════════════════════
    // RECTANGULAR ARRAY
    // ═══════════════════════════════════════════════════════════
    
    /// Create a rectangular (2D) array
    pub fn rectangular_array(
        shape: &Shape,
        dir1: (f64, f64, f64),
        dir2: (f64, f64, f64),
        count1: u32,
        count2: u32,
        spacing1: f64,
        spacing2: f64,
    ) -> OcctResult<Vec<Shape>> {
        let mut result = Vec::with_capacity((count1 * count2) as usize);
        
        for i in 0..count1 {
            for j in 0..count2 {
                let offset1 = spacing1 * i as f64;
                let offset2 = spacing2 * j as f64;
                
                let dx = dir1.0 * offset1 + dir2.0 * offset2;
                let dy = dir1.1 * offset1 + dir2.1 * offset2;
                let dz = dir1.2 * offset1 + dir2.2 * offset2;
                
                if i == 0 && j == 0 {
                    result.push(shape.clone());
                } else {
                    result.push(Operations::translate(shape, dx, dy, dz)?);
                }
            }
        }
        Ok(result)
    }

    // ═══════════════════════════════════════════════════════════
    // POLAR ARRAY
    // ═══════════════════════════════════════════════════════════
    
    /// Create a polar (radial) array around an axis
    pub fn polar_array(
        shape: &Shape,
        center: (f64, f64, f64),
        axis: (f64, f64, f64),
        count: u32,
        total_angle: f64,  // radians, use 2*PI for full circle
    ) -> OcctResult<Vec<Shape>> {
        let angle_step = total_angle / count as f64;
        let (cx, cy, cz) = center;
        let (ax, ay, az) = axis;
        
        let mut result = vec![shape.clone()];
        for i in 1..count {
            let angle = angle_step * i as f64;
            let copy = Operations::rotate(shape, cx, cy, cz, ax, ay, az, angle)?;
            result.push(copy);
        }
        Ok(result)
    }
    
    /// Create polar array and fuse
    pub fn polar_array_fused(
        shape: &Shape,
        center: (f64, f64, f64),
        axis: (f64, f64, f64),
        count: u32,
        total_angle: f64,
    ) -> OcctResult<Shape> {
        let shapes = Self::polar_array(shape, center, axis, count, total_angle)?;
        let refs: Vec<&Shape> = shapes.iter().collect();
        Operations::fuse_many(&refs)
    }

    // ═══════════════════════════════════════════════════════════
    // CURVE ARRAY
    // ═══════════════════════════════════════════════════════════
    
    /// Distribute copies along a curve
    pub fn array_along_curve(
        shape: &Shape,
        curve: &Shape,
        count: u32,
        align_to_curve: bool,  // orient copies along curve tangent
    ) -> OcctResult<Vec<Shape>> {
        let mut result = Vec::with_capacity(count as usize);
        
        for i in 0..count {
            let param = i as f64 / (count - 1) as f64;
            let pos = CurveOperations::point_at(curve, param);
            
            let mut copy = Operations::translate(shape, pos.0, pos.1, pos.2)?;
            
            if align_to_curve {
                let tangent = CurveOperations::tangent_at(curve, param);
                // Rotate to align with tangent
                copy = rotate_to_direction(&copy, tangent)?;
            }
            
            result.push(copy);
        }
        Ok(result)
    }
}
```

---

## 5. Fase 4: Sistema de Selección (3 semanas)

### 5.1 Face/Edge/Vertex Picking

**Archivo**: `packages/picker/src/ObjectPicker.ts` (NUEVO)

```typescript
import { invoke } from '@tauri-apps/api/core';
import { CancellablePromise } from '@cadhy/command';

export enum SelectionMode {
  Solid = 'solid',
  Face = 'face',
  Edge = 'edge',
  Vertex = 'vertex',
  Curve = 'curve',
  ControlPoint = 'control-point',
}

export interface SelectionResult {
  mode: SelectionMode;
  objectId: string;
  subElementIndex?: number;
  point: { x: number; y: number; z: number };
}

export interface ObjectPickerOptions {
  mode: SelectionMode | SelectionMode[];
  min?: number;
  max?: number;
  filter?: (result: RaycastResult) => boolean;
  highlight?: boolean;
}

export class ObjectPicker {
  private mode: SelectionMode[];
  private min: number;
  private max: number;
  private selected: SelectionResult[] = [];
  private hovered: SelectionResult | null = null;
  
  constructor(options: ObjectPickerOptions) {
    this.mode = Array.isArray(options.mode) ? options.mode : [options.mode];
    this.min = options.min ?? 1;
    this.max = options.max ?? 1;
  }
  
  execute(
    callback?: (selection: SelectionResult[]) => void
  ): CancellablePromise<SelectionResult[]> {
    return new CancellablePromise((resolve, reject) => {
      // Setup mouse handlers
      const handleClick = async (event: MouseEvent) => {
        const result = await this.raycast(event.clientX, event.clientY);
        if (result) {
          this.selected.push(result);
          callback?.(this.selected);
          
          if (this.selected.length >= this.max) {
            cleanup();
            resolve(this.selected);
          }
        }
      };
      
      const handleMove = async (event: MouseEvent) => {
        const result = await this.raycast(event.clientX, event.clientY);
        this.hovered = result;
        // Update highlight visualization
      };
      
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          cleanup();
          reject(new CancelError());
        } else if (event.key === 'Enter' && this.selected.length >= this.min) {
          cleanup();
          resolve(this.selected);
        }
      };
      
      const cleanup = () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('keydown', handleKeyDown);
      };
      
      window.addEventListener('click', handleClick);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('keydown', handleKeyDown);
      
      return cleanup;
    });
  }
  
  private async raycast(
    screenX: number, 
    screenY: number
  ): Promise<SelectionResult | null> {
    // Get ray from camera
    const ray = this.screenToRay(screenX, screenY);
    
    // Raycast against all objects
    const hits = await invoke<RaycastHit[]>('cad_raycast', {
      origin: ray.origin,
      direction: ray.direction,
      modes: this.mode,
    });
    
    if (hits.length === 0) return null;
    
    // Return closest valid hit
    return hits[0];
  }
  
  private screenToRay(x: number, y: number) {
    // Convert screen coords to world ray using camera
    // This uses Three.js camera projection
    return { origin: [0,0,0], direction: [0,0,-1] };
  }
}
```

### 5.2 Backend Raycast

```rust
// crates/cadhy-cad/src/raycast.rs (NUEVO)

use crate::shape::Shape;

#[derive(Debug, Clone, Serialize)]
pub struct RaycastHit {
    pub object_id: String,
    pub element_type: ElementType,
    pub element_index: i32,
    pub point: (f64, f64, f64),
    pub normal: (f64, f64, f64),
    pub distance: f64,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub enum ElementType {
    Solid,
    Face,
    Edge,
    Vertex,
}

pub struct Raycast;

impl Raycast {
    /// Raycast against a shape, returning all hits
    pub fn cast(
        shape: &Shape,
        origin: (f64, f64, f64),
        direction: (f64, f64, f64),
        modes: &[ElementType],
    ) -> Vec<RaycastHit> {
        let mut hits = Vec::new();
        
        // Use BRepIntCurveSurface for face intersections
        if modes.contains(&ElementType::Face) || modes.contains(&ElementType::Solid) {
            hits.extend(Self::cast_faces(shape, origin, direction));
        }
        
        // Use BRepExtrema for edge proximity
        if modes.contains(&ElementType::Edge) {
            hits.extend(Self::cast_edges(shape, origin, direction));
        }
        
        // Check vertex proximity
        if modes.contains(&ElementType::Vertex) {
            hits.extend(Self::cast_vertices(shape, origin, direction));
        }
        
        // Sort by distance
        hits.sort_by(|a, b| a.distance.partial_cmp(&b.distance).unwrap());
        
        hits
    }
    
    fn cast_faces(
        shape: &Shape,
        origin: (f64, f64, f64),
        direction: (f64, f64, f64),
    ) -> Vec<RaycastHit> {
        // Use IntCurvesFace_Intersector
        ffi::raycast_faces(shape.inner(), origin, direction)
    }
    
    fn cast_edges(
        shape: &Shape,
        origin: (f64, f64, f64),
        direction: (f64, f64, f64),
    ) -> Vec<RaycastHit> {
        // Use BRepExtrema with tolerance
        ffi::raycast_edges(shape.inner(), origin, direction, EDGE_PICK_TOLERANCE)
    }
    
    fn cast_vertices(
        shape: &Shape,
        origin: (f64, f64, f64),
        direction: (f64, f64, f64),
    ) -> Vec<RaycastHit> {
        // Check proximity to line
        ffi::raycast_vertices(shape.inner(), origin, direction, VERTEX_PICK_TOLERANCE)
    }
}
```

---

## 6. Fase 5: Sistema de Snaps (2 semanas)

### 6.1 Snap Manager

**Archivo**: `packages/snap/src/SnapManager.ts` (NUEVO)

```typescript
export interface Snap {
  id: string;
  name: string;
  type: SnapType;
  priority: number;
  
  project(point: Vec3, direction?: Vec3): SnapResult | null;
  isActive(): boolean;
}

export enum SnapType {
  Grid = 'grid',
  Endpoint = 'endpoint',
  Midpoint = 'midpoint',
  Center = 'center',
  Intersection = 'intersection',
  Perpendicular = 'perpendicular',
  Tangent = 'tangent',
  Nearest = 'nearest',
  Axis = 'axis',
  Plane = 'plane',
}

export interface SnapResult {
  snap: Snap;
  position: Vec3;
  displayPosition?: Vec3;  // For visualization
  normal?: Vec3;
  param?: number;
}

export class SnapManager {
  private snaps: Map<string, Snap> = new Map();
  private enabled = true;
  private activeTypes: Set<SnapType> = new Set(Object.values(SnapType));
  
  register(snap: Snap): void {
    this.snaps.set(snap.id, snap);
  }
  
  unregister(id: string): void {
    this.snaps.delete(id);
  }
  
  findBestSnap(
    point: Vec3,
    direction?: Vec3,
    threshold?: number,
  ): SnapResult | null {
    if (!this.enabled) return null;
    
    let bestResult: SnapResult | null = null;
    let bestDistance = threshold ?? Infinity;
    
    for (const snap of this.snaps.values()) {
      if (!this.activeTypes.has(snap.type)) continue;
      if (!snap.isActive()) continue;
      
      const result = snap.project(point, direction);
      if (!result) continue;
      
      const distance = vec3.distance(point, result.position);
      const adjustedDistance = distance / snap.priority;
      
      if (adjustedDistance < bestDistance) {
        bestDistance = adjustedDistance;
        bestResult = result;
      }
    }
    
    return bestResult;
  }
  
  setTypeEnabled(type: SnapType, enabled: boolean): void {
    if (enabled) {
      this.activeTypes.add(type);
    } else {
      this.activeTypes.delete(type);
    }
  }
}

// Snap implementations
export class GridSnap implements Snap {
  id = 'grid';
  name = 'Grid';
  type = SnapType.Grid;
  priority = 1;
  
  constructor(private gridSize: number = 1) {}
  
  project(point: Vec3): SnapResult {
    const snapped = {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize,
      z: Math.round(point.z / this.gridSize) * this.gridSize,
    };
    return { snap: this, position: snapped };
  }
  
  isActive() { return true; }
}

export class EndpointSnap implements Snap {
  id = 'endpoint';
  name = 'Endpoint';
  type = SnapType.Endpoint;
  priority = 10;  // Higher priority than grid
  
  constructor(private getVertices: () => Vec3[]) {}
  
  project(point: Vec3): SnapResult | null {
    const vertices = this.getVertices();
    let closest: Vec3 | null = null;
    let closestDist = Infinity;
    
    for (const v of vertices) {
      const dist = vec3.distance(point, v);
      if (dist < closestDist) {
        closestDist = dist;
        closest = v;
      }
    }
    
    if (!closest) return null;
    return { snap: this, position: closest };
  }
  
  isActive() { return true; }
}

export class AxisSnap implements Snap {
  id: string;
  name: string;
  type = SnapType.Axis;
  priority = 5;
  
  constructor(
    private origin: Vec3,
    private direction: Vec3,
    name: string,
  ) {
    this.id = `axis-${name}`;
    this.name = `${name} Axis`;
  }
  
  project(point: Vec3): SnapResult {
    // Project point onto infinite line
    const projected = projectPointOnLine(point, this.origin, this.direction);
    return { snap: this, position: projected };
  }
  
  isActive() { return true; }
}
```

---

## 7. Resumen de Archivos a Crear

### Rust (crates/cadhy-cad/src/)

```
crates/cadhy-cad/src/
├── lib.rs                    # Actualizar exports
├── curves.rs                 # NUEVO - Curve creation
├── curve_operations.rs       # NUEVO - Curve manipulation
├── face_operations.rs        # NUEVO - Face operations
├── edge_operations.rs        # NUEVO - Edge operations
├── patterns.rs               # NUEVO - Array patterns
├── raycast.rs                # NUEVO - Raycasting
├── advanced_operations.rs    # NUEVO - Draft, thicken, etc.
└── snap_points.rs            # NUEVO - Snap point generation
```

### C++ FFI (crates/cadhy-cad/cpp/)

```
cpp/
├── include/bridge.h          # Actualizar con nuevas funciones
├── bridge.cpp                # Implementar nuevas funciones
├── curves.cpp                # NUEVO - Curve implementations
├── face_ops.cpp              # NUEVO - Face operation implementations
└── raycast.cpp               # NUEVO - Raycast implementation
```

### TypeScript (packages/)

```
packages/
├── picker/                   # NUEVO
│   ├── src/
│   │   ├── ObjectPicker.ts
│   │   ├── PointPicker.ts
│   │   ├── SelectionMode.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── snap/                     # NUEVO
│   ├── src/
│   │   ├── Snap.ts
│   │   ├── SnapManager.ts
│   │   ├── snaps/
│   │   │   ├── GridSnap.ts
│   │   │   ├── EndpointSnap.ts
│   │   │   ├── MidpointSnap.ts
│   │   │   ├── CenterSnap.ts
│   │   │   ├── IntersectionSnap.ts
│   │   │   ├── AxisSnap.ts
│   │   │   └── PlaneSnap.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── command/                  # AMPLIAR
│   └── src/
│       ├── commands/         # NUEVO
│       │   ├── LineCommand.ts
│       │   ├── CircleCommand.ts
│       │   ├── ArcCommand.ts
│       │   ├── RectangleCommand.ts
│       │   ├── ExtrudeCommand.ts
│       │   ├── RevolveCommand.ts
│       │   ├── FilletCommand.ts
│       │   └── ...
│
├── factory/                  # AMPLIAR
│   └── src/
│       ├── curves/           # NUEVO
│       │   ├── LineFactory.ts
│       │   ├── CircleFactory.ts
│       │   ├── ArcFactory.ts
│       │   └── ...
│       └── operations/       # NUEVO
│           ├── ExtrudeFactory.ts
│           ├── RevolveFactory.ts
│           └── ...
```

---

## 8. Timeline

| Fase | Descripción | Semanas | Prioridad |
|------|-------------|---------|-----------|
| **1** | Curvas y Sketching | 4 | 🔴 Crítico |
| **2** | Face/Edge Operations | 3 | 🔴 Crítico |
| **3** | Operaciones Avanzadas | 3 | ⚠️ Importante |
| **4** | Sistema de Selección | 3 | 🔴 Crítico |
| **5** | Sistema de Snaps | 2 | 🔴 Crítico |
| **6** | Commands UI | 2 | ⚠️ Importante |
| **7** | Testing & Polish | 2 | ⚠️ Importante |
| **TOTAL** | | **19 semanas** | |

---

## 9. Métricas de Éxito

### Funcionalidades CAD Completas

- [ ] 20+ tipos de curvas
- [ ] 15+ operaciones de curvas (trim, offset, bridge, etc.)
- [ ] 10+ operaciones de caras
- [ ] 5+ operaciones de aristas
- [ ] 3 tipos de arrays (linear, rectangular, polar)
- [ ] Selección de face/edge/vertex
- [ ] 8+ tipos de snap

### Paridad con Plasticity

- [ ] Todos los primitivos
- [ ] Boolean operations
- [ ] Fillet/Chamfer con variantes
- [ ] Extrude con draft y twist
- [ ] Sweep con aux spine
- [ ] Loft multi-section
- [ ] Face offset/move/remove
- [ ] Edge operations
- [ ] Arrays/patterns
- [ ] Object picker
- [ ] Point picker con snaps

---

**Última Actualización**: 2025-12-21
**Versión**: 1.0.0
