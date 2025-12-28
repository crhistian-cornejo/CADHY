# CADHY - Complete Migration Map

## Principios de Migración

1. **NO REHACER CÓDIGO** - Solo renombrar y mover archivos
2. **PRESERVAR UI/UX** - El estilo visual actual se mantiene intacto
3. **REFACTORIZAR LÓGICA** - Si mejora el código, se refactoriza pero sin cambiar diseño
4. **NADA SUELTO** - Todo archivo debe estar en su lugar correcto

---

## Estructura Actual vs Nueva

### FRONTEND (TypeScript/React)

```
ACTUAL                                    NUEVO
─────────────────────────────────────────────────────────────────────────
apps/desktop/src/
├── app/                               →  app/                    (SIN CAMBIO)
├── assets/                            →  assets/                 (SIN CAMBIO)
│
├── components/
│   ├── ai/
│   │   └── AIChatPanel.tsx            →  editors/space_ai/ED_ai_chat.tsx
│   │
│   ├── cadras/
│   │   └── CADRASView.tsx             →  editors/space_cadras/ED_cadras_view.tsx
│   │
│   ├── command-palette/
│   │   └── CommandPalette.tsx         →  interface/UI_command_palette.tsx
│   │
│   ├── common/
│   │   ├── ErrorBoundary.tsx          →  interface/common/UI_error_boundary.tsx
│   │   ├── EmptyState.tsx             →  interface/common/UI_empty_state.tsx
│   │   └── UsageImpactDialog.tsx      →  interface/dialogs/UI_usage_impact_dialog.tsx
│   │
│   ├── drawings/
│   │   ├── dialogs/
│   │   │   └── *.tsx                  →  editors/space_drawing/dialogs/ED_draw_*.tsx
│   │   ├── panels/
│   │   │   ├── DrawingPropertiesPanel.tsx  →  editors/space_drawing/ED_draw_properties.tsx
│   │   │   ├── DrawingToolsPanel.tsx       →  editors/space_drawing/ED_draw_tools.tsx
│   │   │   └── DrawingsListPanel.tsx       →  editors/space_drawing/ED_draw_list.tsx
│   │   ├── toolbars/
│   │   │   └── DrawingToolbar.tsx     →  editors/space_drawing/ED_draw_toolbar.tsx
│   │   └── viewport/
│   │       └── Viewport2D.tsx         →  editors/space_drawing/ED_draw_viewport.tsx
│   │
│   ├── gallery/
│   │   └── GalleryView.tsx            →  editors/space_gallery/ED_gallery_view.tsx
│   │
│   ├── layout/
│   │   ├── AppLayout.tsx              →  windowmanager/WM_layout.tsx
│   │   ├── StatusBar.tsx              →  interface/UI_statusbar.tsx
│   │   ├── dialogs/
│   │   │   ├── SettingsDialog.tsx     →  interface/dialogs/UI_settings_dialog.tsx
│   │   │   ├── ProfileDialog.tsx      →  interface/dialogs/UI_profile_dialog.tsx
│   │   │   ├── ImportIFCDialog.tsx    →  interface/dialogs/UI_import_ifc_dialog.tsx
│   │   │   ├── ExportDialog.tsx       →  interface/dialogs/UI_export_dialog.tsx
│   │   │   └── *.tsx                  →  interface/dialogs/UI_*_dialog.tsx
│   │   └── settings/
│   │       └── *.tsx                  →  interface/settings/UI_settings_*.tsx
│   │
│   ├── modeller/
│   │   ├── ModellerView.tsx           →  editors/space_view3d/ED_view3d_main.tsx
│   │   │
│   │   ├── camera/
│   │   │   └── *.tsx                  →  editors/space_view3d/camera/ED_view3d_camera_*.tsx
│   │   │
│   │   ├── creators/
│   │   │   ├── CreatePanel.tsx        →  operators/create/OP_create_panel.tsx
│   │   │   ├── ChuteCreator.tsx       →  operators/create/OP_create_chute.tsx
│   │   │   ├── ChannelCreator.tsx     →  operators/create/OP_create_channel.tsx
│   │   │   ├── TransitionCreator.tsx  →  operators/create/OP_create_transition.tsx
│   │   │   ├── SplineCreator.tsx      →  operators/create/OP_create_spline.tsx
│   │   │   ├── LoftCreator.tsx        →  operators/create/OP_create_loft.tsx
│   │   │   ├── SweepCreator.tsx       →  operators/create/OP_create_sweep.tsx
│   │   │   └── HelixCreator.tsx       →  operators/create/OP_create_helix.tsx
│   │   │
│   │   ├── dialogs/
│   │   │   ├── ActiveOperationDialog.tsx      →  interface/dialogs/UI_active_operation.tsx
│   │   │   ├── CADOperationsProvider.tsx      →  operators/context/OP_cad_provider.tsx
│   │   │   └── FloatingCADOperationsPanel.tsx →  operators/context/OP_floating_panel.tsx
│   │   │
│   │   ├── panels/
│   │   │   ├── HistoryPanel.tsx       →  editors/space_timeline/ED_timeline_history.tsx
│   │   │   ├── HistoryEntryDetails.tsx →  editors/space_timeline/ED_timeline_details.tsx
│   │   │   ├── ToolsPanel.tsx         →  editors/space_view3d/panels/ED_view3d_tools.tsx
│   │   │   ├── DebugStatsPanel.tsx    →  editors/space_view3d/panels/ED_view3d_debug.tsx
│   │   │   ├── CameraAnimationPanel.tsx →  editors/space_view3d/panels/ED_view3d_camera_anim.tsx
│   │   │   ├── NotificationsPanel.tsx →  interface/UI_notifications.tsx
│   │   │   ├── SnappingSettingsPanel.tsx →  editors/space_view3d/panels/ED_view3d_snap.tsx
│   │   │   └── DrawingToolsPanel.tsx  →  editors/space_view3d/panels/ED_view3d_draw_tools.tsx
│   │   │
│   │   ├── properties/
│   │   │   ├── PropertiesPanel.tsx    →  editors/space_properties/ED_props_main.tsx
│   │   │   ├── TextureMaterialPanel.tsx →  editors/space_properties/ED_props_material.tsx
│   │   │   ├── panels/
│   │   │   │   ├── ChutePropertiesPanel.tsx     →  editors/space_properties/types/ED_props_chute.tsx
│   │   │   │   ├── ChannelPropertiesPanel.tsx   →  editors/space_properties/types/ED_props_channel.tsx
│   │   │   │   └── TransitionPropertiesPanel.tsx →  editors/space_properties/types/ED_props_transition.tsx
│   │   │   ├── previews/
│   │   │   │   └── ChannelSectionPreview.tsx    →  editors/space_properties/previews/ED_props_preview_*.tsx
│   │   │   ├── sections/
│   │   │   │   ├── GeometrySection.tsx          →  editors/space_properties/sections/ED_props_geometry.tsx
│   │   │   │   ├── MaterialSection.tsx          →  editors/space_properties/sections/ED_props_material.tsx
│   │   │   │   ├── TransformSection.tsx         →  editors/space_properties/sections/ED_props_transform.tsx
│   │   │   │   ├── BIMInfoSection.tsx           →  editors/space_properties/sections/ED_props_bim.tsx
│   │   │   │   └── MeshDetailsSection.tsx       →  editors/space_properties/sections/ED_props_mesh.tsx
│   │   │   ├── shared/
│   │   │   │   ├── PropertyRow.tsx              →  interface/properties/UI_prop_row.tsx
│   │   │   │   ├── PropertySection.tsx          →  interface/properties/UI_prop_section.tsx
│   │   │   │   └── VectorInput.tsx              →  interface/properties/UI_prop_vector.tsx
│   │   │   └── states/
│   │   │       ├── NoSelection.tsx              →  editors/space_properties/states/ED_props_no_selection.tsx
│   │   │       └── MultipleSelection.tsx        →  editors/space_properties/states/ED_props_multi_selection.tsx
│   │   │
│   │   ├── scene/
│   │   │   └── ScenePanel.tsx         →  editors/space_outliner/ED_outliner_main.tsx
│   │   │
│   │   ├── toolbars/
│   │   │   ├── CADToolbar.tsx         →  editors/space_view3d/toolbars/ED_view3d_cad_toolbar.tsx
│   │   │   ├── ViewportToolbar.tsx    →  editors/space_view3d/toolbars/ED_view3d_toolbar.tsx
│   │   │   └── *.tsx                  →  editors/space_view3d/toolbars/ED_view3d_*.tsx
│   │   │
│   │   └── viewport/
│   │       ├── SceneContent.tsx       →  render/RE_scene_content.tsx
│   │       ├── PostProcessing.tsx     →  render/RE_postprocessing.tsx
│   │       ├── ViewportOverlays.tsx   →  render/RE_overlays.tsx
│   │       ├── ViewportSettingsPanel.tsx →  editors/space_view3d/panels/ED_view3d_settings.tsx
│   │       ├── InteractiveCADOperations.tsx →  operators/interactive/OP_interactive_cad.tsx
│   │       ├── SectionPlane.tsx       →  render/RE_section_plane.tsx
│   │       └── meshes/
│   │           └── SceneObjectMesh.tsx →  render/meshes/RE_object_mesh.tsx
│   │
│   ├── onboarding/
│   │   └── *.tsx                      →  interface/onboarding/UI_onboarding_*.tsx
│   │
│   ├── project/
│   │   ├── ProjectCard.tsx            →  editors/space_projects/ED_project_card.tsx
│   │   └── *.tsx                      →  editors/space_projects/ED_project_*.tsx
│   │
│   ├── results/
│   │   └── *.tsx                      →  editors/space_results/ED_results_*.tsx
│   │
│   └── ui/                            →  interface/shadcn/         (SIN CAMBIO interno)
│
├── hooks/
│   ├── use-cad.ts                     →  hooks/use-kernel.ts
│   ├── use-cad-operations.ts          →  hooks/use-operators.ts
│   ├── use-cad-preview.ts             →  hooks/use-preview.ts
│   ├── use-cad-operation-hotkeys.ts   →  hooks/use-operator-hotkeys.ts
│   ├── use-app-hotkeys.ts             →  windowmanager/WM_hotkeys.ts
│   ├── use-hotkey.ts                  →  windowmanager/WM_hotkey_hook.ts
│   ├── use-command.ts                 →  windowmanager/WM_command.ts
│   ├── use-units.ts                   →  hooks/use-units.ts        (SIN CAMBIO)
│   ├── use-dimensioning.ts            →  hooks/use-dimensioning.ts (SIN CAMBIO)
│   ├── use-pbr-textures.ts            →  render/RE_textures_hook.ts
│   ├── use-ai-chat.ts                 →  hooks/use-ai-chat.ts      (SIN CAMBIO)
│   ├── use-ai-provider.ts             →  hooks/use-ai-provider.ts  (SIN CAMBIO)
│   ├── use-auto-save.ts               →  hooks/use-auto-save.ts    (SIN CAMBIO)
│   ├── use-updater.ts                 →  hooks/use-updater.ts      (SIN CAMBIO)
│   ├── use-platform.ts                →  hooks/use-platform.ts     (SIN CAMBIO)
│   ├── use-sounds.ts                  →  hooks/use-sounds.ts       (SIN CAMBIO)
│   ├── use-topology.ts                →  kernel/KE_topology_hook.ts
│   ├── use-topological-selection.ts   →  kernel/KE_selection_hook.ts
│   └── use-virtual-list.ts            →  hooks/use-virtual-list.ts (SIN CAMBIO)
│
├── i18n/                              →  i18n/                     (SIN CAMBIO)
│
├── lib/
│   ├── icons/
│   │   ├── hugeicons.ts               →  ELIMINAR (dividir en categorías)
│   │   └── index.ts                   →  lib/icons/index.ts
│   │   # NUEVO:
│   │   # ├── IC_tools.ts              ←  Iconos de herramientas
│   │   # ├── IC_objects.ts            ←  Iconos de tipos de objeto
│   │   # ├── IC_actions.ts            ←  Iconos de acciones (add, delete, etc.)
│   │   # ├── IC_ui.ts                 ←  Iconos de UI (chevrons, settings)
│   │   # └── IC_status.ts             ←  Iconos de estado (warning, error)
│   └── utils/                         →  lib/utils/                (SIN CAMBIO)
│
├── services/
│   ├── cad-service.ts                 →  services/SV_cad.ts
│   ├── cad-operations-init.ts         →  services/SV_cad_init.ts
│   ├── cad-validation.ts              →  services/SV_validation.ts
│   ├── material-pool.ts               →  render/pool/RE_material_pool.ts
│   ├── texture-cache.ts               →  render/cache/RE_texture_cache.ts
│   ├── texture-service.ts             →  render/RE_texture_service.ts
│   ├── mesh-cache.ts                  →  render/cache/RE_mesh_cache.ts
│   ├── lod-manager.ts                 →  render/RE_lod_manager.ts
│   ├── snap-manager.ts                →  services/SV_snap.ts
│   ├── measurement-tools.ts           →  services/SV_measurement.ts
│   ├── section-tool.ts                →  services/SV_section.ts
│   ├── export-service.ts              →  services/SV_export.ts
│   ├── ai-service.ts                  →  services/SV_ai.ts
│   ├── frustum-culler.ts              →  render/RE_frustum_culler.ts
│   ├── instancing-manager.ts          →  render/RE_instancing.ts
│   ├── project-service.ts             →  services/SV_project.ts
│   ├── chat-persistence.ts            →  services/SV_chat_persistence.ts
│   ├── tauri-service.ts               →  services/SV_tauri.ts
│   ├── hotkey-registry.ts             →  windowmanager/WM_hotkey_registry.ts
│   ├── default-hotkeys.ts             →  windowmanager/WM_default_hotkeys.ts
│   ├── operation-queue.ts             →  services/SV_operation_queue.ts
│   ├── thumbnail-service.ts           →  services/SV_thumbnail.ts
│   └── viewport-registry.ts           →  render/RE_viewport_registry.ts
│
├── stores/
│   ├── modeller/
│   │   ├── index.ts                   →  stores/index.ts
│   │   ├── types.ts                   →  stores/ST_types.ts
│   │   ├── store-types.ts             →  stores/ST_store_types.ts
│   │   ├── scene-context.ts           →  stores/ST_scene_context.ts
│   │   ├── camera-slice.ts            →  stores/slices/ST_camera.ts
│   │   ├── objects-slice.ts           →  stores/slices/ST_objects.ts
│   │   ├── selection-slice.ts         →  stores/slices/ST_selection.ts
│   │   ├── history-slice.ts           →  stores/slices/ST_history.ts
│   │   ├── scene-slice.ts             →  stores/slices/ST_scene.ts
│   │   ├── transform-slice.ts         →  stores/slices/ST_transform.ts
│   │   ├── viewport-slice.ts          →  stores/slices/ST_viewport.ts
│   │   ├── tools-slice.ts             →  stores/slices/ST_tools.ts
│   │   ├── snapping-slice.ts          →  stores/slices/ST_snapping.ts
│   │   ├── gizmo-slice.ts             →  stores/slices/ST_gizmo.ts
│   │   ├── materials-slice.ts         →  stores/slices/ST_materials.ts
│   │   ├── rendering-slice.ts         →  stores/slices/ST_rendering.ts
│   │   ├── notifications-slice.ts     →  stores/slices/ST_notifications.ts
│   │   ├── measurements-slice.ts      →  stores/slices/ST_measurements.ts
│   │   ├── cad-operations-slice.ts    →  stores/slices/ST_cad_operations.ts
│   │   └── drawing-tools-slice.ts     →  stores/slices/ST_drawing_tools.ts
│   │
│   ├── drawing-store.ts               →  stores/ST_drawing.ts
│   ├── project-store.ts               →  stores/ST_project.ts
│   ├── settings-store.ts              →  stores/ST_settings.ts
│   ├── results-store.ts               →  stores/ST_results.ts
│   └── ai-store.ts                    →  stores/ST_ai.ts
│
├── types/                             →  types/                    (SIN CAMBIO)
│
└── utils/
    ├── dimension-helpers.ts           →  lib/utils/UT_dimensions.ts
    ├── snap-system.ts                 →  lib/utils/UT_snap.ts
    ├── cad-validation.ts              →  lib/utils/UT_cad_validation.ts
    ├── stilling-basin-design.ts       →  lib/utils/UT_stilling_basin.ts
    ├── hatch-patterns.ts              →  lib/utils/UT_hatch.ts
    ├── camera-interpolation.ts        →  lib/utils/UT_camera.ts
    └── drawing-units.ts               →  lib/utils/UT_drawing_units.ts
```

---

### BACKEND (Rust/Tauri)

```
ACTUAL                                    NUEVO
─────────────────────────────────────────────────────────────────────────
apps/desktop/src-tauri/src/
├── main.rs                            →  main.rs                   (SIN CAMBIO)
├── lib.rs                             →  lib.rs                    (ACTUALIZAR exports)
├── macos_menu.rs                      →  platform/macos_menu.rs
│
├── auth/
│   ├── mod.rs                         →  auth/mod.rs               (SIN CAMBIO)
│   ├── keyring.rs                     →  auth/keyring.rs           (SIN CAMBIO)
│   └── gemini.rs                      →  auth/gemini.rs            (SIN CAMBIO)
│
└── commands/
    ├── mod.rs                         →  commands/mod.rs           (ACTUALIZAR)
    ├── cad.rs                         →  commands/cmd_cad.rs
    ├── geometry.rs                    →  commands/cmd_geometry.rs
    ├── curves.rs                      →  commands/cmd_curves.rs
    ├── drawing.rs                     →  commands/cmd_drawing.rs
    ├── drawing_export.rs              →  commands/cmd_drawing_export.rs
    ├── dxf.rs                         →  commands/cmd_dxf.rs
    ├── ifc.rs                         →  commands/cmd_ifc.rs
    ├── project.rs                     →  commands/cmd_project.rs
    ├── hydraulics.rs                  →  commands/cmd_hydraulics.rs
    ├── chat.rs                        →  commands/cmd_chat.rs
    ├── credits.rs                     →  commands/cmd_credits.rs
    └── system.rs                      →  commands/cmd_system.rs


crates/
├── cadhy-cad/                         →  crates/cadhy-cad/         (SIN CAMBIO interno)
│   └── src/
│       ├── lib.rs
│       ├── ffi.rs                     # C++ bridge
│       ├── primitives.rs              # Primitivas
│       ├── operations.rs              # Operaciones CAD
│       ├── mesh.rs                    # Mesh operations
│       ├── projection.rs              # HLR, sections
│       ├── curves.rs                  # Curvas
│       ├── drawing.rs                 # 2D drawing
│       ├── export.rs                  # Export
│       ├── step_io.rs                 # STEP I/O
│       ├── dxf_import.rs              # DXF import
│       ├── topology.rs                # Topología
│       ├── analysis.rs                # Análisis
│       ├── section.rs                 # Secciones
│       ├── shape.rs                   # Shapes
│       ├── dimensions.rs              # Dimensiones
│       ├── config.rs                  # Config
│       └── error.rs                   # Errors
│
├── cadhy-core/                        →  crates/cadhy-core/        (SIN CAMBIO)
│   └── src/
│       ├── lib.rs
│       ├── geometry.rs
│       ├── graph.rs
│       ├── id.rs
│       └── units.rs
│
├── cadhy-mesh/                        →  crates/cadhy-mesh/        (SIN CAMBIO)
│   └── src/
│       ├── lib.rs
│       ├── ffi.rs
│       ├── types.rs
│       ├── params.rs
│       ├── quality.rs
│       ├── generator.rs
│       ├── export.rs
│       └── error.rs
│
├── cadhy-hydraulics/                  →  crates/cadhy-hydraulics/  (SIN CAMBIO)
│   └── src/
│       ├── lib.rs
│       ├── hydraulics.rs
│       ├── sections.rs
│       ├── transitions.rs
│       ├── structures.rs
│       ├── alignment.rs
│       ├── corridor.rs
│       └── ...
│
├── cadhy-ifc/                         →  crates/cadhy-ifc/         (SIN CAMBIO)
│   └── src/
│       ├── lib.rs
│       ├── parser.rs
│       ├── exporter.rs
│       ├── geometry.rs
│       ├── types.rs
│       └── error.rs
│
├── cadhy-export/                      →  crates/cadhy-export/      (SIN CAMBIO)
│   └── src/
│       ├── lib.rs
│       ├── stl.rs
│       └── obj.rs
│
└── cadhy-project/                     →  crates/cadhy-project/     (SIN CAMBIO)
```

---

## Nueva Estructura de Carpetas Completa

```
apps/desktop/src/
├── app/                          # Entry point (SIN CAMBIO)
├── assets/                       # Static assets (SIN CAMBIO)
│
├── editors/                      # UI Editors (ED_*)
│   ├── space_view3d/             # 3D Viewport
│   │   ├── ED_view3d_main.tsx
│   │   ├── camera/
│   │   ├── panels/
│   │   └── toolbars/
│   ├── space_properties/         # Properties panel
│   │   ├── ED_props_main.tsx
│   │   ├── types/
│   │   ├── sections/
│   │   ├── previews/
│   │   └── states/
│   ├── space_outliner/           # Scene tree
│   ├── space_timeline/           # History
│   ├── space_drawing/            # 2D Drawing
│   ├── space_projects/           # Projects
│   ├── space_results/            # Results
│   ├── space_gallery/            # Gallery
│   ├── space_ai/                 # AI Chat
│   └── space_cadras/             # CADRAS
│
├── operators/                    # Operations (OP_*)
│   ├── create/                   # Creation operators
│   │   ├── OP_create_panel.tsx
│   │   ├── OP_create_chute.tsx
│   │   └── ...
│   ├── transform/                # Transform operators
│   ├── mesh/                     # Mesh operators
│   ├── boolean/                  # Boolean operators
│   ├── context/                  # Context/providers
│   └── interactive/              # Interactive operations
│
├── interface/                    # UI Components (UI_*)
│   ├── UI_panel.tsx              # Base panel
│   ├── UI_dialog.tsx             # Base dialog
│   ├── UI_toolbar.tsx            # Base toolbar
│   ├── UI_statusbar.tsx
│   ├── UI_command_palette.tsx
│   ├── UI_notifications.tsx
│   ├── common/                   # Common components
│   ├── dialogs/                  # All dialogs
│   ├── settings/                 # Settings panels
│   ├── properties/               # Property components
│   ├── onboarding/               # Onboarding
│   └── shadcn/                   # shadcn/ui components (SIN CAMBIO)
│
├── windowmanager/                # Window Manager (WM_*)
│   ├── WM_layout.tsx             # App layout
│   ├── WM_hotkeys.ts             # Hotkey system
│   ├── WM_hotkey_hook.ts
│   ├── WM_hotkey_registry.ts
│   ├── WM_default_hotkeys.ts
│   └── WM_command.ts
│
├── kernel/                       # Kernel hooks (KE_*)
│   ├── KE_topology_hook.ts
│   └── KE_selection_hook.ts
│
├── render/                       # Rendering (RE_*)
│   ├── RE_scene_content.tsx
│   ├── RE_postprocessing.tsx
│   ├── RE_overlays.tsx
│   ├── RE_section_plane.tsx
│   ├── RE_texture_service.ts
│   ├── RE_lod_manager.ts
│   ├── RE_frustum_culler.ts
│   ├── RE_instancing.ts
│   ├── RE_viewport_registry.ts
│   ├── pool/
│   │   └── RE_material_pool.ts
│   ├── cache/
│   │   ├── RE_texture_cache.ts
│   │   └── RE_mesh_cache.ts
│   └── meshes/
│       └── RE_object_mesh.tsx
│
├── services/                     # Services (SV_*)
│   ├── SV_cad.ts
│   ├── SV_cad_init.ts
│   ├── SV_validation.ts
│   ├── SV_snap.ts
│   ├── SV_measurement.ts
│   ├── SV_section.ts
│   ├── SV_export.ts
│   ├── SV_ai.ts
│   ├── SV_project.ts
│   ├── SV_chat_persistence.ts
│   ├── SV_tauri.ts
│   ├── SV_operation_queue.ts
│   └── SV_thumbnail.ts
│
├── stores/                       # State (ST_*)
│   ├── index.ts
│   ├── ST_types.ts
│   ├── ST_store_types.ts
│   ├── ST_scene_context.ts
│   ├── ST_drawing.ts
│   ├── ST_project.ts
│   ├── ST_settings.ts
│   ├── ST_results.ts
│   ├── ST_ai.ts
│   └── slices/
│       ├── ST_camera.ts
│       ├── ST_objects.ts
│       ├── ST_selection.ts
│       ├── ST_history.ts
│       └── ... (todos los slices)
│
├── hooks/                        # React hooks
│   ├── use-kernel.ts
│   ├── use-operators.ts
│   ├── use-preview.ts
│   ├── use-operator-hotkeys.ts
│   ├── use-units.ts
│   ├── use-dimensioning.ts
│   └── ...
│
├── lib/
│   ├── icons/                    # Icons (IC_*)
│   │   ├── index.ts              # Single export
│   │   ├── IC_tools.ts           # Tool icons
│   │   ├── IC_objects.ts         # Object type icons
│   │   ├── IC_actions.ts         # Action icons
│   │   ├── IC_ui.ts              # UI icons
│   │   └── IC_status.ts          # Status icons
│   └── utils/                    # Utils (UT_*)
│       ├── UT_dimensions.ts
│       ├── UT_snap.ts
│       ├── UT_cad_validation.ts
│       ├── UT_stilling_basin.ts
│       ├── UT_hatch.ts
│       ├── UT_camera.ts
│       └── UT_drawing_units.ts
│
├── types/                        # Types (SIN CAMBIO)
│
└── i18n/                         # i18n (SIN CAMBIO)
```

---

## Script de Migración

```bash
#!/bin/bash
# migration.sh - Script para ejecutar la migración

# Crear estructura de carpetas
mkdir -p apps/desktop/src/{editors/{space_view3d/{camera,panels,toolbars},space_properties/{types,sections,previews,states},space_outliner,space_timeline,space_drawing,space_projects,space_results,space_gallery,space_ai,space_cadras},operators/{create,transform,mesh,boolean,context,interactive},interface/{common,dialogs,settings,properties,onboarding,shadcn},windowmanager,kernel,render/{pool,cache,meshes},services,stores/slices,hooks,lib/{icons,utils}}

# Los archivos se moverán con git mv para preservar historial
# Ver MIGRATION-COMMANDS.md para comandos específicos
```

---

## Principios de Migración

### 1. Preservar UI/UX
- **NO cambiar estilos CSS**
- **NO cambiar estructura de componentes visuales**
- Solo renombrar archivos y actualizar imports

### 2. Actualizar Imports
Después de mover archivos, actualizar imports con:
```typescript
// ANTES
import { ChuteCreator } from "@/components/modeller/creators/ChuteCreator"

// DESPUÉS
import { ChuteCreator } from "@/operators/create/OP_create_chute"
```

### 3. Barrel Exports
Cada carpeta tendrá un `index.ts` para exports limpios:
```typescript
// editors/space_view3d/index.ts
export * from './ED_view3d_main';
export * from './panels';
export * from './toolbars';
```

### 4. Path Aliases
Actualizar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/editors/*": ["./src/editors/*"],
      "@/operators/*": ["./src/operators/*"],
      "@/interface/*": ["./src/interface/*"],
      "@/render/*": ["./src/render/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/services/*": ["./src/services/*"],
      "@/kernel/*": ["./src/kernel/*"],
      "@/windowmanager/*": ["./src/windowmanager/*"]
    }
  }
}
```
