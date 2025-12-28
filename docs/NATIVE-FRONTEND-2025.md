# CADHY Native Frontend Architecture - 2025 Research Update

> **Actualización**: Investigación exhaustiva de opciones de frontend nativo para CADHY

---

## 📊 Resumen Ejecutivo

Después de investigar FreeCAD, Blender, Plasticity, y las opciones modernas de Rust GUI en 2025, presento las siguientes conclusiones:

### Recomendación Principal: **Arquitectura Híbrida wgpu + egui**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CADHY Desktop v2                              │
├─────────────────────────────────────────────────────────────────┤
│  Capa de Renderizado (wgpu - Vulkan/Metal/DX12/OpenGL)          │
│  ├── Viewport 3D nativo (sin WebGL)                             │
│  ├── Post-processing pipeline                                    │
│  └── Integración directa con OpenCASCADE meshes                 │
├─────────────────────────────────────────────────────────────────┤
│  Capa UI (egui - Pure Rust Immediate Mode)                      │
│  ├── Panels (Properties, Outliner, Timeline)                    │
│  ├── Toolbars y Menús                                           │
│  ├── Dialogs y Overlays                                         │
│  └── Theming (estilo Blender/Plasticity)                        │
├─────────────────────────────────────────────────────────────────┤
│  Capa de Estado (Rust puro - sin Zustand)                       │
│  ├── Scene State (objects, selections, layers)                  │
│  ├── Viewport State (camera, tools, modes)                      │
│  └── App State (preferences, history, undo)                     │
├─────────────────────────────────────────────────────────────────┤
│  Backend CAD (Rust + C++ FFI)                                   │
│  ├── OpenCASCADE operations                                     │
│  ├── Hydraulics engine                                          │
│  └── File I/O (STEP, IFC, DXF)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Análisis de Opciones

### 1. **wgpu** - Motor de Renderizado ⭐ RECOMENDADO

**Por qué wgpu:**
- ✅ Cross-platform: Vulkan, Metal, DX12, OpenGL ES, WebGPU
- ✅ Production-ready: Usado por Firefox, Servo, Deno, Bevy
- ✅ Pure Rust: Sin FFI complicado para gráficos
- ✅ Shader translation automática via Naga (WGSL → SPIR-V → MSL/HLSL/GLSL)
- ✅ Integración nativa con egui via `egui-wgpu`

**Dependencias:**
```toml
[dependencies]
wgpu = "24"
winit = "0.30"
pollster = "0.4"  # Para async sin runtime completo
bytemuck = "1.14" # Para conversión de datos a GPU
```

**Recursos:**
- [wgpu.rs](https://wgpu.rs/)
- [Learn Wgpu Tutorial](https://sotrh.github.io/learn-wgpu/)

---

### 2. **egui** - UI Framework ⭐ RECOMENDADO

**Por qué egui sobre Dear ImGui:**

| Característica | egui | Dear ImGui |
|---------------|------|------------|
| Lenguaje | 100% Rust | C++ + bindings |
| Setup | Trivial | Complejo |
| Integration wgpu | Nativo | Requiere glue |
| API Safety | Type-safe | Manual |
| Lazy Mode | ✅ (reduce CPU) | ❌ |
| Performance | Excelente | Excelente |
| Madurez | Buena (v0.29) | Muy alta |

**Ventajas específicas para CAD:**
1. **Lazy rendering**: Solo re-dibuja cuando hay cambios (ahorra CPU)
2. **Immediate mode**: Ideal para herramientas CAD como Blender
3. **Tessellation**: Diseñado para vivir en entornos 3D
4. **Web compatible**: El mismo código puede correr en WASM si necesitas

**Dependencias:**
```toml
[dependencies]
egui = "0.29"
egui-wgpu = "0.29"
egui-winit = "0.29"
```

**Recursos:**
- [egui GitHub](https://github.com/emilk/egui)
- [egui Demo](https://www.egui.rs/)

---

### 3. **Alternativas Consideradas**

#### Dioxus (Descartado para modelador)
- ✅ React-like API
- ✅ 100% Rust
- ❌ WebView-based por defecto
- ❌ WGPU renderer experimental
- **Veredicto**: Mejor para apps tipo dashboard, no para CAD

#### Slint (Descartado)
- ✅ Declarativo, muy eficiente
- ✅ < 300KB RAM
- ❌ No immediate mode (difícil para viewport interactivo)
- ❌ Menos ejemplos de 3D
- **Veredicto**: Mejor para embedded/HMI, no para CAD

#### Iced (Descartado)
- ✅ Elm-like architecture
- ❌ Retained mode (menos control)
- ❌ No diseñado para viewports 3D
- **Veredicto**: Mejor para apps de datos, no para CAD

#### Dear ImGui (Alternativa válida)
- ✅ Más maduro
- ✅ Más widgets
- ⚠️ Requiere imgui-rs + imgui-wgpu-backend
- ⚠️ Curva de aprendizaje para bindings
- **Veredicto**: Segunda opción si egui no cumple

---

## 🏗️ Arquitectura Propuesta: `apps/desktop-v2`

### Estructura de Directorios

```
apps/desktop-v2/
├── Cargo.toml
├── src/
│   ├── main.rs                     # Entry point
│   │
│   ├── app/                        # Application core
│   │   ├── mod.rs
│   │   ├── APP_state.rs            # Global state
│   │   ├── APP_config.rs           # Configuration
│   │   └── APP_events.rs           # Event system
│   │
│   ├── render/                     # wgpu Rendering
│   │   ├── mod.rs
│   │   ├── RE_context.rs           # wgpu context setup
│   │   ├── RE_pipeline.rs          # Render pipelines
│   │   ├── RE_mesh.rs              # Mesh rendering
│   │   ├── RE_camera.rs            # Camera system
│   │   ├── RE_gizmo.rs             # Transform gizmos
│   │   ├── RE_grid.rs              # Viewport grid
│   │   ├── RE_selection.rs         # Selection highlighting
│   │   ├── RE_postprocess.rs       # Post-processing
│   │   └── shaders/                # WGSL shaders
│   │       ├── mesh.wgsl
│   │       ├── wireframe.wgsl
│   │       ├── grid.wgsl
│   │       └── outline.wgsl
│   │
│   ├── ui/                         # egui UI
│   │   ├── mod.rs
│   │   ├── UI_theme.rs             # Blender-like theme
│   │   │
│   │   ├── panels/                 # UI Panels
│   │   │   ├── mod.rs
│   │   │   ├── PN_viewport.rs      # 3D Viewport panel
│   │   │   ├── PN_properties.rs    # Properties panel
│   │   │   ├── PN_outliner.rs      # Scene outliner
│   │   │   ├── PN_timeline.rs      # History/timeline
│   │   │   ├── PN_tools.rs         # Tools panel
│   │   │   └── PN_console.rs       # Console/logs
│   │   │
│   │   ├── toolbars/               # Toolbars
│   │   │   ├── mod.rs
│   │   │   ├── TB_main.rs          # Main toolbar
│   │   │   ├── TB_viewport.rs      # Viewport toolbar
│   │   │   └── TB_selection.rs     # Selection mode
│   │   │
│   │   ├── dialogs/                # Dialogs
│   │   │   ├── mod.rs
│   │   │   ├── DL_preferences.rs
│   │   │   ├── DL_export.rs
│   │   │   ├── DL_import.rs
│   │   │   └── DL_about.rs
│   │   │
│   │   └── widgets/                # Custom widgets
│   │       ├── mod.rs
│   │       ├── WG_vec3_input.rs
│   │       ├── WG_color_picker.rs
│   │       ├── WG_tree_view.rs
│   │       └── WG_slider.rs
│   │
│   ├── input/                      # Input handling
│   │   ├── mod.rs
│   │   ├── IN_keyboard.rs
│   │   ├── IN_mouse.rs
│   │   ├── IN_hotkeys.rs
│   │   └── IN_gestures.rs          # Touch/trackpad
│   │
│   ├── operators/                  # CAD Operators
│   │   ├── mod.rs
│   │   ├── OP_transform.rs         # Move/rotate/scale
│   │   ├── OP_selection.rs         # Selection operators
│   │   ├── OP_primitives.rs        # Box, sphere, etc.
│   │   ├── OP_boolean.rs           # Boolean operations
│   │   ├── OP_sketch.rs            # Sketching
│   │   └── OP_measure.rs           # Measurements
│   │
│   ├── state/                      # State management
│   │   ├── mod.rs
│   │   ├── ST_scene.rs             # Scene state
│   │   ├── ST_viewport.rs          # Viewport state
│   │   ├── ST_selection.rs         # Selection state
│   │   ├── ST_history.rs           # Undo/redo
│   │   └── ST_layers.rs            # Layers
│   │
│   ├── cad/                        # CAD integration
│   │   ├── mod.rs
│   │   ├── CAD_bridge.rs           # Bridge to cadhy-core
│   │   ├── CAD_mesh.rs             # Mesh conversion
│   │   └── CAD_topology.rs         # Topology queries
│   │
│   └── platform/                   # Platform-specific
│       ├── mod.rs
│       ├── PL_macos.rs
│       ├── PL_windows.rs
│       └── PL_linux.rs
│
└── assets/
    ├── fonts/
    ├── icons/
    └── themes/
```

---

## 🔄 Comparación con Software de Referencia

### Blender Architecture

| Componente | Blender | CADHY v2 |
|------------|---------|----------|
| Window System | GHOST (custom) | winit |
| UI | Custom Immediate Mode | egui |
| Rendering | OpenGL + custom | wgpu |
| State | C structs | Rust structs |
| Operators | Python + C | Rust |

**Lección de Blender**: GHOST fue creado porque GLUT no era suficiente. winit es el equivalente moderno en Rust y es mucho más maduro.

### FreeCAD Architecture

| Componente | FreeCAD | CADHY v2 |
|------------|---------|----------|
| UI Framework | Qt/PySide | egui |
| 3D Rendering | Coin3D (OpenInventor) | wgpu |
| CAD Kernel | OpenCASCADE | OpenCASCADE |
| Scripting | Python | (Futuro: Rhai?) |

**Lección de FreeCAD**: La separación App/Gui es crítica. Nosotros ya tenemos esto con cadhy-core vs frontend.

### Plasticity Architecture

| Componente | Plasticity | CADHY v2 |
|------------|-----------|----------|
| Framework | Electron | Native Rust |
| UI | React/Three.js | egui/wgpu |
| Rendering | WebGL | wgpu (Vulkan/Metal) |
| CAD | xNURBS + custom | OpenCASCADE |

**Lección de Plasticity**: Demuestra que una UI moderna es posible con enfoque CAD. Su éxito valida que los artistas quieren CAD sin complejidad CAD.

---

## ⚡ Performance Comparativa Esperada

| Métrica | React/Three.js | Native (egui/wgpu) |
|---------|---------------|-------------------|
| Startup | ~3-5s | <1s |
| Memory baseline | ~200MB | ~50MB |
| 60 FPS viewport | ~1000 objetos | ~10,000+ objetos |
| Bundle size | ~50MB | ~15MB |
| CPU idle | 5-15% | <1% (lazy mode) |

---

## 🚀 Plan de Implementación Actualizado

### Fase 0: POC (2 semanas)
- [ ] Setup wgpu + egui básico
- [ ] Ventana con viewport vacío
- [ ] Panel de propiedades simple
- [ ] Renderizar un cubo desde cadhy-core

### Fase 1: Viewport (3 semanas)
- [ ] Camera orbit/pan/zoom
- [ ] Grid y ejes
- [ ] Renderizado de meshes
- [ ] Selection highlighting

### Fase 2: UI Core (3 semanas)
- [ ] Theme estilo Blender
- [ ] Outliner funcional
- [ ] Properties panel
- [ ] Toolbar básico

### Fase 3: Operators (4 semanas)
- [ ] Transform gizmo
- [ ] Selection operators
- [ ] Primitive creation
- [ ] Boolean operations

### Fase 4: Features (4 semanas)
- [ ] History/Undo
- [ ] Import/Export
- [ ] Preferences
- [ ] Hotkeys

### Fase 5: Polish (2 semanas)
- [ ] Performance optimization
- [ ] Platform testing
- [ ] Bug fixes

**Total estimado: 18 semanas (~4.5 meses)**

---

## 📦 Dependencias Cargo.toml

```toml
[package]
name = "cadhy-desktop-v2"
version = "0.1.0"
edition = "2021"

[dependencies]
# Windowing
winit = "0.30"
raw-window-handle = "0.6"

# Graphics (wgpu)
wgpu = "24"
bytemuck = { version = "1.14", features = ["derive"] }
pollster = "0.4"

# UI (egui)
egui = "0.29"
egui-wgpu = "0.29"
egui-winit = "0.29"

# Math
glam = { version = "0.29", features = ["bytemuck"] }
ultraviolet = "0.9"  # Alternative for some operations

# Async
tokio = { version = "1", features = ["rt", "sync", "macros"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
ron = "0.8"  # For config files

# Error handling
thiserror = "2"
anyhow = "1"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Image loading (textures)
image = "0.25"

# File dialogs
rfd = "0.15"

# CAD core
cadhy-core = { path = "../../crates/cadhy-core" }
cadhy-mesh = { path = "../../crates/cadhy-mesh" }

[target.'cfg(target_os = "macos")'.dependencies]
cocoa = "0.26"

[target.'cfg(target_os = "windows")'.dependencies]
windows = "0.58"

[profile.release]
lto = true
codegen-units = 1
strip = true
```

---

## 🎨 Theme: Blender-Inspired Dark

```rust
// ui/UI_theme.rs
pub fn blender_dark_theme() -> egui::Style {
    let mut style = egui::Style::default();

    style.visuals = egui::Visuals {
        dark_mode: true,
        override_text_color: Some(egui::Color32::from_gray(220)),
        panel_fill: egui::Color32::from_rgb(40, 40, 40),
        window_fill: egui::Color32::from_rgb(50, 50, 50),
        // ... más configuración
    };

    style
}
```

---

## 🔗 Referencias

### Documentación
- [wgpu Documentation](https://docs.rs/wgpu/)
- [egui Documentation](https://docs.rs/egui/)
- [Learn Wgpu](https://sotrh.github.io/learn-wgpu/)
- [Blender Developer Docs](https://developer.blender.org/)

### Ejemplos de Código
- [egui + wgpu template](https://github.com/emilk/egui/tree/master/crates/egui-wgpu)
- [wgpu examples](https://github.com/gfx-rs/wgpu/tree/trunk/examples)
- [Bevy CAD](https://github.com/mattatz/bevy_curvo) - Parametric modeling reference

### Proyectos de Referencia
- [Truck CAD kernel](https://github.com/ricosjp/truck) - Rust B-Rep
- [Fornjot](https://github.com/hannobraun/fornjot) - Rust CAD (experimental)
- [OpenCASCADE](https://dev.opencascade.org/) - C++ CAD kernel

---

## ✅ Decisión Final

| Aspecto | Decisión |
|---------|----------|
| **Rendering** | wgpu |
| **UI Framework** | egui |
| **State Management** | Rust structs + Arc<Mutex<>> |
| **Window Management** | winit |
| **Build System** | Cargo (puro Rust) |
| **Tauri** | NO para desktop-v2 (solo Rust nativo) |

### Justificación para NO usar Tauri en v2

1. **Tauri = WebView**: Tauri fundamentalmente depende de webview para renderizado
2. **IPC overhead**: Comunicación Rust↔JS añade latencia
3. **Complejidad**: Mantener dos stacks (Rust + JS) es más trabajo
4. **Performance**: Native es siempre más rápido que WebView

El código TypeScript existente en `packages/` seguirá funcionando para la app web, pero el modelador desktop será 100% Rust.

---

**Última actualización**: Diciembre 2025
**Investigación realizada**: FreeCAD, Blender, Plasticity, egui, wgpu, Dioxus, Slint
**Versión**: 2.0
