#!/bin/bash
# Script to fix OCCT dylib paths in macOS app bundle
# Must be run AFTER tauri build
# Will re-sign the app after modifications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENTITLEMENTS="$PROJECT_ROOT/apps/desktop/src-tauri/entitlements.plist"

# Find the app bundle
if [ -n "$1" ]; then
    APP_BUNDLE="$1"
else
    # Default location for arm64 build
    APP_BUNDLE="$PROJECT_ROOT/target/aarch64-apple-darwin/release/bundle/macos/CADHY.app"
fi

if [ ! -d "$APP_BUNDLE" ]; then
    echo "ERROR: App bundle not found at: $APP_BUNDLE"
    echo "Usage: $0 [path/to/CADHY.app]"
    exit 1
fi

BINARY="$APP_BUNDLE/Contents/MacOS/CADHY"
FRAMEWORKS_DIR="$APP_BUNDLE/Contents/Frameworks"

if [ ! -f "$BINARY" ]; then
    echo "ERROR: Binary not found at: $BINARY"
    exit 1
fi

if [ ! -d "$FRAMEWORKS_DIR" ]; then
    echo "ERROR: Frameworks directory not found at: $FRAMEWORKS_DIR"
    exit 1
fi

echo "Fixing dylib paths in: $APP_BUNDLE"
echo ""

# Function to fix all OCCT-related paths in a binary/dylib
fix_all_paths() {
    local target="$1"
    
    # Get all dependencies
    local deps=$(otool -L "$target" 2>/dev/null | tail -n +2 | awk '{print $1}')
    
    for dep in $deps; do
        # Check if it's a homebrew OCCT lib
        if [[ "$dep" == */opt/homebrew/* ]] || [[ "$dep" == */usr/local/* ]]; then
            local lib_name=$(basename "$dep")
            # Remove version suffix: libTKernel.7.9.dylib -> libTKernel.dylib
            local base_name=$(echo "$lib_name" | sed -E 's/\.[0-9]+\.[0-9]+\.dylib/.dylib/')
            local new_path="@executable_path/../Frameworks/$base_name"
            
            install_name_tool -change "$dep" "$new_path" "$target" 2>/dev/null || true
        fi
        
        # Check if it's an @rpath reference to a versioned lib
        if [[ "$dep" == @rpath/*.dylib ]]; then
            local lib_name=$(basename "$dep")
            # Remove version suffix
            local base_name=$(echo "$lib_name" | sed -E 's/\.[0-9]+\.[0-9]+\.dylib/.dylib/')
            if [ "$lib_name" != "$base_name" ]; then
                local new_path="@executable_path/../Frameworks/$base_name"
                install_name_tool -change "$dep" "$new_path" "$target" 2>/dev/null || true
            fi
        fi
    done
}

# Fix the main binary
echo "Fixing main binary..."
fix_all_paths "$BINARY"

# Fix each dylib in Frameworks
echo "Fixing framework dylibs..."
for dylib in "$FRAMEWORKS_DIR"/*.dylib; do
    if [ -f "$dylib" ]; then
        dylib_name=$(basename "$dylib")
        
        # Set the install name to a simple name (no version)
        install_name_tool -id "@rpath/${dylib_name}" "$dylib" 2>/dev/null || true
        
        # Fix references to other libs
        fix_all_paths "$dylib"
        
        echo "  Fixed: $dylib_name"
    fi
done

echo ""
echo "Verifying fix..."
REMAINING_BINARY=$(otool -L "$BINARY" 2>/dev/null | grep -c "homebrew\|/usr/local" || true)
REMAINING_FRAMEWORKS=0
for dylib in "$FRAMEWORKS_DIR"/*.dylib; do
    count=$(otool -L "$dylib" 2>/dev/null | grep -c "homebrew\|/usr/local" || true)
    REMAINING_FRAMEWORKS=$((REMAINING_FRAMEWORKS + count))
done

echo "Binary homebrew refs: $REMAINING_BINARY"
echo "Framework homebrew refs: $REMAINING_FRAMEWORKS"

if [ "$REMAINING_BINARY" = "0" ] && [ "$REMAINING_FRAMEWORKS" = "0" ]; then
    echo "✅ All paths fixed!"
else
    echo "⚠️  Some homebrew paths remain - may need additional dependencies"
fi

# Re-sign the app bundle
echo ""
echo "Re-signing app bundle..."

# Check for signing identity - prefer env var, then look for Developer ID, fallback to ad-hoc
if [ -n "$APPLE_SIGNING_IDENTITY" ]; then
    SIGN_IDENTITY="$APPLE_SIGNING_IDENTITY"
    echo "Using APPLE_SIGNING_IDENTITY from environment"
elif [ -z "$CI" ] && security find-identity -v -p codesigning 2>/dev/null | grep -q "Developer ID"; then
    # Only try to find Developer ID on local machine, not in CI
    SIGN_IDENTITY=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID" | head -1 | awk -F'"' '{print $2}')
    echo "Found Developer ID certificate"
else
    SIGN_IDENTITY="-"  # Ad-hoc signing
    echo "Using ad-hoc signing"
fi

echo "Signing identity: $SIGN_IDENTITY"

# Sign frameworks first, then the main app
# Check if entitlements file exists for hardened runtime
ENTITLEMENTS_ARG=""
if [ -f "$ENTITLEMENTS" ]; then
    echo "Using entitlements from: $ENTITLEMENTS"
    ENTITLEMENTS_ARG="--entitlements $ENTITLEMENTS"
fi

for dylib in "$FRAMEWORKS_DIR"/*.dylib; do
    codesign --force --sign "$SIGN_IDENTITY" --options runtime $ENTITLEMENTS_ARG "$dylib" 2>/dev/null || true
done

codesign --force --deep --sign "$SIGN_IDENTITY" --options runtime $ENTITLEMENTS_ARG "$APP_BUNDLE" 2>&1 || {
    echo "Signing with identity failed, falling back to ad-hoc"
    codesign --force --deep --sign - "$APP_BUNDLE" 2>&1
}

echo ""
echo "✅ Done! App bundle fixed and re-signed."
