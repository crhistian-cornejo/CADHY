//! Credits management commands
//!
//! Handles device ID generation and credits state persistence.
//! Credits are stored locally and don't require authentication.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
/// Device ID for rate limiting (persistent across sessions)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceId {
    pub id: String,
    pub created_at: i64,
}

/// Credits state stored locally
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsState {
    pub available: i32,
    pub last_regenerated: i64,
    pub used_today: i32,
    pub tier: String,
    pub device_id: String,
}

/// Get or create device ID
fn get_device_id_path() -> Result<PathBuf, String> {
    let app_data = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?
        .join("CADHY");
    fs::create_dir_all(&app_data).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_data.join("device_id.json"))
}

/// Generate a new device ID
fn generate_device_id() -> DeviceId {
    use uuid::Uuid;
    DeviceId {
        id: Uuid::new_v4().to_string(),
        created_at: chrono::Utc::now().timestamp(),
    }
}

/// Get or create device ID (persistent across sessions)
#[tauri::command]
pub fn credits_get_device_id() -> Result<String, String> {
    let path = get_device_id_path()?;

    // Try to read existing device ID
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(device_id) = serde_json::from_str::<DeviceId>(&content) {
            return Ok(device_id.id);
        }
    }

    // Generate new device ID
    let device_id = generate_device_id();
    let json = serde_json::to_string_pretty(&device_id)
        .map_err(|e| format!("Failed to serialize device ID: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write device ID: {}", e))?;

    Ok(device_id.id)
}

/// Get credits state path
fn get_credits_state_path() -> Result<PathBuf, String> {
    let app_data = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?
        .join("CADHY");
    fs::create_dir_all(&app_data).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_data.join("credits.json"))
}

/// Load credits state from disk
#[tauri::command]
pub fn credits_load_state() -> Result<CreditsState, String> {
    let path = get_credits_state_path()?;

    // Try to load existing state
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(state) = serde_json::from_str::<CreditsState>(&content) {
            return Ok(state);
        }
    }

    // Initialize new state
    let device_id = credits_get_device_id()?;
    let state = CreditsState {
        available: 50, // Free tier default
        last_regenerated: chrono::Utc::now().timestamp_millis(),
        used_today: 0,
        tier: "free".to_string(),
        device_id,
    };

    // Save initial state
    credits_save_state(state.clone())?;

    Ok(state)
}

/// Save credits state to disk
#[tauri::command]
pub fn credits_save_state(state: CreditsState) -> Result<(), String> {
    let path = get_credits_state_path()?;

    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize credits state: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write credits state: {}", e))?;

    Ok(())
}

/// Regenerate credits if needed (called periodically)
#[tauri::command]
pub fn credits_regenerate_if_needed() -> Result<CreditsState, String> {
    let mut state = credits_load_state()?;
    let now = chrono::Utc::now().timestamp_millis();
    let regeneration_interval = 24 * 60 * 60 * 1000; // 24 hours

    // Check if regeneration is needed
    if now - state.last_regenerated >= regeneration_interval {
        // Reset credits based on tier
        let daily_limit = match state.tier.as_str() {
            "free" => 50,
            "pro" => 500,
            "enterprise" => -1, // Unlimited
            _ => 50,
        };

        state.available = daily_limit;
        state.last_regenerated = now;
        state.used_today = 0;

        credits_save_state(state.clone())?;
    }

    Ok(state)
}
