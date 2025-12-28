# CADHY Debug Utilities

Debugging tools for the CADHY desktop application (Tauri + Rust + React + Three.js).

## Directory Structure

```
debug/
├── README.md              # This file
├── lldb_rust.py          # LLDB helpers for Rust debugging
├── debug_frontend.ts     # Browser DevTools scripts
└── debug_backend.ts      # Rust/Tauri debugging utilities
```

## LLDB Rust Helpers

Pretty printers and commands for debugging Rust code with LLDB.

### Setup

Add to your `~/.lldbinit`:

```
command script import /path/to/cadhy/tools/debug/lldb_rust.py
```

### Commands

| Command | Description |
|---------|-------------|
| `rust_bt` | Clean Rust backtrace (filters runtime frames) |
| `show_vec <var>` | Pretty print a `Vec<T>` |
| `show_str <var>` | Pretty print a `String` or `&str` |
| `cadhy_shapes` | List CAD shapes in current scope |

### Example Session

```lldb
(lldb) b cadhy_cad::operations::fillet
(lldb) r
(lldb) rust_bt
(lldb) show_vec edges
(lldb) cadhy_shapes
```

## Frontend Debug Scripts

JavaScript snippets to paste in Chrome DevTools Console.

### Usage

```bash
# Generate memory analysis script
bun run tools/debug/debug_frontend.ts memory

# Copy output and paste in Chrome DevTools Console (F12)
```

### Commands

| Command | Description |
|---------|-------------|
| `memory` | Analyze JavaScript heap memory |
| `components` | React component tree |
| `scene` | Three.js scene inspector |
| `perf` | FPS and performance measurement |
| `textures` | Texture cache inspector |

### Exposing Objects for Debugging

Add to your code for better debugging:

```typescript
// In your Three.js scene setup
if (import.meta.env.DEV) {
  window.__THREE_SCENE__ = scene
  canvas.__three_renderer = renderer
  window.__TEXTURE_MANAGER__ = textureManager
}
```

## Backend Debug Utilities

Rust/Tauri debugging and profiling tools.

### Usage

```bash
# List all Tauri commands
bun run tools/debug/debug_backend.ts trace

# Analyze log statements
bun run tools/debug/debug_backend.ts logs

# Show profiling setup guide
bun run tools/debug/debug_backend.ts profile

# Check debug symbols
bun run tools/debug/debug_backend.ts symbols
```

### Commands

| Command | Description |
|---------|-------------|
| `trace` | List all `#[tauri::command]` functions |
| `logs` | Count log macros (error!, warn!, etc.) |
| `profile` | Profiling tools setup guide |
| `symbols` | Check if debug symbols are present |

## Profiling Guide

### CPU Profiling

```bash
# Install samply
cargo install samply

# Profile the app
samply record -- ./target/release/cadhy-desktop

# Opens Firefox Profiler with results
```

### Memory Profiling

```bash
# macOS
brew install heaptrack
heaptrack ./target/release/cadhy-desktop

# View results
heaptrack_gui heaptrack.cadhy-desktop.*.gz
```

### Flamegraph

```bash
# Install
cargo install flamegraph

# Generate flamegraph
cargo flamegraph --bin cadhy-desktop

# Opens flamegraph.svg
```

### Async Tracing (Tokio)

Add to `Cargo.toml`:
```toml
[dependencies]
console-subscriber = "0.2"
```

Add to `main.rs`:
```rust
#[tokio::main]
async fn main() {
    console_subscriber::init();
    // ...
}
```

Run the console:
```bash
tokio-console
```

## Debug Build Configuration

### Cargo.toml Settings

```toml
[profile.dev]
debug = 2  # Full debug info

[profile.release]
debug = 1  # Line tables only (for stack traces)

[profile.release-with-debug]
inherits = "release"
debug = 2  # Full debug info in release
```

### Environment Variables

```bash
# Enable Rust backtraces
export RUST_BACKTRACE=1

# Full backtrace
export RUST_BACKTRACE=full

# Enable debug logging
export RUST_LOG=cadhy=debug
```

## VSCode/Cursor Debug Configuration

The `utils_ide/setup_vscode.ts` tool creates launch configurations for debugging.
Run it to set up:

```bash
bun run tools/utils_ide/setup_vscode.ts
```

This creates:
- Tauri Development launch config
- Debug Rust Tests config
- Debug Web (Chrome) config
