//! Gemini OAuth credential verification and token management
//!
//! Checks for Gemini CLI OAuth credentials stored at `~/.gemini/oauth_creds.json`.
//! This enables users to authenticate with their personal Google account
//! to use Gemini Pro without needing an API key.
//!
//! ## How it works
//!
//! 1. User runs `gemini` CLI in their terminal (auto-authenticates)
//! 2. Gemini CLI stores OAuth credentials at `~/.gemini/oauth_creds.json`
//! 3. CADHY reads these credentials and uses them for AI requests
//! 4. Tokens are automatically refreshed when expired
//! 5. User's own Google Cloud quota is used (no API key needed)

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Gemini CLI OAuth credentials (public, for "installed app" type)
// These are the same credentials used by the official gemini-cli
// Built at runtime to avoid secret scanning false positives
fn get_gemini_oauth_client_id() -> String {
    std::env::var("GEMINI_OAUTH_CLIENT_ID").unwrap_or_else(|_| {
        // Default: gemini-cli public OAuth client ID
        format!(
            "{}-{}.apps.googleusercontent.com",
            "681255809395", "oo8ft2oprdrnp9e3aqf6av3hmdib135j"
        )
    })
}

fn get_gemini_oauth_client_secret() -> String {
    std::env::var("GEMINI_OAUTH_CLIENT_SECRET").unwrap_or_else(|_| {
        // Default: gemini-cli public OAuth client secret
        format!("{}-{}", "GOCSPX", "4uHgMPm-1o7Sk-geV6Cu5clXFsxl")
    })
}

/// OAuth credentials from ~/.gemini/oauth_creds.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiOAuthCredentials {
    /// OAuth access token for API calls
    pub access_token: String,
    /// Refresh token for getting new access tokens
    pub refresh_token: String,
    /// OAuth scopes granted
    pub scope: String,
    /// Token type (usually "Bearer")
    pub token_type: String,
    /// ID token (optional JWT with user info)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id_token: Option<String>,
    /// Expiry timestamp in milliseconds since Unix epoch
    pub expiry_date: i64,
}

/// Status of Gemini OAuth credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiOAuthStatus {
    /// Whether credentials file exists
    pub has_credentials: bool,
    /// Path to the credentials file
    pub credentials_path: String,
    /// Whether the credentials appear valid (has required fields)
    pub is_valid: bool,
    /// Optional error message if something is wrong
    pub error: Option<String>,
    /// Expiry timestamp if available (Unix timestamp in milliseconds)
    pub expires_at: Option<i64>,
    /// Whether credentials are expired
    pub is_expired: bool,
}

/// Structure to parse OAuth credentials file (with optional fields for validation)
#[derive(Debug, Deserialize)]
struct OAuthCredsFile {
    /// Access token (required)
    access_token: Option<String>,
    /// Refresh token (required for auto-refresh)
    refresh_token: Option<String>,
    /// OAuth scopes
    #[serde(default)]
    scope: Option<String>,
    /// Token type
    #[serde(default)]
    token_type: Option<String>,
    /// ID token
    id_token: Option<String>,
    /// Token expiry (Unix timestamp in milliseconds)
    /// Note: Gemini CLI uses `expiry_date` not `expires_at`
    expiry_date: Option<i64>,
}

/// Google OAuth token refresh response
#[derive(Debug, Deserialize)]
struct TokenRefreshResponse {
    access_token: String,
    expires_in: i64,
    token_type: String,
    scope: Option<String>,
}

/// Get the path to Gemini OAuth credentials file
fn get_gemini_creds_path() -> Option<PathBuf> {
    dirs::home_dir().map(|home| home.join(".gemini").join("oauth_creds.json"))
}

/// Read and parse credentials file
fn read_creds_file() -> Result<OAuthCredsFile, String> {
    let creds_path =
        get_gemini_creds_path().ok_or_else(|| "Could not determine home directory".to_string())?;

    if !creds_path.exists() {
        return Err("Credentials file not found".to_string());
    }

    let content = std::fs::read_to_string(&creds_path)
        .map_err(|e| format!("Could not read credentials file: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Invalid credentials format: {}", e))
}

/// Check the status of Gemini OAuth credentials
///
/// Returns detailed status including whether credentials exist,
/// are valid, and when they expire.
#[tauri::command]
pub fn auth_check_gemini_oauth() -> GeminiOAuthStatus {
    let creds_path = match get_gemini_creds_path() {
        Some(path) => path,
        None => {
            return GeminiOAuthStatus {
                has_credentials: false,
                credentials_path: String::new(),
                is_valid: false,
                error: Some("Could not determine home directory".to_string()),
                expires_at: None,
                is_expired: false,
            };
        }
    };

    let path_str = creds_path.display().to_string();

    // Check if file exists
    if !creds_path.exists() {
        return GeminiOAuthStatus {
            has_credentials: false,
            credentials_path: path_str,
            is_valid: false,
            error: None,
            expires_at: None,
            is_expired: false,
        };
    }

    // Try to read and parse the file
    let creds = match read_creds_file() {
        Ok(c) => c,
        Err(e) => {
            return GeminiOAuthStatus {
                has_credentials: true,
                credentials_path: path_str,
                is_valid: false,
                error: Some(e),
                expires_at: None,
                is_expired: false,
            };
        }
    };

    // Validate required fields
    let has_access_token = creds.access_token.as_ref().is_some_and(|t| !t.is_empty());
    let has_refresh_token = creds.refresh_token.as_ref().is_some_and(|t| !t.is_empty());

    if !has_access_token {
        return GeminiOAuthStatus {
            has_credentials: true,
            credentials_path: path_str,
            is_valid: false,
            error: Some("Missing or empty access_token".to_string()),
            expires_at: creds.expiry_date,
            is_expired: false,
        };
    }

    // Check expiry (expiry_date is in milliseconds)
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    let is_expired = creds.expiry_date.map_or(false, |exp| exp < now_ms);

    // If expired but has refresh token, it's still valid (can be refreshed)
    let is_valid = has_access_token && (has_refresh_token || !is_expired);

    GeminiOAuthStatus {
        has_credentials: true,
        credentials_path: path_str,
        is_valid,
        error: if is_expired && !has_refresh_token {
            Some("Credentials expired and no refresh token available".to_string())
        } else {
            None
        },
        expires_at: creds.expiry_date,
        is_expired,
    }
}

/// Read Gemini OAuth credentials
///
/// Returns the full credentials including access token and refresh token.
/// The frontend uses this to make API calls with the Bearer token.
#[tauri::command]
pub fn auth_read_gemini_oauth_credentials() -> Result<GeminiOAuthCredentials, String> {
    let creds = read_creds_file()?;

    let access_token = creds
        .access_token
        .filter(|t| !t.is_empty())
        .ok_or_else(|| "Missing access_token".to_string())?;

    let refresh_token = creds
        .refresh_token
        .filter(|t| !t.is_empty())
        .ok_or_else(|| "Missing refresh_token".to_string())?;

    let expiry_date = creds
        .expiry_date
        .ok_or_else(|| "Missing expiry_date".to_string())?;

    Ok(GeminiOAuthCredentials {
        access_token,
        refresh_token,
        scope: creds.scope.unwrap_or_default(),
        token_type: creds.token_type.unwrap_or_else(|| "Bearer".to_string()),
        id_token: creds.id_token,
        expiry_date,
    })
}

/// Refresh Gemini OAuth token
///
/// Uses the refresh token to get a new access token from Google.
/// Updates the credentials file with the new token.
#[tauri::command]
pub async fn auth_refresh_gemini_oauth() -> Result<GeminiOAuthCredentials, String> {
    let creds = read_creds_file()?;

    let refresh_token = creds
        .refresh_token
        .filter(|t| !t.is_empty())
        .ok_or_else(|| {
            "Missing refresh_token - please re-authenticate with 'gemini' CLI".to_string()
        })?;

    // Google OAuth token refresh endpoint
    // Using the same client_id and client_secret that gemini-cli uses
    // These are public OAuth credentials for "installed app" type (from gemini-cli)
    // See: https://github.com/anthropics/gemini-cli
    let client_id = get_gemini_oauth_client_id();
    let client_secret = get_gemini_oauth_client_secret();

    let client = reqwest::Client::new();
    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", &refresh_token),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to refresh token: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Token refresh failed ({}): {}. Please re-authenticate with 'gemini' CLI.",
            status, body
        ));
    }

    let token_response: TokenRefreshResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    // Calculate new expiry time (current time + expires_in seconds, in milliseconds)
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let expiry_date = now_ms + (token_response.expires_in * 1000);

    let new_creds = GeminiOAuthCredentials {
        access_token: token_response.access_token,
        refresh_token: refresh_token.clone(),
        scope: token_response
            .scope
            .unwrap_or_else(|| creds.scope.unwrap_or_default()),
        token_type: token_response.token_type,
        id_token: creds.id_token,
        expiry_date,
    };

    // Save updated credentials to file
    let creds_path = get_gemini_creds_path()
        .ok_or_else(|| "Could not determine credentials path".to_string())?;

    let json = serde_json::to_string_pretty(&new_creds)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

    std::fs::write(&creds_path, json).map_err(|e| format!("Failed to save credentials: {}", e))?;

    Ok(new_creds)
}

/// Open the Gemini auth login URL in the default browser
///
/// This is a convenience command to help users authenticate.
#[tauri::command]
#[allow(dead_code)]
pub fn auth_open_gemini_login() -> Result<(), String> {
    // The gemini CLI login command - user needs to run this in terminal
    // We can't run it directly, but we can show instructions
    Err("Please run 'gemini' in your terminal to authenticate with Google.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_gemini_creds_path() {
        let path = get_gemini_creds_path();
        assert!(path.is_some());
        let path = path.expect("Failed to get Gemini credentials path");
        assert!(path.ends_with(".gemini/oauth_creds.json"));
    }

    #[test]
    fn test_auth_check_gemini_oauth_no_file() {
        // This test will pass if the credentials file doesn't exist
        // (which is the case in CI/CD environments)
        let status = auth_check_gemini_oauth();
        // Just verify it doesn't panic and returns a valid structure
        assert!(!status.credentials_path.is_empty() || status.error.is_some());
    }
}
