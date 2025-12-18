//! Keyring module for secure credential storage
//!
//! Uses the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
//! to securely store API keys and credentials.

use keyring::Entry;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "com.cadhy.desktop";

/// Credential data (reserved for future use with credential listing)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Credential {
    pub provider: String,
    pub value: String,
}

/// Save a credential to the OS keychain
#[tauri::command]
pub fn auth_save_credential(provider: String, value: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())?;
    eprintln!("[CADHY] Saved credential for provider: {}", provider);
    Ok(())
}

/// Get a credential from the OS keychain
#[tauri::command]
pub fn auth_get_credential(provider: String) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Delete a credential from the OS keychain
#[tauri::command]
pub fn auth_delete_credential(provider: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => {
            eprintln!("[CADHY] Deleted credential for provider: {}", provider);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted
        Err(e) => Err(e.to_string()),
    }
}

/// Check if a credential exists in the OS keychain
#[tauri::command]
pub fn auth_has_credential(provider: String) -> Result<bool, String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}
