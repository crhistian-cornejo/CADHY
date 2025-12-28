# Plan de Implementación: Frontend Nativo Rust/C++ con Tauri

> **Objetivo**: Migrar CADHY de React/Three.js a un frontend completamente nativo en Rust/C++, similar a Blender, manteniendo Tauri para multiplataforma.

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura Propuesta](#arquitectura-propuesta)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Fases de Implementación](#fases-de-implementación)
5. [Estructura de Código](#estructura-de-código)
6. [Migración de Componentes](#migración-de-componentes)
7. [Rendering Pipeline](#rendering-pipeline)
8. [Consideraciones Técnicas](#consideraciones-técnicas)
9. [Riesgos y Mitigaciones](#riesgos-y-mitigaciones)

---

## 🎯 Visión General

### Estado Actual
- **Frontend**: React 19 + TypeScript + Three.js (WebGL)
- **Backend**: Rust + Tauri v2
- **Rendering**: Three.js con post-processing
- **UI**: shadcn/ui + Tailwind CSS

### Estado Objetivo
- **Frontend**: Rust/C++ nativo con UI immediate mode
- **Rendering**: OpenGL/Vulkan directo
- **UI**: Dear ImGui o egui
- **Backend**: Rust + Tauri (sin webview, solo IPC)

### Ventajas del Frontend Nativo

1. **Performance**: Sin overhead de JavaScript/WebGL
2. **Control total**: Acceso directo a GPU y sistema
3. **Consistencia**: Look & feel nativo por plataforma
4. **Menor tamaño**: Sin bundle de React/Three.js
5. **Mejor integración**: Con OpenCASCADE y librerías C++

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    CADHY Desktop App                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend Nativo (Rust/C++)                                  │
│  ├── UI Layer (Dear ImGui / egui)                           │
│  ├── Rendering Layer (OpenGL/Vulkan)                        │
│  ├── Input Layer (Window events, keyboard, mouse)           │
│  └── State Layer (Rust structs, no Zustand)                 │
├─────────────────────────────────────────────────────────────┤
│  Tauri IPC Layer (sin webview)                              │
│  ├── Commands (invoke desde Rust frontend)                  │
│  └── Events (emit/listen en Rust)                           │
├─────────────────────────────────────────────────────────────┤
│  Backend (Rust + Tauri)                                      │
│  ├── Command Layer (Tauri Commands)                         │
│  ├── Engine Layer (CAD, Hydraulics)                         │
│  └── Core Layer (Types, Math, Utils)                        │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
User Input (Mouse/Keyboard)
        ↓
Frontend Rust (UI + Rendering)
        ↓
Tauri IPC (invoke_command)
        ↓
Backend Rust (Commands)
        ↓
OpenCASCADE (C++ via FFI)
        ↓
Mesh Data (Rust structs)
        ↓
Frontend Rust (Render en OpenGL/Vulkan)
```

---

## 🛠️ Stack Tecnológico

### Opción A: Dear ImGui (Recomendada para Blender-like)

**Pros**:
- ✅ UI immediate mode, muy similar a Blender
- ✅ Maduro y estable (usado en muchos juegos/CAD)
- ✅ Excelente integración con OpenGL/Vulkan
- ✅ Bindings Rust maduros (`imgui-rs`)
- ✅ Look & feel profesional

**Contras**:
- ⚠️ C++ con bindings Rust (más complejidad)
- ⚠️ Curva de aprendizaje para immediate mode

**Dependencias**:
```toml
[dependencies]
imgui = "0.9"
imgui-winit-support = "0.9"
imgui-opengl-renderer = "0.9"  # o imgui-vulkan-renderer
winit = "0.29"  # Window management
glutin = "0.31"  # OpenGL context
# o
ash = "0.38"  # Vulkan bindings
```

### Opción B: egui (Rust puro)

**Pros**:
- ✅ 100% Rust, sin FFI
- ✅ Más fácil de integrar con Tauri
- ✅ API más moderna y type-safe
- ✅ Buen rendimiento

**Contras**:
- ⚠️ Menos maduro que ImGui
- ⚠️ Look & feel menos "nativo"
- ⚠️ Menos ejemplos de CAD apps

**Dependencias**:
```toml
[dependencies]
egui = "0.24"
eframe = "0.24"
winit = "0.29"
```

### Opción C: Iced (Declarativo)

**Pros**:
- ✅ Estilo React-like (declarativo)
- ✅ 100% Rust
- ✅ Buen para UI complejas

**Contras**:
- ⚠️ Menos adecuado para viewport 3D
- ⚠️ Overhead más alto

### Recomendación: **Dear ImGui** (Opción A)

Razones:
1. Más similar a Blender (immediate mode)
2. Mejor para aplicaciones CAD profesionales
3. Excelente integración con OpenGL/Vulkan
4. Comunidad grande y ejemplos

---

## 📦 Rendering Pipeline

### OpenGL vs Vulkan

#### OpenGL (Recomendado para empezar)

**Pros**:
- ✅ Más simple de implementar
- ✅ Mejor documentación
- ✅ Compatibilidad universal
- ✅ Bindings Rust maduros (`gl`, `glow`)

**Contras**:
- ⚠️ API legacy (pero funcional)
- ⚠️ Menos control sobre GPU

**Dependencias**:
```toml
[dependencies]
gl = "0.14"  # OpenGL bindings
glow = "0.13"  # Safe OpenGL wrapper (recomendado)
glutin = "0.31"  # Context creation
```

#### Vulkan (Para futuro)

**Pros**:
- ✅ Control total sobre GPU
- ✅ Mejor performance
- ✅ Moderno y futuro-proof

**Contras**:
- ⚠️ Mucho más complejo
- ⚠️ Más código boilerplate
- ⚠️ Curva de aprendizaje alta

**Dependencias**:
```toml
[dependencies]
ash = "0.38"  # Vulkan bindings
gpu-alloc = "0.6"  # Memory management
```

### Pipeline de Rendering Propuesto

```rust
// 1. Setup OpenGL Context (via glutin/winit)
let window = WindowBuilder::new()
    .with_title("CADHY")
    .with_inner_size(LogicalSize::new(1200, 900))
    .build()?;

let gl_context = unsafe { 
    ContextBuilder::new()
        .with_gl(GlProfile::Core, GlVersion::new(3, 3))
        .build_windowed(window)?
};

// 2. Initialize Dear ImGui
let mut imgui = imgui::Context::create();
let mut platform = imgui_winit_support::WinitPlatform::init(&mut imgui);
platform.attach_window(imgui.io_mut(), &window, HiDpiMode::Default);

// 3. Render Loop
loop {
    // Handle events
    event_loop.poll_events(|event| {
        platform.handle_event(imgui.io_mut(), &window, &event);
        // ... handle input
    });

    // Update ImGui
    platform.prepare_frame(imgui.io_mut(), &window)?;
    let ui = imgui.frame();

    // Render UI
    ui.window("Viewport")
        .size([800.0, 600.0], Condition::FirstUseEver)
        .build(|| {
            // Viewport content
        });

    // Render 3D Scene (OpenGL)
    unsafe {
        gl::Clear(gl::COLOR_BUFFER_BIT | gl::DEPTH_BUFFER_BIT);
        // Render meshes from OpenCASCADE
        render_scene(&meshes);
    }

    // Render ImGui overlay
    let draw_data = imgui.render();
    renderer.render(draw_data)?;

    // Swap buffers
    gl_context.swap_buffers()?;
}
```

---

## 🗂️ Estructura de Código Propuesta

```
apps/desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                    # Entry point
│   │   ├── lib.rs                     # Tauri app (sin webview)
│   │   │
│   │   ├── frontend/                  # NEW - Frontend nativo
│   │   │   ├── mod.rs
│   │   │   │
│   │   │   ├── ui/                    # UI Layer (ImGui)
│   │   │   │   ├── mod.rs
│   │   │   │   ├── panels/            # UI panels
│   │   │   │   │   ├── viewport_panel.rs
│   │   │   │   │   ├── properties_panel.rs
│   │   │   │   │   ├── outliner_panel.rs
│   │   │   │   │   └── toolbar_panel.rs
│   │   │   │   ├── dialogs/           # Dialogs
│   │   │   │   │   ├── file_dialog.rs
│   │   │   │   │   └── settings_dialog.rs
│   │   │   │   └── widgets/           # Custom widgets
│   │   │   │       ├── number_input.rs
│   │   │   │       └── color_picker.rs
│   │   │   │
│   │   │   ├── render/                # Rendering Layer
│   │   │   │   ├── mod.rs
│   │   │   │   ├── gl_context.rs      # OpenGL setup
│   │   │   │   ├── shaders/           # GLSL shaders
│   │   │   │   │   ├── mesh.vert
│   │   │   │   │   ├── mesh.frag
│   │   │   │   │   └── wireframe.frag
│   │   │   │   ├── mesh_renderer.rs   # Mesh rendering
│   │   │   │   ├── camera.rs          # Camera controls
│   │   │   │   ├── gizmo.rs           # Transform gizmos
│   │   │   │   └── postprocess.rs     # Post-processing
│   │   │   │
│   │   │   ├── input/                 # Input handling
│   │   │   │   ├── mod.rs
│   │   │   │   ├── keyboard.rs
│   │   │   │   ├── mouse.rs
│   │   │   │   └── hotkeys.rs
│   │   │   │
│   │   │   ├── state/                 # State management
│   │   │   │   ├── mod.rs
│   │   │   │   ├── app_state.rs       # Global app state
│   │   │   │   ├── scene_state.rs     # Scene data
│   │   │   │   └── viewport_state.rs  # Viewport state
│   │   │   │
│   │   │   └── tauri_bridge.rs        # Tauri IPC bridge
│   │   │       ├── commands.rs        # Invoke commands
│   │   │       └── events.rs           # Listen to events
│   │   │
│   │   └── commands/                  # Backend commands (existing)
│   │       ├── cmd_cad.rs
│   │       └── ...
│   │
│   └── Cargo.toml
│
└── (eliminar src/ React completamente)
```

---

## 🚀 Fases de Implementación

### Fase 0: Preparación (1-2 semanas)

**Objetivos**:
- [ ] Investigar y prototipar Dear ImGui + OpenGL
- [ ] Crear POC mínimo (ventana + viewport básico)
- [ ] Evaluar integración con Tauri sin webview
- [ ] Decidir stack final (ImGui vs egui, OpenGL vs Vulkan)

**Tareas**:
1. Crear branch `feature/native-frontend`
2. Prototipo básico en `apps/desktop/src-tauri/src/frontend/`
3. Documentar decisiones técnicas

**Deliverables**:
- POC funcional con ventana + viewport básico
- Documento de decisiones técnicas

---

### Fase 1: Infraestructura Base (2-3 semanas)

**Objetivos**:
- [ ] Setup OpenGL context y Dear ImGui
- [ ] Sistema de ventanas básico
- [ ] Integración con Tauri (IPC)
- [ ] Render loop funcional

**Tareas**:

1. **Setup OpenGL + ImGui**
   ```rust
   // apps/desktop/src-tauri/src/frontend/mod.rs
   pub mod ui;
   pub mod render;
   pub mod input;
   pub mod state;
   ```

2. **Tauri sin webview**
   ```rust
   // En lib.rs, crear ventana nativa en lugar de webview
   use tauri::WindowBuilder;
   
   fn main() {
       tauri::Builder::default()
           .setup(|app| {
               // Crear ventana nativa (no webview)
               let window = app.get_window("main").unwrap();
               // Inicializar frontend nativo
               frontend::init(window)?;
               Ok(())
           })
           .run(tauri::generate_context!())
   }
   ```

3. **IPC Bridge**
   ```rust
   // frontend/tauri_bridge.rs
   use tauri::AppHandle;
   
   pub struct TauriBridge {
       app: AppHandle,
   }
   
   impl TauriBridge {
       pub async fn invoke_cad_command(&self, cmd: &str, args: Value) -> Result<Value> {
           self.app.emit("invoke", (cmd, args))?;
           // O usar tauri::command directamente
       }
   }
   ```

**Deliverables**:
- Ventana nativa funcionando
- Render loop básico
- IPC funcionando

---

### Fase 2: Viewport 3D (3-4 semanas)

**Objetivos**:
- [ ] Renderizado de meshes desde OpenCASCADE
- [ ] Cámara y controles de navegación
- [ ] Sistema de selección
- [ ] Grid y ejes

**Tareas**:

1. **Mesh Renderer**
   ```rust
   // frontend/render/mesh_renderer.rs
   pub struct MeshRenderer {
       shader: ShaderProgram,
       vao: VertexArrayObject,
       vbo: Buffer,
       ebo: Buffer,
   }
   
   impl MeshRenderer {
       pub fn render(&self, mesh: &MeshData, camera: &Camera) {
           // Upload mesh data to GPU
           // Render with shader
       }
   }
   ```

2. **Camera System**
   ```rust
   // frontend/render/camera.rs
   pub struct Camera {
       position: Vec3,
       target: Vec3,
       up: Vec3,
       fov: f32,
   }
   
   impl Camera {
       pub fn view_matrix(&self) -> Mat4 { /* ... */ }
       pub fn projection_matrix(&self, aspect: f32) -> Mat4 { /* ... */ }
   }
   ```

3. **Integración con Backend**
   ```rust
   // En el render loop
   let meshes = tauri_bridge.invoke("get_scene_meshes", json!({})).await?;
   for mesh in meshes {
       mesh_renderer.render(&mesh, &camera);
   }
   ```

**Deliverables**:
- Viewport 3D renderizando meshes
- Cámara orbit funcionando
- Selección básica

---

### Fase 3: UI Panels (4-5 semanas)

**Objetivos**:
- [ ] Panel de propiedades
- [ ] Outliner (árbol de escena)
- [ ] Toolbar
- [ ] Menús

**Tareas**:

1. **Properties Panel**
   ```rust
   // frontend/ui/panels/properties_panel.rs
   pub fn render_properties_panel(ui: &Ui, selected: &Option<ObjectId>) {
       ui.window("Properties")
           .size([300.0, 600.0], Condition::FirstUseEver)
           .build(|| {
               if let Some(id) = selected {
                   let props = get_object_properties(id);
                   ui.text("Transform");
                   ui.input_float3("Position", &mut props.position);
                   // ...
               }
           });
   }
   ```

2. **Outliner**
   ```rust
   // frontend/ui/panels/outliner_panel.rs
   pub fn render_outliner(ui: &Ui, scene: &Scene) {
       ui.window("Outliner")
           .build(|| {
               for obj in scene.objects() {
                   ui.tree_node(&obj.name)
                       .build(|| {
                           // Children
                       });
               }
           });
   }
   ```

**Deliverables**:
- Panels principales funcionando
- UI responsive y usable

---

### Fase 4: Operadores y Herramientas (4-5 semanas)

**Objetivos**:
- [ ] Gizmos de transformación
- [ ] Operadores CAD (crear, editar, boolean)
- [ ] Herramientas de dibujo
- [ ] Hotkeys system

**Tareas**:

1. **Gizmos**
   ```rust
   // frontend/render/gizmo.rs
   pub struct TransformGizmo {
       translation: Vec3,
       rotation: Quat,
       scale: Vec3,
   }
   
   impl TransformGizmo {
       pub fn render(&self, camera: &Camera) {
           // Render axes, handles, etc.
       }
       
       pub fn handle_input(&mut self, mouse: &MouseState) -> bool {
           // Handle drag
       }
   }
   ```

2. **Operadores**
   ```rust
   // frontend/operators/mod.rs
   pub enum Operator {
       CreateBox { params: BoxParams },
       BooleanUnion { objects: Vec<ObjectId> },
       // ...
   }
   
   impl Operator {
       pub async fn execute(&self, bridge: &TauriBridge) -> Result<()> {
           bridge.invoke("create_box", self.params).await?;
           Ok(())
       }
   }
   ```

**Deliverables**:
- Gizmos funcionando
- Operadores básicos implementados
- Hotkeys configurados

---

### Fase 5: Post-processing y Efectos (2-3 semanas)

**Objetivos**:
- [ ] Shaders de post-processing
- [ ] SSAO, Bloom, DOF
- [ ] Modos de renderizado (wireframe, solid, rendered)

**Tareas**:

1. **Post-processing Pipeline**
   ```rust
   // frontend/render/postprocess.rs
   pub struct PostProcessor {
       framebuffer: Framebuffer,
       shaders: HashMap<String, ShaderProgram>,
   }
   
   impl PostProcessor {
       pub fn render(&mut self, scene_texture: Texture) {
           // Apply SSAO
           // Apply Bloom
           // Apply DOF
           // Composite
       }
   }
   ```

**Deliverables**:
- Post-processing funcionando
- Modos de renderizado implementados

---

### Fase 6: Migración de Features (6-8 semanas)

**Objetivos**:
- [ ] Migrar todas las features de React
- [ ] Sistema de dibujo 2D
- [ ] Análisis hidráulico UI
- [ ] AI chat UI

**Tareas**:
- Migrar feature por feature
- Mantener funcionalidad existente
- Mejorar UX donde sea posible

**Deliverables**:
- Todas las features migradas
- App funcionalmente completa

---

### Fase 7: Optimización y Polish (2-3 semanas)

**Objetivos**:
- [ ] Optimizar rendering
- [ ] Mejorar performance
- [ ] Polish UI/UX
- [ ] Testing

**Deliverables**:
- App optimizada
- Lista para release

---

## 🔄 Migración de Componentes

### Mapeo React → Rust Nativo

| Componente React | Equivalente Rust |
|-----------------|------------------|
| `Viewport3D` | `frontend/render/viewport.rs` |
| `PropertiesPanel` | `frontend/ui/panels/properties_panel.rs` |
| `Outliner` | `frontend/ui/panels/outliner_panel.rs` |
| `Toolbar` | `frontend/ui/panels/toolbar_panel.rs` |
| `Zustand stores` | `frontend/state/*.rs` (Rust structs) |
| `Three.js Mesh` | `frontend/render/mesh_renderer.rs` |
| `PostProcessing` | `frontend/render/postprocess.rs` |
| `Gizmo` | `frontend/render/gizmo.rs` |

### Estado (Zustand → Rust)

**Antes (TypeScript)**:
```typescript
interface CadStore {
  objects: CadObject[]
  selectedIds: string[]
  addObject: (obj: CadObject) => void
}
```

**Después (Rust)**:
```rust
// frontend/state/scene_state.rs
pub struct SceneState {
    objects: Vec<CadObject>,
    selected_ids: Vec<ObjectId>,
}

impl SceneState {
    pub fn add_object(&mut self, obj: CadObject) {
        self.objects.push(obj);
    }
}
```

---

## ⚙️ Consideraciones Técnicas

### 1. Tauri sin Webview

Tauri v2 permite crear aplicaciones sin webview usando solo el backend:

```rust
// En lib.rs
tauri::Builder::default()
    .setup(|app| {
        // No crear webview, solo ventana nativa
        let window = app.get_window("main").unwrap();
        // Inicializar frontend nativo aquí
        Ok(())
    })
    .run(tauri::generate_context!())
```

**Nota**: Puede requerir modificar `tauri.conf.json` para deshabilitar webview.

### 2. IPC entre Frontend y Backend

El frontend Rust puede usar Tauri commands directamente:

```rust
// En frontend/tauri_bridge.rs
use tauri::AppHandle;

pub async fn invoke_command(
    app: &AppHandle,
    command: &str,
    args: serde_json::Value,
) -> Result<serde_json::Value> {
    // Usar tauri::command o emit events
    app.emit("command", (command, args))?;
    // O mejor: usar tauri::command directamente si es posible
}
```

### 3. Threading

- **UI Thread**: Dear ImGui debe correr en el thread principal
- **Render Thread**: OpenGL puede correr en thread separado (con cuidado)
- **Backend Thread**: Tauri commands pueden ser async

### 4. Memory Management

- Usar `Arc<Mutex<>>` para estado compartido
- Evitar clones innecesarios de meshes grandes
- Usar object pooling para objetos temporales

### 5. Cross-platform

- **macOS**: Cocoa (via winit)
- **Windows**: Win32 (via winit)
- **Linux**: X11/Wayland (via winit)

winit abstrae estas diferencias.

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Complejidad de Dear ImGui

**Mitigación**:
- Empezar con POC pequeño
- Usar ejemplos de la comunidad
- Considerar egui como alternativa más simple

### Riesgo 2: Pérdida de Features durante Migración

**Mitigación**:
- Migrar incrementalmente
- Mantener branch de React hasta completar migración
- Feature flags para alternar entre frontends

### Riesgo 3: Performance de OpenGL

**Mitigación**:
- Profiling temprano
- Considerar Vulkan para futuro
- Optimizar draw calls y batching

### Riesgo 4: Tauri sin Webview no documentado

**Mitigación**:
- Investigar alternativas (winit directo)
- Considerar fork de Tauri si es necesario
- Usar Tauri solo para IPC, ventanas con winit

### Riesgo 5: Curva de Aprendizaje

**Mitigación**:
- Training del equipo
- Documentación extensa
- Code reviews cuidadosos

---

## 📚 Recursos y Referencias

### Documentación

- [Dear ImGui](https://github.com/ocornut/imgui)
- [imgui-rs](https://github.com/imgui-rs/imgui-rs)
- [winit](https://docs.rs/winit/)
- [glow](https://docs.rs/glow/)
- [Tauri IPC](https://tauri.app/v1/guides/features/command)

### Ejemplos

- [imgui-rs examples](https://github.com/imgui-rs/imgui-rs/tree/main/imgui-examples)
- [Blender source code](https://github.com/blender/blender) (referencia de arquitectura)
- [Plasticity](https://www.plasticity.xyz/) (ejemplo de CAD nativo)

### Comunidad

- [imgui-rs Discord](https://discord.gg/4MvBaKH)
- [Rust GameDev](https://rust-gamedev.github.io/)

---

## 🎯 Métricas de Éxito

### Performance

- [ ] 60 FPS constante en viewport con 1000+ objetos
- [ ] Tiempo de inicio < 2 segundos
- [ ] Uso de memoria < 500 MB para escena básica

### Funcionalidad

- [ ] 100% de features migradas
- [ ] UI responsive y fluida
- [ ] Hotkeys funcionando
- [ ] Export/Import funcionando

### UX

- [ ] Look & feel profesional
- [ ] Feedback positivo de usuarios beta
- [ ] Documentación completa

---

## 📅 Timeline Estimado

| Fase | Duración | Total Acumulado |
|------|----------|-----------------|
| Fase 0: Preparación | 1-2 semanas | 2 semanas |
| Fase 1: Infraestructura | 2-3 semanas | 4-5 semanas |
| Fase 2: Viewport 3D | 3-4 semanas | 7-9 semanas |
| Fase 3: UI Panels | 4-5 semanas | 11-14 semanas |
| Fase 4: Operadores | 4-5 semanas | 15-19 semanas |
| Fase 5: Post-processing | 2-3 semanas | 17-22 semanas |
| Fase 6: Migración Features | 6-8 semanas | 23-30 semanas |
| Fase 7: Optimización | 2-3 semanas | 25-33 semanas |

**Total estimado**: 6-8 meses (dependiendo del equipo)

---

## ✅ Checklist de Inicio

Antes de comenzar:

- [ ] Leer documentación de Dear ImGui
- [ ] Crear POC básico (ventana + viewport)
- [ ] Evaluar alternativas (egui, Iced)
- [ ] Decidir stack final (ImGui + OpenGL recomendado)
- [ ] Setup branch `feature/native-frontend`
- [ ] Crear estructura de directorios
- [ ] Documentar decisiones técnicas
- [ ] Planificar migración incremental

---

**Última actualización**: Diciembre 2024  
**Autor**: Plan de migración frontend nativo  
**Versión**: 1.0

