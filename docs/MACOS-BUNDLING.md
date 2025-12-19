# macOS Native Library Bundling

> Complete guide for bundling OpenCASCADE (OCCT) dylibs in Tauri macOS apps

## Overview

CADHY depends on OpenCASCADE for CAD operations. These are native C++ libraries accessed via Rust FFI. For standalone macOS distribution, all 37 dylibs must be bundled with the app.

## The Problem

When Rust compiles against Homebrew libraries, it embeds **absolute paths**:

```bash
# Check what paths are embedded
otool -L target/release/CADHY

# Output shows absolute Homebrew paths:
/opt/homebrew/opt/opencascade/lib/libTKernel.7.9.dylib
/opt/homebrew/opt/opencascade/lib/libTKMath.7.9.dylib
...
```

This works on dev machines but crashes on user machines without Homebrew:

```
dyld: Library not loaded: /opt/homebrew/opt/opencascade/lib/libTKernel.7.9.dylib
Reason: image not found
```

## The Solution

1. Copy dylibs to `Frameworks/` directory inside the app bundle
2. Rewrite paths from absolute to relative (`@executable_path/../Frameworks/`)
3. Re-sign all modified binaries (required on macOS)

## Files Structure

```
apps/desktop/src-tauri/
├── frameworks/                    # Created by copy script (gitignored)
│   ├── libTKernel.7.9.dylib
│   ├── libTKMath.7.9.dylib
│   └── ... (37 total)
├── tauri.conf.json               # Base config
└── tauri.macos.conf.json         # macOS-specific with frameworks list

scripts/occt/
├── copy-dylibs-macos.sh          # Copies from Homebrew to frameworks/
└── fix-dylib-paths-macos.sh      # Rewrites paths and re-signs
```

## Step-by-Step Process

### 1. Install Dependencies

```bash
brew install opencascade freetype libpng tbb
```

### 2. Copy Dylibs

```bash
./scripts/occt/copy-dylibs-macos.sh
```

This copies from:
- `/opt/homebrew/opt/opencascade/lib/` (33 OCCT libs)
- `/opt/homebrew/opt/freetype/lib/` (1 lib)
- `/opt/homebrew/opt/libpng/lib/` (1 lib)
- `/opt/homebrew/opt/tbb/lib/` (2 libs)

### 3. Build the App

```bash
cd apps/desktop
bun run tauri:build --config src-tauri/tauri.macos.conf.json
```

The `tauri.macos.conf.json` lists all frameworks:

```json
{
  "bundle": {
    "macOS": {
      "frameworks": [
        "src-tauri/frameworks/libTKernel.7.9.dylib",
        "src-tauri/frameworks/libTKMath.7.9.dylib",
        // ... 35 more
      ]
    }
  }
}
```

### 4. Fix Paths and Re-sign

```bash
./scripts/occt/fix-dylib-paths-macos.sh
```

This script:
1. Finds the built `.app` bundle
2. Locates all dylibs in `Frameworks/`
3. Rewrites paths using `install_name_tool -change`
4. Re-signs each dylib and the main binary

## Technical Details

### Path Rewriting

```bash
# For each dylib reference:
install_name_tool -change \
  "/opt/homebrew/opt/opencascade/lib/libTKernel.7.9.dylib" \
  "@executable_path/../Frameworks/libTKernel.7.9.dylib" \
  "$BINARY"
```

### macOS Path Variables

| Variable | Resolves To |
|----------|-------------|
| `@executable_path` | Directory containing the main executable |
| `@loader_path` | Directory containing the binary doing the loading |
| `@rpath` | Runtime search paths (set via linker flags) |

We use `@executable_path/../Frameworks/` which resolves to:
```
CADHY.app/Contents/MacOS/../Frameworks/
= CADHY.app/Contents/Frameworks/
```

### Code Signing

Modifying Mach-O binaries invalidates their code signature. Must re-sign:

```bash
# Ad-hoc signing (no Apple Developer ID)
codesign --force --sign - "$DYLIB"

# With Developer ID (for notarization)
codesign --force --sign "Developer ID Application: Your Name" "$DYLIB"
```

### Rpath in build.rs

`crates/cadhy-cad/build.rs` adds runtime search path:

```rust
if cfg!(target_os = "macos") {
    println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
}
```

## Complete Dylib List

### OCCT Libraries (33)

| Library | Purpose |
|---------|---------|
| libTKernel | OCCT kernel |
| libTKMath | Math utilities |
| libTKG2d | 2D geometry |
| libTKG3d | 3D geometry |
| libTKGeomBase | Geometry base |
| libTKBRep | Boundary representation |
| libTKGeomAlgo | Geometry algorithms |
| libTKTopAlgo | Topology algorithms |
| libTKPrim | Primitive shapes |
| libTKBO | Boolean operations |
| libTKFillet | Fillet/chamfer |
| libTKOffset | Offset operations |
| libTKFeat | Feature modeling |
| libTKMesh | Meshing |
| libTKShHealing | Shape healing |
| libTKHLR | Hidden line removal |
| libTKService | Services |
| libTKV3d | 3D visualization |
| libTKOpenGl | OpenGL |
| libTKXSBase | Data exchange base |
| libTKSTEP | STEP format |
| libTKSTEP209 | STEP AP209 |
| libTKSTEPAttr | STEP attributes |
| libTKSTEPBase | STEP base |
| libTKIGES | IGES format |
| libTKXCAF | Extended CAF |
| libTKXDESTEP | XDE STEP |
| libTKXDEIGES | XDE IGES |
| libTKCAF | CAF framework |
| libTKLCAF | CAF lite |
| libTKCDF | CDF format |
| libTKBinL | Binary lite format |
| libTKBin | Binary format |

### Dependencies (4)

| Library | Purpose |
|---------|---------|
| libfreetype.6 | Font rendering |
| libpng16.16 | PNG support |
| libtbb.12 | Intel TBB parallelism |
| libtbbmalloc.2 | TBB memory allocator |

## CI/CD Integration

In `.github/workflows/release-app.yml`:

```yaml
- name: Install OpenCASCADE via Homebrew
  run: brew install opencascade freetype libpng tbb

- name: Copy OCCT dylibs for bundling
  run: |
    chmod +x scripts/occt/*.sh
    ./scripts/occt/copy-dylibs-macos.sh

- name: Build App
  run: |
    cd apps/desktop
    bun run tauri:build --config src-tauri/tauri.macos.conf.json

- name: Fix dylib paths and re-sign
  run: ./scripts/occt/fix-dylib-paths-macos.sh
```

## Debugging

### Verify Paths After Fix

```bash
otool -L "CADHY.app/Contents/MacOS/CADHY" | grep -E "(TK|freetype|png|tbb)"
```

Should show:
```
@executable_path/../Frameworks/libTKernel.7.9.dylib
@executable_path/../Frameworks/libfreetype.6.dylib
...
```

### Verify Code Signature

```bash
codesign --verify --deep --strict "CADHY.app"
```

### Check Missing Libraries

```bash
# Run app and check for dyld errors
./CADHY.app/Contents/MacOS/CADHY 2>&1 | grep -i "library not loaded"
```

## Troubleshooting

### "Library not loaded" Error

1. Check if dylib exists in Frameworks:
   ```bash
   ls "CADHY.app/Contents/Frameworks/"
   ```

2. Check if path was rewritten:
   ```bash
   otool -L "CADHY.app/Contents/MacOS/CADHY"
   ```

3. Check dylib's own dependencies:
   ```bash
   otool -L "CADHY.app/Contents/Frameworks/libTKernel.7.9.dylib"
   ```

### "Code signature invalid" Error

Re-sign all binaries:
```bash
codesign --force --deep --sign - "CADHY.app"
```

### Missing Transitive Dependencies

Some OCCT libs depend on others. If one is missing, the load fails. Use:
```bash
# Find all dependencies recursively
for f in CADHY.app/Contents/Frameworks/*.dylib; do
  echo "=== $f ==="
  otool -L "$f" | grep -v "@executable_path"
done
```

## Related Documentation

- [ARCHITECTURE.md](../.agents/context/ARCHITECTURE.md) - Section 11: Native Library Bundling
- [MEMORIES.md](../.agents/memories/MEMORIES.md) - macOS Standalone Distribution bug details
- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
