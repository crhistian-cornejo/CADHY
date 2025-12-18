# Changelog

All notable changes to CADHY will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-18

### Initial Public Release

CADHY's first public release brings a powerful desktop application for designing and analyzing open channel hydraulic structures.

### Features

#### Channel Modeling
- 3D modeling of rectangular, trapezoidal, and triangular open channels
- Real-time 3D visualization with interactive camera controls
- Configurable channel parameters: dimensions, Manning's coefficient, slope

#### Hydraulic Analysis
- Manning flow calculations
- Normal depth computation
- Critical depth computation
- Froude number classification (subcritical, critical, supercritical)
- Channel capacity verification with freeboard
- Water surface profiles using Standard Step Method (GVF)

#### Hydraulic Structures
- Channel transitions (width/shape changes)
- Hydraulic drops
- Chutes with multiple surface types:
  - Smooth surface
  - Stepped surface
  - Baffled chutes
  - Ogee crests
  - Converging walls
- Energy dissipation basins (USBR Types I-IV, SAF)

#### CAD Operations
- Boolean operations: Union, Subtract, Intersect
- Modify operations: Fillet, Chamfer
- Primitive shapes: Box, Cylinder, Sphere, Cone, Torus
- Shape properties analysis

#### Export
- STL format (ASCII and Binary) — All platforms
- STEP format (ISO 10303) — All platforms
- OBJ format (Wavefront) — Windows/macOS only
- glTF/GLB format — Windows/macOS only
- PLY format — Windows/macOS only

#### User Interface
- Modern React-based interface
- Resizable panels
- Keyboard shortcuts
- Multi-language support (i18n)
- Dark/light theme

#### Technical
- Cross-platform: Windows, macOS (Apple Silicon), Linux
- OpenCASCADE 7.9.2 CAD kernel
- Auto-update functionality
- Project file format (.cadhy)

### Known Limitations

- Circular channel sections not yet exposed in UI (backend ready)
- Compound channels with bermas not yet in UI (backend ready)
- **Linux:** Limited export formats (STL/STEP only) due to system OpenCASCADE 7.5.x. Full export support (glTF, OBJ, PLY) requires OCCT 7.6+ which is not available in Ubuntu 22.04 repositories
- macOS x64 builds temporarily disabled (requires dedicated runner)

---

[0.1.0]: https://github.com/crhistian-cornejo/CADHY/releases/tag/v0.1.0
