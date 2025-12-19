# CADHY Roadmap 2025 - Path to Production Excellence

> **Last Updated**: 2025-12-19
> **Current Version**: 0.1.3 (beta)
> **Target**: v1.0.0 Production Ready (Q4 2025)

---

## Executive Summary

CADHY is a specialized CAD/BIM software for hydraulic engineering with solid technical foundation (Rust + OpenCASCADE + React 19). This roadmap outlines the path from beta to production-ready software, focusing on:

1. **Code Quality & Reliability** - Eliminate critical bugs, optimize performance
2. **BIM Interoperability** - IFC, DWG/DXF support (industry standard)
3. **Professional Documentation** - Sheets, PDF export, annotations
4. **Production Standards** - Testing, monitoring, error handling
5. **Modern Technologies** - WebGPU, virtualization, memoization

**Timeline**: 9-12 months to v1.0.0

---

## Current State Analysis

### Strengths ✅

**Advanced Hydraulic Calculations:**
- Saint-Venant solver (transient flow)
- GVF analysis with hydraulic jump detection
- USBR stilling basin design (Types I-IV, SAF)
- Sediment transport
- Section optimization for minimum cost
- 7 cross-section types + composite sections

**Robust CAD Engine:**
- OpenCASCADE 7.9.2 (industrial-grade)
- Boolean operations (union, cut, common)
- Advanced operations: loft, pipe, fillet, chamfer, shell
- Complete topological analysis
- Hidden Line Removal with 2D projections

**Export Capabilities:**
- STEP, IGES (CAD standard)
- glTF/GLB, OBJ, STL, PLY (mesh)

### Critical Gaps ❌

**BIM Interoperability:**
- ❌ No IFC import/export (87% industry standard)
- ❌ No DWG/DXF import (AutoCAD compatibility)
- ❌ No parametric families
- ❌ No levels, grids, references
- ❌ No quantities/materials/costs

**Documentation System:**
- ❌ No technical sheets (drawings)
- ❌ No automatic annotations
- ❌ No PDF export
- ❌ No quantity schedules

**Code Quality:**
- ⚠️ 20+ critical `unwrap()` in production code
- ⚠️ 187 `console.log` in production
- ⚠️ No React.memo on list components
- ⚠️ No virtualization for large lists
- ⚠️ Excessive cloning and allocations

---

## Strategic Positioning

### NOT competing as general BIM (like Revit)

### YES positioning as:

> **"Specialized BIM Software for Hydraulic Engineering"**

**Focus areas:**
- Channels and control structures
- Urban drainage and sewage
- Water intake works
- Irrigation systems

**Complementing Revit/Civil 3D through:**
- DWG/DXF import (real workflows)
- IFC export (BIM integration)
- Hydraulic calculations Revit cannot do
- Bi-directional exchange plugins

**Competitive Advantages:**
1. Open Source + Open Format (IFC4.3 native)
2. Technical Specialization (advanced hydraulics)
3. Multi-platform (Windows + macOS + Linux)
4. Price (Free vs. $2,500+/year)

---

## Quarterly Roadmap

### Q1 2025 (v0.2.0) - "Quality Foundation"

**Duration**: 8 weeks
**Focus**: Code quality, critical bug fixes, performance

#### Sprint 1: Code Quality (2 weeks)

**Rust Improvements:**
- [ ] Replace 20 critical `unwrap()` with proper error handling
- [ ] Add `Vec::with_capacity()` in geometry generation loops
- [ ] Use `&'static str` for constant error messages
- [ ] Replace `partial_cmp().unwrap_or()` with `total_cmp()`
- [ ] Safe numeric conversions (no truncating `as usize`)
- [ ] Add benchmarks for mesh generation

**TypeScript Improvements:**
- [ ] Implement conditional logger (remove console.log in prod)
- [ ] Add React.memo to 5 key components
- [ ] Fix `any` types in Three.js refs
- [ ] Optimize filtered lists with useMemo
- [ ] Add useCallback to event handlers in lists
- [ ] Split large components (PropertiesPanel, Menubar)

**Quality Gates:**
- [ ] 0 `cargo clippy` warnings
- [ ] 0 `bun typecheck` errors
- [ ] 0 `unwrap()` in production code
- [ ] 0 `console.log` in production builds
- [ ] Test coverage > 70%

#### Sprint 2: Performance Optimization (2 weeks)

**React Performance:**
- [ ] Install `@tanstack/react-virtual`
- [ ] Virtualize ScenePanel object list
- [ ] Virtualize LayersPanel layer list
- [ ] Add React.memo to: LayerItem, SceneObjectItem, VectorInput
- [ ] Optimize Zustand selectors with useShallow
- [ ] Add batch actions in stores (toggleAllLayers, etc.)

**3D Viewport:**
- [ ] Profile render performance with React DevTools
- [ ] Optimize mesh updates (reuse geometries)
- [ ] Implement LOD for complex scenes
- [ ] Add performance budget: 60 FPS with 10k polygons

**Rust Performance:**
- [ ] Profile with `cargo flamegraph`
- [ ] Optimize corridor generation (54 Vec::new())
- [ ] Cache tessellation results
- [ ] Use rayon for parallel computation where applicable

#### Sprint 3: IFC Import Foundation (3 weeks)

**Backend:**
- [ ] Create `crates/cadhy-ifc/` crate
- [ ] Add `ifc_rs` dependency
- [ ] Implement IFC4.3 parser (basic geometry)
- [ ] Convert IFC → MeshData
- [ ] Extract properties and metadata
- [ ] Tauri command: `import_ifc(path: string)`

**Frontend:**
- [ ] Add "Import IFC" button in File menu
- [ ] Create import dialog with options
- [ ] Display object hierarchy preview
- [ ] Show import progress
- [ ] Handle errors gracefully

**Testing:**
- [ ] Test with buildingSMART sample files
- [ ] Import basic geometry (boxes, walls)
- [ ] Verify metadata extraction
- [ ] Integration tests

#### Sprint 4: DWG/DXF Import (1 week)

**Backend:**
- [ ] Add `dxf-rs` crate dependency
- [ ] Implement DXF parser (2D/3D)
- [ ] Map layers and blocks
- [ ] Convert to CADHY objects
- [ ] Tauri command: `import_dxf(path: string)`

**Frontend:**
- [ ] Add drag-and-drop support for DXF
- [ ] Import dialog with layer mapping
- [ ] Preview imported entities

**Deliverables v0.2.0:**
- ✅ 0 critical bugs in production code
- ✅ Performance: 60 FPS viewport with 10k polygons
- ✅ IFC4.3 import functional
- ✅ DWG/DXF 2D/3D import

---

### Q2 2025 (v0.3.0) - "Professional Documentation"

**Duration**: 10 weeks
**Focus**: Technical drawings, PDF export, annotations

#### Sprint 5: Drawing System Foundation (4 weeks)

**Backend:**
- [ ] Create `crates/cadhy-drawing/` crate
- [ ] Implement Sheet data structure
- [ ] Implement Viewport (view into 3D model)
- [ ] Implement Annotation system
  - [ ] Dimensions (linear, angular, radial)
  - [ ] Text labels
  - [ ] Leaders and callouts
  - [ ] Hatching patterns
- [ ] PDF export with `printpdf` or `pdf-writer`

**Frontend:**
- [ ] Create Sheet Manager panel
- [ ] Viewport editor (position, scale, rotation)
- [ ] Annotation toolbar
- [ ] Dimension style editor
- [ ] Sheet templates

#### Sprint 6: PDF Export & Printing (2 weeks)

**Backend:**
- [ ] High-quality PDF rendering
- [ ] Multi-sheet PDF export
- [ ] Vector output (lines, arcs, text)
- [ ] Raster images for complex geometry
- [ ] Page size support (A4, A3, Letter, etc.)

**Frontend:**
- [ ] Print preview dialog
- [ ] Page setup options
- [ ] Print to PDF action
- [ ] Batch export multiple sheets

#### Sprint 7: IFC Export (3 weeks)

**Backend:**
- [ ] Implement IFC4.3 exporter
- [ ] Dual geometry: BRep (exact) + Tessellation (compatible)
- [ ] Export hydraulic properties as IfcPropertySet
- [ ] Object classification (IfcClassification)
- [ ] Relationships and hierarchy
- [ ] Tauri command: `export_ifc(path: string, options: ExportOptions)`

**Frontend:**
- [ ] Export IFC dialog with options
  - [ ] IFC version (4.0, 4.3)
  - [ ] Geometry type (BRep, Tessellation, Both)
  - [ ] Level of detail
- [ ] Export progress indicator
- [ ] Validation report

**Testing:**
- [ ] Roundtrip tests (import → export → import)
- [ ] Open exported IFC in Revit/FreeCAD
- [ ] Verify property preservation
- [ ] Validate with IfcOpenShell

**Deliverables v0.3.0:**
- ✅ Sheet system with viewports
- ✅ Automatic annotations
- ✅ PDF export high-quality
- ✅ IFC4.3 export complete
- ✅ Roundtrip IFC validated

---

### Q3 2025 (v0.4.0) - "Advanced Integration"

**Duration**: 12 weeks
**Focus**: IfcOpenShell, HEC-RAS, WebGPU

#### Sprint 8: IfcOpenShell Integration (6 weeks)

**Backend:**
- [ ] FFI bindings to IfcOpenShell C++
- [ ] OCCT ↔ IFC bidirectional conversion
- [ ] NURBS support in IFC
- [ ] Advanced BRep export (IfcAdvancedBrep)
- [ ] Geometry validation

**Build System:**
- [ ] Bundle IfcOpenShell dylibs (macOS)
- [ ] Bundle IfcOpenShell DLLs (Windows)
- [ ] Update CI/CD for library bundling
- [ ] Update documentation

#### Sprint 9: HEC-RAS Integration (3 weeks)

**Backend:**
- [ ] Research HEC-RAS file format
- [ ] Export channel geometry to HEC-RAS
- [ ] Export hydraulic parameters
- [ ] Import HEC-RAS results (optional)

**Frontend:**
- [ ] Export to HEC-RAS dialog
- [ ] Parameter mapping UI
- [ ] Result visualization (if importing)

#### Sprint 10: WebGPU Migration (3 weeks)

**Investigation:**
- [ ] Evaluate Three.js WebGPU renderer
- [ ] Performance benchmarks vs WebGL
- [ ] Browser compatibility check

**Implementation:**
- [ ] Migrate to WebGPURenderer
- [ ] Update shaders if needed
- [ ] Fallback to WebGL if not supported
- [ ] Performance testing

**Deliverables v0.4.0:**
- ✅ IFC with complete NURBS support
- ✅ Export/Import HEC-RAS
- ✅ 30% better performance (WebGPU)
- ✅ Advanced BRep in IFC

---

### Q4 2025 (v1.0.0) - "Production Ready"

**Duration**: 12 weeks
**Focus**: Polish, documentation, security, release

#### Sprint 11: Bug Fixes & Polish (4 weeks)

**Quality:**
- [ ] Fix all P0/P1 bugs
- [ ] Address all P2 bugs
- [ ] UI/UX polish
- [ ] Accessibility improvements
- [ ] Keyboard shortcuts complete
- [ ] Localization (i18n) complete

**Performance:**
- [ ] Load project < 2 seconds
- [ ] CAD operations < 500ms (basic primitives)
- [ ] IFC import < 5 seconds (< 50MB files)
- [ ] Memory usage optimized
- [ ] No memory leaks

#### Sprint 12: Documentation & Testing (4 weeks)

**Documentation:**
- [ ] Complete user manual
- [ ] API documentation (Tauri commands)
- [ ] Developer guide
- [ ] Video tutorials
- [ ] Migration guides
- [ ] FAQ

**Testing:**
- [ ] Unit tests: 80%+ coverage
- [ ] Integration tests: all critical paths
- [ ] End-to-end tests: user workflows
- [ ] Performance tests: benchmarks
- [ ] Security audit
- [ ] Penetration testing

#### Sprint 13: Release Preparation (4 weeks)

**Marketing:**
- [ ] Website update
- [ ] Release notes
- [ ] Demo videos
- [ ] Case studies
- [ ] Press kit

**Distribution:**
- [ ] Installer packages (Windows, macOS, Linux)
- [ ] Code signing certificates
- [ ] Update server setup
- [ ] Analytics integration
- [ ] Crash reporting

**Launch:**
- [ ] Soft launch (beta testers)
- [ ] Public release
- [ ] Social media announcement
- [ ] Community engagement

**Deliverables v1.0.0:**
- ✅ 80%+ test coverage
- ✅ Complete documentation
- ✅ 0 P0/P1 bugs
- ✅ Security audit passed
- ✅ Public release

---

## Quality Standards

### Code Quality Metrics

**Rust:**
- 0 `cargo clippy` warnings (enforced in CI)
- 0 `unwrap()` in production code
- All public APIs documented with `///`
- Error handling with `Result<T, E>` and `?`
- Use `thiserror` for library errors
- Benchmarks for performance-critical functions

**TypeScript:**
- 0 TypeScript errors
- 0 Biome lint errors
- 0 `any` types (except justified with comment)
- 0 `console.log` in production
- React.memo for components in lists
- useMemo for expensive computations
- useCallback for functions passed as props

### Performance Budgets

**3D Viewport:**
- 60 FPS with 10,000 polygons
- 30 FPS with 100,000 polygons
- < 100ms for camera animations
- < 500ms for mesh updates

**UI Responsiveness:**
- < 100ms for user interactions
- < 16ms for render updates
- < 200ms for panel toggles
- Virtual scrolling for lists > 100 items

**File Operations:**
- Load project < 2 seconds
- Save project < 1 second
- Import IFC < 5 seconds (< 50MB)
- Export STEP < 3 seconds

### Testing Requirements

**Coverage:**
- Unit tests: 80%+ coverage
- Integration tests: all critical paths
- E2E tests: main user workflows

**Test Types:**
- Unit tests (Rust: `cargo test`, TS: Vitest)
- Integration tests (Tauri commands)
- Performance tests (benchmarks)
- Visual regression tests (screenshots)
- Accessibility tests (a11y)

### Security Standards

**Dependencies:**
- Regular `cargo audit` (Rust)
- Regular `npm audit` (Node.js)
- Update dependencies monthly
- Review security advisories

**Build:**
- Code signing (macOS, Windows)
- Reproducible builds
- SBOM (Software Bill of Materials)
- Supply chain verification

---

## Implementation Phases

### Phase 1: Code Quality (Weeks 1-2)

**Focus**: Fix critical bugs, remove unwrap(), optimize

**Files to modify:**
- `crates/cadhy-hydraulics/src/saint_venant.rs`
- `crates/cadhy-hydraulics/src/corridor.rs`
- `crates/cadhy-hydraulics/src/characteristic_curves.rs`
- `apps/desktop/src/components/modeller/viewport/SceneContent.tsx`
- `apps/desktop/src/components/scene/LayersPanel.tsx`
- `apps/desktop/src/components/scene/ScenePanel.tsx`

**Deliverables:**
- [ ] All critical unwrap() replaced
- [ ] Conditional logger implemented
- [ ] React.memo added to key components
- [ ] Types fixed (no `any`)

### Phase 2: Performance (Weeks 3-4)

**Focus**: Virtualization, memoization, optimization

**New dependencies:**
```json
{
  "@tanstack/react-virtual": "^3.10.0"
}
```

**Files to create:**
- `packages/shared/logger.ts`
- `apps/desktop/src/hooks/useVirtualizer.ts`

**Files to modify:**
- `apps/desktop/src/components/scene/ScenePanel.tsx` (virtualization)
- `apps/desktop/src/components/scene/LayersPanel.tsx` (virtualization)
- `apps/desktop/src/stores/modeller/objects-slice.ts` (batch actions)

**Deliverables:**
- [ ] Virtualized lists (Scene, Layers)
- [ ] All filters/sorts memoized
- [ ] Batch actions in stores
- [ ] Performance meets budgets

### Phase 3: Production Standards (Weeks 5-6)

**Focus**: Error boundaries, monitoring, logging

**Files to create:**
- `apps/desktop/src/components/ErrorBoundary.tsx`
- `apps/desktop/src/lib/monitoring.ts`
- `apps/desktop/src/lib/analytics.ts`

**Deliverables:**
- [ ] Error boundaries on all routes
- [ ] Crash reporting integrated
- [ ] Analytics for user actions
- [ ] Logging infrastructure

### Phase 4: IFC Foundation (Weeks 7-9)

**Focus**: IFC import basic functionality

**New crate:**
```
crates/cadhy-ifc/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── parser.rs
│   ├── geometry.rs
│   ├── exporter.rs
│   └── metadata.rs
└── tests/
    └── import_tests.rs
```

**Deliverables:**
- [ ] IFC4.3 parser working
- [ ] Basic geometry import
- [ ] Metadata extraction
- [ ] UI integration

---

## Dependencies to Add

### Rust Crates

```toml
# IFC support
ifc_rs = "0.1"

# DXF support
dxf = "0.6"

# PDF generation
printpdf = "0.7"
# or
pdf-writer = "0.10"

# Performance profiling
criterion = "0.5" # benchmarks
```

### TypeScript Packages

```json
{
  "@tanstack/react-virtual": "^3.10.0",
  "react-error-boundary": "^4.0.13",
  "@sentry/tauri": "^7.0.0",
  "mixpanel-browser": "^2.50.0"
}
```

---

## Success Metrics

### v0.2.0 Success Criteria

- [ ] 0 critical unwrap() in production
- [ ] 60 FPS viewport with 10k polygons
- [ ] IFC import works for basic files
- [ ] DXF import works for 2D/3D
- [ ] 70%+ test coverage

### v0.3.0 Success Criteria

- [ ] Sheet system functional
- [ ] PDF export high-quality
- [ ] IFC export validated in Revit
- [ ] Roundtrip IFC preserves data
- [ ] 75%+ test coverage

### v0.4.0 Success Criteria

- [ ] IFC with NURBS complete
- [ ] HEC-RAS export working
- [ ] 30% performance improvement
- [ ] 80%+ test coverage

### v1.0.0 Success Criteria

- [ ] All quality gates passed
- [ ] Complete documentation
- [ ] Security audit clean
- [ ] User manual published
- [ ] 100 beta testers validated

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| IfcOpenShell FFI complexity | High | Start with ifc_rs, FFI optional |
| WebGPU browser support | Medium | Keep WebGL fallback |
| Performance regression | High | Continuous benchmarking |
| OpenCASCADE memory leaks | Medium | Profiling, proper cleanup |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimated IFC complexity | High | Phase 1 POC, adjust timeline |
| Dependency issues | Medium | Regular updates, audits |
| Testing bottleneck | Medium | Parallel testing, CI/CD |

### Resource Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single developer | High | Good documentation, modular code |
| Community support | Low | Engage OSArch, buildingSMART |
| Library maintenance | Medium | Prefer actively maintained libs |

---

## Community & Ecosystem

### Engagement

- [ ] Join OSArch community
- [ ] Participate in buildingSMART forums
- [ ] Contribute to IfcOpenShell
- [ ] Blog about development progress
- [ ] YouTube tutorials

### Partnerships

- [ ] Integration with FreeCAD
- [ ] Integration with BlenderBIM
- [ ] University research projects
- [ ] Engineering firms beta testing

---

## References

### Standards
- IFC4.3 ADD2: https://ifc43-docs.standards.buildingsmart.org/
- STEP AP242: https://www.iso.org/standard/84123.html
- glTF 2.0: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

### Libraries
- ifc_rs: https://github.com/MetabuildDev/ifc_rs
- IfcOpenShell: https://ifcopenshell.org/
- Truck (Rust CAD): https://github.com/ricosjp/truck
- @tanstack/react-virtual: https://tanstack.com/virtual

### Communities
- OSArch: https://community.osarch.org/
- buildingSMART: https://forums.buildingsmart.org/
- Rust CAD: https://www.reddit.com/r/rust/

---

**Last Updated**: 2025-12-19
**Next Review**: 2025-01-15
