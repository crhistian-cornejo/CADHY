# CADHY Desktop App - Complete Refactoring Plan

## Inspired by Blender, Plasticity & Shapr3D Architecture

---

## Executive Summary

This document outlines a comprehensive restructuring of the CADHY desktop application, inspired by:
- **Blender's** modular architecture with clear prefixes (BKE_, ED_, WM_, RNA_)
- **Plasticity's** streamlined NURBS workflow with Parasolid kernel integration
- **Shapr3D's** hybrid direct/parametric modeling with excellent UX

### Key Objectives
1. **Consistent Naming** - Blender-style prefixes for all modules
2. **Zero Redundancy** - Eliminate code duplication (currently ~30%)
3. **Clear Communication** - Frontend ← Tauri Commands ← Rust Backend ← C++ Kernel
4. **Optimized Rendering** - Proper shadows, textures, tessellation from C++
5. **Professional UX** - Unified icons, panels, dialogs

---

## Part 1: New Directory Structure

### Current vs Proposed Structure

```
apps/desktop/src/
├── app/                          # KEEP - Entry point
├── assets/                       # KEEP - Static assets
│
├── kernel/                       # NEW - Core kernel interfaces (like BKE_)
│   ├── KE_types.ts               # Core type definitions
│   ├── KE_mesh.ts                # Mesh operations interface
│   ├── KE_object.ts              # Object management
│   ├── KE_scene.ts               # Scene graph
│   ├── KE_geometry.ts            # Geometry utilities
│   ├── KE_material.ts            # Material system
│   ├── KE_modifier.ts            # Modifier stack
│   └── index.ts
│
├── operators/                    # NEW - Operations (like MESH_OT_, OBJECT_OT_)
│   ├── mesh/
│   │   ├── MESH_OT_select.ts
│   │   ├── MESH_OT_extrude.ts
│   │   ├── MESH_OT_bevel.ts
│   │   ├── MESH_OT_boolean.ts
│   │   └── index.ts
│   ├── object/
│   │   ├── OBJ_OT_transform.ts
│   │   ├── OBJ_OT_duplicate.ts
│   │   ├── OBJ_OT_delete.ts
│   │   └── index.ts
│   ├── view/
│   │   ├── VIEW_OT_rotate.ts
│   │   ├── VIEW_OT_pan.ts
│   │   ├── VIEW_OT_zoom.ts
│   │   └── index.ts
│   └── index.ts
│
├── editors/                      # NEW - UI Editors (like ED_)
│   ├── space_view3d/             # 3D Viewport editor
│   │   ├── ED_view3d_draw.tsx
│   │   ├── ED_view3d_select.tsx
│   │   ├── ED_view3d_gizmo.tsx
│   │   ├── ED_view3d_overlay.tsx
│   │   ├── ED_view3d_tools.tsx
│   │   └── index.ts
│   ├── space_properties/         # Properties panel editor
│   │   ├── ED_props_object.tsx
│   │   ├── ED_props_geometry.tsx
│   │   ├── ED_props_material.tsx
│   │   └── index.ts
│   ├── space_outliner/           # Scene tree editor
│   │   ├── ED_outliner_tree.tsx
│   │   ├── ED_outliner_ops.tsx
│   │   └── index.ts
│   ├── space_timeline/           # History/timeline editor
│   │   ├── ED_timeline_history.tsx
│   │   ├── ED_timeline_preview.tsx
│   │   └── index.ts
│   └── space_drawing/            # 2D Drawing editor
│       ├── ED_draw_viewport.tsx
│       ├── ED_draw_tools.tsx
│       └── index.ts
│
├── interface/                    # NEW - UI Components (like UI_)
│   ├── UI_panel.tsx              # Base panel component
│   ├── UI_dialog.tsx             # Base dialog component
│   ├── UI_toolbar.tsx            # Base toolbar component
│   ├── UI_menu.tsx               # Menu system
│   ├── UI_button.tsx             # Consistent button styles
│   ├── UI_input.tsx              # Input components
│   ├── UI_icons.tsx              # SINGLE icon management file
│   ├── UI_themes.tsx             # Theme management
│   └── index.ts
│
├── windowmanager/                # NEW - Window/Event management (like WM_)
│   ├── WM_event.ts               # Event handling
│   ├── WM_keymap.ts              # Keyboard shortcuts
│   ├── WM_handlers.ts            # Event handlers
│   ├── WM_operators.ts           # Operator execution
│   ├── WM_modal.ts               # Modal operations
│   └── index.ts
│
├── data/                         # NEW - Data access layer (like RNA_)
│   ├── DNA_types.ts              # Data structure types
│   ├── RNA_access.ts             # Property access
│   ├── RNA_define.ts             # Property definitions
│   └── index.ts
│
├── render/                       # NEW - Rendering pipeline
│   ├── RE_pipeline.ts            # Main render pipeline
│   ├── RE_engine.ts              # Render engine interface
│   ├── RE_mesh.tsx               # Mesh rendering
│   ├── RE_material.ts            # Material rendering
│   ├── RE_shadow.ts              # Shadow system
│   ├── RE_postprocess.ts         # Post-processing
│   └── index.ts
│
├── gpu/                          # NEW - GPU/Three.js interface
│   ├── GPU_batch.ts              # Batch rendering
│   ├── GPU_shader.ts             # Shader management
│   ├── GPU_texture.ts            # Texture handling
│   ├── GPU_framebuffer.ts        # Framebuffer ops
│   └── index.ts
│
├── stores/                       # REFACTOR - State management
│   ├── ST_scene.ts               # Scene state (replaces scene-slice)
│   ├── ST_selection.ts           # Selection state
│   ├── ST_history.ts             # Undo/redo history
│   ├── ST_viewport.ts            # Viewport state
│   ├── ST_tools.ts               # Active tools
│   ├── ST_preferences.ts         # User preferences
│   └── index.ts
│
├── hooks/                        # REFACTOR - React hooks
│   ├── use-operator.ts           # Execute operators
│   ├── use-selection.ts          # Selection management
│   ├── use-viewport.ts           # Viewport controls
│   ├── use-history.ts            # History operations
│   ├── use-keymap.ts             # Keyboard handling
│   └── index.ts
│
├── services/                     # REFACTOR - Backend services
│   ├── SV_tauri.ts               # Tauri IPC
│   ├── SV_cad.ts                 # CAD kernel service
│   ├── SV_export.ts              # Export service
│   ├── SV_project.ts             # Project management
│   └── index.ts
│
├── lib/                          # KEEP - Utilities
│   ├── icons/                    # REFACTOR - Icon system
│   │   ├── IC_tools.ts           # Tool icons
│   │   ├── IC_objects.ts         # Object type icons
│   │   ├── IC_actions.ts         # Action icons
│   │   ├── IC_ui.ts              # UI element icons
│   │   └── index.ts              # Single export point
│   └── utils/
│       ├── UT_math.ts            # Math utilities
│       ├── UT_geometry.ts        # Geometry helpers
│       ├── UT_validation.ts      # Validation
│       └── index.ts
│
└── types/                        # KEEP - TypeScript types
    ├── TY_mesh.ts
    ├── TY_object.ts
    ├── TY_scene.ts
    └── index.ts
```

---

## Part 2: Naming Convention System

### Prefix Reference Table

| Prefix | Purpose | Example | Blender Equivalent |
|--------|---------|---------|-------------------|
| `KE_` | Kernel functions | `KE_mesh_validate()` | `BKE_` |
| `ED_` | Editor functions | `ED_view3d_select()` | `ED_` |
| `WM_` | Window manager | `WM_event_add_handler()` | `WM_` |
| `UI_` | UI components | `UI_Panel` | `UI_` |
| `OT_` | Operator types | `MESH_OT_extrude` | `_OT_` |
| `ST_` | Store/State | `ST_scene` | N/A (Zustand) |
| `SV_` | Services | `SV_cad` | N/A |
| `RE_` | Rendering | `RE_pipeline` | `RE_` |
| `GPU_` | GPU interface | `GPU_batch` | `GPU_` |
| `IC_` | Icons | `IC_tools` | N/A |
| `UT_` | Utilities | `UT_math` | `BLI_` |
| `TY_` | Types | `TY_mesh` | `DNA_` |

### Operator Naming Pattern

```typescript
// Pattern: MODULE_OT_action
// Examples:
MESH_OT_select_all       // Select all mesh elements
MESH_OT_extrude          // Extrude faces
MESH_OT_bevel            // Bevel edges
MESH_OT_subdivide        // Subdivide mesh

OBJ_OT_transform_move    // Move object
OBJ_OT_transform_rotate  // Rotate object
OBJ_OT_transform_scale   // Scale object
OBJ_OT_duplicate         // Duplicate object

VIEW_OT_rotate           // Rotate view
VIEW_OT_pan              // Pan view
VIEW_OT_zoom             // Zoom view
VIEW_OT_frame_selected   // Frame selection

CAD_OT_fillet            // Fillet edges
CAD_OT_chamfer           // Chamfer edges
CAD_OT_boolean_union     // Boolean union
CAD_OT_boolean_subtract  // Boolean subtract
```

---

## Part 3: Icon System Consolidation

### Current Problem
- 244 icon imports across 127 files
- Same icons imported multiple times
- No categorization

### New Icon Architecture

```typescript
// lib/icons/IC_tools.ts
export const ToolIcons = {
  // Selection
  select_box: SelectionBoxIcon,
  select_lasso: SelectionLassoIcon,
  select_circle: SelectionCircleIcon,

  // Transform
  move: Move01Icon,
  rotate: RotateIcon,
  scale: ScaleIcon,

  // Modeling
  extrude: ExtrudeIcon,
  bevel: BevelIcon,
  inset: InsetIcon,

  // CAD
  fillet: FilletIcon,
  chamfer: ChamferIcon,
  offset: OffsetIcon,
} as const;

// lib/icons/IC_objects.ts
export const ObjectIcons = {
  mesh: MeshIcon,
  curve: CurveIcon,
  surface: SurfaceIcon,
  channel: ChannelIcon,
  transition: TransitionIcon,
  chute: ChuteIcon,
} as const;

// lib/icons/IC_actions.ts
export const ActionIcons = {
  add: AddIcon,
  remove: RemoveIcon,
  duplicate: DuplicateIcon,
  delete: DeleteIcon,
  confirm: Tick01Icon,
  cancel: Cancel01Icon,
} as const;

// lib/icons/IC_ui.ts
export const UIIcons = {
  expand: ChevronDownIcon,
  collapse: ChevronRightIcon,
  settings: SettingsIcon,
  info: InfoIcon,
  warning: WarningIcon,
  error: ErrorIcon,
} as const;

// lib/icons/index.ts - SINGLE EXPORT POINT
export * from './IC_tools';
export * from './IC_objects';
export * from './IC_actions';
export * from './IC_ui';

// Wrapper component with consistent sizing
export function Icon({
  icon: IconComponent,
  size = 16,
  className
}: IconProps) {
  return <IconComponent size={size} className={className} />;
}
```

### Usage Pattern
```tsx
// BEFORE (scattered imports)
import { Move01Icon, RotateIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

// AFTER (centralized)
import { ToolIcons, Icon } from "@/lib/icons";

<Icon icon={ToolIcons.move} size={18} />
```

---

## Part 4: Component Consolidation

### 4.1 Property Panels Refactor

**Problem:** 3 property panels with 1,371 lines of duplicated code

**Solution:** Extract base component + hooks

```typescript
// interface/UI_property_panel.tsx
export function PropertyPanel<T extends SceneObject>({
  object,
  sections,
  onUpdate,
}: PropertyPanelProps<T>) {
  const { updateProperty, getConnectedName } = usePropertyPanel(object);

  return (
    <div className="property-panel">
      {sections.map(section => (
        <PropertySection key={section.id} {...section} />
      ))}
    </div>
  );
}

// hooks/use-property-panel.ts
export function usePropertyPanel<T extends SceneObject>(object: T) {
  const objects = useModellerStore(s => s.objects);

  const getConnectedName = useCallback((id: string | null) => {
    if (!id) return null;
    return objects.find(o => o.id === id)?.name ?? "Unknown";
  }, [objects]);

  const updateProperty = useCallback(<K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    // Unified update logic
  }, [object.id]);

  return { updateProperty, getConnectedName };
}
```

### 4.2 Creator Components Refactor

**Problem:** 7 creator components with 4,793 lines of duplicated code

**Solution:** Creator factory pattern

```typescript
// operators/CREATE_factory.ts
export function createCreatorOperator<T extends CreatorConfig>({
  type,
  defaultValues,
  validate,
  fields,
}: T): React.FC {
  return function Creator() {
    const form = useCreatorForm(defaultValues);
    const { execute } = useOperator(`CREATE_OT_${type}`);

    return (
      <CreatorPanel
        title={`Create ${type}`}
        fields={fields}
        form={form}
        onConfirm={() => execute(form.values)}
        validate={validate}
      />
    );
  };
}

// Usage:
export const ChannelCreator = createCreatorOperator({
  type: 'channel',
  defaultValues: CHANNEL_DEFAULTS,
  validate: validateChannel,
  fields: CHANNEL_FIELDS,
});
```

---

## Part 5: Backend Integration Architecture

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Operators (MESH_OT_*, OBJ_OT_*, CAD_OT_*)                      │
│       ↓                                                          │
│  Services (SV_cad.ts)                                           │
│       ↓                                                          │
│  Tauri invoke()                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     TAURI COMMANDS (Rust)                        │
├─────────────────────────────────────────────────────────────────┤
│  commands/cad.rs                                                 │
│  commands/mesh.rs                                                │
│  commands/object.rs                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RUST CAD LIBRARY (cadhy-cad)                  │
├─────────────────────────────────────────────────────────────────┤
│  operations.rs → High-level CAD operations                      │
│  primitives.rs → Primitive creation                             │
│  mesh.rs       → Mesh operations                                │
│  ffi.rs        → C++ bridge                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   C++ KERNEL (OpenCASCADE)                       │
├─────────────────────────────────────────────────────────────────┤
│  cadhy::primitives  → Box, Cylinder, etc.                       │
│  cadhy::boolean     → Fuse, Cut, Common                         │
│  cadhy::modify      → Fillet, Chamfer, Offset                   │
│  cadhy::mesh        → Tessellation, Subdivision                 │
│  cadhy::projection  → HLR, Sections                             │
└─────────────────────────────────────────────────────────────────┘
```

### Tauri Command Naming

```rust
// commands/mod.rs
pub mod cad;
pub mod mesh;
pub mod object;
pub mod view;
pub mod project;

// commands/cad.rs
#[tauri::command]
pub async fn cad_boolean_union(shape1_id: u64, shape2_id: u64) -> Result<MeshData, Error> { }

#[tauri::command]
pub async fn cad_fillet_edges(shape_id: u64, edges: Vec<u32>, radius: f64) -> Result<MeshData, Error> { }

#[tauri::command]
pub async fn cad_chamfer_edges(shape_id: u64, edges: Vec<u32>, distance: f64) -> Result<MeshData, Error> { }

// commands/mesh.rs
#[tauri::command]
pub async fn mesh_subdivide(shape_id: u64, level: u32) -> Result<MeshData, Error> { }

#[tauri::command]
pub async fn mesh_tessellate(shape_id: u64, quality: TessellationQuality) -> Result<MeshData, Error> { }

#[tauri::command]
pub async fn mesh_get_face_data(shape_id: u64, face_idx: u32) -> Result<FaceData, Error> { }
```

---

## Part 6: Mesh & Tessellation System

### C++ Side (Already Implemented)

```cpp
// cadhy::mesh namespace provides:
- tessellate()           // Basic tessellation
- tessellate_quality()   // Quality-controlled tessellation
- compute_normals()      // Normal computation
- compute_uvs()          // UV coordinate generation
- subdivide()            // Mesh subdivision
- decimate()             // Mesh simplification
```

### Frontend Integration

```typescript
// render/RE_mesh.tsx
export interface MeshRenderData {
  positions: Float32Array;
  normals: Float32Array;
  uvs?: Float32Array;
  indices: Uint32Array;
  faceGroups: FaceGroup[];
}

export function useMeshData(objectId: string, quality: TessellationQuality) {
  const [meshData, setMeshData] = useState<MeshRenderData | null>(null);

  useEffect(() => {
    SV_cad.tessellate(objectId, quality).then(setMeshData);
  }, [objectId, quality]);

  return meshData;
}

// Quality levels
export enum TessellationQuality {
  Draft = 0,      // Fast preview (angular deflection: 0.5)
  Normal = 1,     // Standard (angular deflection: 0.1)
  High = 2,       // High quality (angular deflection: 0.01)
  Ultra = 3,      // Maximum (angular deflection: 0.001)
}
```

### Subdivision System

```typescript
// operators/mesh/MESH_OT_subdivide.ts
export const MESH_OT_subdivide: Operator = {
  id: 'MESH_OT_subdivide',
  label: 'Subdivide',

  async execute({ objectId, level }) {
    // Call C++ subdivision via Rust
    const newMesh = await invoke('mesh_subdivide', {
      shape_id: objectId,
      level
    });

    // Update store with new mesh data
    ST_scene.updateObjectMesh(objectId, newMesh);
  },

  poll: (context) => context.selectedObjects.length > 0,
};
```

---

## Part 7: Rendering & Shadows System

### Shadow Configuration

```typescript
// render/RE_shadow.ts
export interface ShadowConfig {
  type: 'basic' | 'pcf' | 'pcfsoft' | 'vsm';
  mapSize: number;
  bias: number;
  normalBias: number;
  radius: number;
  blurSamples: number;
}

export const SHADOW_PRESETS: Record<string, ShadowConfig> = {
  performance: {
    type: 'basic',
    mapSize: 1024,
    bias: 0.0001,
    normalBias: 0.02,
    radius: 1,
    blurSamples: 8,
  },
  quality: {
    type: 'pcfsoft',
    mapSize: 2048,
    bias: 0.00005,
    normalBias: 0.01,
    radius: 2,
    blurSamples: 16,
  },
  ultra: {
    type: 'vsm',
    mapSize: 4096,
    bias: 0.00001,
    normalBias: 0.005,
    radius: 4,
    blurSamples: 32,
  },
};
```

### Post-Processing Pipeline

```typescript
// render/RE_postprocess.ts
export function usePostProcessing(config: PostProcessConfig) {
  const { gl, scene, camera } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);

    // Render pass
    c.addPass(new RenderPass(scene, camera));

    // SSAO (Ambient Occlusion)
    if (config.ssao.enabled) {
      c.addPass(new SSAOPass(scene, camera, config.ssao));
    }

    // Outline (selection highlight)
    if (config.outline.enabled) {
      c.addPass(new OutlinePass(scene, camera, config.outline));
    }

    // Anti-aliasing
    if (config.fxaa) {
      c.addPass(new ShaderPass(FXAAShader));
    }

    return c;
  }, [gl, scene, camera, config]);

  return composer;
}
```

---

## Part 8: History System with Previews

### History Entry Structure

```typescript
// stores/ST_history.ts
export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: OperationType;
  label: string;

  // Preview data
  preview: {
    thumbnail?: string;        // Base64 thumbnail
    meshDiff?: MeshDiff;       // Geometry changes
    propertyChanges?: Record<string, { before: any; after: any }>;
  };

  // Undo data
  undo: {
    operations: UndoOperation[];
  };
}

// Generate thumbnail on operation complete
async function captureHistoryPreview(): Promise<string> {
  const canvas = document.querySelector('canvas');
  if (!canvas) return '';

  // Render to smaller size for preview
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 128;
  thumbCanvas.height = 96;
  const ctx = thumbCanvas.getContext('2d');
  ctx?.drawImage(canvas, 0, 0, 128, 96);

  return thumbCanvas.toDataURL('image/jpeg', 0.6);
}
```

### History Panel Component

```tsx
// editors/space_timeline/ED_timeline_history.tsx
export function HistoryPanel() {
  const history = useStore(ST_history);
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);

  return (
    <UI_Panel title="History" icon={IC_ui.history}>
      <div className="history-list">
        {history.entries.map((entry, idx) => (
          <HistoryEntry
            key={entry.id}
            entry={entry}
            isActive={idx === history.currentIndex}
            onHover={() => setHoveredEntry(entry.id)}
            onClick={() => history.jumpTo(idx)}
          />
        ))}
      </div>

      {hoveredEntry && (
        <HistoryPreview entryId={hoveredEntry} />
      )}
    </UI_Panel>
  );
}
```

---

## Part 9: Curve-Following Channels & Arrays

### Curve Path System

```typescript
// operators/curve/CURVE_OT_array.ts
export interface CurveArrayConfig {
  curveId: string;           // Reference curve
  count: number;             // Number of copies
  spacing: 'even' | 'fixed'; // Distribution mode
  fixedDistance?: number;    // For fixed spacing

  // Orientation
  followCurve: boolean;      // Align to curve tangent
  upVector: Vector3;         // Up direction

  // Scale along curve
  scaleStart: number;
  scaleEnd: number;
}

export const CURVE_OT_array: Operator = {
  id: 'CURVE_OT_array',
  label: 'Array Along Curve',

  async execute({ objectId, config }: { objectId: string; config: CurveArrayConfig }) {
    // Get curve points from C++
    const curveData = await invoke('curve_get_points', {
      curve_id: config.curveId,
      count: config.count,
      spacing: config.spacing,
    });

    // Create array instances
    const instances: ObjectInstance[] = curveData.points.map((point, i) => ({
      position: point.position,
      rotation: config.followCurve ? point.tangentRotation : [0, 0, 0],
      scale: lerp(config.scaleStart, config.scaleEnd, i / (config.count - 1)),
    }));

    // Apply to object
    ST_scene.setObjectInstances(objectId, instances);
  },
};
```

### Channel Following Curve

```typescript
// operators/hydraulic/CHANNEL_OT_follow_curve.ts
export const CHANNEL_OT_follow_curve: Operator = {
  id: 'CHANNEL_OT_follow_curve',
  label: 'Channel Along Curve',

  async execute({ profile, curveId, config }) {
    // Create swept channel along curve via C++
    const meshData = await invoke('cad_sweep_along_curve', {
      profile_id: profile.id,
      curve_id: curveId,
      twist: config.twist,
      scale_start: config.scaleStart,
      scale_end: config.scaleEnd,
    });

    // Create new channel object
    const channel = createChannelFromMesh(meshData);
    ST_scene.addObject(channel);
  },
};
```

---

## Part 10: Implementation Phases

### Phase 1: Foundation ✅ COMPLETED
- [x] Create new directory structure
- [x] Set up icon consolidation (IC_*.ts files)
- [x] Create base UI components (UI_panel, UI_dialog, etc.)
- [x] Establish naming conventions

### Phase 2: Core Refactoring ✅ COMPLETED
- [x] Move all components to new locations with git mv
- [x] Rename files with proper prefixes (ED_, OP_, WM_, UI_, RE_, ST_, SV_)
- [x] Create barrel exports for all directories
- [x] Update all imports to use new paths
- [x] Rename Rust commands with cmd_* prefix
- [x] Verify TypeScript and Rust builds pass

### Phase 3: Development Tools 🔄 IN PROGRESS
- [x] Create `tools/` directory structure (like Blender's)
- [x] Create `tools/check_source/check_naming.ts`
- [x] Create `tools/check_source/check_exports.ts`
- [x] Create `tools/generators/gen_operator.ts`
- [x] Create `tools/generators/gen_editor.ts`
- [ ] Create `tools/utils_maintenance/` scripts
- [ ] Set up IDE configurations in `tools/config/`

### Phase 4: Architecture Expansion 📋 TODO
- [ ] Create `gpu/` abstraction layer (GPU_batch, GPU_shader, GPU_texture)
- [ ] Create `modifiers/` system (MOD_array, MOD_mirror, MOD_boolean)
- [ ] Create `depsgraph/` for dependency graph
- [ ] Create `rna/` property system (RNA_access, RNA_define)
- [ ] Enhance operator system with full poll/exec/properties pattern

### Phase 5: New Editor Spaces 📋 TODO
- [ ] Implement `space_file` (file browser)
- [ ] Implement `space_node` (node editor for procedural geometry)
- [ ] Implement `space_spreadsheet` (data viewer)
- [ ] Implement `space_info` (log viewer)

### Phase 6: Backend Integration 📋 TODO
- [ ] Implement mesh tessellation quality levels
- [ ] Add subdivision support via C++
- [ ] Create proper mesh data flow
- [ ] Implement shadow presets

### Phase 7: Advanced Features 📋 TODO
- [ ] Non-destructive modifier stack
- [ ] Procedural geometry nodes
- [ ] Asset library system
- [ ] History system with previews
- [ ] Curve array system

---

## Part 11: File Migration Map

| Current Path | New Path | Notes |
|--------------|----------|-------|
| `components/modeller/viewport/*` | `editors/space_view3d/*` | Rename with ED_ prefix |
| `components/modeller/properties/*` | `editors/space_properties/*` | Consolidate panels |
| `components/modeller/scene/*` | `editors/space_outliner/*` | Scene tree |
| `components/modeller/panels/HistoryPanel.tsx` | `editors/space_timeline/*` | History |
| `stores/modeller/*-slice.ts` | `stores/ST_*.ts` | Rename with prefix |
| `hooks/use-cad*.ts` | `hooks/use-operator.ts` | Consolidate |
| `services/cad-service.ts` | `services/SV_cad.ts` | Rename |
| `lib/icons/hugeicons.ts` | `lib/icons/IC_*.ts` | Split by category |

---

## Appendix: References

### Blender Source
- [BKE_mesh.h](https://github.com/blender/blender/blob/main/source/blender/blenkernel/BKE_mesh.h)
- [ED_view3d.hh](https://github.com/blender/blender/blob/main/source/blender/editors/include/ED_view3d.hh)
- [WM_api.hh](https://github.com/blender/blender/blob/main/source/blender/windowmanager/WM_api.hh)
- [C/C++ Style Guide](https://wiki.blender.org/wiki/Style_Guide/C_Cpp)
- [RNA Architecture](https://developer.blender.org/docs/features/core/rna/)

### Plasticity
- [Plasticity Product](https://www.plasticity.xyz/)
- [Plasticity Manual](https://doc.plasticity.xyz/)

### Shapr3D
- [Shapr3D Product](https://www.shapr3d.com/)
- [3D CAD Concepts](https://support.shapr3d.com/hc/en-us/articles/11883044707484-3D-CAD-modeling-concepts)
