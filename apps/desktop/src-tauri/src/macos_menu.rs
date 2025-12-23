//! macOS Native Menu Configuration
//!
//! Creates a comprehensive native macOS menu bar with standard menus,
//! shortcuts, and professional organization following Apple HIG.

use tauri::{
    menu::{AboutMetadataBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Error, Runtime,
};

/// Create the macOS native menu
pub fn create_macos_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Error> {
    // =========================================================================
    // APP MENU (CADHY)
    // =========================================================================
    let app_menu = SubmenuBuilder::new(app, "CADHY")
        .about(Some(
            AboutMetadataBuilder::new()
                .name(Some("CADHY"))
                .version(Some(env!("CARGO_PKG_VERSION")))
                .short_version(Some(env!("CARGO_PKG_VERSION")))
                .copyright(Some("Copyright © 2024 CADHY Team. All rights reserved."))
                .comments(Some(
                    "Professional Civil-Hydraulic Engineering Analysis Tool",
                ))
                .website(Some("https://cadhy.app"))
                .website_label(Some("Visit Website"))
                .license(Some("MIT License"))
                .build(),
        ))
        .separator()
        .item(&MenuItemBuilder::with_id("check_for_updates", "Check for Updates...").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("preferences", "Settings...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    // =========================================================================
    // FILE MENU
    // =========================================================================

    // Open Recent submenu
    let recent_menu = SubmenuBuilder::new(app, "Open Recent")
        .item(
            &MenuItemBuilder::with_id("recent_1", "No Recent Projects")
                .enabled(false)
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("clear_recent", "Clear Menu").build(app)?)
        .build()?;

    // Export submenu
    let export_menu = SubmenuBuilder::new(app, "Export")
        .item(
            &MenuItemBuilder::with_id("export_step", "STEP (.step)")
                .accelerator("CmdOrCtrl+Shift+E")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("export_stl", "STL (.stl)").build(app)?)
        .item(&MenuItemBuilder::with_id("export_obj", "OBJ (.obj)").build(app)?)
        .item(&MenuItemBuilder::with_id("export_glb", "glTF Binary (.glb)").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("export_pdf", "PDF Report (.pdf)").build(app)?)
        .item(&MenuItemBuilder::with_id("export_csv", "CSV Data (.csv)").build(app)?)
        .build()?;

    // Import submenu
    let import_menu = SubmenuBuilder::new(app, "Import")
        .item(&MenuItemBuilder::with_id("import_step", "STEP File (.step)").build(app)?)
        .item(&MenuItemBuilder::with_id("import_stl", "STL File (.stl)").build(app)?)
        .item(&MenuItemBuilder::with_id("import_dxf", "DXF File (.dxf)").build(app)?)
        .build()?;

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
        .item(&recent_menu)
        .separator()
        .item(
            &MenuItemBuilder::with_id("close_project", "Close Project")
                .accelerator("CmdOrCtrl+W")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("save_project", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("save_project_as", "Save As...")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("duplicate_project", "Duplicate")
                .accelerator("CmdOrCtrl+Shift+D")
                .build(app)?,
        )
        .separator()
        .item(&import_menu)
        .item(&export_menu)
        .separator()
        .item(&MenuItemBuilder::with_id("project_settings", "Project Settings...").build(app)?)
        .separator()
        .close_window()
        .build()?;

    // =========================================================================
    // EDIT MENU
    // =========================================================================
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
        .item(
            &MenuItemBuilder::with_id("paste_special", "Paste Special...")
                .accelerator("CmdOrCtrl+Shift+V")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("delete", "Delete")
                .accelerator("Backspace")
                .build(app)?,
        )
        .select_all()
        .separator()
        .item(
            &MenuItemBuilder::with_id("duplicate", "Duplicate")
                .accelerator("CmdOrCtrl+D")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("find", "Find...")
                .accelerator("CmdOrCtrl+F")
                .build(app)?,
        )
        .build()?;

    // =========================================================================
    // VIEW MENU
    // =========================================================================

    // Viewport submenu
    let viewport_menu = SubmenuBuilder::new(app, "Viewport")
        .item(
            &MenuItemBuilder::with_id("view_front", "Front")
                .accelerator("Numpad1")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view_back", "Back")
                .accelerator("Ctrl+Numpad1")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view_right", "Right")
                .accelerator("Numpad3")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view_left", "Left")
                .accelerator("Ctrl+Numpad3")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view_top", "Top")
                .accelerator("Numpad7")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("view_bottom", "Bottom")
                .accelerator("Ctrl+Numpad7")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("view_isometric", "Isometric")
                .accelerator("Numpad5")
                .build(app)?,
        )
        .build()?;

    // Display Mode submenu
    let display_menu = SubmenuBuilder::new(app, "Display Mode")
        .item(&MenuItemBuilder::with_id("display_solid", "Solid").build(app)?)
        .item(&MenuItemBuilder::with_id("display_wireframe", "Wireframe").build(app)?)
        .item(&MenuItemBuilder::with_id("display_solid_wireframe", "Solid + Wireframe").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("display_xray", "X-Ray").build(app)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+\\")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_properties", "Toggle Properties Panel")
                .accelerator("CmdOrCtrl+Shift+P")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_timeline", "Toggle Timeline")
                .accelerator("CmdOrCtrl+T")
                .build(app)?,
        )
        .separator()
        .item(&viewport_menu)
        .item(&display_menu)
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
            &MenuItemBuilder::with_id("zoom_fit", "Zoom to Fit")
                .accelerator("CmdOrCtrl+0")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("zoom_selection", "Zoom to Selection")
                .accelerator("CmdOrCtrl+.")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("toggle_grid", "Show Grid")
                .accelerator("CmdOrCtrl+G")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("toggle_axes", "Show Axes").build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_stats", "Show Statistics").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("fullscreen", "Enter Full Screen")
                .accelerator("Ctrl+CmdOrCtrl+F")
                .build(app)?,
        )
        .build()?;

    // =========================================================================
    // TOOLS MENU (NEW!)
    // =========================================================================

    // Transform submenu
    let transform_menu = SubmenuBuilder::new(app, "Transform")
        .item(
            &MenuItemBuilder::with_id("tool_move", "Move")
                .accelerator("G")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("tool_rotate", "Rotate")
                .accelerator("R")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("tool_scale", "Scale")
                .accelerator("S")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("tool_mirror", "Mirror...").build(app)?)
        .item(&MenuItemBuilder::with_id("tool_array", "Array...").build(app)?)
        .build()?;

    // Primitives submenu
    let primitives_menu = SubmenuBuilder::new(app, "Create Primitive")
        .item(&MenuItemBuilder::with_id("create_box", "Box").build(app)?)
        .item(&MenuItemBuilder::with_id("create_sphere", "Sphere").build(app)?)
        .item(&MenuItemBuilder::with_id("create_cylinder", "Cylinder").build(app)?)
        .item(&MenuItemBuilder::with_id("create_cone", "Cone").build(app)?)
        .item(&MenuItemBuilder::with_id("create_torus", "Torus").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("create_plane", "Plane").build(app)?)
        .build()?;

    // Boolean submenu
    let boolean_menu = SubmenuBuilder::new(app, "Boolean")
        .item(
            &MenuItemBuilder::with_id("boolean_union", "Union")
                .accelerator("CmdOrCtrl+Shift+U")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("boolean_subtract", "Subtract")
                .accelerator("CmdOrCtrl+Shift+B")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("boolean_intersect", "Intersect")
                .accelerator("CmdOrCtrl+Shift+I")
                .build(app)?,
        )
        .build()?;

    // Modify submenu
    let modify_menu = SubmenuBuilder::new(app, "Modify")
        .item(&MenuItemBuilder::with_id("tool_fillet", "Fillet...").build(app)?)
        .item(&MenuItemBuilder::with_id("tool_chamfer", "Chamfer...").build(app)?)
        .item(&MenuItemBuilder::with_id("tool_shell", "Shell...").build(app)?)
        .item(&MenuItemBuilder::with_id("tool_offset", "Offset...").build(app)?)
        .build()?;

    let tools_menu = SubmenuBuilder::new(app, "Tools")
        .item(
            &MenuItemBuilder::with_id("tool_select", "Select")
                .accelerator("V")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("tool_box_select", "Box Select")
                .accelerator("B")
                .build(app)?,
        )
        .separator()
        .item(&transform_menu)
        .separator()
        .item(&primitives_menu)
        .item(&boolean_menu)
        .item(&modify_menu)
        .separator()
        .item(
            &MenuItemBuilder::with_id("tool_measure", "Measure")
                .accelerator("M")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("tool_annotate", "Annotate").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("snap_to_grid", "Snap to Grid")
                .accelerator("CmdOrCtrl+Shift+G")
                .build(app)?,
        )
        .item(&MenuItemBuilder::with_id("snap_to_vertex", "Snap to Vertex").build(app)?)
        .build()?;

    // =========================================================================
    // ANALYSIS MENU
    // =========================================================================
    let analysis_menu = SubmenuBuilder::new(app, "Analysis")
        .item(
            &MenuItemBuilder::with_id("run_analysis", "Run Analysis")
                .accelerator("CmdOrCtrl+R")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("stop_analysis", "Stop Analysis")
                .accelerator("CmdOrCtrl+.")
                .enabled(false)
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("normal_depth", "Calculate Normal Depth").build(app)?)
        .item(&MenuItemBuilder::with_id("critical_depth", "Calculate Critical Depth").build(app)?)
        .item(&MenuItemBuilder::with_id("water_profile", "Water Surface Profile").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("channel_capacity", "Check Channel Capacity").build(app)?)
        .item(&MenuItemBuilder::with_id("froude_number", "Froude Number Analysis").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("analysis_report", "Generate Report...").build(app)?)
        .build()?;

    // =========================================================================
    // WINDOW MENU
    // =========================================================================
    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .item(&MenuItemBuilder::with_id("zoom_window", "Zoom").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("bring_all_to_front", "Bring All to Front").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("toggle_devtools", "Toggle Developer Tools")
                .accelerator("CmdOrCtrl+Alt+I")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("main_window", "CADHY - Main Window").build(app)?)
        .build()?;

    // =========================================================================
    // HELP MENU
    // =========================================================================
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(
            &MenuItemBuilder::with_id("search_help", "Search")
                .accelerator("CmdOrCtrl+Shift+/")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("documentation", "Documentation").build(app)?)
        .item(&MenuItemBuilder::with_id("getting_started", "Getting Started Guide").build(app)?)
        .item(&MenuItemBuilder::with_id("keyboard_shortcuts", "Keyboard Shortcuts").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("hydraulics_reference", "Hydraulics Reference").build(app)?)
        .item(
            &MenuItemBuilder::with_id("manning_calculator", "Manning's Equation Calculator")
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("release_notes", "Release Notes").build(app)?)
        .item(&MenuItemBuilder::with_id("report_issue", "Report an Issue...").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("contact_support", "Contact Support").build(app)?)
        .item(&MenuItemBuilder::with_id("join_discord", "Join Discord Community").build(app)?)
        .build()?;

    // =========================================================================
    // BUILD COMPLETE MENU
    // =========================================================================
    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&tools_menu)
        .item(&analysis_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()
}
