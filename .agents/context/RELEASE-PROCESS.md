# CADHY Release Process

This document defines the standard process for creating and publishing CADHY releases.

## Version Numbering

CADHY follows **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH[-PRERELEASE]`

### Version Format
- **MAJOR**: Breaking changes, incompatible API changes
- **MINOR**: New features, backwards-compatible additions
- **PATCH**: Bug fixes, backwards-compatible fixes
- **PRERELEASE**: Optional suffix for beta/alpha releases

### Examples
- `0.1.0` - Initial development version
- `0.1.0-beta.1` - First beta release
- `0.1.0-beta.2` - Second beta release
- `0.1.1` - First patch release
- `0.2.0` - Second minor version with new features
- `1.0.0` - First stable release

### Version Increment Rules
1. **MAJOR** (0.x.x → 1.x.x): Major architectural changes, breaking API changes
2. **MINOR** (x.0.x → x.1.x): New CAD operations, new UI features, new file format support
3. **PATCH** (x.x.0 → x.x.1): Bug fixes, performance improvements, minor UI tweaks
4. **PRERELEASE**: Use `-beta.N` suffix during development before stable release

## Release Checklist

### 1. Pre-Release Preparation

- [ ] Update version in `apps/desktop/package.json`
- [ ] Update version in `apps/desktop/src-tauri/tauri.*.conf.json` (all platform configs)
- [ ] Update version in `apps/desktop/src-tauri/Cargo.toml`
- [ ] Run full test suite: `bun test`
- [ ] Run TypeScript checks: `bun run tsc --noEmit`
- [ ] Test application on target platforms
- [ ] Update CHANGELOG.md with release notes

### 2. Build Production Binaries

Build for all supported platforms:

```bash
# macOS (Intel + Apple Silicon Universal)
bun run tauri:build:macos

# Windows
bun run tauri:build:windows

# Linux
bun run tauri:build:linux
```

**Output Locations:**
- **macOS**: `apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg`
- **Windows**: `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`
- **Linux**: `apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage`

### 3. Create Git Tag

```bash
# Create annotated tag
git tag -a v0.1.0-beta.1 -m "Release v0.1.0-beta.1: First Beta Release"

# Push tag to remote
git push origin v0.1.0-beta.1
```

### 4. Create GitHub Release

Go to GitHub → Releases → Create a new release

**Release Template:**

```markdown
# CADHY v0.1.0-beta.1

> First Beta Release - Hydraulic CAD System

## What's Changed

### New Features
- ✨ CAD operations toolbar with Boolean operations (Union, Subtract, Intersect)
- ✨ Modify operations: Fillet, Chamfer, Shell with parameter dialogs
- ✨ Export support: STEP, STL, OBJ, GLB formats
- ✨ Measurement tools: Distance and Properties analysis
- ✨ Primitive shape creation panel (Box, Cylinder, Sphere, Cone, Torus)
- ✨ 3D viewport with camera controls and grid
- ✨ Material editor with color and property controls
- ✨ Undo/Redo support for all CAD operations

### Bug Fixes
- 🐛 Fixed shapes not registered in backend when created from CreatePanel
- 🐛 Fixed shapeIdMap export and usage in CAD operations
- 🐛 Fixed Base UI MenuGroupRootContext errors in dropdowns
- 🐛 Disabled post-processing and SSAO by default for better performance

### Technical Improvements
- 🔧 Replaced menubar dropdowns with icon-based toolbar
- 🔧 Improved CAD operation error handling with toast notifications
- 🔧 Backend shape ID mapping system for reliable CAD operations

## Installation

### macOS
Download the `.dmg` file below and drag CADHY to your Applications folder.

**Requirements:** macOS 11.0 (Big Sur) or later

### Windows
Download the `.exe` installer below and run it.

**Requirements:** Windows 10 or later

### Linux
Download the `.AppImage` file below, make it executable, and run it.

**Requirements:** Ubuntu 20.04 or later (or equivalent)

```bash
chmod +x CADHY_0.1.0_amd64.AppImage
./CADHY_0.1.0_amd64.AppImage
```

## Known Issues

- Post-processing effects may cause performance issues on older GPUs
- Complex boolean operations may take several seconds on large models
- Helix primitive not yet connected to backend CAD engine

## Feedback

Please report issues on our [GitHub Issues](https://github.com/[username]/CADHY/issues) page.

---

**Full Changelog**: [v0.0.0...v0.1.0-beta.1](https://github.com/[username]/CADHY/compare/v0.0.0...v0.1.0-beta.1)
```

### 5. Upload Release Assets

Upload the following files to the GitHub release:

- [ ] `CADHY_[version]_aarch64.dmg` - macOS Universal Binary
- [ ] `CADHY_[version]_x64_en-US.exe` - Windows Installer
- [ ] `CADHY_[version]_amd64.AppImage` - Linux AppImage
- [ ] `CADHY_[version]_amd64.AppImage.sig` - Linux AppImage Signature (for auto-updater)

**Optional:**
- [ ] Source code (zip)
- [ ] Source code (tar.gz)
- [ ] SHA256 checksums file

### 6. Update Website

Update the website to reflect the new release:

**apps/web/app/page.tsx** - Hero section download button:
```tsx
<Link href="https://github.com/[username]/CADHY/releases/latest/download/CADHY_[version]_aarch64.dmg">
  Download for macOS
</Link>
```

**Create/Update apps/web/app/downloads/page.tsx** - Version history:
```tsx
<div className="versions">
  <h2>Latest Release</h2>
  <ReleaseCard version="0.1.0-beta.1" date="2024-12-17" isLatest={true} />

  <h2>Previous Releases</h2>
  <ReleaseCard version="0.0.9-alpha" date="2024-12-01" />
  <ReleaseCard version="0.0.8-alpha" date="2024-11-15" />
</div>
```

### 7. Post-Release

- [ ] Announce release on social media/Discord/community channels
- [ ] Update documentation if API changes were made
- [ ] Monitor GitHub Issues for bug reports
- [ ] Plan next release features

## Tauri Auto-Updater Configuration

The Tauri updater automatically checks for new releases on GitHub.

**Configuration in `tauri.*.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/[username]/CADHY/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_UPDATER_PUBLIC_KEY"
    }
  }
}
```

**Generate updater keys:**
```bash
tauri signer generate -w ~/.tauri/CADHY.key
```

This creates:
- Private key: `~/.tauri/CADHY.key` (keep secret!)
- Public key: printed to console (add to tauri config)

## Quick Release Command

For faster releases, you can use this script:

```bash
#!/bin/bash
# scripts/release.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh v0.1.0-beta.1"
  exit 1
fi

echo "Creating release $VERSION..."

# Update versions
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION#v}\"/" apps/desktop/package.json

# Commit and tag
git add .
git commit -m "chore: bump version to $VERSION"
git tag -a $VERSION -m "Release $VERSION"
git push origin main
git push origin $VERSION

echo "✅ Release $VERSION created!"
echo "Now build binaries and create GitHub release."
```

## Release Types

### Beta Releases (`-beta.N`)
- Used during active development
- May have known issues
- For testing and feedback
- Not recommended for production use

### Release Candidates (`-rc.N`)
- Feature-complete versions
- Final testing before stable
- No new features, only bug fixes
- Candidate for stable release

### Stable Releases (`x.y.z`)
- Production-ready
- Thoroughly tested
- Recommended for all users
- Long-term support

## Notes

- Always test on all platforms before releasing
- Keep CHANGELOG.md up to date
- Use GitHub Issues to track release blockers
- Tag releases as "Pre-release" if using `-beta` or `-rc` suffix
- Sign all binaries for security and auto-updater support
