# Plan de Mejoras CADHY basado en Chilli3D

**Fecha:** 2025-12-21
**Autor:** Claude Sonnet 4.5
**Status:** ✅ Ready for Implementation
**Prioridad:** Alta

---

## 📋 Executive Summary

Este plan detalla las mejoras concretas para CADHY inspiradas en la arquitectura de **Chilli3D v0.6.1**, un CAD web de código abierto construido con OpenCASCADE + WebAssembly + Three.js.

**Objetivo:** Aprovechar las mejores prácticas de Chilli3D manteniendo las ventajas nativas de CADHY (Rust + OpenCASCADE 7.9.2 nativo + Tauri).

---

## 🎯 Ventajas Competitivas de CADHY (mantener)

No perder de vista que CADHY tiene ventajas fundamentales:

| Aspecto | CADHY | Chilli3D | Ganador |
|---------|-------|----------|---------|
| **Motor CAD** | OCCT 7.9.2 nativo | OCCT WASM | **CADHY** ⚡ (2-5x más rápido) |
| **Plataforma** | Desktop multiplataforma | Solo web | **CADHY** |
| **Safety** | Rust + C++ | TypeScript + C++ | **CADHY** |
| **Performance** | Nativo | WebAssembly | **CADHY** |
| **Especialización** | Hidráulica | CAD general | **CADHY** |

---

## 🚀 Fase 1: Quick Wins (1-2 semanas)

### 1.1 Integrar three-mesh-bvh (Prioridad: CRÍTICA)

**Problema:** Selección lenta en modelos complejos (raycasting básico de Three.js)
**Solución:** Bounding Volume Hierarchy para acelerar 10-100x el picking
**Impacto:** ⭐⭐⭐⭐⭐ (performance inmediata)
**Esfuerzo:** 🔧 (30 minutos)

#### Paso 1: Instalar dependencia
```bash
cd apps/desktop
bun add three-mesh-bvh
```

#### Paso 2: Configurar en viewport
**Archivo:** `apps/desktop/src/components/modeller/viewport/SceneContent.tsx`

```typescript
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';

// Extend Three.js prototypes (at top of file, outside component)
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// En el componente SceneContent, después de crear meshes:
useEffect(() => {
  if (geometry && geometry.attributes.position) {
    geometry.computeBoundsTree();
  }

  return () => {
    geometry?.disposeBoundsTree?.();
  };
}, [geometry]);
```

#### Paso 3: Actualizar tipos TypeScript
**Archivo:** `apps/desktop/src/types/three-mesh-bvh.d.ts` (crear nuevo)

```typescript
import { BufferGeometry, Mesh } from 'three';

declare module 'three' {
  interface BufferGeometry {
    computeBoundsTree(): void;
    disposeBoundsTree(): void;
    boundsTree?: any;
  }

  interface Mesh {
    raycast: (raycaster: Raycaster, intersects: Intersection[]) => void;
  }
}
```

**Testing:**
```bash
# Abrir DevTools en viewport y medir:
console.time('raycast');
// Hacer click en objeto complejo
console.timeEnd('raycast');
// Antes: ~50-200ms
# Después: ~1-5ms
```

---

### 1.2 Exponer Operaciones CAD Existentes (Prioridad: ALTA)

**Problema:** CADHY ya tiene sweep, loft, helix en FFI pero no están en la UI
**Solución:** Crear Tauri commands y UI para operaciones implementadas
**Impacto:** ⭐⭐⭐⭐ (15+ operaciones nuevas sin tocar C++)
**Esfuerzo:** 🔧🔧 (2-3 días)

#### Paso 1: Crear comandos Tauri
**Archivo:** `apps/desktop/src-tauri/src/commands/cad_advanced.rs` (crear nuevo)

```rust
use cadhy_cad::{Operations, Shape, Curves};
use crate::state::ShapeRegistry;
use tauri::State;

#[tauri::command]
pub fn sweep_profile(
    profile_id: String,
    spine_id: String,
    contact_correction: bool,
    registry: State<ShapeRegistry>,
) -> Result<String, String> {
    let ops = Operations::new();

    let profile = registry.get(&profile_id)
        .ok_or("Profile not found")?;
    let spine = registry.get(&spine_id)
        .ok_or("Spine not found")?;

    let result = if contact_correction {
        ops.sweep_with_contact(&profile, &spine)
    } else {
        ops.sweep(&profile, &spine)
    }
    .map_err(|e| e.to_string())?;

    let shape_id = uuid::Uuid::new_v4().to_string();
    registry.insert(shape_id.clone(), result);

    Ok(shape_id)
}

#[tauri::command]
pub fn create_loft(
    profile_ids: Vec<String>,
    solid: bool,
    ruled: bool,
    registry: State<ShapeRegistry>,
) -> Result<String, String> {
    let ops = Operations::new();

    let profiles: Vec<Shape> = profile_ids
        .iter()
        .map(|id| {
            registry.get(id)
                .ok_or(format!("Profile {} not found", id))
                .cloned()
        })
        .collect::<Result<Vec<_>, _>>()?;

    let result = ops.loft(&profiles, solid, ruled)
        .map_err(|e| e.to_string())?;

    let shape_id = uuid::Uuid::new_v4().to_string();
    registry.insert(shape_id.clone(), result);

    Ok(shape_id)
}

#[tauri::command]
pub fn create_helix(
    radius: f64,
    pitch: f64,
    height: f64,
    left_handed: bool,
    registry: State<ShapeRegistry>,
) -> Result<String, String> {
    let ops = Operations::new();

    let result = ops.helix(radius, pitch, height, left_handed)
        .map_err(|e| e.to_string())?;

    let shape_id = uuid::Uuid::new_v4().to_string();
    registry.insert(shape_id.clone(), result);

    Ok(shape_id)
}

#[tauri::command]
pub fn apply_draft_angle(
    shape_id: String,
    angle_degrees: f64,
    neutral_plane_z: f64,
    registry: State<ShapeRegistry>,
) -> Result<String, String> {
    let ops = Operations::new();

    let shape = registry.get(&shape_id)
        .ok_or("Shape not found")?;

    let result = ops.draft(
        &shape,
        angle_degrees.to_radians(),
        neutral_plane_z
    )
    .map_err(|e| e.to_string())?;

    let new_id = uuid::Uuid::new_v4().to_string();
    registry.insert(new_id.clone(), result);

    Ok(new_id)
}
```

#### Paso 2: Registrar comandos en main.rs
**Archivo:** `apps/desktop/src-tauri/src/main.rs`

```rust
mod commands;
use commands::cad_advanced::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ... existing commands
            sweep_profile,
            create_loft,
            create_helix,
            apply_draft_angle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### Paso 3: Crear UI Components
**Archivo:** `apps/desktop/src/components/modeller/creators/SweepCreator.tsx` (crear nuevo)

```typescript
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function SweepCreator() {
  const [profileId, setProfileId] = useState('');
  const [spineId, setSpineId] = useState('');
  const [contactCorrection, setContactCorrection] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setLoading(true);
      const resultId = await invoke<string>('sweep_profile', {
        profileId,
        spineId,
        contactCorrection,
      });

      // Actualizar escena con nuevo shape
      console.log('Sweep created:', resultId);
    } catch (error) {
      console.error('Sweep failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold">Sweep</h3>

      <div>
        <Label>Profile (Wire/Face)</Label>
        <input
          type="text"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          placeholder="Select profile in viewport"
          className="w-full"
        />
      </div>

      <div>
        <Label>Spine (Wire/Edge)</Label>
        <input
          type="text"
          value={spineId}
          onChange={(e) => setSpineId(e.target.value)}
          placeholder="Select spine in viewport"
          className="w-full"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="contact"
          checked={contactCorrection}
          onCheckedChange={setContactCorrection}
        />
        <Label htmlFor="contact">Contact Correction</Label>
      </div>

      <Button
        onClick={handleCreate}
        disabled={!profileId || !spineId || loading}
      >
        {loading ? 'Creating...' : 'Create Sweep'}
      </Button>
    </div>
  );
}
```

**Repetir para:**
- `LoftCreator.tsx` (múltiples perfiles, solid/ruled)
- `HelixCreator.tsx` (radius, pitch, height, left-handed)
- `DraftCreator.tsx` (angle, neutral plane)

---

### 1.3 Sketching 2D Avanzado (Prioridad: ALTA)

**Problema:** CADHY solo tiene líneas y rectángulos, faltan arcs, ellipses, B-splines
**Solución:** Agregar funciones C++ inspiradas en Chilli3D
**Impacto:** ⭐⭐⭐⭐ (sketching profesional)
**Esfuerzo:** 🔧🔧🔧 (3-4 días)

#### Paso 1: Agregar funciones C++ en bridge.cpp
**Archivo:** `crates/cadhy-cad/cpp/bridge.cpp`

```cpp
// Arc por 3 puntos
std::unique_ptr<TopoDS_Shape> create_arc_3points(
    double x1, double y1, double z1,
    double x2, double y2, double z2,
    double x3, double y3, double z3
) {
    try {
        gp_Pnt p1(x1, y1, z1);
        gp_Pnt p2(x2, y2, z2);
        gp_Pnt p3(x3, y3, z3);

        Handle(Geom_TrimmedCurve) arc = GC_MakeArcOfCircle(p1, p2, p3).Value();
        BRepBuilderAPI_MakeEdge mkEdge(arc);

        if (!mkEdge.IsDone()) {
            throw std::runtime_error("Failed to create arc through 3 points");
        }

        return std::make_unique<TopoDS_Shape>(mkEdge.Edge());
    } catch (const Standard_Failure& e) {
        throw std::runtime_error(std::string("OCCT error: ") + e.GetMessageString());
    }
}

// Elipse paramétrica
std::unique_ptr<TopoDS_Shape> create_ellipse(
    double cx, double cy, double cz,
    double major_radius, double minor_radius,
    double nx, double ny, double nz,
    double start_angle, double end_angle
) {
    try {
        gp_Pnt center(cx, cy, cz);
        gp_Dir normal(nx, ny, nz);
        gp_Ax2 axes(center, normal);

        gp_Elips ellipse(axes, major_radius, minor_radius);

        Handle(Geom_Curve) curve;
        if (std::abs(end_angle - start_angle - 2 * M_PI) < 1e-6) {
            // Full ellipse
            curve = new Geom_Ellipse(ellipse);
        } else {
            // Partial ellipse
            curve = new Geom_TrimmedCurve(
                new Geom_Ellipse(ellipse),
                start_angle,
                end_angle
            );
        }

        BRepBuilderAPI_MakeEdge mkEdge(curve);
        return std::make_unique<TopoDS_Shape>(mkEdge.Edge());
    } catch (const Standard_Failure& e) {
        throw std::runtime_error(std::string("OCCT error: ") + e.GetMessageString());
    }
}

// B-spline por interpolación de puntos
std::unique_ptr<TopoDS_Shape> create_bspline_interpolation(
    const rust::Vec<Point3D>& points,
    bool periodic,
    double tolerance
) {
    try {
        if (points.size() < 2) {
            throw std::runtime_error("Need at least 2 points for interpolation");
        }

        TColgp_Array1OfPnt pnts(1, points.size());
        for (size_t i = 0; i < points.size(); i++) {
            pnts.SetValue(i + 1, gp_Pnt(points[i].x, points[i].y, points[i].z));
        }

        Handle(TColgp_HArray1OfPnt) hPnts = new TColgp_HArray1OfPnt(pnts);

        GeomAPI_Interpolate interp(hPnts, periodic, tolerance);
        interp.Perform();

        if (!interp.IsDone()) {
            throw std::runtime_error("B-spline interpolation failed");
        }

        Handle(Geom_BSplineCurve) curve = interp.Curve();
        BRepBuilderAPI_MakeEdge mkEdge(curve);

        return std::make_unique<TopoDS_Shape>(mkEdge.Edge());
    } catch (const Standard_Failure& e) {
        throw std::runtime_error(std::string("OCCT error: ") + e.GetMessageString());
    }
}

// Bezier por puntos de control
std::unique_ptr<TopoDS_Shape> create_bezier_curve(
    const rust::Vec<Point3D>& control_points
) {
    try {
        if (control_points.size() < 2) {
            throw std::runtime_error("Need at least 2 control points");
        }

        TColgp_Array1OfPnt poles(1, control_points.size());
        for (size_t i = 0; i < control_points.size(); i++) {
            poles.SetValue(i + 1, gp_Pnt(
                control_points[i].x,
                control_points[i].y,
                control_points[i].z
            ));
        }

        Handle(Geom_BezierCurve) curve = new Geom_BezierCurve(poles);
        BRepBuilderAPI_MakeEdge mkEdge(curve);

        return std::make_unique<TopoDS_Shape>(mkEdge.Edge());
    } catch (const Standard_Failure& e) {
        throw std::runtime_error(std::string("OCCT error: ") + e.GetMessageString());
    }
}

// Offset 2D de wire
std::unique_ptr<TopoDS_Shape> offset_wire_2d(
    const TopoDS_Wire& wire,
    double offset
) {
    try {
        BRepOffsetAPI_MakeOffset mkOffset;
        mkOffset.Init(GeomAbs_Arc);  // Arc connection at corners
        mkOffset.AddWire(wire);
        mkOffset.Perform(offset);

        if (!mkOffset.IsDone()) {
            throw std::runtime_error("Wire offset failed");
        }

        return std::make_unique<TopoDS_Shape>(mkOffset.Shape());
    } catch (const Standard_Failure& e) {
        throw std::runtime_error(std::string("OCCT error: ") + e.GetMessageString());
    }
}
```

#### Paso 2: Exponer en FFI
**Archivo:** `crates/cadhy-cad/src/ffi.rs`

```rust
#[cxx::bridge(namespace = "cadhy")]
mod ffi {
    // ... existing code ...

    unsafe extern "C++" {
        fn create_arc_3points(
            x1: f64, y1: f64, z1: f64,
            x2: f64, y2: f64, z2: f64,
            x3: f64, y3: f64, z3: f64,
        ) -> Result<UniquePtr<TopoDS_Shape>>;

        fn create_ellipse(
            cx: f64, cy: f64, cz: f64,
            major_radius: f64, minor_radius: f64,
            nx: f64, ny: f64, nz: f64,
            start_angle: f64, end_angle: f64,
        ) -> Result<UniquePtr<TopoDS_Shape>>;

        fn create_bspline_interpolation(
            points: &Vec<Point3D>,
            periodic: bool,
            tolerance: f64,
        ) -> Result<UniquePtr<TopoDS_Shape>>;

        fn create_bezier_curve(
            control_points: &Vec<Point3D>,
        ) -> Result<UniquePtr<TopoDS_Shape>>;

        fn offset_wire_2d(
            wire: &TopoDS_Wire,
            offset: f64,
        ) -> Result<UniquePtr<TopoDS_Shape>>;
    }
}
```

#### Paso 3: Wrapper Rust
**Archivo:** `crates/cadhy-cad/src/curves.rs`

```rust
impl Curves {
    /// Create arc through 3 points
    pub fn arc_through_3_points(
        &self,
        p1: Point3D,
        p2: Point3D,
        p3: Point3D,
    ) -> Result<Shape> {
        let shape = ffi::create_arc_3points(
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z,
        )?;
        Ok(Shape::from_ptr(shape))
    }

    /// Create ellipse (full or partial)
    pub fn ellipse(
        &self,
        center: Point3D,
        major_radius: f64,
        minor_radius: f64,
        normal: Vector3D,
        start_angle: f64,
        end_angle: f64,
    ) -> Result<Shape> {
        let shape = ffi::create_ellipse(
            center.x, center.y, center.z,
            major_radius, minor_radius,
            normal.x, normal.y, normal.z,
            start_angle, end_angle,
        )?;
        Ok(Shape::from_ptr(shape))
    }

    /// Create B-spline curve through points
    pub fn bspline_interpolation(
        &self,
        points: &[Point3D],
        periodic: bool,
        tolerance: f64,
    ) -> Result<Shape> {
        let shape = ffi::create_bspline_interpolation(points, periodic, tolerance)?;
        Ok(Shape::from_ptr(shape))
    }

    /// Create Bezier curve from control points
    pub fn bezier_curve(&self, control_points: &[Point3D]) -> Result<Shape> {
        let shape = ffi::create_bezier_curve(control_points)?;
        Ok(Shape::from_ptr(shape))
    }

    /// Offset 2D wire
    pub fn offset_wire_2d(&self, wire: &Shape, offset: f64) -> Result<Shape> {
        // wire debe ser TopoDS_Wire
        let shape = ffi::offset_wire_2d(wire.as_wire()?, offset)?;
        Ok(Shape::from_ptr(shape))
    }
}
```

#### Paso 4: Tests
**Archivo:** `crates/cadhy-cad/tests/curves_test.rs` (crear nuevo)

```rust
#[test]
fn test_arc_3points() {
    let curves = Curves::new();
    let p1 = Point3D { x: 0.0, y: 0.0, z: 0.0 };
    let p2 = Point3D { x: 1.0, y: 1.0, z: 0.0 };
    let p3 = Point3D { x: 2.0, y: 0.0, z: 0.0 };

    let arc = curves.arc_through_3_points(p1, p2, p3).unwrap();
    assert!(arc.is_valid());
}

#[test]
fn test_ellipse() {
    let curves = Curves::new();
    let center = Point3D { x: 0.0, y: 0.0, z: 0.0 };
    let normal = Vector3D { x: 0.0, y: 0.0, z: 1.0 };

    let ellipse = curves.ellipse(
        center,
        2.0,  // major
        1.0,  // minor
        normal,
        0.0,
        std::f64::consts::PI * 2.0,
    ).unwrap();

    assert!(ellipse.is_valid());
}

#[test]
fn test_bspline_interpolation() {
    let curves = Curves::new();
    let points = vec![
        Point3D { x: 0.0, y: 0.0, z: 0.0 },
        Point3D { x: 1.0, y: 1.0, z: 0.0 },
        Point3D { x: 2.0, y: 0.5, z: 0.0 },
        Point3D { x: 3.0, y: 1.5, z: 0.0 },
    ];

    let spline = curves.bspline_interpolation(&points, false, 1e-6).unwrap();
    assert!(spline.is_valid());
}
```

---

## 🏗️ Fase 2: Arquitectura Modular (3-4 semanas)

### 2.1 Reorganización en Paquetes Granulares

**Problema:** Código monolítico en `apps/desktop/src/`, dificulta testing y reutilización
**Solución:** Estructura de paquetes inspirada en Chilli3D
**Impacto:** ⭐⭐⭐⭐ (mantenibilidad, testing, reutilización)
**Esfuerzo:** 🔧🔧🔧🔧 (1-2 semanas)

#### Estructura Objetivo

```
packages/
├── @cadhy/core/           # Domain models, types, interfaces
│   ├── src/
│   │   ├── types/
│   │   ├── models/
│   │   ├── interfaces/
│   │   └── utils/
│   └── package.json
│
├── @cadhy/cad/            # CAD operations (wrapper de Rust)
│   ├── src/
│   │   ├── primitives/
│   │   ├── operations/
│   │   ├── curves/
│   │   └── analysis/
│   └── package.json
│
├── @cadhy/viewer/         # Three.js + R3F components
│   ├── src/
│   │   ├── viewport/
│   │   ├── meshes/
│   │   ├── cameras/
│   │   └── controls/
│   └── package.json
│
├── @cadhy/hydraulics/     # Hydraulic-specific logic
│   ├── src/
│   │   ├── channel/
│   │   ├── chute/
│   │   ├── transition/
│   │   └── analysis/
│   └── package.json
│
├── @cadhy/ui/             # Shared UI components
│   ├── src/
│   │   ├── layout/
│   │   ├── panels/
│   │   ├── dialogs/
│   │   └── controls/
│   └── package.json
│
├── @cadhy/command/        # Command pattern + undo/redo
│   ├── src/
│   │   ├── command.ts
│   │   ├── manager.ts
│   │   └── commands/
│   └── package.json
│
├── @cadhy/controls/       # Input handling, hotkeys
│   ├── src/
│   │   ├── keyboard/
│   │   ├── mouse/
│   │   └── hotkeys/
│   └── package.json
│
└── @cadhy/storage/        # Persistence layer
    ├── src/
    │   ├── project.ts
    │   ├── settings.ts
    │   └── cache.ts
    └── package.json
```

#### package.json base
**Archivo:** `packages/core/package.json`

```json
{
  "name": "@cadhy/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./models": "./src/models/index.ts",
    "./utils": "./src/utils/index.ts"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.8.3"
  }
}
```

#### tsconfig path mapping
**Archivo:** `apps/desktop/tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@cadhy/core": ["../../packages/core/src"],
      "@cadhy/core/*": ["../../packages/core/src/*"],
      "@cadhy/cad": ["../../packages/cad/src"],
      "@cadhy/cad/*": ["../../packages/cad/src/*"],
      "@cadhy/viewer": ["../../packages/viewer/src"],
      "@cadhy/viewer/*": ["../../packages/viewer/src/*"],
      "@cadhy/hydraulics": ["../../packages/hydraulics/src"],
      "@cadhy/hydraulics/*": ["../../packages/hydraulics/src/*"],
      "@cadhy/ui": ["../../packages/ui/src"],
      "@cadhy/ui/*": ["../../packages/ui/src/*"],
      "@cadhy/command": ["../../packages/command/src"],
      "@cadhy/command/*": ["../../packages/command/src/*"],
      "@cadhy/controls": ["../../packages/controls/src"],
      "@cadhy/controls/*": ["../../packages/controls/src/*"],
      "@cadhy/storage": ["../../packages/storage/src"],
      "@cadhy/storage/*": ["../../packages/storage/src/*"]
    }
  }
}
```

#### Migración gradual (ejemplo: @cadhy/core)

**Paso 1:** Crear paquete
```bash
mkdir -p packages/core/src/{types,models,utils}
cd packages/core
bun init -y
```

**Paso 2:** Mover types
```bash
mv apps/desktop/src/types/*.ts packages/core/src/types/
```

**Paso 3:** Actualizar imports
```typescript
// Antes:
import { Shape, Point3D } from '@/types';

// Después:
import { Shape, Point3D } from '@cadhy/core/types';
```

**Paso 4:** Validar
```bash
bun typecheck
bun lint
```

**Repetir para cada paquete.**

---

### 2.2 Sistema de Comandos con Undo/Redo Robusto

**Problema:** Undo/redo básico, no hay command history visualizable
**Solución:** Command pattern inspirado en Chilli3D
**Impacto:** ⭐⭐⭐⭐ (UX profesional)
**Esfuerzo:** 🔧🔧🔧 (1 semana)

Ver implementación completa en `.agents/reports/CHILLI3D-COMPARISON.md` sección "Prioridad 5".

**Archivos a crear:**
- `packages/command/src/command.ts` - Interfaces
- `packages/command/src/manager.ts` - CommandManager
- `packages/command/src/commands/` - Comandos concretos
- `apps/desktop/src/components/modeller/CommandHistory.tsx` - UI

---

## 🎨 Fase 3: Sistema de Iconos (1 semana)

### 3.1 Migrar de Lucide React a SVG Icon Font

**Problema:** Lucide React carga todos los iconos (bundle size grande)
**Solución:** Sistema de iconos como Chilli3D (SVG sprite sheet)
**Impacto:** ⭐⭐⭐ (bundle size reducido, iconos custom)
**Esfuerzo:** 🔧🔧 (3-4 días)

Ver sección completa más abajo: "Estrategia de Iconos de Chilli3D".

---

## 🔬 Fase 4: Mesh Quality & Analysis (2 semanas)

### 4.1 Surface Analysis

**Agregar en `bridge.cpp`:**

```cpp
struct SurfaceAnalysis {
    rust::String type;  // "plane", "cylinder", "cone", "sphere", "torus", "bspline"
    double area;
    double curvature_max;
    double curvature_min;
    rust::Vec<double> center;
    rust::Vec<double> normal;
    double radius;  // para cilindros, esferas
};

SurfaceAnalysis analyze_face(const TopoDS_Face& face) {
    SurfaceAnalysis result;

    Handle(Geom_Surface) surf = BRep_Tool::Surface(face);

    if (surf->IsKind(STANDARD_TYPE(Geom_Plane))) {
        result.type = "plane";
        Handle(Geom_Plane) plane = Handle(Geom_Plane)::DownCast(surf);
        gp_Pln pln = plane->Pln();

        gp_Dir normal = pln.Axis().Direction();
        result.normal = {normal.X(), normal.Y(), normal.Z()};

        gp_Pnt loc = pln.Location();
        result.center = {loc.X(), loc.Y(), loc.Z()};

        result.curvature_max = 0.0;
        result.curvature_min = 0.0;

    } else if (surf->IsKind(STANDARD_TYPE(Geom_CylindricalSurface))) {
        result.type = "cylinder";
        Handle(Geom_CylindricalSurface) cyl =
            Handle(Geom_CylindricalSurface)::DownCast(surf);

        double radius = cyl->Radius();
        result.radius = radius;
        result.curvature_max = 1.0 / radius;
        result.curvature_min = 0.0;

        gp_Ax3 ax = cyl->Position();
        gp_Pnt loc = ax.Location();
        result.center = {loc.X(), loc.Y(), loc.Z()};

        gp_Dir axis = ax.Direction();
        result.normal = {axis.X(), axis.Y(), axis.Z()};

    } else if (surf->IsKind(STANDARD_TYPE(Geom_SphericalSurface))) {
        result.type = "sphere";
        Handle(Geom_SphericalSurface) sph =
            Handle(Geom_SphericalSurface)::DownCast(surf);

        double radius = sph->Radius();
        result.radius = radius;
        result.curvature_max = 1.0 / radius;
        result.curvature_min = 1.0 / radius;

        gp_Pnt loc = sph->Location();
        result.center = {loc.X(), loc.Y(), loc.Z()};

    } else if (surf->IsKind(STANDARD_TYPE(Geom_ConicalSurface))) {
        result.type = "cone";
        // ... similar

    } else if (surf->IsKind(STANDARD_TYPE(Geom_ToroidalSurface))) {
        result.type = "torus";
        // ... similar

    } else if (surf->IsKind(STANDARD_TYPE(Geom_BSplineSurface))) {
        result.type = "bspline";
        // curvature analysis más complejo

    } else {
        result.type = "unknown";
    }

    // Compute area
    GProp_GProps props;
    BRepGProp::SurfaceProperties(face, props);
    result.area = props.Mass();

    return result;
}
```

**UI:** Panel de análisis mostrando tipo de superficie, curvaturas, área, etc.

---

### 4.2 Mesh Quality Parameters

**Agregar en `bridge.cpp`:**

```cpp
struct MeshQualityParams {
    double linear_deflection;
    double angular_deflection;
    bool relative;
    bool in_parallel;
    double min_size;
    double max_size;
};

std::unique_ptr<TessellationResult> tessellate_with_quality(
    const TopoDS_Shape& shape,
    const MeshQualityParams& params
) {
    BRepMesh_IncrementalMesh mesher(
        shape,
        params.linear_deflection,
        params.relative,
        params.angular_deflection,
        params.in_parallel
    );

    mesher.SetMinSize(params.min_size);
    mesher.SetMaxSize(params.max_size);
    mesher.Perform();

    // ... convert to TessellationResult
}
```

**UI:** Settings para controlar calidad de mesh (Low, Medium, High, Custom).

---

## 📅 Timeline & Roadmap

### Sprint 1 (Semana 1-2): Quick Wins
- ✅ Integrar three-mesh-bvh
- ✅ Exponer sweep/loft/helix via Tauri
- ✅ Crear UI para operaciones existentes

### Sprint 2 (Semana 3-4): Sketching 2D
- ✅ Agregar arc, ellipse, B-spline, Bezier en C++
- ✅ Exponer en Rust FFI
- ✅ Crear UI creators
- ✅ Tests

### Sprint 3 (Semana 5-6): Arquitectura
- ✅ Crear paquetes @cadhy/*
- ✅ Migrar código a paquetes
- ✅ Actualizar imports
- ✅ Validar build

### Sprint 4 (Semana 7-8): Comandos
- ✅ Implementar command pattern
- ✅ CommandManager con undo/redo
- ✅ UI command history
- ✅ Tests

### Sprint 5 (Semana 9-10): Iconos
- ✅ Crear SVG icon font
- ✅ Migrar de Lucide React
- ✅ UI icon picker

### Sprint 6 (Semana 11-12): Analysis
- ✅ Surface analysis en C++
- ✅ Mesh quality params
- ✅ UI analysis panel

---

## 📊 Métricas de Éxito

| Métrica | Antes | Después (Objetivo) |
|---------|-------|-------------------|
| **Performance Selection** | 50-200ms | 1-5ms |
| **CAD Operations** | ~20 | ~40+ |
| **Sketching 2D** | Líneas, rectángulos | + Arcs, ellipses, B-splines, Bezier |
| **Bundle Size** | ~2MB | ~1.5MB (iconos optimizados) |
| **Test Coverage** | ~30% | ~60% |
| **Undo/Redo** | Básico | Robusto con history |
| **Code Organization** | Monolítico | Paquetes granulares |

---

## 🎯 Next Steps

1. **Revisar este plan** con el equipo
2. **Priorizar** sprints según necesidades del proyecto
3. **Empezar con Sprint 1** (quick wins)
4. **Iterar** y ajustar según feedback

---

**Status:** ✅ Ready for Implementation
**Última actualización:** 2025-12-21
