#!/bin/bash
# Script to copy OpenCASCADE dylibs for macOS bundling
# These will be embedded in the .app bundle by Tauri

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TAURI_DIR="$PROJECT_ROOT/apps/desktop/src-tauri"
FRAMEWORKS_DIR="$TAURI_DIR/frameworks"

# Find OCCT installation
if [ -n "$OCCT_ROOT" ] && [ -d "$OCCT_ROOT/lib" ]; then
    OCCT_LIB="$OCCT_ROOT/lib"
elif command -v brew &> /dev/null; then
    OCCT_PREFIX=$(brew --prefix opencascade 2>/dev/null || echo "")
    if [ -n "$OCCT_PREFIX" ] && [ -d "$OCCT_PREFIX/lib" ]; then
        OCCT_LIB="$OCCT_PREFIX/lib"
    fi
fi

if [ -z "$OCCT_LIB" ] || [ ! -d "$OCCT_LIB" ]; then
    echo "ERROR: OpenCASCADE library directory not found"
    echo "Install with: brew install opencascade"
    echo "Or set OCCT_ROOT environment variable"
    exit 1
fi

echo "Found OCCT libraries at: $OCCT_LIB"

# Create frameworks directory
mkdir -p "$FRAMEWORKS_DIR"

# List of required OCCT libraries (from build.rs)
LIBS=(
    "TKernel"
    "TKMath"
    "TKG2d"
    "TKG3d"
    "TKGeomBase"
    "TKBRep"
    "TKGeomAlgo"
    "TKTopAlgo"
    "TKPrim"
    "TKBO"
    "TKBool"
    "TKFillet"
    "TKShHealing"
    "TKMesh"
    "TKOffset"
    "TKHLR"
    "TKDE"
    "TKXSBase"
    "TKDESTEP"
    "TKDEIGES"
    "TKDEGLTF"
    "TKDEOBJ"
    "TKDESTL"
    "TKDEPLY"
    "TKDEVRML"
    "TKRWMesh"
    "TKCDF"
    "TKLCAF"
    "TKXCAF"
)

echo "Copying OCCT libraries to $FRAMEWORKS_DIR..."

# Function to resolve symlinks and copy the actual library
copy_lib() {
    local lib_name=$1
    local src_pattern="$OCCT_LIB/lib${lib_name}.*.dylib"
    local dest="$FRAMEWORKS_DIR/lib${lib_name}.dylib"
    
    # Find the versioned dylib (e.g., libTKernel.7.9.3.dylib)
    local src_file=$(ls $src_pattern 2>/dev/null | grep -v "\.7\.9\.dylib$" | head -1)
    
    if [ -z "$src_file" ]; then
        # Try to find any dylib with this name
        src_file=$(ls "$OCCT_LIB/lib${lib_name}.dylib" 2>/dev/null || echo "")
    fi
    
    if [ -n "$src_file" ] && [ -f "$src_file" ]; then
        # Resolve symlinks to get the actual file
        local real_file=$(realpath "$src_file")
        cp "$real_file" "$dest"
        echo "  Copied: lib${lib_name}.dylib"
    else
        echo "  WARNING: lib${lib_name}.dylib not found"
    fi
}

for lib in "${LIBS[@]}"; do
    copy_lib "$lib"
done

# Also copy any additional dependencies these libs might have
echo ""
echo "Checking for additional OCCT dependencies..."

# Get all OCCT libs that our libs depend on
for dylib in "$FRAMEWORKS_DIR"/*.dylib; do
    if [ -f "$dylib" ]; then
        deps=$(otool -L "$dylib" 2>/dev/null | grep "libTK" | grep -v "$(basename "$dylib")" | awk '{print $1}' | xargs -I {} basename {} .dylib | sed 's/\.7\.9$//' || true)
        for dep in $deps; do
            dep_name=$(echo "$dep" | sed 's/^lib//')
            if [ ! -f "$FRAMEWORKS_DIR/lib${dep_name}.dylib" ]; then
                echo "  Adding dependency: lib${dep_name}.dylib"
                copy_lib "$dep_name"
            fi
        done
    fi
done

echo ""
echo "Done! Copied $(ls -1 "$FRAMEWORKS_DIR"/*.dylib 2>/dev/null | wc -l | tr -d ' ') libraries to $FRAMEWORKS_DIR"

# Copy additional dependencies (freetype, tbb)
echo ""
echo "Copying additional dependencies (freetype, tbb)..."

# Find freetype
FREETYPE_PREFIX=$(brew --prefix freetype 2>/dev/null || echo "")
if [ -n "$FREETYPE_PREFIX" ] && [ -f "$FREETYPE_PREFIX/lib/libfreetype.6.dylib" ]; then
    cp "$(realpath "$FREETYPE_PREFIX/lib/libfreetype.6.dylib")" "$FRAMEWORKS_DIR/libfreetype.6.dylib"
    echo "  Copied: libfreetype.6.dylib"
fi

# Find libpng (dependency of freetype)
LIBPNG_PREFIX=$(brew --prefix libpng 2>/dev/null || echo "")
if [ -n "$LIBPNG_PREFIX" ] && [ -f "$LIBPNG_PREFIX/lib/libpng16.16.dylib" ]; then
    cp "$(realpath "$LIBPNG_PREFIX/lib/libpng16.16.dylib")" "$FRAMEWORKS_DIR/libpng16.16.dylib"
    echo "  Copied: libpng16.16.dylib"
fi

# Find tbb
TBB_PREFIX=$(brew --prefix tbb 2>/dev/null || echo "")
if [ -n "$TBB_PREFIX" ]; then
    if [ -f "$TBB_PREFIX/lib/libtbb.12.dylib" ]; then
        cp "$(realpath "$TBB_PREFIX/lib/libtbb.12.dylib")" "$FRAMEWORKS_DIR/libtbb.12.dylib"
        echo "  Copied: libtbb.12.dylib"
    fi
    if [ -f "$TBB_PREFIX/lib/libtbbmalloc.2.dylib" ]; then
        cp "$(realpath "$TBB_PREFIX/lib/libtbbmalloc.2.dylib")" "$FRAMEWORKS_DIR/libtbbmalloc.2.dylib"
        echo "  Copied: libtbbmalloc.2.dylib"
    fi
fi

echo ""
echo "Total libraries: $(ls -1 "$FRAMEWORKS_DIR"/*.dylib 2>/dev/null | wc -l | tr -d ' ')"
echo ""
echo "NOTE: Tauri will automatically:"
echo "  1. Copy these to Contents/Frameworks/ in the app bundle"
echo "  2. Update library paths using install_name_tool"
echo "  3. Sign the libraries with your certificate"
