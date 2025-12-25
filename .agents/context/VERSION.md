# CADHY Version Information

> **Purpose**: Single source of truth for version info, accessible to AI assistants.

## Current Version

| Field | Value |
|-------|-------|
| **Version** | `0.1.3` |
| **Stage** | `stable` |
| **Release Date** | 2025-12-24 |
| **Codename** | Foundation |

## Version Scheme

CADHY follows [Semantic Versioning 2.0.0](https://semver.org/) with extensions for pre-release stages:

```
MAJOR.MINOR.PATCH[-STAGE.N]

Examples:
  0.1.0           - Initial release
  0.1.0-beta.1    - First beta of 0.1.0
  0.1.0-beta.2    - Second beta of 0.1.0
  0.1.0-rc.1      - Release candidate
  0.1.0           - Stable release
  1.0.0           - First major stable release
```

### Version Stages

| Stage | Suffix | Meaning |
|-------|--------|---------|
| **Alpha** | `-alpha.N` | Active development, expect breaking changes |
| **Beta** | `-beta.N` | Feature complete, testing phase |
| **RC** | `-rc.N` | Release candidate, bug fixes only |
| **Stable** | (none) | Production ready |

### Version Bumping Rules

- **MAJOR** (X.0.0): Breaking changes to:
  - Project file format (.cadhy)
  - Rust command API
  - Tauri IPC interface
  - Core data structures

- **MINOR** (0.X.0): New features that are backward-compatible:
  - New CAD operations
  - New hydraulic analysis types
  - New export formats
  - UI enhancements

- **PATCH** (0.0.X): Bug fixes and minor improvements:
  - Bug fixes
  - Performance improvements
  - Documentation updates
  - Dependency updates (non-breaking)

## Component Versions

All components share the same version number:

| Component | Location | Version Source |
|-----------|----------|----------------|
| Root package | `package.json` | `0.1.0` |
| Desktop app | `apps/desktop/package.json` | `0.1.0` |
| Tauri app | `apps/desktop/src-tauri/Cargo.toml` | `0.1.0` |
| Rust workspace | `Cargo.toml` | `0.1.0` |
| All packages | `packages/*/package.json` | `0.1.0` |

## Minimum Supported Versions

| Dependency | Minimum Version | Notes |
|------------|-----------------|-------|
| Node.js | 20.x | LTS recommended |
| Bun | 1.3.0 | Package manager |
| Rust | 1.82+ | 2024 edition |
| OpenCASCADE | 7.9.2 | Via brew/vcpkg |
| Windows | 10+ | x64 only |
| macOS | 12+ | Apple Silicon + Intel |
| Linux | Ubuntu 22.04+ | glibc 2.35+ (experimental) |

## Changelog Location

- **Full Changelog**: `/CHANGELOG.md`
- **Release Notes**: GitHub Releases
- **Migration Guides**: Added to releases when breaking changes occur

## For AI Assistants

When generating code or documentation:

1. **Always use current version** (`0.1.3`) in examples
2. **Check this file** at session start for version updates
3. **Note the stage** (stable) - but still pre-1.0, breaking changes possible
4. **Reference CHANGELOG.md** for recent changes

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.3 | 2025-12-24 | Preferences dialog, BIM enhancements, hotkeys improvements |
| 0.1.2 | 2025-12-18 | Fix macOS app crash, consolidate toolbars, fix shape export |
| 0.1.1 | 2025-12-18 | macOS standalone distribution fix (OCCT dylib bundling) - BROKEN |
| 0.1.0-beta.1 | 2025-12-18 | Initial beta release |

---

**Last Updated**: 2025-12-24
