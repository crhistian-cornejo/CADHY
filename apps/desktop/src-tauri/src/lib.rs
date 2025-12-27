//! CADHY Desktop Application
//!
//! This is the main entry point for the Tauri desktop application.
//! Specialized for Civil-Hydraulic Engineering analysis.
//!
//! NOTE: AI chat/streaming is handled in TypeScript via Vercel AI SDK.
//! The Rust backend handles hydraulic computations and authentication.

// TODO: Refactorizar para reducir complejidad en un PR futuro
#![allow(clippy::too_many_arguments)]
#![allow(clippy::derivable_impls)]
#![allow(clippy::manual_map)]
#![allow(clippy::collapsible_if)]
#![allow(clippy::unnecessary_map_or)]

use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};

// Command modules
mod commands;

// Authentication module (keyring for secure credential storage)
mod auth;

// macOS native menu (only compiled on macOS)
#[cfg(target_os = "macos")]
mod macos_menu;

/// Application state
pub struct AppState {
    /// Current project data
    pub project: Mutex<Option<ProjectData>>,
}

/// Simple project data structure
#[derive(Default, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectData {
    pub name: String,
    pub channels: Vec<ChannelData>,
}

/// Channel data for hydraulic analysis
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ChannelData {
    pub id: String,
    pub name: String,
    pub channel_type: String,
    pub params: serde_json::Value,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            project: Mutex::new(None),
        }
    }
}

/// Tauri entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env files
    load_env_files();

    // Check if updater should be enabled (only when signing key is available)
    let updater_enabled = option_env!("TAURI_SIGNING_PRIVATE_KEY").is_some();
    let app_version = env!("CARGO_PKG_VERSION");

    // Build the application with all plugins
    let mut builder = tauri::Builder::default()
        // Core plugins
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        // Persistence plugins (OpenCode pattern)
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        // State management
        .manage(AppState::default())
        .setup(move |app| {
            // Inject runtime configuration into the frontend (OpenCode pattern)
            // This allows the frontend to access runtime state without IPC calls
            if let Some(window) = app.get_webview_window("main") {
                let init_script = format!(
                    r#"
                    window.__CADHY__ = window.__CADHY__ || {{}};
                    window.__CADHY__.version = "{}";
                    window.__CADHY__.updaterEnabled = {};
                    window.__CADHY__.platform = "{}";
                    window.__CADHY__.debug = {};
                    "#,
                    app_version,
                    updater_enabled,
                    std::env::consts::OS,
                    cfg!(debug_assertions)
                );
                let _ = window.eval(&init_script);
            }

            // Initialize macOS native menu bar
            #[cfg(target_os = "macos")]
            {
                match macos_menu::create_macos_menu(app.handle()) {
                    Ok(menu) => {
                        if let Err(e) = app.set_menu(menu) {
                            eprintln!("[CADHY] Failed to set macOS menu: {}", e);
                        } else {
                            eprintln!("[CADHY] macOS native menu initialized");
                        }
                    }
                    Err(e) => {
                        eprintln!("[CADHY] Failed to create macOS menu: {}", e);
                    }
                }
            }

            eprintln!(
                "[CADHY] Application started (v{}, updater: {})",
                app_version, updater_enabled
            );

            Ok(())
        })
        .on_menu_event(|app, event| {
            // Emit menu events to the frontend
            let event_id = event.id().as_ref();
            if let Some(window) = app.get_webview_window("main") {
                // Emit the menu event to the frontend
                let _ = window.emit("menu-event", event_id);
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            commands::project::create_project,
            commands::project::open_project,
            commands::project::save_project,
            commands::project::save_project_as,
            commands::project::update_project_settings,
            commands::project::get_default_projects_dir,
            commands::project::project_exists,
            // Hydraulic analysis commands
            commands::hydraulics::analyze_channel,
            commands::hydraulics::calculate_normal_depth,
            commands::hydraulics::calculate_critical_depth,
            commands::hydraulics::analyze_water_profile,
            commands::hydraulics::check_channel_capacity,
            // Geometry/Mesh commands
            commands::geometry::generate_channel_mesh,
            commands::geometry::generate_transition_mesh,
            commands::geometry::generate_chute_mesh,
            commands::geometry::export_mesh_to_file,
            commands::geometry::get_mesh_stats,
            // CAD commands - Utilities
            commands::cad::cad_shape_exists,
            // CAD commands - Primitives
            commands::cad::cad_create_box,
            commands::cad::cad_create_box_at,
            commands::cad::cad_create_cylinder,
            commands::cad::cad_create_cylinder_at,
            commands::cad::cad_create_sphere,
            commands::cad::cad_create_sphere_at,
            commands::cad::cad_create_cone,
            commands::cad::cad_create_torus,
            commands::cad::cad_create_wedge,
            commands::cad::cad_create_helix,
            commands::cad::cad_create_pyramid,
            commands::cad::cad_create_ellipsoid,
            commands::cad::cad_create_vertex,
            // CAD commands - Boolean operations
            commands::cad::cad_boolean_fuse,
            commands::cad::cad_boolean_cut,
            commands::cad::cad_boolean_common,
            // CAD commands - Modifications
            commands::cad::cad_fillet,
            commands::cad::cad_fillet_edges,
            commands::cad::cad_fillet_edges_advanced,
            commands::cad::cad_chamfer,
            commands::cad::cad_chamfer_edges,
            commands::cad::cad_chamfer_edges_two_distances,
            commands::cad::cad_chamfer_edges_distance_angle,
            commands::cad::cad_shell,
            // CAD commands - Transforms
            commands::cad::cad_translate,
            commands::cad::cad_rotate,
            commands::cad::cad_scale,
            commands::cad::cad_mirror,
            // CAD commands - Advanced
            commands::cad::cad_extrude,
            commands::cad::cad_revolve,
            commands::cad::cad_loft,
            commands::cad::cad_pipe,
            commands::cad::cad_pipe_shell,
            commands::cad::cad_offset,
            // CAD commands - Curve Creation (Lines)
            commands::curves::cad_create_line,
            commands::curves::cad_create_line_dir,
            // CAD commands - Curve Creation (Circles & Arcs)
            commands::curves::cad_create_circle,
            commands::curves::cad_create_circle_xy,
            commands::curves::cad_create_arc,
            commands::curves::cad_create_arc_xy,
            commands::curves::cad_create_arc_3_points,
            // CAD commands - Curve Creation (Rectangles)
            commands::curves::cad_create_rectangle,
            commands::curves::cad_create_rectangle_centered,
            // CAD commands - Curve Creation (Polygons)
            commands::curves::cad_create_polygon_2d,
            commands::curves::cad_create_polygon_3d,
            commands::curves::cad_create_regular_polygon,
            // CAD commands - Curve Creation (Polylines)
            commands::curves::cad_create_polyline_2d,
            commands::curves::cad_create_polyline_3d,
            // CAD commands - Curve Creation (Ellipses)
            commands::curves::cad_create_ellipse,
            commands::curves::cad_create_ellipse_xy,
            // CAD commands - Curve Creation (Splines)
            commands::curves::cad_create_bspline,
            commands::curves::cad_create_bezier,
            // CAD commands - Wire Operations
            commands::curves::cad_create_wire_from_edges,
            commands::curves::cad_create_face_from_wire,
            // CAD commands - Tessellation
            commands::cad::cad_tessellate_binary,
            // CAD commands - Import/Export
            commands::cad::cad_import_step,
            commands::cad::cad_export_step,
            commands::cad::cad_export_stl,
            commands::cad::cad_export_obj,
            commands::cad::cad_export_glb,
            // CAD commands - Utility
            commands::cad::cad_analyze,
            commands::cad::cad_measure_distance,
            commands::cad::cad_delete_shape,
            commands::cad::cad_serialize_shape,
            commands::cad::cad_deserialize_shape,
            commands::cad::cad_clear_all,
            commands::cad::cad_shape_exists,
            commands::cad::cad_shape_count,
            commands::cad::cad_simplify,
            commands::cad::cad_combine,
            // CAD commands - Topology
            commands::cad::cad_get_topology,
            // Drawing commands - 2D Projections
            commands::drawing::drawing_create_projection,
            commands::drawing::drawing_generate_standard_views,
            commands::drawing::drawing_create_view_by_name,
            // Drawing export - 2D
            commands::drawing_export::drawing_export_svg,
            commands::drawing_export::drawing_export_dxf,
            commands::drawing_export::drawing_export_pdf,
            // Chat persistence commands
            commands::chat::chat_init,
            commands::chat::chat_save_session,
            commands::chat::chat_load_session,
            commands::chat::chat_list_sessions,
            commands::chat::chat_delete_session,
            // AI Gateway proxy (CORS bypass for image enhancement)
            commands::chat::ai_gateway_enhance_viewport,
            // System info
            commands::system::get_system_info,
            commands::system::get_extended_system_info,
            commands::system::get_system_metrics,
            commands::system::open_url,
            // Authentication
            auth::keyring::auth_save_credential,
            auth::keyring::auth_get_credential,
            auth::keyring::auth_delete_credential,
            auth::keyring::auth_has_credential,
            // Gemini OAuth
            auth::gemini::auth_check_gemini_oauth,
            auth::gemini::auth_read_gemini_oauth_credentials,
            auth::gemini::auth_refresh_gemini_oauth,
            // Credits management
            commands::credits::credits_get_device_id,
            commands::credits::credits_load_state,
            commands::credits::credits_save_state,
            commands::credits::credits_regenerate_if_needed,
            // IFC Import/Export
            commands::ifc::import_ifc,
            commands::ifc::preview_ifc,
            commands::ifc::export_ifc,
            commands::ifc::get_ifc_versions,
            // DXF Import
            commands::dxf::import_dxf_file,
            commands::dxf::preview_dxf,
            commands::dxf::get_dxf_versions,
        ]);

    // Conditionally add updater plugin (OpenCode pattern)
    // Only enabled when TAURI_SIGNING_PRIVATE_KEY is set at build time
    if updater_enabled {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
        eprintln!("[CADHY] Updater plugin enabled");
    } else {
        eprintln!("[CADHY] Updater plugin disabled (no signing key at build time)");
    }

    // Build and run with graceful shutdown handling
    builder
        .build(tauri::generate_context!())
        .expect("error while building CADHY Tauri application")
        .run(|app, event| {
            match event {
                RunEvent::Exit => {
                    eprintln!("[CADHY] Application exiting, cleaning up...");
                    // Cleanup any managed resources
                    if let Some(state) = app.try_state::<AppState>() {
                        if let Ok(mut project) = state.project.lock() {
                            *project = None;
                        }
                    }
                }
                RunEvent::ExitRequested { api, code, .. } => {
                    // Could prompt for unsaved changes here in the future
                    eprintln!("[CADHY] Exit requested (code: {:?})", code);
                    // Don't prevent exit for now
                    let _ = api;
                }
                _ => {}
            }
        });
}

/// Load environment variables from .env files
fn load_env_files() {
    let current_dir = std::env::current_dir().unwrap_or_default();
    let mut search_dir = current_dir.as_path();
    let mut project_root = None;

    // Search up to 5 levels for package.json
    for _ in 0..5 {
        let package_json = search_dir.join("package.json");
        if package_json.exists() {
            project_root = Some(search_dir.to_path_buf());
            break;
        }
        if let Some(parent) = search_dir.parent() {
            search_dir = parent;
        } else {
            break;
        }
    }

    // Load .env files from project root
    if let Some(root) = &project_root {
        eprintln!("[CADHY] Found project root: {}", root.display());

        // Try .env.local first (highest priority)
        let env_local = root.join(".env.local");
        if env_local.exists() {
            if dotenvy::from_path(&env_local).is_ok() {
                eprintln!("[CADHY] Loaded {}", env_local.display());
            }
        }

        // Try .env as fallback
        let env_file = root.join(".env");
        if env_file.exists() {
            if dotenvy::from_path(&env_file).is_ok() {
                eprintln!("[CADHY] Loaded {}", env_file.display());
            }
        }
    } else {
        eprintln!("[CADHY] WARNING: Could not find project root");
        let _ = dotenvy::dotenv();
    }

    // Debug: Log if AI_GATEWAY_API_KEY is set
    if let Ok(key) = std::env::var("AI_GATEWAY_API_KEY") {
        eprintln!("[CADHY] AI_GATEWAY_API_KEY loaded ({} chars)", key.len());
    } else {
        eprintln!("[CADHY] WARNING: AI_GATEWAY_API_KEY not found in environment");
    }
}
