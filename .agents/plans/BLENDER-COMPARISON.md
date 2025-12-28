# CADHY vs Blender Architecture Comparison

## Executive Summary

This document compares CADHY's current structure (post-refactor) with Blender's architecture to identify gaps and improvement opportunities.

---

## Blender's Full Architecture

### Core Source Structure (`source/blender/`)

| Module | Purpose | CADHY Equivalent | Status |
|--------|---------|------------------|--------|
| **blenkernel** | Core kernel (BKE_*) - data ops | `kernel/` | Partial |
| **blenlib** | Utility library (BLI_*) | `lib/utils/` | Partial |
| **editors** | UI editors (ED_*) | `editors/` | Done |
| **windowmanager** | Window/event mgmt (WM_*) | `windowmanager/` | Done |
| **render** | Rendering engine (RE_*) | `render/` | Done |
| **draw** | Drawing/viewport | `render/` | Merged |
| **gpu** | GPU abstraction | Missing | **TODO** |
| **nodes** | Node system | Missing | **TODO** |
| **modifiers** | Modifier stack | Missing | **TODO** |
| **geometry** | Geometry operations | `kernel/` | Partial |
| **makesdna** | DNA (data types) | `types/` | Done |
| **makesrna** | RNA (property API) | Missing | **TODO** |
| **depsgraph** | Dependency graph | Missing | **TODO** |
| **bmesh** | Mesh editing | `crates/cadhy-cad` | Rust/C++ |
| **io** | Import/Export | `services/` | Partial |
| **compositor** | Compositing | N/A | Not needed |
| **sequencer** | Video editing | N/A | Not needed |
| **simulation** | Physics sim | `crates/cadhy-cad` | Partial |
| **freestyle** | NPR rendering | Missing | **Future** |
| **python** | Python scripting | Missing | **Future** |
| **asset_system** | Asset management | Missing | **TODO** |

### Blender Editors (51 total)

| Editor | Purpose | CADHY Equivalent |
|--------|---------|------------------|
| **space_view3d** | 3D viewport | `editors/space_view3d/` |
| **space_outliner** | Scene tree | `editors/space_outliner/` |
| **space_buttons** | Properties | `editors/space_properties/` |
| **space_file** | File browser | Missing |
| **space_image** | Image editor | Missing |
| **space_node** | Node editor | Missing |
| **space_text** | Text/script editor | Missing |
| **space_console** | Python console | Missing |
| **space_info** | Info/log | Missing |
| **space_graph** | Animation curves | Missing |
| **space_action** | Action editor | Missing |
| **space_nla** | NLA editor | Missing |
| **space_clip** | Movie clip | N/A |
| **space_sequencer** | Video seq | N/A |
| **space_spreadsheet** | Data view | Missing |
| **space_statusbar** | Status bar | `interface/UI_statusbar` |
| **space_topbar** | Top bar | `interface/` |
| **space_userpref** | Preferences | `interface/settings/` |
| **object** | Object ops | `operators/` |
| **mesh** | Mesh editing | `operators/` |
| **curve/curves** | Curve editing | Partial |
| **transform** | Transform ops | `operators/` |
| **sculpt_paint** | Sculpting | Missing |
| **uvedit** | UV editing | Missing |
| **physics** | Physics sim | Partial |
| **animation** | Animation | Missing |
| **armature** | Rigging | N/A |
| **gizmo_library** | Gizmos | `@cadhy/gizmo` |
| **render** | Render settings | `editors/space_view3d/panels/` |
| **screen** | Screen layout | `windowmanager/` |
| **interface** | UI widgets | `interface/` |
| **undo** | Undo system | `stores/ST_history` |
| **util** | Utilities | `lib/utils/` |

---

## What CADHY Has (Post-Refactor)

### Current Structure

```
apps/desktop/src/
├── app/                    # Entry point
├── editors/                # ED_* prefixed
│   ├── space_view3d/       # 3D viewport
│   ├── space_properties/   # Properties panel
│   ├── space_outliner/     # Scene tree
│   ├── space_timeline/     # History
│   ├── space_drawing/      # 2D drawings
│   ├── space_projects/     # Project browser
│   ├── space_results/      # Results view
│   ├── space_gallery/      # AI gallery
│   ├── space_ai/           # AI chat
│   └── space_cadras/       # CADRAS view
├── operators/              # OP_* prefixed
│   ├── create/             # Creation ops
│   ├── context/            # CAD context
│   └── interactive/        # Interactive ops
├── interface/              # UI_* prefixed
│   ├── common/             # Common components
│   ├── dialogs/            # Dialog components
│   ├── settings/           # Settings panels
│   ├── properties/         # Property panels
│   └── onboarding/         # Onboarding
├── windowmanager/          # WM_* prefixed
├── render/                 # RE_* prefixed
│   ├── meshes/             # Mesh components
│   ├── cache/              # Caches
│   └── pool/               # Pools
├── kernel/                 # KE_* prefixed
├── stores/                 # ST_* prefixed
│   └── slices/             # Store slices
├── services/               # SV_* prefixed
├── hooks/                  # React hooks
├── lib/
│   ├── icons/              # IC_* categorized
│   └── utils/              # UT_* utilities
└── types/                  # Type definitions
```

---

## Critical Missing Components

### 1. GPU Abstraction Layer (`gpu/`)

Blender has a complete GPU abstraction. We should add:

```
gpu/
├── GPU_batch.ts            # Batch rendering
├── GPU_shader.ts           # Shader management
├── GPU_texture.ts          # Texture handling
├── GPU_framebuffer.ts      # Framebuffer ops
├── GPU_state.ts            # GL state management
└── index.ts
```

### 2. Node System (`nodes/`)

For procedural geometry and materials:

```
nodes/
├── geometry/               # Geometry nodes
│   ├── NOD_geo_input.ts
│   ├── NOD_geo_transform.ts
│   ├── NOD_geo_boolean.ts
│   └── index.ts
├── shader/                 # Shader nodes (future)
└── index.ts
```

### 3. Modifier Stack (`modifiers/`)

For non-destructive editing:

```
modifiers/
├── MOD_array.ts            # Array modifier
├── MOD_mirror.ts           # Mirror modifier
├── MOD_boolean.ts          # Boolean modifier
├── MOD_solidify.ts         # Solidify modifier
├── MOD_bevel.ts            # Bevel modifier
└── index.ts
```

### 4. Dependency Graph (`depsgraph/`)

For proper update ordering:

```
depsgraph/
├── DEG_graph.ts            # Dependency graph
├── DEG_query.ts            # Graph queries
├── DEG_update.ts           # Update propagation
└── index.ts
```

### 5. RNA Property System (`rna/`)

For property access and UI binding:

```
rna/
├── RNA_access.ts           # Property access
├── RNA_define.ts           # Property definitions
├── RNA_types.ts            # Property types
└── index.ts
```

### 6. Asset System (`asset_system/`)

For asset management:

```
asset_system/
├── AS_library.ts           # Asset library
├── AS_browser.ts           # Asset browser
├── AS_catalog.ts           # Asset catalogs
└── index.ts
```

---

## Development Tools (Blender's `tools/`)

### Blender Has:

```
tools/
├── check_source/           # Code quality checks
│   ├── check_cmake_consistency.py
│   ├── check_deprecated.py
│   ├── check_descriptions.py
│   ├── check_header_duplicate.py
│   ├── check_licenses.py
│   ├── check_spelling.py
│   ├── check_unused_defines.py
│   └── static_check_*.py
├── utils_maintenance/      # Maintenance scripts
│   ├── code_clean.py
│   ├── clang_format_paths.py
│   ├── trailing_space_clean.py
│   └── autopep8_format_paths.py
├── config/                 # IDE configs
├── debug/                  # Debug utilities
├── git/                    # Git utilities
├── triage/                 # Issue triage
└── utils_ide/              # IDE integration
```

### CADHY Should Have:

```
tools/
├── check_source/           # Code quality
│   ├── check_imports.ts    # Import validation
│   ├── check_naming.ts     # Naming conventions
│   ├── check_exports.ts    # Export validation
│   ├── check_unused.ts     # Unused code
│   └── check_types.ts      # Type coverage
├── utils_maintenance/      # Maintenance
│   ├── organize_imports.ts # Import organization
│   ├── update_exports.ts   # Export updates
│   ├── clean_code.ts       # Code cleanup
│   └── migration.ts        # Migration helpers
├── config/                 # Configs
│   ├── vscode/             # VS Code settings
│   ├── cursor/             # Cursor settings
│   └── biome/              # Biome config
├── debug/                  # Debug tools
│   ├── perf_monitor.ts     # Performance
│   └── memory_check.ts     # Memory usage
└── generators/             # Code generators
    ├── gen_operator.ts     # Generate operator
    ├── gen_editor.ts       # Generate editor
    └── gen_component.ts    # Generate component
```

---

## Operator System Enhancement

### Blender's Pattern

```c
// Pattern: MODULE_OT_action
static void MESH_OT_subdivide(wmOperatorType *ot)
{
    ot->name = "Subdivide";
    ot->idname = "MESH_OT_subdivide";
    ot->description = "Subdivide selected faces";

    ot->exec = mesh_subdivide_exec;
    ot->poll = ED_operator_editmesh;

    // Properties
    RNA_def_int(ot->srna, "number_cuts", 1, ...);
    RNA_def_float(ot->srna, "smoothness", 0.0f, ...);
}
```

### CADHY Enhanced Pattern

```typescript
// operators/mesh/MESH_OT_subdivide.ts
export const MESH_OT_subdivide: Operator = {
  id: "MESH_OT_subdivide",
  name: "Subdivide",
  description: "Subdivide selected faces",

  // Poll function - when is operator available?
  poll: (context) => {
    return context.mode === "EDIT" &&
           context.selectedFaces.length > 0;
  },

  // Execute function
  exec: async (context, props) => {
    const result = await invoke("mesh_subdivide", {
      object_id: context.activeObject.id,
      cuts: props.number_cuts,
      smoothness: props.smoothness,
    });
    return { success: true, result };
  },

  // Properties (for UI generation)
  properties: {
    number_cuts: { type: "int", default: 1, min: 1, max: 10 },
    smoothness: { type: "float", default: 0.0, min: 0.0, max: 1.0 },
  },

  // Undo support
  undo: true,

  // Keymap
  keymap: { key: "W", ctrl: true },
};
```

---

## Missing Editor Spaces

### Priority 1 - Should Implement

| Editor | Purpose | Priority |
|--------|---------|----------|
| `space_file` | File browser | High |
| `space_node` | Node editor | High |
| `space_spreadsheet` | Data view | Medium |
| `space_info` | Info/log | Medium |

### Priority 2 - Future

| Editor | Purpose | Priority |
|--------|---------|----------|
| `space_image` | Image/texture editor | Low |
| `space_text` | Script editor | Low |
| `space_console` | Console | Low |

---

## Updated Phase Plan

### Phase 3: Architecture Expansion

- [ ] Create `gpu/` abstraction layer
- [ ] Create `modifiers/` system
- [ ] Create `depsgraph/` for updates
- [ ] Create `rna/` property system
- [ ] Enhance operator system with full pattern

### Phase 4: Development Tools

- [ ] Create `tools/check_source/` scripts
- [ ] Create `tools/utils_maintenance/` scripts
- [ ] Create `tools/generators/` for scaffolding
- [ ] Set up IDE configurations

### Phase 5: New Editors

- [ ] Implement `space_file` (file browser)
- [ ] Implement `space_node` (node editor)
- [ ] Implement `space_spreadsheet` (data viewer)
- [ ] Implement `space_info` (log viewer)

### Phase 6: Advanced Features

- [ ] Non-destructive modifiers
- [ ] Procedural geometry nodes
- [ ] Asset library system
- [ ] Python scripting (future)

---

## Recommendations

### Immediate Actions

1. **Create `tools/` directory** with code quality scripts
2. **Add `gpu/` abstraction** for better Three.js integration
3. **Implement full operator pattern** with poll/exec/properties
4. **Create generators** for boilerplate code

### Medium-term

1. **Node system** for procedural geometry
2. **Modifier stack** for non-destructive editing
3. **Asset browser** for project assets
4. **Dependency graph** for update ordering

### Long-term

1. **Python scripting** for extensibility
2. **NPR rendering** (freestyle-like)
3. **Advanced simulation** integration
4. **Plugin system** for third-party extensions

---

## Summary

| Category | Blender | CADHY Current | Gap |
|----------|---------|---------------|-----|
| Editors | 51 | 10 | Partial (domain-specific) |
| Core Modules | 33 | 12 | Missing GPU, Nodes, Modifiers |
| Tools | 15+ scripts | None | **Critical gap** |
| Operators | Full system | Basic | Needs enhancement |
| Properties | RNA system | Zustand | Different approach OK |
| Asset System | Full | None | **TODO** |
