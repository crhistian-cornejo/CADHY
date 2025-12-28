# Comparación Chilli3D vs CADHY - Oportunidades de Mejora

**Fecha:** 2025-12-21
**Versiones:** Chilli3D v0.6.1 | CADHY (desarrollo activo)

## 🎯 Resumen Ejecutivo

CADHY tiene ventajas fundamentales:
- ✅ **OpenCASCADE 7.9.2 nativo** (más reciente y rápido que WASM)
- ✅ **Desktop multiplataforma** (mejor UX que web)
- ✅ **Más operaciones CAD** implementadas en Rust/C++

Chilli3D tiene ventajas arquitectónicas:
- ✅ **three-mesh-bvh** para selección ultra-rápida
- ✅ **Arquitectura granular** de paquetes
- ✅ **Sistema de comandos** robusto
- ✅ **Sketching 2D completo** en C++

---

## 🚀 Mejoras Prioritarias para CADHY

### Prioridad 1: Performance de Selección (1-2 días)

**Integrar three-mesh-bvh:**

```bash
cd apps/desktop
bun add three-mesh-bvh
```

**Modificar:** `apps/desktop/src/components/modeller/viewport/SceneContent.tsx`

```typescript
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';

// Extend Three.js prototypes
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
```

**Impacto:** 10-100x más rápido en picking de objetos complejos

---

### Prioridad 2: Exponer Operaciones Existentes (2-3 días)

**Crear Tauri commands para operaciones ya implementadas:**

`apps/desktop/src-tauri/src/commands/cad_advanced.rs`:

```rust
use cadhy_cad::{Operations, Shape};

#[tauri::command]
pub fn sweep_profile(
    profile_id: String,
    spine_id: String,
    contact_correction: bool,
) -> Result<String, String> {
    let ops = Operations::new();
    let profile = get_shape(&profile_id)?;
    let spine = get_shape(&spine_id)?;

    let result = if contact_correction {
        ops.sweep_with_contact(&profile, &spine)
    } else {
        ops.sweep(&profile, &spine)
    }?;

    let shape_id = store_shape(result);
    Ok(shape_id)
}

#[tauri::command]
pub fn create_loft(
    profile_ids: Vec<String>,
    solid: bool,
    ruled: bool,
) -> Result<String, String> {
    let ops = Operations::new();
    let profiles: Vec<Shape> = profile_ids
        .iter()
        .map(|id| get_shape(id))
        .collect::<Result<Vec<_>, _>>()?;

    let result = ops.loft(&profiles, solid, ruled)?;
    let shape_id = store_shape(result);
    Ok(shape_id)
}

#[tauri::command]
pub fn create_helix(
    radius: f64,
    pitch: f64,
    height: f64,
    left_handed: bool,
) -> Result<String, String> {
    let ops = Operations::new();
    let result = ops.helix(radius, pitch, height, left_handed)?;
    let shape_id = store_shape(result);
    Ok(shape_id)
}

#[tauri::command]
pub fn apply_draft_angle(
    shape_id: String,
    angle_degrees: f64,
    neutral_plane_z: f64,
) -> Result<String, String> {
    let ops = Operations::new();
    let shape = get_shape(&shape_id)?;

    let result = ops.draft(&shape, angle_degrees.to_radians(), neutral_plane_z)?;
    let shape_id = store_shape(result);
    Ok(shape_id)
}
```

**UI Components:**
- `apps/desktop/src/components/modeller/creators/SweepCreator.tsx`
- `apps/desktop/src/components/modeller/creators/LoftCreator.tsx`
- `apps/desktop/src/components/modeller/creators/HelixCreator.tsx`

**Impacto:** Exponer ~15 operaciones CAD que ya existen pero no están en UI

---

### Prioridad 3: Sketching 2D Avanzado (3-5 días)

**Agregar en `crates/cadhy-cad/cpp/bridge.cpp`:**

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

        Handle(Geom_TrimmedCurve) arc;
        if (std::abs(end_angle - start_angle - 2 * M_PI) < 1e-6) {
            // Full ellipse
            arc = new Geom_TrimmedCurve(new Geom_Ellipse(ellipse), 0, 2 * M_PI);
        } else {
            // Partial ellipse
            arc = new Geom_TrimmedCurve(
                new Geom_Ellipse(ellipse),
                start_angle,
                end_angle
            );
        }

        BRepBuilderAPI_MakeEdge mkEdge(arc);
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
    double offset,
    bool make_offset_shape
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

**Exponer en FFI (`crates/cadhy-cad/src/ffi.rs`):**

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
            make_offset_shape: bool,
        ) -> Result<UniquePtr<TopoDS_Shape>>;
    }
}
```

**Wrapper Rust (`crates/cadhy-cad/src/curves.rs`):**

```rust
impl Curves {
    pub fn arc_through_3_points(&self, p1: Point3D, p2: Point3D, p3: Point3D) -> Result<Shape> {
        let shape = ffi::create_arc_3points(
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z,
        )?;
        Ok(Shape::from_ptr(shape))
    }

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

    pub fn bspline_interpolation(
        &self,
        points: &[Point3D],
        periodic: bool,
        tolerance: f64,
    ) -> Result<Shape> {
        let shape = ffi::create_bspline_interpolation(points, periodic, tolerance)?;
        Ok(Shape::from_ptr(shape))
    }

    pub fn bezier_curve(&self, control_points: &[Point3D]) -> Result<Shape> {
        let shape = ffi::create_bezier_curve(control_points)?;
        Ok(Shape::from_ptr(shape))
    }
}
```

**Impacto:** Sketching 2D profesional (arcs, ellipses, B-splines, Bezier)

---

### Prioridad 4: Arquitectura de Paquetes Granular (1 semana)

**Crear estructura modular:**

```bash
mkdir -p packages/{core,cad,viewer,hydraulics,command,controls,storage}
```

**packages/core/package.json:**
```json
{
  "name": "@cadhy/core",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./utils": "./src/utils/index.ts"
  }
}
```

**Mover código:**
- `apps/desktop/src/types/` → `packages/core/src/types/`
- `apps/desktop/src/services/cad-*` → `packages/cad/src/`
- `apps/desktop/src/components/modeller/viewport/` → `packages/viewer/src/`
- Hydraulics-specific → `packages/hydraulics/src/`

**Actualizar tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@cadhy/core": ["../../packages/core/src"],
      "@cadhy/cad": ["../../packages/cad/src"],
      "@cadhy/viewer": ["../../packages/viewer/src"],
      "@cadhy/hydraulics": ["../../packages/hydraulics/src"]
    }
  }
}
```

**Impacto:**
- Reutilización entre desktop/web
- Testing aislado
- Tree-shaking mejorado
- Boundaries claros

---

### Prioridad 5: Sistema de Comandos con Undo/Redo Robusto (1 semana)

**Crear `packages/command/`:**

```typescript
// packages/command/src/command.ts
export interface Command {
  readonly id: string;
  readonly name: string;
  readonly timestamp: number;

  execute(): Promise<void>;
  undo(): Promise<void>;
  redo?(): Promise<void>;

  canMerge(other: Command): boolean;
  merge(other: Command): void;

  serialize(): string;
}

export abstract class BaseCommand implements Command {
  readonly id: string;
  readonly timestamp: number;

  constructor(public readonly name: string) {
    this.id = `${name}-${Date.now()}-${Math.random()}`;
    this.timestamp = Date.now();
  }

  abstract execute(): Promise<void>;
  abstract undo(): Promise<void>;

  redo(): Promise<void> {
    return this.execute();
  }

  canMerge(_other: Command): boolean {
    return false;
  }

  merge(_other: Command): void {
    throw new Error('Cannot merge this command');
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      name: this.name,
      timestamp: this.timestamp,
    });
  }
}

// packages/command/src/manager.ts
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize = 100;

  async execute(command: Command): Promise<void> {
    await command.execute();

    // Try to merge with last command
    const lastCommand = this.undoStack[this.undoStack.length - 1];
    if (lastCommand && lastCommand.canMerge(command)) {
      lastCommand.merge(command);
    } else {
      this.undoStack.push(command);

      // Limit stack size
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift();
      }
    }

    // Clear redo stack
    this.redoStack = [];
  }

  async undo(): Promise<void> {
    const command = this.undoStack.pop();
    if (!command) {
      throw new Error('Nothing to undo');
    }

    await command.undo();
    this.redoStack.push(command);
  }

  async redo(): Promise<void> {
    const command = this.redoStack.pop();
    if (!command) {
      throw new Error('Nothing to redo');
    }

    if (command.redo) {
      await command.redo();
    } else {
      await command.execute();
    }

    this.undoStack.push(command);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getHistory(): Command[] {
    return [...this.undoStack];
  }
}

// Ejemplo: CreateBoxCommand
export class CreateBoxCommand extends BaseCommand {
  private shapeId?: string;

  constructor(
    private width: number,
    private height: number,
    private depth: number,
  ) {
    super('Create Box');
  }

  async execute(): Promise<void> {
    const result = await invoke<string>('create_box', {
      width: this.width,
      height: this.height,
      depth: this.depth,
    });
    this.shapeId = result;
  }

  async undo(): Promise<void> {
    if (this.shapeId) {
      await invoke('delete_shape', { shapeId: this.shapeId });
    }
  }

  serialize(): string {
    return JSON.stringify({
      ...JSON.parse(super.serialize()),
      width: this.width,
      height: this.height,
      depth: this.depth,
      shapeId: this.shapeId,
    });
  }
}
```

**Integrar en UI:**
```typescript
// apps/desktop/src/components/modeller/CommandHistory.tsx
import { useCommandManager } from '@cadhy/command';

export function CommandHistory() {
  const { history, undo, redo, canUndo, canRedo } = useCommandManager();

  return (
    <div className="command-history">
      <div className="actions">
        <Button onClick={undo} disabled={!canUndo()}>
          Undo
        </Button>
        <Button onClick={redo} disabled={!canRedo()}>
          Redo
        </Button>
      </div>

      <div className="history-list">
        {history.map((cmd) => (
          <div key={cmd.id} className="history-item">
            {cmd.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Impacto:**
- Undo/Redo robusto
- Command history visualizable
- Command merging (ej: múltiples translate)
- Serialización para auto-save

---

### Prioridad 6: Mesh Quality y Analysis (2-3 días)

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

struct SurfaceAnalysis {
    rust::String type;  // "plane", "cylinder", "cone", "sphere", "torus", "bspline"
    double area;
    double curvature_max;
    double curvature_min;
    rust::Vec<double> center;
    rust::Vec<double> normal;
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

SurfaceAnalysis analyze_face(const TopoDS_Face& face) {
    SurfaceAnalysis result;

    // Get surface type
    Handle(Geom_Surface) surf = BRep_Tool::Surface(face);

    if (surf->IsKind(STANDARD_TYPE(Geom_Plane))) {
        result.type = "plane";
        Handle(Geom_Plane) plane = Handle(Geom_Plane)::DownCast(surf);
        gp_Pln pln = plane->Pln();

        result.normal = {pln.Axis().Direction().X(),
                        pln.Axis().Direction().Y(),
                        pln.Axis().Direction().Z()};
    } else if (surf->IsKind(STANDARD_TYPE(Geom_CylindricalSurface))) {
        result.type = "cylinder";
        Handle(Geom_CylindricalSurface) cyl =
            Handle(Geom_CylindricalSurface)::DownCast(surf);

        double radius = cyl->Radius();
        result.curvature_max = 1.0 / radius;
        result.curvature_min = 0.0;
    } else if (surf->IsKind(STANDARD_TYPE(Geom_SphericalSurface))) {
        result.type = "sphere";
        Handle(Geom_SphericalSurface) sph =
            Handle(Geom_SphericalSurface)::DownCast(surf);

        double radius = sph->Radius();
        result.curvature_max = 1.0 / radius;
        result.curvature_min = 1.0 / radius;
    }
    // ... more surface types

    // Compute area
    GProp_GProps props;
    BRepGProp::SurfaceProperties(face, props);
    result.area = props.Mass();

    return result;
}
```

**Impacto:** Análisis de calidad de mesh, clasificación de superficies

---

## 📋 Checklist de Implementación

### Corto Plazo (1-2 semanas)
- [ ] Integrar three-mesh-bvh para selección rápida
- [ ] Exponer sweep/loft/helix via Tauri commands
- [ ] Crear UI para operaciones existentes no expuestas
- [ ] Agregar sketching 2D avanzado (arcs, ellipses, B-splines)

### Mediano Plazo (1 mes)
- [ ] Reorganizar en paquetes granulares (@cadhy/core, @cadhy/cad, etc.)
- [ ] Implementar sistema de comandos robusto con undo/redo
- [ ] Agregar mesh quality params y surface analysis
- [ ] Crear UI para HLR projection (vistas técnicas 2D)

### Largo Plazo (2-3 meses)
- [ ] Constraint solver para sketching paramétrico
- [ ] Assembly support con multi-body operations
- [ ] Advanced material import/export (STEP con colores)
- [ ] Animation/keyframe export
- [ ] Draft/taper analysis visualization

---

## 🎓 Lecciones de Chilli3D

1. **Separación de responsabilidades:** Paquetes granulares facilitan mantenimiento
2. **C++ para operaciones complejas:** Mejor que llamar OpenCASCADE desde Rust
3. **BVH para performance:** Acelera raycasting en órdenes de magnitud
4. **Command pattern:** Esencial para undo/redo robusto
5. **Type safety:** TypeScript + embind generando .d.ts automáticamente

---

## 🏆 Ventajas Competitivas de CADHY

No pierdas de vista que CADHY tiene ventajas fundamentales:

1. **Performance nativa** vs WASM (2-5x más rápido en operaciones CAD complejas)
2. **Desktop multiplataforma** (mejor UX que web)
3. **OpenCASCADE 7.9.2** (la más reciente)
4. **Rust safety** (menos crashes que C++/TypeScript puro)
5. **Especialización hidráulica** (nicho específico vs CAD general)

**Usa lo mejor de Chilli3D sin perder tus fortalezas!**

---

## 📚 Referencias

- Chilli3D: https://github.com/xiangechen/chili3d
- OpenCASCADE Docs: https://dev.opencascade.org/doc/overview/html/
- three-mesh-bvh: https://github.com/gkjohnson/three-mesh-bvh
- Three.js: https://threejs.org/docs/

---

**Autor:** Claude Sonnet 4.5
**Fecha:** 2025-12-21
**Status:** Implementación recomendada
