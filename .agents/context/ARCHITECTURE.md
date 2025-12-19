# CADHY - Architecture Guide

> **Guía de arquitectura para agentes AI**

---

## 1. Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                      CADHY Desktop App                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                               │
│  ├── UI Layer (Components, Panels, Sidebar)                 │
│  ├── State Layer (Zustand Stores)                           │
│  └── Service Layer (Tauri IPC)                              │
├─────────────────────────────────────────────────────────────┤
│  Backend (Rust + Tauri)                                      │
│  ├── Command Layer (Tauri Commands)                         │
│  ├── Engine Layer (CAD, Hydraulics)                         │
│  └── Core Layer (Types, Math, Utils)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
CADHY/
├── apps/
│   └── desktop/              # Main Tauri app
│       ├── src/              # React frontend
│       └── src-tauri/        # Rust backend
│
├── packages/                 # Shared TS packages
│   ├── ui/                   # @cadhy/ui - Component library
│   ├── viewer/               # @cadhy/viewer - Three.js viewer
│   ├── types/                # @cadhy/types - Shared types
│   ├── ai/                   # @cadhy/ai - AI integration
│   └── config/               # @cadhy/config - Shared configs
│
├── crates/                   # Rust crates
│   ├── cadhy-core/           # Core types and math
│   ├── cadhy-cad/            # OpenCASCADE CAD engine
│   ├── cadhy-hydraulics/     # Hydraulic solvers
│   ├── cadhy-mesh/           # Mesh generation
│   ├── cadhy-export/         # File export (STEP, STL)
│   └── cadhy-project/        # Project file format
│
└── tools/                    # Build tools and scripts
```

---

## 3. Data Flow

### 3.1 User Action → Rust → UI Update

```
User clicks "Create Box"
        ↓
React Component calls store action
        ↓
Store calls Tauri invoke()
        ↓
Rust command executes CAD operation
        ↓
Returns MeshData
        ↓
Store updates state
        ↓
Three.js viewer re-renders
```

### 3.2 Sequence Diagram

```
┌──────┐     ┌───────┐     ┌─────────┐     ┌──────────┐     ┌────────┐
│ User │     │  UI   │     │  Store  │     │  Tauri   │     │  Rust  │
└──┬───┘     └───┬───┘     └────┬────┘     └────┬─────┘     └───┬────┘
   │             │              │               │               │
   │  Click      │              │               │               │
   │────────────>│              │               │               │
   │             │  dispatch    │               │               │
   │             │─────────────>│               │               │
   │             │              │  invoke()     │               │
   │             │              │──────────────>│               │
   │             │              │               │  command()    │
   │             │              │               │──────────────>│
   │             │              │               │               │
   │             │              │               │  MeshData     │
   │             │              │               │<──────────────│
   │             │              │  Result       │               │
   │             │              │<──────────────│               │
   │             │  re-render   │               │               │
   │             │<─────────────│               │               │
   │  Updated UI │              │               │               │
   │<────────────│              │               │               │
```

---

## 4. State Management

### 4.1 Store Architecture

```typescript
// Global stores (apps/desktop/src/stores/)
├── app-store.ts          # App-wide state (theme, sidebar)
├── project-store.ts      # Current project data
├── cad-store.ts          # CAD objects and operations
├── viewer-store.ts       # 3D viewer state (camera, selection)
├── hydraulic-store.ts    # Hydraulic analysis state
├── auth-store.ts         # Authentication and API keys
└── ui-store.ts           # UI state (panels, dialogs)
```

### 4.2 Store Pattern

```typescript
// Slice pattern for complex stores
interface CadStore {
  // State
  objects: CadObject[]
  selectedIds: string[]

  // Actions
  addObject: (obj: CadObject) => void
  removeObject: (id: string) => void
  selectObject: (id: string) => void

  // Async actions (Tauri)
  createPrimitive: (type: string, params: object) => Promise<void>
  executeBoolean: (op: string, ids: string[]) => Promise<void>
}
```

---

## 5. Component Architecture

### 5.1 Layout Hierarchy

```
<App>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppTitlebar />
      <AppLayout>
        <ViewerPanel />      {/* Center - 3D viewer */}
        <PropertiesPanel />  {/* Right - Properties */}
        <BottomPanel />      {/* Bottom - Results/Console */}
      </AppLayout>
      <AppStatusbar />
    </SidebarInset>
  </SidebarProvider>
</App>
```

### 5.2 Panel System

```typescript
// Panel types
type PanelId = "viewer" | "properties" | "results" | "console" | "ai-chat"

interface PanelConfig {
  id: PanelId
  title: string
  icon: HugeIcon
  minWidth?: number
  minHeight?: number
  defaultSize?: number
}
```

---

## 6. Rust Crate Dependencies

```
cadhy-desktop (Tauri app)
    │
    ├── cadhy-core
    │   └── (glam, serde, uuid)
    │
    ├── cadhy-cad
    │   ├── cadhy-core
    │   └── (opencascade-sys FFI)
    │
    ├── cadhy-hydraulics
    │   └── cadhy-core
    │
    ├── cadhy-mesh
    │   ├── cadhy-core
    │   └── cadhy-cad
    │
    ├── cadhy-export
    │   ├── cadhy-core
    │   └── cadhy-cad
    │
    └── cadhy-project
        └── cadhy-core
```

---

## 7. TypeScript Package Dependencies

```
@cadhy/desktop (app)
    │
    ├── @cadhy/ui
    │   └── (react, base-ui, hugeicons, cva)
    │
    ├── @cadhy/viewer
    │   ├── @cadhy/types
    │   └── (three, @react-three/fiber)
    │
    ├── @cadhy/types
    │   └── (zod)
    │
    ├── @cadhy/ai
    │   ├── @cadhy/types
    │   └── (ai, @ai-sdk/*)
    │
    └── @cadhy/config
        └── (typescript, biome)
```

---

## 8. File Formats

### 8.1 Project File (.cadhy)

```
project.cadhy (ZIP archive)
├── manifest.json       # Version, metadata
├── project.json        # Project settings
├── objects/            # CAD objects
│   ├── obj_001.json
│   └── obj_002.json
├── hydraulics/         # Hydraulic data
│   └── analysis.json
└── thumbnail.png       # Preview image
```

### 8.2 Export Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| STEP | .step, .stp | CAD interchange |
| STL | .stl | 3D printing, mesh |
| OBJ | .obj | General 3D |
| glTF | .gltf, .glb | Web, visualization |
| CSV | .csv | Hydraulic results |
| PDF | .pdf | Reports |

---

## 9. Error Handling

### 9.1 Frontend

```typescript
// Use Result pattern with error boundaries
try {
  const result = await invoke<MeshData>("create_box", params)
  store.addObject(result)
} catch (error) {
  toast.error("Failed to create box", {
    description: error.message,
  })
}
```

### 9.2 Backend (Rust)

```rust
// Use thiserror for typed errors
#[derive(thiserror::Error, Debug)]
pub enum CadError {
    #[error("Invalid parameters: {0}")]
    InvalidParams(String),

    #[error("OpenCASCADE error: {0}")]
    OcctError(String),

    #[error("Shape not found: {0}")]
    ShapeNotFound(String),
}

// Return Result from commands
#[tauri::command]
async fn create_box(...) -> Result<MeshData, CadError> {
    // ...
}
```

---

## 10. Performance Guidelines

### 10.1 React

- Use `React.memo` for expensive components
- Use `useMemo` for computed values
- Use `useCallback` for event handlers passed to children
- Virtualize long lists

### 10.2 Three.js

- Reuse geometries and materials
- Use instancing for repeated objects
- Implement LOD for complex scenes
- Dispose resources when unmounting

### 10.3 Rust

- Use `rayon` for parallel computation
- Cache tessellation results
- Use arena allocation for temporary shapes
- Profile with `cargo flamegraph`

---

## 11. Native Library Bundling

### 11.1 macOS OCCT Dylibs

CADHY depends on OpenCASCADE (OCCT) native libraries. For standalone distribution, these must be bundled with the app.

**Problem**: When compiling with Rust, dylibs are linked with absolute Homebrew paths (`/opt/homebrew/opt/opencascade/lib/...`). Users without Homebrew OCCT will get crashes.

**Solution**: Bundle dylibs in `Frameworks/` directory with relative paths.

```
CADHY.app/
├── Contents/
│   ├── MacOS/
│   │   └── CADHY                    # Main binary
│   └── Frameworks/
│       ├── libTKernel.7.9.dylib     # 33 OCCT libs
│       ├── libTKMath.7.9.dylib
│       ├── libfreetype.6.dylib      # Dependencies
│       ├── libpng16.16.dylib
│       ├── libtbb.12.dylib
│       └── libtbbmalloc.2.dylib
```

**Scripts**:

1. `scripts/occt/copy-dylibs-macos.sh` - Copies all 37 dylibs to `frameworks/`
2. `scripts/occt/fix-dylib-paths-macos.sh` - Rewrites paths and re-signs

**Path rewriting**:
```bash
# Before (broken)
/opt/homebrew/opt/opencascade/lib/libTKernel.7.9.dylib

# After (works standalone)
@executable_path/../Frameworks/libTKernel.7.9.dylib
```

**Tauri config** (`tauri.macos.conf.json`):
```json
{
  "bundle": {
    "macOS": {
      "frameworks": [
        "src-tauri/frameworks/libTKernel.7.9.dylib",
        ...
      ]
    }
  }
}
```

### 11.2 Windows OCCT DLLs

Windows bundles OCCT DLLs via `resources` in `tauri.windows.conf.json`:
- DLLs are copied to app directory alongside executable
- No path rewriting needed (Windows searches current directory)

### 11.3 CI/CD Integration

The GitHub Actions workflow (`release-app.yml`) handles this automatically:

```yaml
# macOS
- name: Install OpenCASCADE via Homebrew
  run: brew install opencascade freetype libpng tbb

- name: Copy OCCT dylibs for bundling
  run: chmod +x scripts/occt/*.sh && scripts/occt/copy-dylibs-macos.sh

- name: Build App
  run: bun run tauri:build --config src-tauri/tauri.macos.conf.json

- name: Fix dylib paths and re-sign
  run: scripts/occt/fix-dylib-paths-macos.sh
```

### 11.4 Local Development vs Release

| Environment | OCCT Source | Path Type |
|-------------|-------------|-----------|
| Local dev | Homebrew/vcpkg | Absolute (system) |
| CI release | Bundled in Frameworks | Relative (@executable_path) |

For local development, install OCCT via:
- **macOS**: `brew install opencascade freetype libpng tbb`
- **Windows**: Run `scripts/occt/setup.ps1` (uses vcpkg cache)
