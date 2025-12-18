//! Project management commands for CADHY
//!
//! Handles project creation, opening, saving, and file operations.
//! Uses folder-based .cadhy format for project persistence.
//!
//! Project Structure:
//! ```text
//! ProjectName.cadhy/
//! ├── manifest.json      # Version info and metadata
//! ├── project.json       # Scene and settings data
//! ├── .chat/
//! │   ├── index.json     # Session list for fast loading
//! │   └── sessions/      # Individual chat sessions
//! ├── thumbnails/        # Preview images
//! └── (Windows only)
//!     ├── desktop.ini    # Folder icon configuration
//!     └── cadhy.ico      # Embedded icon
//! ```

use crate::AppState;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

/// Current format version - increment when making breaking changes
const FORMAT_VERSION: u32 = 2;

/// Standard paths within a .cadhy folder
mod paths {
    pub const MANIFEST: &str = "manifest.json";
    pub const PROJECT: &str = "project.json";
    pub const CHAT_DIR: &str = ".chat";
    pub const CHAT_INDEX: &str = ".chat/index.json";
    pub const CHAT_SESSIONS: &str = ".chat/sessions";
    pub const THUMBNAILS_DIR: &str = "thumbnails";
    #[allow(dead_code)]
    pub const PREVIEW_THUMBNAIL: &str = "thumbnails/preview.png";
}

/// Project info returned to frontend (lightweight)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_dirty: bool,
}

/// Manifest file - lightweight metadata stored in manifest.json
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectManifest {
    pub format_version: u32,
    pub app_version: String,
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Project settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSettings {
    pub units: UnitSettings,
    pub precision: u32,
    pub theme: String,
    pub auto_save: bool,
    pub auto_save_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnitSettings {
    pub length: String,
    pub angle: String,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            units: UnitSettings {
                length: "m".to_string(),
                angle: "deg".to_string(),
            },
            precision: 4,
            theme: "system".to_string(),
            auto_save: true,
            auto_save_interval: 300,
        }
    }
}

/// Scene data - contains all modeller state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SceneData {
    pub objects: serde_json::Value,
    pub layers: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub viewport_settings: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grid_settings: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub camera_position: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub camera_target: Option<serde_json::Value>,
}

/// Project data file - stored in project.json (heavier data)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectData {
    pub settings: ProjectSettings,
    pub scene: SceneData,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub results: Option<serde_json::Value>,
}

/// Legacy single-file format for migration (v1)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyProjectFile {
    pub format_version: u32,
    pub app_version: String,
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub settings: ProjectSettings,
    pub scene: SceneData,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub results: Option<serde_json::Value>,
}

/// Full project data returned when opening (includes scene data)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFullData {
    pub info: ProjectInfo,
    pub settings: ProjectSettings,
    pub scene: SceneData,
}

/// Create a new project (folder-based .cadhy format)
#[tauri::command]
pub async fn create_project(
    name: String,
    path: String,
    template: String,
    settings: Option<ProjectSettings>,
    _state: State<'_, AppState>,
) -> Result<ProjectInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    let project_settings = settings.unwrap_or_default();

    // Create default scene based on template
    let scene = create_template_scene(&template);

    // Create .cadhy folder (folder name includes extension)
    let cadhy_folder = PathBuf::from(&path).join(format!("{}.cadhy", &name));
    fs::create_dir_all(&cadhy_folder)
        .map_err(|e| format!("Failed to create project folder: {}", e))?;

    // Create manifest.json (lightweight metadata)
    let manifest = ProjectManifest {
        format_version: FORMAT_VERSION,
        app_version,
        id: id.clone(),
        name: name.clone(),
        description: None,
        author: None,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    let manifest_path = cadhy_folder.join(paths::MANIFEST);
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    // Create project.json (scene and settings data)
    let project_data = ProjectData {
        settings: project_settings,
        scene,
        results: None,
    };

    let project_path = cadhy_folder.join(paths::PROJECT);
    let project_json = serde_json::to_string_pretty(&project_data)
        .map_err(|e| format!("Failed to serialize project data: {}", e))?;
    fs::write(&project_path, project_json)
        .map_err(|e| format!("Failed to write project data: {}", e))?;

    // Create chat directory structure
    let _chat_dir = cadhy_folder.join(paths::CHAT_DIR);
    let sessions_dir = cadhy_folder.join(paths::CHAT_SESSIONS);
    fs::create_dir_all(&sessions_dir)
        .map_err(|e| format!("Failed to create chat directory: {}", e))?;

    // Create empty chat index
    let chat_index = ChatIndex { sessions: vec![] };
    let index_path = cadhy_folder.join(paths::CHAT_INDEX);
    let index_json = serde_json::to_string_pretty(&chat_index)
        .map_err(|e| format!("Failed to serialize chat index: {}", e))?;
    fs::write(&index_path, index_json).map_err(|e| format!("Failed to write chat index: {}", e))?;

    // Create thumbnails directory
    let thumbnails_dir = cadhy_folder.join(paths::THUMBNAILS_DIR);
    fs::create_dir_all(&thumbnails_dir)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;

    // Apply Windows folder branding (custom icon via desktop.ini)
    #[cfg(target_os = "windows")]
    apply_windows_branding(&cadhy_folder)?;

    Ok(ProjectInfo {
        id,
        name,
        path: cadhy_folder.to_string_lossy().to_string(),
        created_at: now.clone(),
        updated_at: now,
        is_dirty: false,
    })
}

/// Chat session index for fast listing
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChatIndex {
    pub sessions: Vec<ChatSessionEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSessionEntry {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: usize,
    pub model_id: String,
}

/// Open an existing project and return full data
/// Supports both folder-based (v2) and legacy file-based (v1) formats
#[tauri::command]
pub async fn open_project(
    path: String,
    _state: State<'_, AppState>,
) -> Result<ProjectFullData, String> {
    let project_path = PathBuf::from(&path);

    // Check if it's a folder (v2 format) or a file (v1 legacy format)
    if project_path.is_dir() {
        // v2 folder-based format
        open_folder_project(&project_path)
    } else if project_path.is_file() {
        // v1 legacy file format - attempt migration
        open_legacy_project(&project_path)
    } else {
        Err(format!("Project path does not exist: {}", path))
    }
}

/// Open a folder-based .cadhy project (v2 format)
fn open_folder_project(cadhy_folder: &Path) -> Result<ProjectFullData, String> {
    // Validate it's a .cadhy folder
    if !is_valid_cadhy_folder(cadhy_folder) {
        return Err("Invalid .cadhy project folder: missing manifest.json".into());
    }

    // Read manifest.json
    let manifest_path = cadhy_folder.join(paths::MANIFEST);
    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    let manifest: ProjectManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    // Check format version
    if manifest.format_version > FORMAT_VERSION {
        return Err(
            "Project was created with a newer version of CADHY. Please update the application."
                .into(),
        );
    }

    // Read project.json
    let project_path = cadhy_folder.join(paths::PROJECT);
    let project_content = fs::read_to_string(&project_path)
        .map_err(|e| format!("Failed to read project data: {}", e))?;
    let project_data: ProjectData = serde_json::from_str(&project_content)
        .map_err(|e| format!("Failed to parse project data: {}", e))?;

    Ok(ProjectFullData {
        info: ProjectInfo {
            id: manifest.id,
            name: manifest.name,
            path: cadhy_folder.to_string_lossy().to_string(),
            created_at: manifest.created_at,
            updated_at: manifest.updated_at,
            is_dirty: false,
        },
        settings: project_data.settings,
        scene: project_data.scene,
    })
}

/// Open a legacy single-file .cadhy project (v1 format)
/// Optionally migrates to folder format
fn open_legacy_project(file_path: &Path) -> Result<ProjectFullData, String> {
    // Read legacy project file
    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read project file: {}", e))?;

    let legacy: LegacyProjectFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project file: {}", e))?;

    // Check format version
    if legacy.format_version > 1 {
        return Err("Legacy project has unexpected version".into());
    }

    // Return data without migration (user can save to migrate)
    Ok(ProjectFullData {
        info: ProjectInfo {
            id: legacy.id,
            name: legacy.name,
            path: file_path.to_string_lossy().to_string(),
            created_at: legacy.created_at,
            updated_at: legacy.updated_at,
            is_dirty: false,
        },
        settings: legacy.settings,
        scene: legacy.scene,
    })
}

/// Check if a path is a valid .cadhy folder
fn is_valid_cadhy_folder(path: &Path) -> bool {
    if !path.is_dir() {
        return false;
    }

    // Check extension
    if let Some(ext) = path.extension() {
        if ext.to_string_lossy().to_lowercase() != "cadhy" {
            return false;
        }
    } else {
        return false;
    }

    // Check if manifest exists
    path.join(paths::MANIFEST).exists()
}

/// Save project with scene data
/// Supports both folder-based (v2) and legacy file-based (v1) formats
#[tauri::command]
pub async fn save_project(
    path: String,
    scene: SceneData,
    _state: State<'_, AppState>,
) -> Result<ProjectInfo, String> {
    let project_path = PathBuf::from(&path);

    if project_path.is_dir() {
        // v2 folder-based format
        save_folder_project(&project_path, scene)
    } else {
        // v1 legacy file format
        save_legacy_project(&project_path, scene)
    }
}

/// Save to folder-based .cadhy project (v2 format)
fn save_folder_project(cadhy_folder: &Path, scene: SceneData) -> Result<ProjectInfo, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Read and update manifest
    let manifest_path = cadhy_folder.join(paths::MANIFEST);
    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    let mut manifest: ProjectManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    manifest.updated_at = now.clone();

    // Write manifest (atomic)
    let temp_manifest = cadhy_folder.join("manifest.json.tmp");
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    fs::write(&temp_manifest, &manifest_json)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;
    fs::rename(&temp_manifest, &manifest_path)
        .map_err(|e| format!("Failed to finalize manifest: {}", e))?;

    // Read and update project data
    let project_path = cadhy_folder.join(paths::PROJECT);
    let project_content = fs::read_to_string(&project_path)
        .map_err(|e| format!("Failed to read project data: {}", e))?;
    let mut project_data: ProjectData = serde_json::from_str(&project_content)
        .map_err(|e| format!("Failed to parse project data: {}", e))?;

    project_data.scene = scene;

    // Write project data (atomic)
    let temp_project = cadhy_folder.join("project.json.tmp");
    let project_json = serde_json::to_string_pretty(&project_data)
        .map_err(|e| format!("Failed to serialize project data: {}", e))?;
    fs::write(&temp_project, &project_json)
        .map_err(|e| format!("Failed to write project data: {}", e))?;
    fs::rename(&temp_project, &project_path)
        .map_err(|e| format!("Failed to finalize project data: {}", e))?;

    Ok(ProjectInfo {
        id: manifest.id,
        name: manifest.name,
        path: cadhy_folder.to_string_lossy().to_string(),
        created_at: manifest.created_at,
        updated_at: now,
        is_dirty: false,
    })
}

/// Save to legacy single-file .cadhy project (v1 format)
fn save_legacy_project(file_path: &Path, scene: SceneData) -> Result<ProjectInfo, String> {
    // Read existing project file
    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read project file: {}", e))?;

    let mut project_file: LegacyProjectFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project file: {}", e))?;

    // Update scene and timestamp
    let now = chrono::Utc::now().to_rfc3339();
    project_file.scene = scene;
    project_file.updated_at = now.clone();

    // Write back (atomic)
    let temp_path = file_path.with_extension("cadhy.tmp");
    let json = serde_json::to_string_pretty(&project_file)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;
    fs::write(&temp_path, json).map_err(|e| format!("Failed to write project file: {}", e))?;
    fs::rename(&temp_path, file_path)
        .map_err(|e| format!("Failed to finalize project file: {}", e))?;

    Ok(ProjectInfo {
        id: project_file.id,
        name: project_file.name,
        path: file_path.to_string_lossy().to_string(),
        created_at: project_file.created_at,
        updated_at: now,
        is_dirty: false,
    })
}

/// Save project to a new location (Save As) - always creates folder format
#[tauri::command]
pub async fn save_project_as(
    old_path: String,
    new_path: String,
    new_name: String,
    scene: SceneData,
    _state: State<'_, AppState>,
) -> Result<ProjectInfo, String> {
    let old_project_path = PathBuf::from(&old_path);
    let new_cadhy_folder = PathBuf::from(&new_path);

    // Read existing project data (from either format)
    let (old_manifest, old_project_data) = if old_project_path.is_dir() {
        // v2 folder format
        let manifest_path = old_project_path.join(paths::MANIFEST);
        let manifest_content = fs::read_to_string(&manifest_path)
            .map_err(|e| format!("Failed to read manifest: {}", e))?;
        let manifest: ProjectManifest = serde_json::from_str(&manifest_content)
            .map_err(|e| format!("Failed to parse manifest: {}", e))?;

        let project_path = old_project_path.join(paths::PROJECT);
        let project_content = fs::read_to_string(&project_path)
            .map_err(|e| format!("Failed to read project data: {}", e))?;
        let project_data: ProjectData = serde_json::from_str(&project_content)
            .map_err(|e| format!("Failed to parse project data: {}", e))?;

        (manifest, project_data)
    } else {
        // v1 legacy format
        let content = fs::read_to_string(&old_project_path)
            .map_err(|e| format!("Failed to read project file: {}", e))?;
        let legacy: LegacyProjectFile = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project file: {}", e))?;

        let manifest = ProjectManifest {
            format_version: legacy.format_version,
            app_version: legacy.app_version,
            id: legacy.id,
            name: legacy.name,
            description: legacy.description,
            author: legacy.author,
            created_at: legacy.created_at,
            updated_at: legacy.updated_at,
        };

        let project_data = ProjectData {
            settings: legacy.settings,
            scene: legacy.scene,
            results: legacy.results,
        };

        (manifest, project_data)
    };

    // Generate new ID and update
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    // Create new .cadhy folder
    fs::create_dir_all(&new_cadhy_folder)
        .map_err(|e| format!("Failed to create project folder: {}", e))?;

    // Create new manifest
    let new_manifest = ProjectManifest {
        format_version: FORMAT_VERSION,
        app_version,
        id: id.clone(),
        name: new_name.clone(),
        description: old_manifest.description,
        author: old_manifest.author,
        created_at: old_manifest.created_at.clone(),
        updated_at: now.clone(),
    };

    let manifest_path = new_cadhy_folder.join(paths::MANIFEST);
    let manifest_json = serde_json::to_string_pretty(&new_manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    // Create new project data with updated scene
    let new_project_data = ProjectData {
        settings: old_project_data.settings,
        scene,
        results: old_project_data.results,
    };

    let project_path = new_cadhy_folder.join(paths::PROJECT);
    let project_json = serde_json::to_string_pretty(&new_project_data)
        .map_err(|e| format!("Failed to serialize project data: {}", e))?;
    fs::write(&project_path, project_json)
        .map_err(|e| format!("Failed to write project data: {}", e))?;

    // Create chat directory structure
    let sessions_dir = new_cadhy_folder.join(paths::CHAT_SESSIONS);
    fs::create_dir_all(&sessions_dir)
        .map_err(|e| format!("Failed to create chat directory: {}", e))?;

    let chat_index = ChatIndex { sessions: vec![] };
    let index_path = new_cadhy_folder.join(paths::CHAT_INDEX);
    let index_json = serde_json::to_string_pretty(&chat_index)
        .map_err(|e| format!("Failed to serialize chat index: {}", e))?;
    fs::write(&index_path, index_json).map_err(|e| format!("Failed to write chat index: {}", e))?;

    // Create thumbnails directory
    let thumbnails_dir = new_cadhy_folder.join(paths::THUMBNAILS_DIR);
    fs::create_dir_all(&thumbnails_dir)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;

    // Apply Windows folder branding
    #[cfg(target_os = "windows")]
    apply_windows_branding(&new_cadhy_folder)?;

    Ok(ProjectInfo {
        id,
        name: new_name,
        path: new_cadhy_folder.to_string_lossy().to_string(),
        created_at: old_manifest.created_at,
        updated_at: now,
        is_dirty: false,
    })
}

/// Update project settings
#[tauri::command]
pub async fn update_project_settings(
    path: String,
    settings: ProjectSettings,
) -> Result<(), String> {
    let project_path = PathBuf::from(&path);

    if project_path.is_dir() {
        // v2 folder format
        let project_file_path = project_path.join(paths::PROJECT);
        let content = fs::read_to_string(&project_file_path)
            .map_err(|e| format!("Failed to read project data: {}", e))?;

        let mut project_data: ProjectData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project data: {}", e))?;

        project_data.settings = settings;

        let json = serde_json::to_string_pretty(&project_data)
            .map_err(|e| format!("Failed to serialize project data: {}", e))?;
        fs::write(&project_file_path, json)
            .map_err(|e| format!("Failed to write project data: {}", e))?;

        // Update manifest timestamp
        let manifest_path = project_path.join(paths::MANIFEST);
        let manifest_content = fs::read_to_string(&manifest_path)
            .map_err(|e| format!("Failed to read manifest: {}", e))?;
        let mut manifest: ProjectManifest = serde_json::from_str(&manifest_content)
            .map_err(|e| format!("Failed to parse manifest: {}", e))?;

        manifest.updated_at = chrono::Utc::now().to_rfc3339();

        let manifest_json = serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
        fs::write(&manifest_path, manifest_json)
            .map_err(|e| format!("Failed to write manifest: {}", e))?;
    } else {
        // v1 legacy format
        let content = fs::read_to_string(&project_path)
            .map_err(|e| format!("Failed to read project file: {}", e))?;

        let mut project_file: LegacyProjectFile = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project file: {}", e))?;

        project_file.settings = settings;
        project_file.updated_at = chrono::Utc::now().to_rfc3339();

        let json = serde_json::to_string_pretty(&project_file)
            .map_err(|e| format!("Failed to serialize project: {}", e))?;
        fs::write(&project_path, json)
            .map_err(|e| format!("Failed to write project file: {}", e))?;
    }

    Ok(())
}

/// Get the default projects directory
#[tauri::command]
pub async fn get_default_projects_dir() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;

    let projects_dir = home.join("Documents").join("CADHY Projects");

    // Create if it doesn't exist
    if !projects_dir.exists() {
        fs::create_dir_all(&projects_dir)
            .map_err(|e| format!("Failed to create projects directory: {}", e))?;
    }

    Ok(projects_dir.to_string_lossy().to_string())
}

/// Check if a project exists (folder or file)
#[tauri::command]
pub async fn project_exists(path: String) -> bool {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        // Check for folder-based project
        is_valid_cadhy_folder(&p)
    } else {
        // Check for legacy file
        p.exists() && p.extension().map(|e| e == "cadhy").unwrap_or(false)
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn create_template_scene(template: &str) -> SceneData {
    let default_layer = serde_json::json!([{
        "id": "default",
        "name": "Default",
        "color": "#6366f1",
        "visible": true,
        "locked": false,
        "frozen": false,
        "printable": true,
        "order": 0
    }]);

    match template {
        "channel" => SceneData {
            objects: serde_json::json!([]),
            layers: default_layer,
            ..Default::default()
        },
        "pipe-network" => SceneData {
            objects: serde_json::json!([]),
            layers: serde_json::json!([
                {
                    "id": "default",
                    "name": "Pipes",
                    "color": "#0ea5e9",
                    "visible": true,
                    "locked": false,
                    "frozen": false,
                    "printable": true,
                    "order": 0
                },
                {
                    "id": "nodes",
                    "name": "Nodes",
                    "color": "#22c55e",
                    "visible": true,
                    "locked": false,
                    "frozen": false,
                    "printable": true,
                    "order": 1
                }
            ]),
            ..Default::default()
        },
        _ => SceneData {
            objects: serde_json::json!([]),
            layers: default_layer,
            ..Default::default()
        },
    }
}

// ============================================================================
// WINDOWS FOLDER BRANDING
// ============================================================================

/// Apply Windows-specific folder branding (custom icon via desktop.ini)
/// This makes the .cadhy folder appear with a custom icon in Windows Explorer
#[cfg(target_os = "windows")]
fn apply_windows_branding(cadhy_folder: &Path) -> Result<(), String> {
    use std::process::Command;

    // 1. Embed and copy icon to folder
    // The icon.ico is the Tauri app icon (multi-resolution ICO format)
    let icon_bytes = include_bytes!("../../icons/icon.ico");
    let icon_path = cadhy_folder.join("cadhy.ico");
    fs::write(&icon_path, icon_bytes).map_err(|e| format!("Failed to write icon: {}", e))?;

    // 2. Create desktop.ini with icon reference
    let desktop_ini_content = "[.ShellClassInfo]\r\n\
                               IconResource=cadhy.ico,0\r\n\
                               [ViewState]\r\n\
                               Mode=\r\n\
                               Vid=\r\n\
                               FolderType=Documents";

    let desktop_ini_path = cadhy_folder.join("desktop.ini");
    fs::write(&desktop_ini_path, desktop_ini_content)
        .map_err(|e| format!("Failed to write desktop.ini: {}", e))?;

    // 3. Set folder as read-only (triggers Windows to read desktop.ini)
    let _ = Command::new("attrib")
        .args(["+r", &cadhy_folder.display().to_string()])
        .output();

    // 4. Hide desktop.ini and icon (system + hidden attributes)
    let _ = Command::new("attrib")
        .args(["+h", "+s", &desktop_ini_path.display().to_string()])
        .output();

    let _ = Command::new("attrib")
        .args(["+h", "+s", &icon_path.display().to_string()])
        .output();

    Ok(())
}

/// No-op on non-Windows platforms
#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn apply_windows_branding(_cadhy_folder: &Path) -> Result<(), String> {
    Ok(())
}
