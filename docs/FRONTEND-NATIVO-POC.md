# POC: Frontend Nativo - Ejemplo de Implementación

> **Propósito**: Código de ejemplo y guía práctica para implementar el frontend nativo

---

## 🚀 Quick Start: POC Mínimo

### 1. Setup Cargo.toml

```toml
# apps/desktop/src-tauri/Cargo.toml

[dependencies]
# Tauri (sin webview)
tauri = { version = "2", features = ["macos-private-api"] }

# Window management
winit = "0.29"
raw-window-handle = "0.5"

# OpenGL
glow = "0.13"  # Safe OpenGL wrapper
glutin = "0.31"  # OpenGL context
glutin-winit = "0.4"

# Dear ImGui
imgui = "0.9"
imgui-winit-support = "0.9"
imgui-glow-renderer = "0.9"  # Renderer para glow

# Math
glam = "0.24"

# Async
tokio = { version = "1", features = ["full"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### 2. Estructura Básica

```rust
// apps/desktop/src-tauri/src/frontend/mod.rs

pub mod ui;
pub mod render;
pub mod input;
pub mod state;
pub mod tauri_bridge;

use winit::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};

pub fn init() -> Result<(), Box<dyn std::error::Error>> {
    // Crear event loop
    let event_loop = EventLoop::new()?;
    
    // Crear ventana
    let window = WindowBuilder::new()
        .with_title("CADHY - Native Frontend")
        .with_inner_size(winit::dpi::LogicalSize::new(1200, 900))
        .build(&event_loop)?;

    // Setup OpenGL context
    let gl_context = unsafe {
        glutin::ContextBuilder::new()
            .with_gl(glutin::GlRequest::GlThenGles {
                opengl_version: (3, 3),
                opengles_version: (3, 0),
            })
            .with_gl_profile(glutin::GlProfile::Core)
            .with_vsync(true)
            .build_windowed(window.clone(), &event_loop)?
    };

    let gl_context = unsafe { gl_context.make_current()? };
    
    // Inicializar OpenGL (glow)
    let gl = unsafe {
        glow::Context::from_loader_function(|s| {
            gl_context.get_proc_address(s) as *const _
        })
    };

    // Inicializar Dear ImGui
    let mut imgui = imgui::Context::create();
    imgui.set_ini_filename(None); // No guardar layout por ahora
    
    let mut platform = imgui_winit_support::WinitPlatform::init(&mut imgui);
    platform.attach_window(
        imgui.io_mut(),
        &window,
        imgui_winit_support::HiDpiMode::Default,
    );

    // Renderer de ImGui
    let mut renderer = imgui_glow_renderer::AutoRenderer::new(gl, &mut imgui)?;

    // Estado de la app
    let mut app_state = state::AppState::new();

    // Render loop
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Poll;

        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            Event::WindowEvent {
                event: WindowEvent::Resized(physical_size),
                ..
            } => {
                gl_context.resize(physical_size);
            }
            Event::RedrawRequested(_) => {
                // Preparar frame de ImGui
                platform.prepare_frame(imgui.io_mut(), &window).unwrap();
                let ui = imgui.frame();

                // Render UI
                ui.window("Viewport")
                    .size([800.0, 600.0], imgui::Condition::FirstUseEver)
                    .build(|| {
                        ui.text("Hello from native frontend!");
                        if ui.button("Create Box") {
                            // TODO: Invoke Tauri command
                        }
                    });

                // Render 3D scene
                unsafe {
                    gl.clear_color(0.1, 0.1, 0.1, 1.0);
                    gl.clear(glow::COLOR_BUFFER_BIT | glow::DEPTH_BUFFER_BIT);
                }

                // Render ImGui
                let draw_data = imgui.render();
                renderer.render(draw_data).unwrap();

                // Swap buffers
                gl_context.swap_buffers().unwrap();
            }
            _ => {
                // Handle other events
                platform.handle_event(imgui.io_mut(), &window, &event);
            }
        }
    })?;

    Ok(())
}
```

### 3. Estado de la App

```rust
// apps/desktop/src-tauri/src/frontend/state/mod.rs

pub mod app_state;
pub mod scene_state;
pub mod viewport_state;

pub use app_state::AppState;
pub use scene_state::SceneState;
pub use viewport_state::ViewportState;
```

```rust
// apps/desktop/src-tauri/src/frontend/state/app_state.rs

use std::sync::{Arc, Mutex};

pub struct AppState {
    pub scene: Arc<Mutex<SceneState>>,
    pub viewport: Arc<Mutex<ViewportState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            scene: Arc::new(Mutex::new(SceneState::new())),
            viewport: Arc::new(Mutex::new(ViewportState::new())),
        }
    }
}
```

```rust
// apps/desktop/src-tauri/src/frontend/state/scene_state.rs

use cadhy_core::types::MeshData;

pub struct SceneState {
    pub objects: Vec<SceneObject>,
    pub selected_ids: Vec<String>,
}

pub struct SceneObject {
    pub id: String,
    pub name: String,
    pub mesh: MeshData,
    pub transform: Transform,
}

pub struct Transform {
    pub position: glam::Vec3,
    pub rotation: glam::Quat,
    pub scale: glam::Vec3,
}

impl SceneState {
    pub fn new() -> Self {
        Self {
            objects: Vec::new(),
            selected_ids: Vec::new(),
        }
    }

    pub fn add_object(&mut self, obj: SceneObject) {
        self.objects.push(obj);
    }

    pub fn select_object(&mut self, id: String) {
        if !self.selected_ids.contains(&id) {
            self.selected_ids.push(id);
        }
    }
}
```

### 4. Integración con Tauri

```rust
// apps/desktop/src-tauri/src/frontend/tauri_bridge.rs

use tauri::AppHandle;
use serde_json::Value;

pub struct TauriBridge {
    app: AppHandle,
}

impl TauriBridge {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    // Invocar comando Tauri de forma síncrona (para POC)
    pub fn invoke_sync(&self, command: &str, args: Value) -> Result<Value, String> {
        // En producción, esto sería async
        // Por ahora, usamos un canal para comunicación
        todo!("Implementar IPC síncrono")
    }

    // Emitir evento
    pub fn emit(&self, event: &str, payload: Value) -> Result<(), String> {
        self.app.emit(event, payload)
            .map_err(|e| e.to_string())
    }
}
```

### 5. Renderer de Meshes

```rust
// apps/desktop/src-tauri/src/frontend/render/mod.rs

pub mod mesh_renderer;
pub mod camera;
pub mod shaders;

pub use mesh_renderer::MeshRenderer;
pub use camera::Camera;
```

```rust
// apps/desktop/src-tauri/src/frontend/render/mesh_renderer.rs

use glow::*;
use cadhy_core::types::MeshData;
use super::camera::Camera;

pub struct MeshRenderer {
    gl: Context,
    shader_program: NativeProgram,
    vao: NativeVertexArray,
    vbo: NativeBuffer,
    ebo: NativeBuffer,
}

impl MeshRenderer {
    pub fn new(gl: Context) -> Result<Self, String> {
        // Compilar shaders
        let vertex_shader = Self::compile_shader(
            &gl,
            glow::VERTEX_SHADER,
            include_str!("shaders/mesh.vert"),
        )?;
        
        let fragment_shader = Self::compile_shader(
            &gl,
            glow::FRAGMENT_SHADER,
            include_str!("shaders/mesh.frag"),
        )?;

        let shader_program = unsafe {
            let program = gl.create_program()?;
            gl.attach_shader(program, vertex_shader);
            gl.attach_shader(program, fragment_shader);
            gl.link_program(program);
            
            if !gl.get_program_link_status(program) {
                return Err(gl.get_program_info_log(program));
            }
            
            gl.delete_shader(vertex_shader);
            gl.delete_shader(fragment_shader);
            
            program
        };

        // Crear VAO, VBO, EBO
        let vao = unsafe { gl.create_vertex_array()? };
        let vbo = unsafe { gl.create_buffer()? };
        let ebo = unsafe { gl.create_buffer()? };

        Ok(Self {
            gl,
            shader_program,
            vao,
            vbo,
            ebo,
        })
    }

    pub fn render(&mut self, mesh: &MeshData, camera: &Camera) -> Result<(), String> {
        unsafe {
            // Upload mesh data
            self.gl.bind_vertex_array(Some(self.vao));
            
            // Upload vertices
            self.gl.bind_buffer(glow::ARRAY_BUFFER, Some(self.vbo));
            self.gl.buffer_data_u8_slice(
                glow::ARRAY_BUFFER,
                bytemuck::cast_slice(&mesh.vertices),
                glow::STATIC_DRAW,
            );

            // Upload indices
            self.gl.bind_buffer(glow::ELEMENT_ARRAY_BUFFER, Some(self.ebo));
            self.gl.buffer_data_u8_slice(
                glow::ELEMENT_ARRAY_BUFFER,
                bytemuck::cast_slice(&mesh.indices),
                glow::STATIC_DRAW,
            );

            // Setup vertex attributes
            self.gl.enable_vertex_attrib_array(0);
            self.gl.vertex_attrib_pointer_f32(
                0,
                3,
                glow::FLOAT,
                false,
                3 * std::mem::size_of::<f32>() as i32,
                0,
            );

            // Use shader
            self.gl.use_program(Some(self.shader_program));
            
            // Set uniforms (MVP matrices)
            let mvp = camera.projection_matrix() * camera.view_matrix();
            self.gl.uniform_matrix_4_f32_slice(
                self.gl.get_uniform_location(self.shader_program, "mvp").as_ref(),
                false,
                &mvp.to_cols_array(),
            );

            // Draw
            self.gl.draw_elements(
                glow::TRIANGLES,
                mesh.indices.len() as i32,
                glow::UNSIGNED_INT,
                0,
            );

            self.gl.bind_vertex_array(None);
        }

        Ok(())
    }

    fn compile_shader(gl: &Context, shader_type: u32, source: &str) -> Result<NativeShader, String> {
        unsafe {
            let shader = gl.create_shader(shader_type)?;
            gl.shader_source(shader, source);
            gl.compile_shader(shader);
            
            if !gl.get_shader_compile_status(shader) {
                return Err(gl.get_shader_info_log(shader));
            }
            
            Ok(shader)
        }
    }
}
```

### 6. Shaders Básicos

```glsl
// apps/desktop/src-tauri/src/frontend/render/shaders/mesh.vert

#version 330 core

layout (location = 0) in vec3 aPos;

uniform mat4 mvp;

out vec3 FragPos;

void main() {
    FragPos = aPos;
    gl_Position = mvp * vec4(aPos, 1.0);
}
```

```glsl
// apps/desktop/src-tauri/src/frontend/render/shaders/mesh.frag

#version 330 core

out vec4 FragColor;

in vec3 FragPos;

uniform vec3 color;

void main() {
    FragColor = vec4(color, 1.0);
}
```

### 7. Cámara

```rust
// apps/desktop/src-tauri/src/frontend/render/camera.rs

use glam::{Mat4, Vec3, Quat};

pub struct Camera {
    pub position: Vec3,
    pub target: Vec3,
    pub up: Vec3,
    pub fov: f32,
    pub aspect: f32,
    pub near: f32,
    pub far: f32,
}

impl Camera {
    pub fn new() -> Self {
        Self {
            position: Vec3::new(10.0, 10.0, 10.0),
            target: Vec3::ZERO,
            up: Vec3::Y,
            fov: 50.0,
            aspect: 16.0 / 9.0,
            near: 0.1,
            far: 1000.0,
        }
    }

    pub fn view_matrix(&self) -> Mat4 {
        Mat4::look_at_rh(self.position, self.target, self.up)
    }

    pub fn projection_matrix(&self) -> Mat4 {
        Mat4::perspective_rh(
            self.fov.to_radians(),
            self.aspect,
            self.near,
            self.far,
        )
    }
}
```

### 8. Integración en lib.rs

```rust
// apps/desktop/src-tauri/src/lib.rs

use tauri::{Manager, RunEvent};

mod commands;
mod frontend;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Inicializar frontend nativo en thread separado
            let app_handle = app.handle().clone();
            
            std::thread::spawn(move || {
                if let Err(e) = frontend::init() {
                    eprintln!("Error initializing native frontend: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::cmd_cad::create_box,
            // ... otros comandos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 🔧 Configuración de Tauri sin Webview

### Opción 1: Modificar tauri.conf.json

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "CADHY",
        "width": 1200,
        "height": 900,
        "visible": false  // Ocultar ventana webview
      }
    ]
  },
  "build": {
    "beforeDevCommand": "",  // No build frontend web
    "beforeBuildCommand": "",
    "devUrl": "",
    "frontendDist": ""
  }
}
```

### Opción 2: Usar winit directamente (Recomendado)

No usar Tauri para ventanas, solo para IPC:

```rust
// En frontend/mod.rs, usar winit directamente
// Tauri solo para IPC cuando sea necesario
```

---

## 📝 Ejemplo Completo: Panel de Propiedades

```rust
// apps/desktop/src-tauri/src/frontend/ui/panels/properties_panel.rs

use imgui::*;
use crate::frontend::state::SceneState;

pub fn render_properties_panel(
    ui: &Ui,
    scene: &mut SceneState,
) {
    ui.window("Properties")
        .size([300.0, 600.0], Condition::FirstUseEver)
        .position([900.0, 0.0], Condition::FirstUseEver)
        .build(|| {
            if let Some(selected_id) = scene.selected_ids.first() {
                if let Some(obj) = scene.objects.iter_mut().find(|o| &o.id == selected_id) {
                    ui.text(&format!("Object: {}", obj.name));
                    ui.separator();

                    // Transform
                    ui.text("Transform");
                    
                    let mut pos = [obj.transform.position.x, 
                                  obj.transform.position.y, 
                                  obj.transform.position.z];
                    if ui.input_float3("Position", &mut pos).build() {
                        obj.transform.position = glam::Vec3::new(pos[0], pos[1], pos[2]);
                    }

                    let mut scale = [obj.transform.scale.x,
                                    obj.transform.scale.y,
                                    obj.transform.scale.z];
                    if ui.input_float3("Scale", &mut scale).build() {
                        obj.transform.scale = glam::Vec3::new(scale[0], scale[1], scale[2]);
                    }
                }
            } else {
                ui.text("No object selected");
            }
        });
}
```

---

## 🎮 Input Handling

```rust
// apps/desktop/src-tauri/src/frontend/input/mod.rs

pub mod keyboard;
pub mod mouse;
pub mod hotkeys;

pub use keyboard::KeyboardState;
pub use mouse::MouseState;
pub use hotkeys::HotkeyManager;
```

```rust
// apps/desktop/src-tauri/src/frontend/input/mouse.rs

use winit::event::MouseButton;

pub struct MouseState {
    pub position: (f32, f32),
    pub delta: (f32, f32),
    pub buttons: std::collections::HashSet<MouseButton>,
    pub scroll_delta: f32,
}

impl MouseState {
    pub fn new() -> Self {
        Self {
            position: (0.0, 0.0),
            delta: (0.0, 0.0),
            buttons: std::collections::HashSet::new(),
            scroll_delta: 0.0,
        }
    }

    pub fn is_button_pressed(&self, button: MouseButton) -> bool {
        self.buttons.contains(&button)
    }
}
```

---

## 🚦 Próximos Pasos

1. **Implementar POC básico** con el código de arriba
2. **Probar integración** con comandos Tauri existentes
3. **Agregar renderizado** de meshes desde OpenCASCADE
4. **Implementar cámara** orbit básica
5. **Agregar panels** de UI uno por uno

---

## 📚 Recursos Adicionales

- [imgui-rs examples](https://github.com/imgui-rs/imgui-rs/tree/main/imgui-examples/examples)
- [glow documentation](https://docs.rs/glow/)
- [winit examples](https://github.com/rust-windowing/winit/tree/master/examples)

---

**Nota**: Este es código de ejemplo. Ajustar según necesidades específicas del proyecto.

