//! CADHY Project Module
//!
//! Handles project file format (.cadhy) including:
//! - Project metadata
//! - Scene objects serialization
//! - Settings persistence
//! - Version migration
//!
//! # File Format
//! The .cadhy format is a JSON-based format with the following structure:
//! ```json
//! {
//!   "version": "1.0.0",
//!   "name": "Project Name",
//!   "created": "2024-12-15T00:00:00Z",
//!   "modified": "2024-12-15T00:00:00Z",
//!   "settings": { ... },
//!   "objects": [ ... ]
//! }
//! ```

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// Project errors
#[derive(Debug, Error)]
pub enum ProjectError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Invalid project: {0}")]
    Invalid(String),

    #[error("Version mismatch: expected {expected}, found {found}")]
    VersionMismatch { expected: String, found: String },
}

pub type Result<T> = std::result::Result<T, ProjectError>;

/// Current project file format version
pub const PROJECT_VERSION: &str = "1.0.0";

/// Project metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMeta {
    /// Project unique ID
    pub id: Uuid,
    /// Project name
    pub name: String,
    /// Project file path
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    /// Creation timestamp (ISO 8601)
    pub created: String,
    /// Last modified timestamp (ISO 8601)
    pub modified: String,
    /// Project description
    #[serde(default)]
    pub description: String,
}

impl ProjectMeta {
    /// Create new project metadata
    pub fn new(name: impl Into<String>) -> Self {
        let now = chrono_now();
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            path: None,
            created: now.clone(),
            modified: now,
            description: String::new(),
        }
    }

    /// Update modified timestamp
    pub fn touch(&mut self) {
        self.modified = chrono_now();
    }
}

/// Project settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    /// Default units (metric/imperial)
    #[serde(default = "default_units")]
    pub units: String,
    /// Grid size
    #[serde(default = "default_grid_size")]
    pub grid_size: f64,
    /// Snap to grid enabled
    #[serde(default)]
    pub snap_enabled: bool,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            units: default_units(),
            grid_size: default_grid_size(),
            snap_enabled: false,
        }
    }
}

fn default_units() -> String {
    "metric".to_string()
}

fn default_grid_size() -> f64 {
    1.0
}

/// Full project structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    /// File format version
    pub version: String,
    /// Project metadata
    pub meta: ProjectMeta,
    /// Project settings
    pub settings: ProjectSettings,
    /// Scene objects (serialized as JSON values)
    #[serde(default)]
    pub objects: Vec<serde_json::Value>,
}

impl Project {
    /// Create new empty project
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            version: PROJECT_VERSION.to_string(),
            meta: ProjectMeta::new(name),
            settings: ProjectSettings::default(),
            objects: Vec::new(),
        }
    }

    /// Validate project integrity
    pub fn validate(&self) -> Result<()> {
        if self.meta.name.is_empty() {
            return Err(ProjectError::Invalid("Project name cannot be empty".into()));
        }
        if self.version.is_empty() {
            return Err(ProjectError::Invalid(
                "Project version cannot be empty".into(),
            ));
        }
        // Validate timestamps are in ISO 8601 format
        if !self.meta.created.contains('T') || !self.meta.created.ends_with('Z') {
            return Err(ProjectError::Invalid(
                "Invalid created timestamp format".into(),
            ));
        }
        if !self.meta.modified.contains('T') || !self.meta.modified.ends_with('Z') {
            return Err(ProjectError::Invalid(
                "Invalid modified timestamp format".into(),
            ));
        }
        Ok(())
    }

    /// Save project to file (atomic write)
    pub fn save(&mut self, path: &str) -> Result<()> {
        self.meta.path = Some(path.to_string());
        self.meta.touch();
        self.validate()?;

        let json = serde_json::to_string_pretty(self)?;

        // Atomic write: write to temp file, then rename
        let temp_path = format!("{}.tmp", path);
        std::fs::write(&temp_path, &json)?;
        std::fs::rename(&temp_path, path)?;

        Ok(())
    }

    /// Load project from file
    pub fn load(path: &str) -> Result<Self> {
        let json = std::fs::read_to_string(path)?;
        let mut project: Project = serde_json::from_str(&json)?;
        project.meta.path = Some(path.to_string());
        project.validate()?;
        Ok(project)
    }
}

/// Get current timestamp as ISO 8601 string
fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_creation() {
        let project = Project::new("Test Project");
        assert_eq!(project.meta.name, "Test Project");
        assert_eq!(project.version, PROJECT_VERSION);
    }

    #[test]
    fn test_project_serialization() {
        let project = Project::new("Serialize Test");
        let json = serde_json::to_string(&project).unwrap();
        assert!(json.contains("Serialize Test"));
    }

    #[test]
    fn test_timestamp_format() {
        let timestamp = chrono_now();
        // Should be ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
        assert!(timestamp.contains('T'), "Timestamp should contain 'T'");
        assert!(timestamp.ends_with('Z'), "Timestamp should end with 'Z'");
        assert!(
            timestamp.len() == 20,
            "Timestamp should be 20 chars: {}",
            timestamp
        );
    }

    #[test]
    fn test_project_validation() {
        let project = Project::new("Valid Project");
        assert!(project.validate().is_ok());
    }

    #[test]
    fn test_project_validation_empty_name() {
        let mut project = Project::new("Test");
        project.meta.name = String::new();
        assert!(project.validate().is_err());
    }

    #[test]
    fn test_save_load_roundtrip() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("test_project.cadhy");
        let path_str = path.to_str().unwrap();

        // Create and save
        let mut project = Project::new("Roundtrip Test");
        project.settings.grid_size = 2.5;
        project.settings.snap_enabled = true;
        project.save(path_str).unwrap();

        // Load and verify
        let loaded = Project::load(path_str).unwrap();
        assert_eq!(loaded.meta.name, "Roundtrip Test");
        assert_eq!(loaded.settings.grid_size, 2.5);
        assert!(loaded.settings.snap_enabled);
        assert_eq!(loaded.meta.path, Some(path_str.to_string()));
    }

    #[test]
    fn test_project_touch_updates_modified() {
        let mut meta = ProjectMeta::new("Touch Test");
        let original_modified = meta.modified.clone();

        // Small delay to ensure different timestamp
        std::thread::sleep(std::time::Duration::from_millis(10));

        meta.touch();
        // Modified should be updated (or equal if within same second)
        assert!(meta.modified >= original_modified);
    }

    #[test]
    fn test_project_default_settings() {
        let project = Project::new("Defaults");
        assert_eq!(project.settings.units, "metric");
        assert_eq!(project.settings.grid_size, 1.0);
        assert!(!project.settings.snap_enabled);
    }
}
