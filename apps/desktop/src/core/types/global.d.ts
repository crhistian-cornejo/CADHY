/**
 * Global type declarations for CADHY Desktop
 *
 * This file extends the Window interface to include runtime state
 * injected by the Tauri backend via lib.rs
 */

/**
 * Runtime state injected by Tauri backend
 * @see apps/desktop/src-tauri/src/lib.rs
 */
interface CADHYGlobal {
  /** Application version from Cargo.toml */
  version: string
  /** Whether the updater plugin is enabled (false in dev or when signing key missing) */
  updaterEnabled: boolean
  /** Platform identifier: 'macos' | 'windows' | 'linux' */
  platform: string
  /** Whether running in debug mode */
  debug: boolean
}

declare global {
  interface Window {
    /**
     * CADHY runtime state injected by the Tauri backend.
     * Available after window initialization, may be undefined in web/test contexts.
     */
    __CADHY__?: CADHYGlobal
  }
}

export {}
