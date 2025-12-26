//! System information commands

use serde::{Deserialize, Serialize};
use std::env;
use sysinfo::{System, Disks, Networks};

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

/// System performance metrics for StatusBar
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemMetrics {
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub memory_percent: f32,
    pub cpu_usage: f32,
    pub gpu_info: String,
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

/// Get real-time system performance metrics for the CADHY app process
#[tauri::command]
pub fn get_system_metrics() -> SystemMetrics {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Get current process PID
    let current_pid = sysinfo::get_current_pid().unwrap_or(sysinfo::Pid::from(0));

    // Get process-specific info (CADHY app only)
    let (memory_used_mb, cpu_usage) = if let Some(process) = sys.process(current_pid) {
        let mem_mb = process.memory() / 1024 / 1024;
        let cpu = process.cpu_usage();
        (mem_mb, cpu)
    } else {
        (0, 0.0)
    };

    // Memory percent is relative to total system memory
    let memory_total_mb = sys.total_memory() / 1024 / 1024;
    let memory_percent = if memory_total_mb > 0 {
        (memory_used_mb as f32 / memory_total_mb as f32) * 100.0
    } else {
        0.0
    };

    // Get GPU info (general system info)
    let gpu_info = get_gpu_info();

    SystemMetrics {
        memory_used_mb,
        memory_total_mb,
        memory_percent,
        cpu_usage,
        gpu_info,
    }
}

/// Get GPU information
fn get_gpu_info() -> String {
    // On macOS, we can try to get GPU info via system_profiler
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("system_profiler")
            .arg("SPDisplaysDataType")
            .output()
        {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                // Look for "Chipset Model:" line
                for line in output_str.lines() {
                    if line.contains("Chipset Model:") {
                        return line
                            .split(':')
                            .nth(1)
                            .unwrap_or("GPU")
                            .trim()
                            .to_string();
                    }
                }
            }
        }
        "Apple GPU".to_string()
    }

    // On Windows, try wmic
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("wmic")
            .args(["path", "win32_VideoController", "get", "name"])
            .output()
        {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let lines: Vec<&str> = output_str.lines().collect();
                if lines.len() > 1 {
                    return lines[1].trim().to_string();
                }
            }
        }
        "GPU".to_string()
    }

    // On Linux, try lspci
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("lspci").output() {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                for line in output_str.lines() {
                    if line.to_lowercase().contains("vga") || line.to_lowercase().contains("3d") {
                        if let Some(gpu) = line.split(':').nth(2) {
                            return gpu.trim().to_string();
                        }
                    }
                }
            }
        }
        "GPU".to_string()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "GPU".to_string()
    }
}
