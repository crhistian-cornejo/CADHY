# CADHY Architecture Refactoring Plan

## Inspiración: Estructura de Blender

Basado en la [arquitectura de Blender](https://developer.blender.org/docs/features/code_layout/):

| Blender Directory | Propósito | CADHY Equivalente |
|-------------------|-----------|-------------------|
| `source/blender/blenkernel` | Kernel (data structures, low-level) | `crates/cadhy-core` |
| `source/blender/blenlib` | Utilities (math, lists, memory) | `packages/shared` |
| `source/blender/bmesh` | Mesh editing API | `crates/cadhy-cad/cpp/src/edit/` |
| `source/blender/editors` | Tools, operators, UI | `apps/desktop/src/components` |
| `source/blender/geometry` | Mesh functions | `crates/cadhy-mesh` |
| `source/blender/io` | Import/Export | `crates/cadhy-export` |
| `source/blender/gpu` | GPU/shaders | `packages/viewer` |
| `intern/cycles` | Rendering engine | `packages/viewer/src/components` |

---

## Estado Actual: Problemas

### 1. Monolito C++ (bridge.cpp = 4,867 líneas)
```
Secciones actuales:
├── PRIMITIVE CREATION (línea 19)
├── SHAPE OPERATIONS (línea 429)
├── BOOLEAN OPERATIONS (línea 474)
├── MODIFICATION OPERATIONS (línea 544)
├── TRANSFORM OPERATIONS (línea 968)
├── SURFACE/SOLID GENERATION (línea 1085)
├── LOFT/SWEEP OPERATIONS (línea 1121)
├── WIRE/SKETCH OPERATIONS (línea 1308)
├── TESSELLATION (línea 1581)
├── BREP I/O (línea 1936)
├── STEP/IGES I/O (línea 2000)
├── MODERN FORMAT EXPORT (línea 2060)
├── SHAPE ANALYSIS & VALIDATION (línea 2232)
├── ADVANCED DISTANCE MEASUREMENT (línea 2532)
├── MEASUREMENT/PROPERTIES (línea 2630)
├── SHAPE UTILITIES (línea 2744)
├── HLR PROJECTION (línea 2783)
├── ENHANCED HLR PROJECTION V2 (línea 3468)
├── SECTION WITH HATCHING (línea 3848)
├── TOPOLOGY EXTRACTION (línea 4148)
└── EXPLODE/IMPLODE (línea 4587)
```

### 2. Impacto en Rendimiento
- Compilación lenta: todo el archivo se recompila por cualquier cambio
- Sin compilación paralela de módulos
- Headers pesados incluidos en todo

---

## Nueva Estructura Propuesta

```
crates/cadhy-cad/
├── cpp/
│   ├── CMakeLists.txt           # Build system modular
│   ├── include/
│   │   └── cadhy/               # Namespace principal
│   │       ├── core/
│   │       │   ├── types.hpp        # OcctShape, Point3D, etc.
│   │       │   ├── memory.hpp       # Smart pointers, allocators
│   │       │   └── error.hpp        # Exception handling
│   │       ├── primitives/
│   │       │   ├── box.hpp
│   │       │   ├── cylinder.hpp
│   │       │   ├── sphere.hpp
│   │       │   ├── cone.hpp
│   │       │   ├── torus.hpp
│   │       │   └── primitives.hpp   # All primitives
│   │       ├── boolean/
│   │       │   └── boolean.hpp      # Fuse, Cut, Common
│   │       ├── modify/
│   │       │   ├── fillet.hpp
│   │       │   ├── chamfer.hpp
│   │       │   ├── offset.hpp
│   │       │   ├── shell.hpp
│   │       │   ├── draft.hpp
│   │       │   └── modify.hpp       # All modifications
│   │       ├── transform/
│   │       │   └── transform.hpp    # Translate, Rotate, Scale, Mirror
│   │       ├── sweep/
│   │       │   ├── extrude.hpp
│   │       │   ├── revolve.hpp
│   │       │   ├── loft.hpp
│   │       │   ├── pipe.hpp
│   │       │   └── sweep.hpp        # All sweeps
│   │       ├── wire/
│   │       │   └── wire.hpp         # Wire/sketch operations
│   │       ├── mesh/
│   │       │   ├── tessellation.hpp
│   │       │   └── mesh.hpp
│   │       ├── io/
│   │       │   ├── step.hpp
│   │       │   ├── iges.hpp
│   │       │   ├── brep.hpp
│   │       │   ├── gltf.hpp
│   │       │   └── io.hpp
│   │       ├── edit/                # ★ NUEVO: Face/Edge editing
│   │       │   ├── selection.hpp    # Face/Edge/Vertex selection
│   │       │   ├── face_ops.hpp     # Push/Pull, Inset, Offset
│   │       │   ├── edge_ops.hpp     # Split, Bridge, Loop
│   │       │   └── edit.hpp
│   │       ├── projection/
│   │       │   ├── hlr.hpp          # Hidden Line Removal
│   │       │   ├── section.hpp      # Cross-sections
│   │       │   └── projection.hpp
│   │       ├── analysis/
│   │       │   ├── validate.hpp
│   │       │   ├── measure.hpp
│   │       │   ├── distance.hpp
│   │       │   └── analysis.hpp
│   │       └── cadhy.hpp            # Master header
│   └── src/
│       ├── core/
│       │   └── types.cpp
│       ├── primitives/
│       │   └── primitives.cpp
│       ├── boolean/
│       │   └── boolean.cpp
│       ├── modify/
│       │   └── modify.cpp
│       ├── transform/
│       │   └── transform.cpp
│       ├── sweep/
│       │   └── sweep.cpp
│       ├── wire/
│       │   └── wire.cpp
│       ├── mesh/
│       │   └── mesh.cpp
│       ├── io/
│       │   └── io.cpp
│       ├── edit/                    # ★ NUEVO
│       │   ├── selection.cpp
│       │   ├── face_ops.cpp
│       │   └── edge_ops.cpp
│       ├── projection/
│       │   └── projection.cpp
│       ├── analysis/
│       │   └── analysis.cpp
│       └── ffi/
│           └── bridge.cpp           # Solo FFI bindings (delgado)
├── src/                             # Rust bindings
│   ├── lib.rs
│   ├── ffi.rs                       # cxx bridge
│   ├── primitives.rs
│   ├── boolean.rs
│   ├── modify.rs
│   ├── transform.rs
│   ├── sweep.rs
│   ├── wire.rs
│   ├── mesh.rs
│   ├── io.rs
│   ├── edit.rs                      # ★ NUEVO
│   ├── projection.rs
│   └── analysis.rs
└── Cargo.toml
```

---

## Fase 1: Modularización C++ (Prioridad Alta)

### 1.1 Crear estructura de carpetas
```bash
mkdir -p crates/cadhy-cad/cpp/include/cadhy/{core,primitives,boolean,modify,transform,sweep,wire,mesh,io,edit,projection,analysis}
mkdir -p crates/cadhy-cad/cpp/src/{core,primitives,boolean,modify,transform,sweep,wire,mesh,io,edit,projection,analysis,ffi}
```

### 1.2 Actualizar CMakeLists.txt
```cmake
# Compilación modular para paralelismo
add_library(cadhy_cad_core STATIC
    src/core/types.cpp
)

add_library(cadhy_cad_primitives STATIC
    src/primitives/primitives.cpp
)

add_library(cadhy_cad_boolean STATIC
    src/boolean/boolean.cpp
)

# ... etc

# Biblioteca final que enlaza todo
add_library(cadhy_cad STATIC
    src/ffi/bridge.cpp
)
target_link_libraries(cadhy_cad
    cadhy_cad_core
    cadhy_cad_primitives
    cadhy_cad_boolean
    # ...
)
```

---

## Fase 2: Implementar Face/Edge Editing (edit/)

### 2.1 selection.hpp - Selección de geometría
```cpp
namespace cadhy::edit {

// Get face by index from shape topology
std::unique_ptr<OcctShape> get_face_by_index(
    const OcctShape& shape,
    int32_t index
);

// Get edge by index
std::unique_ptr<OcctShape> get_edge_by_index(
    const OcctShape& shape,
    int32_t index
);

// Get face normal vector
std::array<double, 3> get_face_normal(
    const OcctShape& shape,
    int32_t face_index
);

// Get face center point
std::array<double, 3> get_face_center(
    const OcctShape& shape,
    int32_t face_index
);

// Get adjacent faces for an edge
std::vector<int32_t> get_adjacent_faces(
    const OcctShape& shape,
    int32_t edge_index
);

} // namespace cadhy::edit
```

### 2.2 face_ops.hpp - Operaciones de caras
```cpp
namespace cadhy::edit {

// Push/Pull face (like Plasticity Offset Face)
std::unique_ptr<OcctShape> push_pull_face(
    const OcctShape& solid,
    int32_t face_index,
    double distance,
    bool boolean_merge = true
);

// Inset face (like Blender inset_individual)
std::unique_ptr<OcctShape> inset_face(
    const OcctShape& solid,
    int32_t face_index,
    double thickness,
    double depth = 0.0
);

// Offset face (move face without creating volume)
std::unique_ptr<OcctShape> offset_face(
    const OcctShape& solid,
    int32_t face_index,
    double distance
);

// Extrude faces with boolean option
std::unique_ptr<OcctShape> extrude_faces(
    const OcctShape& solid,
    const std::vector<int32_t>& face_indices,
    double dx, double dy, double dz,
    bool boolean_union = true
);

} // namespace cadhy::edit
```

### 2.3 edge_ops.hpp - Operaciones de aristas
```cpp
namespace cadhy::edit {

// Split edge at parameter
std::unique_ptr<OcctShape> split_edge(
    const OcctShape& shape,
    int32_t edge_index,
    double parameter  // 0.0 to 1.0
);

// Bridge two edge loops
std::unique_ptr<OcctShape> bridge_edge_loops(
    const OcctShape& shape,
    const std::vector<int32_t>& loop1_edges,
    const std::vector<int32_t>& loop2_edges
);

// Create edge loop around face
std::vector<int32_t> get_face_edge_loop(
    const OcctShape& shape,
    int32_t face_index
);

} // namespace cadhy::edit
```

---

## Fase 3: Optimizaciones de Rendimiento

### 3.1 Precompiled Headers (PCH)
```cpp
// pch.hpp - Precompiled header
#pragma once

// Heaviest OpenCASCADE headers
#include <TopoDS.hxx>
#include <TopoDS_Shape.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
// ...
```

### 3.2 Lazy Tessellation
```cpp
class OcctShape {
    mutable std::optional<MeshData> cached_mesh_;
    mutable std::mutex mesh_mutex_;

public:
    const MeshData& get_mesh(double deflection = 0.1) const {
        std::lock_guard lock(mesh_mutex_);
        if (!cached_mesh_) {
            cached_mesh_ = tessellate(deflection);
        }
        return *cached_mesh_;
    }

    void invalidate_cache() {
        std::lock_guard lock(mesh_mutex_);
        cached_mesh_.reset();
    }
};
```

### 3.3 Object Pooling
```cpp
// Reuse OCCT objects to avoid allocation overhead
template<typename T>
class ObjectPool {
    std::vector<std::unique_ptr<T>> pool_;
    std::mutex mutex_;
public:
    std::unique_ptr<T> acquire();
    void release(std::unique_ptr<T> obj);
};
```

---

## Fase 4: Reorganización Monorepo

### Nueva estructura raíz
```
CADHY/
├── apps/
│   ├── desktop/                 # Tauri app
│   └── web/                     # Marketing site
├── crates/                      # Rust libraries
│   ├── cadhy-cad/              # OpenCASCADE bridge
│   ├── cadhy-core/             # Core types
│   ├── cadhy-mesh/             # Mesh processing
│   ├── cadhy-export/           # File export
│   ├── cadhy-ifc/              # IFC support
│   ├── cadhy-hydraulics/       # Domain logic
│   └── cadhy-project/          # Project management
├── packages/                    # TS/JS libraries
│   ├── ui/                     # shadcn components
│   ├── viewer/                 # Three.js viewer
│   ├── gizmo/                  # Transform gizmos
│   ├── types/                  # Shared types
│   ├── shared/                 # Utilities
│   └── ai/                     # AI integration
├── tools/                       # Dev tools
│   ├── scripts/                # Build/release scripts
│   └── generators/             # Code generators
├── docs/                        # Documentation
├── tests/                       # Integration tests
│   ├── e2e/
│   └── performance/
└── .agents/                     # AI context
```

---

## Métricas de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| bridge.cpp líneas | 4,867 | < 500 (solo FFI) |
| Tiempo de compilación C++ | ~60s | < 20s |
| Módulos C++ | 1 | 12+ |
| Face editing operations | 0 | 6+ |
| Test coverage C++ | 0% | > 60% |

---

## Orden de Implementación

1. **Semana 1**: Crear estructura de carpetas y headers
2. **Semana 2**: Extraer primitives/, boolean/, modify/
3. **Semana 3**: Extraer transform/, sweep/, wire/
4. **Semana 4**: Extraer mesh/, io/, projection/
5. **Semana 5**: Implementar edit/ (face/edge ops)
6. **Semana 6**: Optimizaciones de rendimiento
7. **Semana 7**: Tests y documentación
