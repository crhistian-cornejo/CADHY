//! CADHY Desktop Application Entry Point
//!
//! Handles platform-specific initialization before running the Tauri application.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Configure display backend on Linux to avoid Wayland issues with WebKitGTK.
///
/// WebKitGTK has known compatibility issues with certain Wayland compositors,
/// causing crashes or rendering problems. This function forces X11 backend
/// via XWayland when available, unless the user explicitly opts into Wayland.
///
/// Set `CADHY_ALLOW_WAYLAND=1` to use native Wayland.
#[cfg(target_os = "linux")]
fn configure_display_backend() -> Option<String> {
    use std::env;

    /// Sets an environment variable only if it's not already set.
    /// # Safety
    /// This is called during startup before any threads are spawned.
    fn set_env_if_absent(key: &str, value: &str) {
        if env::var_os(key).is_none() {
            // Safety: called during single-threaded startup
            unsafe { env::set_var(key, value) };
        }
    }

    // Detect if we're running on Wayland
    let on_wayland = env::var_os("WAYLAND_DISPLAY").is_some()
        || matches!(
            env::var("XDG_SESSION_TYPE"),
            Ok(v) if v.eq_ignore_ascii_case("wayland")
        );

    if !on_wayland {
        return None;
    }

    // Allow users to explicitly keep Wayland
    let allow_wayland = matches!(
        env::var("CADHY_ALLOW_WAYLAND"),
        Ok(v) if matches!(v.to_ascii_lowercase().as_str(), "1" | "true" | "yes")
    );

    if allow_wayland {
        return Some("Wayland session detected; respecting CADHY_ALLOW_WAYLAND=1".into());
    }

    // Prefer XWayland when X11 display is available
    if env::var_os("DISPLAY").is_some() {
        set_env_if_absent("WINIT_UNIX_BACKEND", "x11");
        set_env_if_absent("GDK_BACKEND", "x11");
        set_env_if_absent("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        return Some("Wayland detected; forcing X11 backend via XWayland for stability".into());
    }

    // Wayland without X11 fallback - disable problematic renderer
    set_env_if_absent("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    Some("Wayland detected without X11 fallback; disabled DMABUF renderer".into())
}

fn main() {
    // Configure Linux display backend before any GTK/WebKit initialization
    #[cfg(target_os = "linux")]
    {
        if let Some(note) = configure_display_backend() {
            eprintln!("[CADHY] {}", note);
        }
    }

    app_lib::run();
}
