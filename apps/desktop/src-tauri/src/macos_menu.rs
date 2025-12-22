//! macOS Native Menu Configuration
//!
//! Creates a native macOS menu bar with standard menus and shortcuts.

use tauri::{
    menu::{AboutMetadataBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Error, Runtime,
};

/// Create the macOS native menu
pub fn create_macos_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Error> {
    // App menu (CADHY)
    let app_menu = SubmenuBuilder::new(app, "CADHY")
        .about(Some(
            AboutMetadataBuilder::new()
                .name(Some("CADHY"))
                .version(Some(env!("CARGO_PKG_VERSION")))
                .short_version(Some(env!("CARGO_PKG_VERSION")))
                .copyright(Some("Copyright © 2024 CADHY Team"))
                .comments(Some("Civil-Hydraulic Engineering Analysis Tool"))
                .build(),
        ))
        .separator()
        .item(&MenuItemBuilder::with_id("check_for_updates", "Check for Updates...").build(app)?)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    // File menu
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("new_project", "New Project")
                .accelerator("CmdOrCtrl+N")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_project", "Open Project...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("close_project", "Close Project")
                .accelerator("CmdOrCtrl+W")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("save_project", "Save Project")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("save_project_as", "Save Project As...")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("export", "Export...")
                .accelerator("CmdOrCtrl+E")
                .build(app)?,
        )
        .separator()
        .close_window()
        .build()?;

    // Edit menu
    // Note: We use custom undo/redo items instead of .undo()/.redo() native methods
    // because those send events to the system, not to our app's JavaScript frontend
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(
            &MenuItemBuilder::with_id("undo", "Undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("redo", "Redo")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?,
        )
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    // View menu
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+\\")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_properties", "Toggle Properties")
                .accelerator("CmdOrCtrl+Shift+P")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("zoom_in", "Zoom In")
                .accelerator("CmdOrCtrl+=")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom_out", "Zoom Out")
                .accelerator("CmdOrCtrl+-")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom_fit", "Fit to Window")
                .accelerator("CmdOrCtrl+0")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("fullscreen", "Toggle Fullscreen")
                .accelerator("Ctrl+CmdOrCtrl+F")
                .build(app)?,
        )
        .build()?;

    // Analysis menu
    let analysis_menu = SubmenuBuilder::new(app, "Analysis")
        .item(
            &MenuItemBuilder::with_id("run_analysis", "Run Analysis")
                .accelerator("CmdOrCtrl+R")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("normal_depth", "Calculate Normal Depth").build(app)?)
        .item(&MenuItemBuilder::with_id("critical_depth", "Calculate Critical Depth").build(app)?)
        .item(&MenuItemBuilder::with_id("water_profile", "Water Surface Profile").build(app)?)
        .build()?;

    // Window menu
    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .item(&MenuItemBuilder::with_id("main_window", "CADHY").build(app)?)
        .build()?;

    // Help menu
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("documentation", "Documentation").build(app)?)
        .item(&MenuItemBuilder::with_id("hydraulics_reference", "Hydraulics Reference").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("report_issue", "Report an Issue").build(app)?)
        .build()?;

    // Build the complete menu
    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&analysis_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()
}
