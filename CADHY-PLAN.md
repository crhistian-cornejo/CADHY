# CADHY - Plan de Implementacion

> **CAD + Hidraulica Suite** | Desktop-First | Monorepo con Bun Workspaces + Cargo

---

## Estado Actual del Proyecto

### Resumen de Progreso

| Modulo | Estado | Completado |
|--------|--------|------------|
| **Modeller 3D** | Funcional | 85% |
| **Hydraulics Engine** | Funcional | 90% |
| **Transitions** | Funcional | 80% |
| **AI Assistant** | Funcional | 70% |
| **Export** | Pendiente | 10% |
| **Tests** | Parcial | 40% |

### Implementado (Diciembre 2024)

#### Backend Rust (crates/)
- **cadhy-core**: Tipos fundamentales, geometria, unidades, grafos
- **cadhy-cad**: OpenCASCADE FFI funcional (primitivas, booleans)
- **cadhy-hydraulics**: Completo con:
  - Secciones: Rectangular, Trapezoidal, Circular, Triangular, U-Shaped, Parabolic, Compound
  - Corridor Generator con solid walls/floor
  - Transitions: Linear, Warped, Cylindrical, Inlet, Outlet
  - Manning solver, GVF analysis, Hydraulic jump
  - Gate flow, Optimization, Saint-Venant equations
- **cadhy-mesh**: Generador de mallas con GMSH

#### Frontend (apps/desktop/src/)
- **components/modeller/**: Viewport3D, CreatePanel, ObjectsPanel, TransitionCreator
- **components/ai/**: AIChatPanel completo con streaming
- **components/layout/**: AppLayout, Sidebar, Titlebar, Statusbar
- **stores/**: modeller-store, auth-store, project-store
- **services/**: hydraulics-service, auth-service

### Pendiente

#### Crates Vacios
- **cadhy-export/**: Solo estructura, sin implementacion
- **cadhy-project/**: Solo estructura, sin implementacion

#### Carpetas Vacias (Frontend)
```
apps/desktop/src/features/
├── ai/
│   ├── hooks/     (vacio)
│   ├── stores/    (vacio)
│   └── utils/     (vacio)
├── cad/
│   ├── hooks/     (vacio)
│   ├── stores/    (vacio)
│   └── utils/     (vacio)
└── hydraulics/
    ├── hooks/     (vacio)
    ├── stores/    (vacio)
    └── utils/     (vacio)
```

---

## 1. Vision del Proyecto

**CADHY** es una suite de ingenieria civil con:

- **Modeller 3D** - Canales hidraulicos con geometria solida
- **Analisis Hidraulico** - Manning, GVF, Resalto, Estructuras
- **AI Assistant** - Vercel AI SDK + Claude/GPT
- **Export** - STEP, STL, OBJ (via Rust)

```
┌─────────────────────────────────────────────────────────────────┐
│  CADHY - Suite de Ingenieria Civil                              │
├─────────────────────────────────────────────────────────────────┤
│  Paginas:                                                       │
│  • /modeller  - Modelado 3D de canales y transiciones          │
│  • /mallador  - Generacion de mallas (futuro)                  │
│  • /analysis  - Analisis hidraulico detallado (futuro)         │
│  • /settings  - Configuracion de la app                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnologico

### Frontend
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 19.x | UI Framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling (OKLCH) |
| Three.js | 0.181 | Viewport 3D |
| @react-three/fiber | 9.x | React wrapper for Three.js |
| Zustand | 5.x | State management |
| Vercel AI SDK | 5.x | AI Integration |
| Vite | 7.x | Bundler |

### Backend (Rust)
| Crate | Estado | Proposito |
|-------|--------|-----------|
| cadhy-core | ✅ Completo | Tipos fundamentales (Vec3, Mesh, etc.) |
| cadhy-cad | ✅ Funcional | OpenCASCADE FFI (primitivas, booleans) |
| cadhy-hydraulics | ✅ Completo | Solvers hidraulicos + Corridor Generator |
| cadhy-mesh | ✅ Funcional | Generacion de mallas (GMSH) |
| cadhy-export | ❌ Vacio | STEP, STL, glTF export |
| cadhy-project | ❌ Vacio | Formato .cadhy |

### Desktop
| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Tauri | 2.x | Desktop framework |
| Bun | 1.x | Package manager |

---

## 3. Estructura del Monorepo (Actual)

```
CADHY/
├── apps/
│   └── desktop/                      # Tauri + React App
│       ├── src/
│       │   ├── app/                  # Entry point + routing
│       │   ├── components/
│       │   │   ├── ai/              # ✅ AIChatPanel
│       │   │   ├── common/          # ✅ WelcomeScreen, etc.
│       │   │   ├── layout/          # ✅ AppLayout, Sidebar
│       │   │   ├── modeller/        # ✅ Viewport3D, CreatePanel
│       │   │   ├── panels/          # ✅ PropertiesPanel
│       │   │   ├── project/         # ✅ NewProjectDialog
│       │   │   ├── settings/        # ✅ SettingsDialog
│       │   │   ├── sidebar/         # ✅ Navigation
│       │   │   └── tools/           # ✅ CAD tools
│       │   ├── features/            # ❌ Empty (planned)
│       │   ├── stores/              # ✅ Zustand stores
│       │   ├── services/            # ✅ Tauri services
│       │   ├── hooks/               # ✅ Custom hooks
│       │   ├── i18n/                # ✅ Internationalization
│       │   └── __tests__/           # ⚠️ 4 tests only
│       └── src-tauri/               # Rust backend
│           └── src/commands/        # ✅ Tauri commands
│
├── packages/
│   ├── ui/                          # ✅ @cadhy/ui components
│   ├── config/                      # ✅ Shared configs
│   └── types/                       # ⚠️ Minimal
│
└── crates/
    ├── cadhy-core/                  # ✅ 5 files, 4 tests
    ├── cadhy-cad/                   # ✅ OpenCASCADE FFI
    ├── cadhy-hydraulics/            # ✅ 20+ files, 7 tests
    ├── cadhy-mesh/                  # ✅ GMSH integration
    ├── cadhy-export/                # ❌ Empty
    └── cadhy-project/               # ❌ Empty
```

---

## 4. Paginas de la Aplicacion

### 4.1 /modeller (Implementado)

Pagina principal para modelado 3D de canales hidraulicos.

**Componentes:**
- `Viewport3D` - Renderizado Three.js con channels y transitions
- `CreatePanel` - Formulario para crear canales
- `TransitionCreator` - Formulario para crear transiciones
- `ObjectsPanel` - Lista de objetos con drag & drop
- `PropertiesPanel` - Edicion de propiedades del objeto seleccionado

**Objetos soportados:**
- Channels: Rectangular, Trapezoidal, Triangular, Circular
- Transitions: Linear, Warped, Cylindrical, Inlet, Outlet
- Shapes: Box, Cylinder, Sphere, Cone, Torus (basicos)

### 4.2 /mallador (Futuro)

Generacion de mallas para CFD.

**Componentes planificados:**
- MeshPreview - Visualizacion de malla
- MeshSettings - Configuracion de parametros
- ExportPanel - Export a formatos CFD

### 4.3 /analysis (Futuro)

Analisis hidraulico detallado.

**Componentes planificados:**
- ProfileChart - Graficos de perfiles
- ResultsTable - Tablas de resultados
- ComparisonView - Comparacion de escenarios

### 4.4 /settings (Implementado)

Configuracion de la aplicacion.

**Secciones:**
- General - Idioma, unidades
- AI Providers - API keys para Claude/GPT
- Theme - Modo oscuro/claro
- Hotkeys - Atajos de teclado

---

## 5. Arquitectura de Datos

### 5.1 Modeller Store

```typescript
interface ModellerStore {
  // Scene objects
  objects: Map<string, AnySceneObject>;
  selectedIds: string[];
  hoveredId: string | null;

  // Object types
  type ObjectType = 'shape' | 'channel' | 'transition';

  // Channel definition
  interface ChannelObject {
    type: 'channel';
    section: ChannelSection;
    length: number;
    slope: number;
    startStation: number;
    startElevation: number;
    // ...
  }

  // Transition definition
  interface TransitionObject {
    type: 'transition';
    transitionType: TransitionTypeEnum;
    inlet: TransitionSection;
    outlet: TransitionSection;
    length: number;
    // ...
  }
}
```

### 5.2 Tauri Commands (Backend)

```rust
// Geometry
generate_channel_mesh(input: ChannelGeometryInput) -> MeshResult
generate_transition_mesh(input: TransitionGeometryDef) -> MeshResult
export_mesh_to_file(mesh, path, format) -> String

// Hydraulics
analyze_channel(params, depth) -> FlowAnalysis
calculate_normal_depth(params, discharge) -> f64
calculate_critical_depth(params, discharge) -> f64
analyze_water_profile(params, ...) -> WaterProfileResult

// Project
create_project(name, path) -> ProjectInfo
open_project(path) -> ProjectInfo
save_project() -> ()
```

---

## 6. Roadmap de Implementacion

### Fase 1: Consolidacion (Actual)

- [x] Corridor Generator con solid geometry
- [x] Transitions entre canales
- [x] Normal recalculation para lighting correcto
- [x] AI Assistant funcional
- [ ] Tests comprensivos para hydraulics
- [ ] Tests para frontend components
- [ ] Limpiar carpetas vacias

### Fase 2: Export y Proyecto

- [ ] Implementar cadhy-export
  - [ ] STL export (ASCII y binario)
  - [ ] OBJ export
  - [ ] STEP export (via OpenCASCADE)
- [ ] Implementar cadhy-project
  - [ ] Formato .cadhy (JSON + assets)
  - [ ] Save/Load completo
  - [ ] Recent projects

### Fase 3: Mallador

- [ ] Pagina /mallador
- [ ] Integracion con cadhy-mesh
- [ ] Preview de malla en Viewport
- [ ] Export para OpenFOAM

### Fase 4: Analysis

- [ ] Pagina /analysis
- [ ] Graficos interactivos
- [ ] Tablas editables
- [ ] Reportes PDF

### Fase 5: Polish

- [ ] Performance optimization
- [ ] Documentacion completa
- [ ] CI/CD pipeline
- [ ] Release builds

---

## 7. Tests Requeridos

### Backend (Rust)

```rust
// cadhy-hydraulics/tests/
✅ hydraulics_tests.rs    - Manning, Critical depth
✅ sections_tests.rs      - Section properties
✅ alignment_tests.rs     - Alignment generation
✅ corridor_tests.rs      - Mesh generation
✅ transitions_tests.rs   - Transition interpolation
✅ hydraulic_jump_tests.rs - Jump calculations
✅ structures_tests.rs    - Weirs, gates

// Pendientes
[ ] corridor_solid_tests.rs - Wall/floor generation
[ ] normal_tests.rs         - Normal recalculation
[ ] export_tests.rs         - STL/OBJ export
```

### Frontend (TypeScript)

```typescript
// Existentes (4)
✅ modeller-store.test.ts
✅ auth-store.test.ts
✅ project-service.test.ts
✅ hydraulics-service.test.ts

// Pendientes
[ ] Viewport3D.test.tsx
[ ] CreatePanel.test.tsx
[ ] TransitionCreator.test.tsx
[ ] ObjectsPanel.test.tsx
```

---

## 8. Comandos de Desarrollo

```bash
# Setup inicial
bun install
cargo build

# Desarrollo
bun dev                    # Tauri dev mode

# Build
bun build                  # Build release
bun tauri build           # Build instalador

# Tests
bun test                   # Frontend tests
cargo test                 # Rust tests
cargo test --package cadhy-hydraulics

# Quality
bun lint                   # Biome lint
cargo clippy              # Rust lint
```

---

## 9. Notas Tecnicas

### 9.1 Sistema de Coordenadas

- **Backend (Rust)**: Z-up (ingenieria)
  - X: Direccion de flujo (longitudinal)
  - Y: Transversal
  - Z: Vertical (elevacion)

- **Frontend (Three.js)**: Y-up (graficos)
  - X: Direccion de flujo
  - Y: Vertical (elevacion)
  - Z: Transversal (negado)

Transformacion en `meshResultToBufferGeometry()`:
```typescript
positions[i] = x;       // X -> X
positions[i+1] = z;     // Z -> Y (vertical)
positions[i+2] = -y;    // Y -> -Z (transversal)
```

### 9.2 Generacion de Normales

El sistema usa `recalculate_normals()` para:
1. Calcular normales por cara
2. Promediar en vertices compartidos
3. Normalizar para iluminacion correcta

### 9.3 Secciones de Canal

Profile order: `[0=bottom-left, 1=bottom-right, 2=top-right, 3=top-left]`

Solid walls:
- Left wall: `inner[0,3]` <-> `outer[0,3]`
- Right wall: `inner[1,2]` <-> `outer[1,2]`
- Floor: `inner[0,1]` <-> `outer[0,1]`

---

## 10. Proximos Pasos

1. **Implementar tests pendientes**
2. **Implementar cadhy-export**
3. **Implementar cadhy-project**
4. **Crear pagina /mallador**
5. **Documentar API publica**

---

> **Ultima actualizacion**: Diciembre 2024
> **Version**: 0.1.0-alpha
