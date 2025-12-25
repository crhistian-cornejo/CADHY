# CADHY Release History & Roadmap

> **Purpose**: Track releases, plan future versions, and provide context for AI assistants.

## Release Philosophy

CADHY follows a milestone-based release approach:

1. **Alpha** (0.x.x-alpha): Rapid iteration, breaking changes allowed
2. **Beta** (0.x.x-beta): Feature freeze, focus on stability
3. **Stable** (1.0.0+): Backward compatibility guaranteed within major versions

---

## Current Release

### v0.1.3 "Foundation" (2025-12-24)

**Status**: `CURRENT` | **Stage**: `Stable`

Latest stable release with preferences dialog and BIM enhancements.

#### Highlights

- **Preferences Dialog**: User settings and hotkey customization
- **BIM Enhancements**: Improved BIM info section
- **Hotkeys**: Enhanced keyboard shortcuts system
- **CAD Engine**: OpenCASCADE 7.9.2 with primitives and boolean operations
- **3D Viewer**: Three.js with camera controls and grid
- **Hydraulic Analysis**: Manning equation, GVF, hydraulic jump
- **AI Integration**: Multi-provider (Anthropic, OpenAI, Google) support
- **Project System**: Save/load with undo/redo support
- **Export Formats**: STEP, STL, OBJ, glTF

#### Stats

| Metric | Value |
|--------|-------|
| Rust Crates | 6 |
| TypeScript Packages | 5 |
| Test Coverage | Partial |

---

## Previous Releases

### v0.1.2 (2025-12-18)
- Fix macOS app crash
- Consolidate toolbars
- Fix shape export

### v0.1.1 (2025-12-18) - BROKEN
- macOS standalone distribution fix (OCCT dylib bundling)

### v0.1.0-beta.1 (2025-12-18)
- Initial beta release establishing all core systems

---

## Planned Releases

### v0.2.0 "Refinement" (Q1 2025)

**Status**: `PLANNED` | **Stage**: `Beta`

Focus: Performance, stability, and UX improvements.

#### Planned Features

- [ ] Improved mesh generation performance
- [ ] Better error messages with suggestions
- [ ] Undo/redo for all operations
- [ ] Project templates
- [ ] Recent files list

### v0.3.0 "Civil" (Q2 2025)

**Status**: `PLANNED` | **Stage**: `Beta`

Focus: Civil engineering and hydraulics features.

#### Planned Features

- [ ] Channel corridor generation
- [ ] Transition design (inlet/outlet)
- [ ] Energy dissipator design
- [ ] HEC-RAS compatibility
- [ ] Report generation (PDF)

### v0.4.0 "Collaboration" (Q3 2025)

**Status**: `PLANNED` | **Stage**: `Beta`

Focus: Multi-user and cloud features.

#### Planned Features

- [ ] Cloud project sync (optional)
- [ ] Project sharing
- [ ] Version history
- [ ] Comments and annotations

### v1.0.0 "Production" (Q4 2025)

**Status**: `PLANNED` | **Stage**: `Stable`

Focus: Production readiness and backward compatibility.

#### Requirements for 1.0

- [ ] Stable project file format
- [ ] Complete documentation
- [ ] 80%+ test coverage
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

## Long-Term Vision (Post 1.0)

### v1.x Features

- Plugin system for custom tools
- Scripting API (Python bindings)
- Mobile companion app
- Marketplace for templates

### v2.0 Features (Speculative)

- FEA integration (structural analysis)
- CFD integration (fluid dynamics)
- Generative design with AI
- AR/VR preview

---

## Release Process

### For Maintainers

1. **Update Versions**: Use `bun changeset` workflow
2. **Update CHANGELOG.md**: Add release notes
3. **Update VERSION.md**: Change version and date
4. **Create Tag**: `git tag v0.X.0`
5. **Push Tag**: `git push origin v0.X.0`
6. **GitHub Actions**: Automatically builds and creates release

### Version Locations to Update

```bash
# These files contain version numbers:
package.json                              # Root version
apps/desktop/package.json                 # Desktop app
apps/desktop/src-tauri/Cargo.toml         # Tauri app
apps/desktop/src-tauri/tauri.conf.json    # Tauri config
Cargo.toml                                # Rust workspace
.agents/context/VERSION.md                # AI context
```

---

## Migration Guides

### From Pre-0.1.0 (Development Builds)

No migration needed - 0.1.0 is the first public release.

### Future Migrations

Migration guides will be added here as breaking changes occur.

---

## For AI Assistants

When discussing releases:

1. **Current version is 0.1.3** (stable, pre-1.0)
2. **Breaking changes are allowed** until 1.0.0
3. **Check VERSION.md** for exact version details
4. **Reference this file** for roadmap context
5. **Don't promise features** from planned releases as done

---

**Last Updated**: 2025-12-24
