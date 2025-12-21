//! Chat persistence commands for CADHY
//!
//! Handles AI chat session storage within project directories.
//! Structure for folder-based projects (v2):
//!   ProjectName.cadhy/.chat/index.json     - Fast session listing
//!   ProjectName.cadhy/.chat/sessions/*.json - Individual session files
//!
//! Structure for legacy projects (v1):
//!   ProjectDir/.chat/sessions/*.json

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ============================================================================
// TYPES
// ============================================================================

/// Metadata for a chat session (lightweight, for listing)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSessionMeta {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: usize,
    pub model_id: String,
}

/// A single chat message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<serde_json::Value>,
}

/// Full chat session data (stored in JSON file)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    pub created_at: i64,
    pub updated_at: i64,
    pub model_id: String,
}

/// Chat index file for fast session listing
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChatIndex {
    pub sessions: Vec<ChatSessionMeta>,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Get the chat directory path for a project
/// Handles both folder-based (v2) and legacy file-based (v1) projects
fn get_chat_dir(project_path: &str) -> PathBuf {
    let project_path = PathBuf::from(project_path);

    if project_path.is_dir() {
        // v2 folder-based: project_path IS the .cadhy folder
        project_path.join(".chat")
    } else {
        // v1 legacy: project_path is the .cadhy file, chat is in parent
        project_path.parent().unwrap_or(&project_path).join(".chat")
    }
}

/// Get the sessions directory path
fn get_sessions_dir(project_path: &str) -> PathBuf {
    get_chat_dir(project_path).join("sessions")
}

/// Get the index file path
fn get_index_path(project_path: &str) -> PathBuf {
    get_chat_dir(project_path).join("index.json")
}

/// Get the path for a specific session file
fn get_session_path(project_path: &str, session_id: &str) -> PathBuf {
    get_sessions_dir(project_path).join(format!("{}.json", session_id))
}

/// Read the chat index file
fn read_index(project_path: &str) -> ChatIndex {
    let index_path = get_index_path(project_path);
    if index_path.exists() {
        if let Ok(content) = fs::read_to_string(&index_path) {
            if let Ok(index) = serde_json::from_str(&content) {
                return index;
            }
        }
    }
    ChatIndex::default()
}

/// Write the chat index file (atomic write)
fn write_index(project_path: &str, index: &ChatIndex) -> Result<(), String> {
    let index_path = get_index_path(project_path);

    // Ensure parent directory exists
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create chat directory: {}", e))?;
    }

    // Atomic write
    let temp_path = index_path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(&index)
        .map_err(|e| format!("Failed to serialize index: {}", e))?;
    fs::write(&temp_path, json).map_err(|e| format!("Failed to write index: {}", e))?;
    fs::rename(&temp_path, &index_path).map_err(|e| format!("Failed to finalize index: {}", e))?;

    Ok(())
}

/// Update or add a session in the index
fn update_index_entry(project_path: &str, session: &ChatSession) -> Result<(), String> {
    let mut index = read_index(project_path);

    // Extract preview from messages
    let preview = session
        .messages
        .iter()
        .rev()
        .find(|m| m.role == "assistant")
        .or_else(|| session.messages.last())
        .map(|m| {
            let content = &m.content;
            if content.len() > 100 {
                format!("{}...", &content[..100])
            } else {
                content.clone()
            }
        })
        .unwrap_or_else(|| "Empty".to_string());

    let meta = ChatSessionMeta {
        id: session.id.clone(),
        title: session.title.clone(),
        preview,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: session.messages.len(),
        model_id: session.model_id.clone(),
    };

    // Update existing or add new
    if let Some(pos) = index.sessions.iter().position(|s| s.id == session.id) {
        index.sessions[pos] = meta;
    } else {
        index.sessions.push(meta);
    }

    // Sort by updated_at descending
    index
        .sessions
        .sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    write_index(project_path, &index)
}

/// Remove a session from the index
fn remove_index_entry(project_path: &str, session_id: &str) -> Result<(), String> {
    let mut index = read_index(project_path);
    index.sessions.retain(|s| s.id != session_id);
    write_index(project_path, &index)
}

// ============================================================================
// COMMANDS
// ============================================================================

/// Initialize the chat directory structure for a project
#[tauri::command]
pub async fn chat_init(project_path: String) -> Result<(), String> {
    let sessions_dir = get_sessions_dir(&project_path);

    fs::create_dir_all(&sessions_dir)
        .map_err(|e| format!("Failed to create chat directory: {}", e))?;

    // Create empty index if it doesn't exist
    let index_path = get_index_path(&project_path);
    if !index_path.exists() {
        write_index(&project_path, &ChatIndex::default())?;
    }

    Ok(())
}

/// Save a chat session
#[tauri::command]
pub async fn chat_save_session(project_path: String, session: ChatSession) -> Result<(), String> {
    // Ensure directory exists
    let sessions_dir = get_sessions_dir(&project_path);
    fs::create_dir_all(&sessions_dir)
        .map_err(|e| format!("Failed to create sessions directory: {}", e))?;

    // Write session file (atomic)
    let session_path = get_session_path(&project_path, &session.id);
    let temp_path = session_path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    fs::write(&temp_path, json).map_err(|e| format!("Failed to write session file: {}", e))?;
    fs::rename(&temp_path, &session_path)
        .map_err(|e| format!("Failed to finalize session file: {}", e))?;

    // Update index
    update_index_entry(&project_path, &session)?;

    Ok(())
}

/// Load a chat session by ID
#[tauri::command]
pub async fn chat_load_session(
    project_path: String,
    session_id: String,
) -> Result<ChatSession, String> {
    let session_path = get_session_path(&project_path, &session_id);

    let content = fs::read_to_string(&session_path)
        .map_err(|e| format!("Failed to read session file: {}", e))?;

    let session: ChatSession = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse session file: {}", e))?;

    Ok(session)
}

/// List all chat sessions for a project (returns metadata only)
/// Uses index file for fast listing when available
#[tauri::command]
pub async fn chat_list_sessions(project_path: String) -> Result<Vec<ChatSessionMeta>, String> {
    let index_path = get_index_path(&project_path);

    // Try to use index file first (fast path)
    if index_path.exists() {
        let index = read_index(&project_path);
        if !index.sessions.is_empty() {
            return Ok(index.sessions);
        }
    }

    // Fallback: scan sessions directory (for legacy or if index is empty)
    let sessions_dir = get_sessions_dir(&project_path);

    // If directory doesn't exist, return empty list
    if !sessions_dir.exists() {
        return Ok(vec![]);
    }

    let mut sessions: Vec<ChatSessionMeta> = Vec::new();

    let entries = fs::read_dir(&sessions_dir)
        .map_err(|e| format!("Failed to read sessions directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();

        // Only process .json files (not .tmp files)
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }

        // Try to read and parse the session
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(session) = serde_json::from_str::<ChatSession>(&content) {
                // Extract preview from last assistant message or last message
                let preview = session
                    .messages
                    .iter()
                    .rev()
                    .find(|m| m.role == "assistant")
                    .or_else(|| session.messages.last())
                    .map(|m| {
                        let content = &m.content;
                        if content.len() > 100 {
                            format!("{}...", &content[..100])
                        } else {
                            content.clone()
                        }
                    })
                    .unwrap_or_else(|| "Empty".to_string());

                sessions.push(ChatSessionMeta {
                    id: session.id,
                    title: session.title,
                    preview,
                    created_at: session.created_at,
                    updated_at: session.updated_at,
                    message_count: session.messages.len(),
                    model_id: session.model_id,
                });
            }
        }
    }

    // Sort by updated_at descending (most recent first)
    sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    // Rebuild index from scanned sessions
    if !sessions.is_empty() {
        let _ = write_index(
            &project_path,
            &ChatIndex {
                sessions: sessions.clone(),
            },
        );
    }

    Ok(sessions)
}

/// Delete a chat session
#[tauri::command]
pub async fn chat_delete_session(project_path: String, session_id: String) -> Result<(), String> {
    let session_path = get_session_path(&project_path, &session_id);

    if session_path.exists() {
        fs::remove_file(&session_path)
            .map_err(|e| format!("Failed to delete session file: {}", e))?;
    }

    // Update index
    remove_index_entry(&project_path, &session_id)?;

    Ok(())
}

// ============================================================================
// AI GATEWAY PROXY (CORS bypass)
// ============================================================================

/// Request body for AI Gateway image enhancement
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnhanceViewportRequest {
    /// Base64 encoded image (with or without data: prefix)
    pub image_base64: String,
    /// MIME type of the image
    pub media_type: String,
    /// Enhancement prompt
    pub prompt: String,
}

/// Response from AI Gateway image enhancement
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnhanceViewportResponse {
    /// Whether the operation was successful
    pub success: bool,
    /// Generated images as base64 strings
    pub images: Vec<GeneratedImageData>,
    /// Text response from the model (if any)
    pub text: Option<String>,
    /// Error message if failed
    pub error: Option<String>,
}

/// Generated image data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedImageData {
    /// Base64 encoded image data
    pub base64: String,
    /// MIME type
    pub media_type: String,
}

/// Proxy request to AI Gateway to bypass CORS restrictions
/// The browser cannot call ai-gateway.vercel.sh directly due to CORS,
/// but Rust has no such restrictions.
#[tauri::command]
pub async fn ai_gateway_enhance_viewport(
    api_key: String,
    request: EnhanceViewportRequest,
) -> Result<EnhanceViewportResponse, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    eprintln!("[CADHY] ai_gateway_enhance_viewport called");
    eprintln!("[CADHY] prompt length: {}", request.prompt.len());
    eprintln!("[CADHY] image_base64 length: {}", request.image_base64.len());

    // Extract raw base64 if it has data: prefix
    let image_data = if request.image_base64.starts_with("data:") {
        request
            .image_base64
            .split(',')
            .nth(1)
            .unwrap_or(&request.image_base64)
            .to_string()
    } else {
        request.image_base64
    };

    // Decode base64 to verify it's valid
    let image_bytes = STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Invalid base64 image: {}", e))?;

    eprintln!("[CADHY] Decoded image bytes: {}", image_bytes.len());

    // Re-encode to ensure clean base64
    let clean_base64 = STANDARD.encode(&image_bytes);

    // Build the request body for AI Gateway
    // Format: OpenAI-compatible chat completions with image
    let request_body = serde_json::json!({
        "model": "google/gemini-3-pro-image",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:{};base64,{}", request.media_type, clean_base64)
                        }
                    },
                    {
                        "type": "text",
                        "text": request.prompt
                    }
                ]
            }
        ],
        "max_tokens": 4096
    });

    eprintln!("[CADHY] Sending request to AI Gateway...");

    // Make the HTTP request to AI Gateway
    let client = reqwest::Client::new();
    let response = client
        .post("https://ai-gateway.vercel.sh/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to call AI Gateway: {}", e))?;

    let status = response.status();
    eprintln!("[CADHY] AI Gateway response status: {}", status);

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    eprintln!("[CADHY] Response length: {} chars", response_text.len());
    // Log first 500 chars for debugging
    eprintln!("[CADHY] Response preview: {}", &response_text.chars().take(1000).collect::<String>());

    if !status.is_success() {
        return Ok(EnhanceViewportResponse {
            success: false,
            images: vec![],
            text: None,
            error: Some(format!(
                "AI Gateway returned status {}: {}",
                status, response_text
            )),
        });
    }

    // Parse the response
    let response_json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Extract images from the response
    // The gateway returns images in the standard OpenAI format or in a files array
    let mut images: Vec<GeneratedImageData> = vec![];

    // Check for files array (AI SDK format)
    if let Some(files) = response_json.get("files").and_then(|f| f.as_array()) {
        for file in files {
            if let (Some(base64), Some(media_type)) = (
                file.get("base64").and_then(|b| b.as_str()),
                file.get("mediaType")
                    .or_else(|| file.get("mimeType"))
                    .and_then(|m| m.as_str()),
            ) {
                if media_type.starts_with("image/") {
                    images.push(GeneratedImageData {
                        base64: base64.to_string(),
                        media_type: media_type.to_string(),
                    });
                }
            }
        }
    }

    // Check for choices array (OpenAI format)
    if images.is_empty() {
        if let Some(choices) = response_json.get("choices").and_then(|c| c.as_array()) {
            for choice in choices {
                if let Some(message) = choice.get("message") {
                    // Check for image content
                    if let Some(content) = message.get("content") {
                        if let Some(content_array) = content.as_array() {
                            for item in content_array {
                                if item.get("type").and_then(|t| t.as_str()) == Some("image") {
                                    if let Some(image_data) = item.get("image") {
                                        if let (Some(base64), Some(media_type)) = (
                                            image_data.get("base64").and_then(|b| b.as_str()),
                                            image_data
                                                .get("mediaType")
                                                .or_else(|| image_data.get("mimeType"))
                                                .and_then(|m| m.as_str()),
                                        ) {
                                            images.push(GeneratedImageData {
                                                base64: base64.to_string(),
                                                media_type: media_type.to_string(),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Extract text response
    let text = response_json
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|content| {
            if content.is_string() {
                content.as_str().map(|s| s.to_string())
            } else if let Some(arr) = content.as_array() {
                arr.iter()
                    .find(|item| item.get("type").and_then(|t| t.as_str()) == Some("text"))
                    .and_then(|item| item.get("text").and_then(|t| t.as_str()))
                    .map(|s| s.to_string())
            } else {
                None
            }
        });

    // Check before moving images
    let has_images = !images.is_empty();
    eprintln!("[CADHY] Extracted {} images, text: {:?}", images.len(), text.as_ref().map(|t| t.len()));

    // If no images, include response preview in error for debugging
    let error_msg = if !has_images {
        // Truncate response for error message
        let preview: String = response_text.chars().take(500).collect();
        Some(format!("No images generated. Response preview: {}", preview))
    } else {
        None
    };

    Ok(EnhanceViewportResponse {
        success: has_images,
        images,
        text,
        error: error_msg,
    })
}
