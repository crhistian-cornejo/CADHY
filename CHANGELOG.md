# Changelog

All notable changes to CADHY will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-12-19

### Added

#### Global Keyboard Shortcuts System
- **use-app-hotkeys hook** - Centralized keyboard shortcut management
- **Numpad key support** - Fixed hotkey-registry to match numpad keys using `event.code`
- **New UI components**: Autocomplete, Kbd (keyboard shortcut display), Frame

#### Texture & Materials System
- **texture-service** - Service for loading and managing textures
- **TextureMaterialPanel** - UI for applying textures and materials to objects

#### Shared Logger Package
- **@cadhy/shared** - New package with centralized logging utilities
- Migration scripts for converting console.log to logger

#### Camera Animation System
- **Keyframe-based camera animations** - Create professional camera fly-throughs with keyframe timeline
- **Camera Views Popover** - Quick camera position switching (Top, Front, Right, Isometric, etc.)
- **Playback Controls** - Play, pause, and scrub through camera animations
- **Camera interpolation utilities** - Smooth Catmull-Rom spline interpolation between keyframes

#### Documentation & Planning
- Added comprehensive roadmap for 2025
- Phase 1 code quality implementation plan
- Completed work summary documentation

#### Developer Experience
- **useVirtualList hook** - Efficient rendering for large lists
- **ErrorBoundary component** - Improved error handling with tests
- **Build-time variables** in vite.config.ts for version info injection
- **useIsFullscreen hook** for detecting macOS fullscreen state

### Fixed

#### React Controlled/Uncontrolled Warnings
- Fix CameraAnimationPanel Select value to use `undefined` when no animation selected
- Fix NewProjectDialog Select to use consistent 'none' string value

#### Keyboard Shortcuts
- Fix hotkey-registry to properly match numpad keys using `event.code` instead of `event.key`

#### UI Stability
- Fix ParamInput crash with undefined values in ChuteCreator, TransitionCreator, CreatePanel
- Fix HelpDialog hardcoded version - now uses dynamic version from Tauri API
- Fix GitHub URL typo in UpdateBadge and UpdateDialog (`crhristian` → `crhistian`)
- Fix auto-updater running in development mode - now skips update checks when `import.meta.env.DEV`
- Fix HDR environment loading error - changed preset from 'sunset' to 'apartment'
- Fix Light Background toggle not working - now properly updates Three.js `scene.background`
- Fix ProjectsView scroll issues - add `overflow-hidden` and `min-h-0` for proper ScrollArea behavior
- Fix titlebar logo position on macOS fullscreen - logo moves left when traffic lights are hidden

### Changed

#### Architecture Improvements
- CommandPalette refactored for better performance
- UpdateDialog UI improvements
- Chat store optimizations
- Objects and layers slice improvements

#### macOS Build Process
- Improved dylib path fixing script
- Added entitlements.plist for proper app signing

#### UI/UX Improvements
- CreatePanel now opens only Hydraulics section by default (was all sections expanded)
- Refactor tauri-service to use backend's `get_extended_system_info` command
- Add camera-slice to modeller store for animation state management
- LayersPanel, PropertiesPanel, ScenePanel improvements

---

## [0.1.2] - 2025-12-18

### Fixed

#### macOS App Launch Crash (CRITICAL)
- **v0.1.1 was broken** - app crashed on launch with "Library not loaded: /opt/homebrew/*/libTKernel.7.9.dylib"
- Root cause: CI workflow was creating DMG before dylib paths were fixed
- Solution: Restructured build to fix dylib paths BEFORE DMG creation
- Now uses `hdiutil` directly instead of Tauri's DMG bundler to preserve fixed paths

#### Shape Export
- Fix export for shapes that were created in previous sessions
- Add fallback to check `shape.metadata.backendShapeId` when `shapeIdMap` is empty (after page refresh)
- Add `isExportable()` and `hasExportableObjects()` helper functions
- Include 'shape' type in export checks (was only checking 'channel' and 'transition')

### Changed

#### Unified Toolbar
- Consolidate all CAD operations into ViewportToolbar
- Remove separate CADToolbar component from ModellerView
- Add Boolean operations (Union, Subtract, Intersect) to ViewportToolbar
- Add Modify operations (Fillet, Chamfer, Shell) to ViewportToolbar
- Add Measure tools (Distance, Angle, Area, Volume) to ViewportToolbar

### Improved
- CreatePanel layout and interaction improvements
- Better error logging in export service for debugging
- Minor viewport component refinements

---

## [0.1.1] - 2025-12-18 (BROKEN - DO NOT USE)

> ⚠️ **This release is broken on macOS.** The app crashes on launch. Use v0.1.2 instead.

### Fixed

#### macOS Standalone Distribution
- Bundle OCCT, TBB, freetype, and libpng dylibs (37 total) in the macOS app bundle
- Fix dylib paths for standalone distribution - app now runs without requiring Homebrew OCCT installation
- Add scripts for copying and fixing dylib paths (`scripts/occt/copy-dylibs-macos.sh`, `scripts/occt/fix-dylib-paths-macos.sh`)
- Update CI workflow to copy dylibs before build

#### React Component Fixes
- Fix `handleOpenProject` initialization order in OpenProjectDialog (was causing "Cannot access before initialization" error)
- Fix null check for `currentProject.name` in AIChatPanel dependency array

---

## [0.1.0] - 2025-12-18

### Initial Public Release

CADHY's first public release brings a powerful desktop application for designing and analyzing open channel hydraulic structures.

### Features

#### Channel Sections (Backend)
- **Rectangular**: Width and depth parameters
- **Trapezoidal**: Bottom width, depth, asymmetric side slopes (left/right)
- **Triangular**: Depth with asymmetric side slopes
- **Circular**: Diameter (pipe flow with partial/full flow calculations)
- **Parabolic**: Top width and depth
- **U-Shaped**: Combined circular bottom with vertical walls
- **Compound**: Main channel with lateral berms, using Divided Channel Method with:
  - Lotter n-equivalent coefficient
  - Coriolis (α) and Boussinesq (β) correction factors
  - Per-zone conveyance calculations

#### Hydraulic Analysis
- Manning flow calculations with full hydraulic properties
- Normal depth computation (Newton-Raphson iteration)
- Critical depth computation
- Froude number classification (subcritical, critical, supercritical)
- Channel capacity verification with freeboard
- Specific energy and momentum calculations
- Water surface profiles using Standard Step Method (GVF):
  - 12 profile types: M1, M2, M3, S1, S2, S3, C1, C3, H2, H3, A2, A3
  - Automatic flow regime detection
  - Transition head loss calculations (contraction/expansion)
- **Hydraulic jump analysis**:
  - Jump type classification (Undular, Weak, Oscillating, Steady, Strong)
  - Conjugate depth calculation (Belanger equation)
  - Energy dissipation efficiency

#### Hydraulic Structures (Backend)
- **Drops**: Vertical, Inclined, Stepped, Ogee profiles
- **Weirs**: 
  - Sharp-crested rectangular
  - Broad-crested rectangular  
  - Trapezoidal (Cipolletti)
  - Triangular (V-notch)
  - Ogee spillway
  - Sutro (proportional)
  - Labyrinth
- **Chutes (Rápidas)**:
  - Step blocks along chute
  - Aeration requirements detection
  - Normal/critical depth profiles
- **Stilling Basins (USBR)**: 
  - Type I (Fr < 1.7)
  - Type II (Fr 2.5-4.5, dentated sill)
  - Type III (Fr > 4.5, baffle blocks)
  - Type IV (oscillating jump alternative)
  - SAF (Saint Anthony Falls)
  - Automatic type selection based on Froude and velocity
  - Chute blocks, baffle blocks, end sills design
- **Junctions**: Lateral diversions, confluences, with gate options

#### Alignment Engine (Backend)
- PI-based horizontal alignment with curve radii
- Tangent and circular arc segments
- Deflection angle and curve geometry calculations
- Longitudinal profile with slope changes
- 3D station interpolation
- Superelevation support

#### CAD Operations
- **Primitives**: Box, Cylinder, Sphere, Cone, Torus, Wedge, Helix
- **Boolean operations**: Union (Fuse), Subtract (Cut), Intersect (Common)
- **Modify operations**: Fillet, Chamfer, Shell (hollow solids)
- **Transforms**: Translate, Rotate, Scale, Mirror
- **Advanced**: Extrude, Revolve
- **Analysis**: Shape validation, distance measurement, topology inspection

#### Export Formats
- **STL** (Binary) — All platforms
- **STEP** (ISO 10303) — All platforms
- **OBJ** (Wavefront) — Windows/macOS only
- **glTF/GLB** — Windows/macOS only

#### User Interface
- Modern React-based interface with shadcn/ui components
- Resizable panels
- Keyboard shortcuts
- Multi-language support (English, Spanish)
- Dark/light theme

#### Technical
- Cross-platform: Windows, macOS (Apple Silicon), Linux
- OpenCASCADE 7.9.2 CAD kernel
- Auto-update functionality
- Project file format (.cadhy)

### Known Limitations

- **UI Exposure**: Circular, Parabolic, U-Shaped, and Compound sections are fully implemented in backend but not yet exposed in UI
- **Weirs/Structures**: Backend complete, UI integration pending
- **Alignment Editor**: Backend complete, visual editor pending
- **Linux**: Limited export formats (STL/STEP only) due to system OpenCASCADE 7.5.x
- **macOS x64**: Builds temporarily disabled (requires dedicated runner)

---

[1.3.0]: https://github.com/crhistian-cornejo/CADHY/releases/tag/v1.3.0
[0.1.2]: https://github.com/crhistian-cornejo/CADHY/releases/tag/v0.1.2
[0.1.1]: https://github.com/crhistian-cornejo/CADHY/releases/tag/v0.1.1
[0.1.0]: https://github.com/crhistian-cornejo/CADHY/releases/tag/v0.1.0
