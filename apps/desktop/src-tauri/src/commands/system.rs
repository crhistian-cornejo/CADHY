//! System information commands

use serde::{Deserialize, Serialize};
use std::env;

/// Basic system information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub version: String,
}

/// Extended system information for About dialog
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtendedSystemInfo {
    pub app_name: String,
    pub app_description: String,
    pub version: String,
    pub os_type: String,
    pub os_version: String,
    pub arch: String,
    pub hostname: String,
    pub git_commit: String,
    pub git_branch: String,
    pub git_dirty: bool,
    pub build_timestamp: String,
    pub build_profile: String,
    pub target_triple: String,
    pub rust_version: String,
    pub tauri_version: String,
}

/// Get basic system information
#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

/// Get extended system information for About dialog
#[tauri::command]
pub fn get_extended_system_info() -> ExtendedSystemInfo {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    // Get OS version
    let os_version = get_os_version();

    ExtendedSystemInfo {
        app_name: env!("CARGO_PKG_NAME").to_string(),
        app_description: env!("CARGO_PKG_DESCRIPTION").to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os_type: env::consts::OS.to_string(),
        os_version,
        arch: env::consts::ARCH.to_string(),
        hostname,
        git_commit: option_env!("GIT_COMMIT").unwrap_or("unknown").to_string(),
        git_branch: option_env!("GIT_BRANCH").unwrap_or("main").to_string(),
        git_dirty: option_env!("GIT_DIRTY")
            .map(|v| v == "true")
            .unwrap_or(false),
        build_timestamp: option_env!("BUILD_TIMESTAMP")
            .unwrap_or("unknown")
            .to_string(),
        build_profile: if cfg!(debug_assertions) {
            "debug".to_string()
        } else {
            "release".to_string()
        },
        target_triple: get_target_triple(),
        rust_version: option_env!("RUSTC_VERSION")
            .unwrap_or(env!("CARGO_PKG_RUST_VERSION"))
            .to_string(),
        tauri_version: tauri::VERSION.to_string(),
    }
}

/// Open URL in default browser
#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

/// Get OS version string
fn get_os_version() -> String {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("sw_vers").arg("-productVersion").output() {
            if output.status.success() {
                return String::from_utf8_lossy(&output.stdout).trim().to_string();
            }
        }
        "Unknown".to_string()
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("cmd").args(["/C", "ver"]).output() {
            if output.status.success() {
                let ver = String::from_utf8_lossy(&output.stdout);
                // Parse Windows version from output like "Microsoft Windows [Version 10.0.22631.4460]"
                if let Some(start) = ver.find('[') {
                    if let Some(end) = ver.find(']') {
                        return ver[start + 1..end].replace("Version ", "");
                    }
                }
            }
        }
        "Unknown".to_string()
    }

    #[cfg(target_os = "linux")]
    {
        use std::fs;
        // Try to read from /etc/os-release
        if let Ok(content) = fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return line
                        .trim_start_matches("PRETTY_NAME=")
                        .trim_matches('"')
                        .to_string();
                }
            }
        }
        "Linux".to_string()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "Unknown".to_string()
    }
}

/// Get target triple string
fn get_target_triple() -> String {
    let arch = env::consts::ARCH;
    let os = env::consts::OS;

    let os_suffix = match os {
        "macos" => "apple-darwin",
        "windows" => "pc-windows-msvc",
        "linux" => "unknown-linux-gnu",
        _ => os,
    };

    format!("{}-{}", arch, os_suffix)
}
