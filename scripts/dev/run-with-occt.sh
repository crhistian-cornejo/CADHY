#!/bin/bash

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# =============================================================================
# OCCT Environment Setup (macOS/Linux)
# =============================================================================

setup_occt_macos() {
    # Try Homebrew first (most common on macOS)
    if command -v brew &> /dev/null; then
        HOMEBREW_PREFIX=$(brew --prefix 2>/dev/null || echo "/opt/homebrew")
        OCCT_HOMEBREW="$HOMEBREW_PREFIX/opt/opencascade"
        
        if [ -d "$OCCT_HOMEBREW" ]; then
            echo "[macOS] Using Homebrew OpenCASCADE at $OCCT_HOMEBREW"
            export OCCT_ROOT="$OCCT_HOMEBREW"
            export CASROOT="$OCCT_HOMEBREW"
            export CSF_OCCTBinPath="$OCCT_HOMEBREW/bin"
            export CSF_OCCTLibPath="$OCCT_HOMEBREW/lib"
            export CSF_OCCTIncludePath="$OCCT_HOMEBREW/include/opencascade"
            export CSF_OCCTResourcePath="$OCCT_HOMEBREW/share/opencascade/resources"
            
            # Add to DYLD_LIBRARY_PATH for runtime linking
            export DYLD_LIBRARY_PATH="$OCCT_HOMEBREW/lib:${DYLD_LIBRARY_PATH:-}"
            
            return 0
        fi
    fi
    
    # Fallback: Check for system-installed OCCT
    if [ -d "/usr/local/opt/opencascade" ]; then
        echo "[macOS] Using system OpenCASCADE at /usr/local/opt/opencascade"
        export OCCT_ROOT="/usr/local/opt/opencascade"
        export CASROOT="/usr/local/opt/opencascade"
        return 0
    fi
    
    echo "[macOS] Warning: OpenCASCADE not found. Install with: brew install opencascade"
    return 1
}

setup_occt_linux() {
    # Check common Linux installation paths
    LINUX_PATHS=(
        "/usr/lib/x86_64-linux-gnu"
        "/usr/local/lib"
        "/usr/lib"
        "/opt/opencascade"
    )
    
    for path in "${LINUX_PATHS[@]}"; do
        if [ -f "$path/libTKernel.so" ] || [ -d "$path/opencascade" ]; then
            echo "[Linux] Using OpenCASCADE at $path"
            export OCCT_ROOT="$path"
            export LD_LIBRARY_PATH="$path:${LD_LIBRARY_PATH:-}"
            return 0
        fi
    done
    
    echo "[Linux] Warning: OpenCASCADE not found. Install with your package manager."
    return 1
}

# Detect platform and setup OCCT
case "$(uname)" in
    Darwin)
        setup_occt_macos
        ;;
    Linux)
        setup_occt_linux
        ;;
    *)
        echo "Unknown platform: $(uname)"
        ;;
esac

# =============================================================================
# Environment Variables from .env.local
# =============================================================================

# Path to .env.local (check config/ first, then root for backwards compatibility)
if [ -f "$PROJECT_ROOT/config/.env.local" ]; then
    ENV_LOCAL="$PROJECT_ROOT/config/.env.local"
else
    ENV_LOCAL="$PROJECT_ROOT/.env.local"
fi

# Load environment variables from .env.local if it exists
if [ -f "$ENV_LOCAL" ]; then
    echo "Loading environment from $ENV_LOCAL..."
    # Read file line by line to handle spaces and quotes properly
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ $key =~ ^#.* ]] || [[ -z $key ]]; then
            continue
        fi
        
        # Remove quotes from value if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        export "$key=$value"
        
        if [ "$key" == "AI_GATEWAY_API_KEY" ]; then
            echo "  [OK] AI_GATEWAY_API_KEY loaded (${#value} chars)"
        fi
    done < "$ENV_LOCAL"
fi

# =============================================================================
# Command Execution
# =============================================================================

if [ $# -eq 0 ]; then
    echo "Usage: ./scripts/dev/run-with-occt.sh <command>"
    echo "Example: ./scripts/dev/run-with-occt.sh bun run dev"
    exit 0
fi

COMMAND="$*"

# Platform-specific Tauri config selection
case "$(uname)" in
    Darwin)
        echo "[macOS] Using native traffic lights configuration"
        export TAURI_PLATFORM="macos"
        # Replace tauri:dev with tauri:dev:macos and tauri:build with tauri:build:macos
        COMMAND="${COMMAND//tauri:dev:platform/tauri:dev:macos}"
        COMMAND="${COMMAND//tauri:dev/tauri:dev:macos}"
        COMMAND="${COMMAND//tauri:build/tauri:build:macos}"
        # Also handle direct tauri commands (not via npm scripts)
        COMMAND="${COMMAND//tauri dev/tauri dev --config src-tauri/tauri.macos.conf.json}"
        COMMAND="${COMMAND//tauri build/tauri build --config src-tauri/tauri.macos.conf.json}"
        # Fix double replacement issue (tauri:dev:macos:macos -> tauri:dev:macos)
        COMMAND="${COMMAND//:macos:macos/:macos}"
        ;;
    Linux)
        echo "[Linux] Using custom window controls configuration"
        export TAURI_PLATFORM="linux"
        # Replace tauri:dev with tauri:dev:linux and tauri:build with tauri:build:linux
        COMMAND="${COMMAND//tauri:dev:platform/tauri:dev:linux}"
        COMMAND="${COMMAND//tauri:dev/tauri:dev:linux}"
        COMMAND="${COMMAND//tauri:build/tauri:build:linux}"
        # Also handle direct tauri commands (not via npm scripts)
        COMMAND="${COMMAND//tauri dev/tauri dev --config src-tauri/tauri.linux.conf.json}"
        COMMAND="${COMMAND//tauri build/tauri build --config src-tauri/tauri.linux.conf.json}"
        # Fix double replacement issue
        COMMAND="${COMMAND//:linux:linux/:linux}"
        ;;
esac

echo ""
echo "Running: $COMMAND"
echo "Working directory: $(pwd)"
echo ""

# Execute the command
eval "$COMMAND"
