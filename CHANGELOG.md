# Changelog

All notable changes to CADHY will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/crhistian-cornejo/CADHY/releases/tag/v0.1.0
