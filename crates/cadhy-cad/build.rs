//! Build script for cadhy-cad
//!
//! Links against OpenCASCADE binaries.
//! - Windows: Uses precompiled 7.9.2 binaries from deps/occt-7.9.2/
//! - macOS: Uses Homebrew installation (brew install opencascade)
//! - Linux: Uses system installation or OCCT_ROOT environment variable

use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=cpp/bridge.cpp");
    println!("cargo:rerun-if-changed=src/ffi.rs");

    // CADHY modular C++ headers
    println!("cargo:rerun-if-changed=cpp/include/cadhy/cadhy.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/core/types.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/edit/selection.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/edit/face_ops.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/primitives/primitives.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/boolean/boolean.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/modify/modify.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/transform/transform.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/sweep/sweep.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/wire/wire.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/mesh/mesh.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/io/io.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/analysis/analysis.hpp");
    println!("cargo:rerun-if-changed=cpp/include/cadhy/projection/projection.hpp");

    // CADHY modular C++ implementations
    println!("cargo:rerun-if-changed=cpp/src/edit/selection.cpp");
    println!("cargo:rerun-if-changed=cpp/src/edit/face_ops.cpp");
    println!("cargo:rerun-if-changed=cpp/src/primitives/primitives.cpp");
    println!("cargo:rerun-if-changed=cpp/src/boolean/boolean.cpp");
    println!("cargo:rerun-if-changed=cpp/src/modify/modify.cpp");
    println!("cargo:rerun-if-changed=cpp/src/transform/transform.cpp");
    println!("cargo:rerun-if-changed=cpp/src/sweep/sweep.cpp");
    println!("cargo:rerun-if-changed=cpp/src/wire/wire.cpp");
    println!("cargo:rerun-if-changed=cpp/src/mesh/mesh.cpp");
    println!("cargo:rerun-if-changed=cpp/src/io/io.cpp");
    println!("cargo:rerun-if-changed=cpp/src/analysis/analysis.cpp");
    println!("cargo:rerun-if-changed=cpp/src/projection/projection.cpp");

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();

    // Find OCCT installation based on platform
    let (occt_inc, occt_lib) = match target_os.as_str() {
        "macos" => find_occt_macos(),
        "linux" => find_occt_linux(),
        _ => find_occt_windows(), // Default to Windows
    };

    // Verify paths exist
    if !occt_inc.exists() {
        panic!(
            "OCCT include directory not found: {:?}\n\
             For macOS: brew install opencascade\n\
             For Windows: Run scripts/setup_occt.ps1\n\
             For Linux: Install opencascade-dev or set OCCT_ROOT",
            occt_inc
        );
    }
    if !occt_lib.exists() {
        panic!(
            "OCCT library directory not found: {:?}\n\
             For macOS: brew install opencascade\n\
             For Windows: Run scripts/setup_occt.ps1\n\
             For Linux: Install opencascade-dev or set OCCT_ROOT",
            occt_lib
        );
    }

    println!("cargo:rustc-link-search=native={}", occt_lib.display());

    // Link required OCCT libraries (comprehensive set for CAD modeling)
    let libs = [
        // Foundation Classes
        "TKernel",
        "TKMath",
        // Modeling Data
        "TKG2d",
        "TKG3d",
        "TKGeomBase",
        "TKBRep",
        // Modeling Algorithms
        "TKGeomAlgo",
        "TKTopAlgo",
        "TKPrim",
        "TKBO",
        "TKBool",
        "TKFillet",
        "TKShHealing",
        "TKMesh",
        "TKOffset",
        // Hidden Line Removal (for 2D technical drawings)
        "TKHLR",
        // Data Exchange - Core
        "TKDE",
        "TKXSBase",
        // Data Exchange - Formats
        "TKDESTEP", // STEP format
        "TKDEIGES", // IGES format
        "TKDEGLTF", // glTF format
        "TKDEOBJ",  // OBJ format
        "TKDESTL",  // STL format
        "TKDEPLY",  // PLY format
        "TKDEVRML", // VRML format
        // Mesh I/O utilities
        "TKRWMesh",
        // XDE (Extended Data Exchange) for advanced format support
        "TKCDF",
        "TKLCAF",
        "TKXCAF",
    ];

    // Determine link type based on platform
    let link_type = match target_os.as_str() {
        "macos" | "linux" => "dylib",
        _ => "dylib", // Windows also uses dylib for DLL linking
    };

    for lib in &libs {
        println!("cargo:rustc-link-lib={}={}", link_type, lib);
    }

    // Set rpath for macOS to find dylibs in Frameworks directory
    // This allows the bundled app to find OCCT libraries without hardcoded paths
    if target_os == "macos" {
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
    }

    // Build C++ bridge with cxx
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let cpp_dir = PathBuf::from(&manifest_dir).join("cpp");

    let mut build = cxx_build::bridge("src/ffi.rs");

    // Include directories for new modular structure
    let cadhy_include = cpp_dir.join("include");

    build
        // Main bridge file (legacy - being slimmed down as modules are extracted)
        .file("cpp/bridge.cpp")
        // CADHY modular C++ implementations
        .file("cpp/src/edit/selection.cpp")
        .file("cpp/src/edit/face_ops.cpp")
        .file("cpp/src/primitives/primitives.cpp")
        .file("cpp/src/boolean/boolean.cpp")
        .file("cpp/src/modify/modify.cpp")
        .file("cpp/src/transform/transform.cpp")
        .file("cpp/src/sweep/sweep.cpp")
        .file("cpp/src/wire/wire.cpp")
        .file("cpp/src/mesh/mesh.cpp")
        .file("cpp/src/io/io.cpp")
        .file("cpp/src/analysis/analysis.cpp")
        .file("cpp/src/projection/projection.cpp")
        // Include paths
        .include(&occt_inc)
        .include(&cpp_dir) // For legacy bridge.h
        .include(&cadhy_include) // For new cadhy/ headers
        .std("c++17")
        .define("_USE_MATH_DEFINES", None);

    // Platform-specific compiler flags and defines
    match target_os.as_str() {
        "macos" => {
            build.flag("-stdlib=libc++");
            // macOS uses HAVE_XLOCALE_H for locale support
            build.define("HAVE_XLOCALE_H", None);
        }
        "linux" => {
            build.flag("-fPIC");
            build.define("HAVE_LIMITS_H", None);
        }
        _ => {
            // Windows-specific flags
            build.flag_if_supported("/EHsc"); // MSVC exception handling
            build.flag_if_supported("/MD"); // Use DLL runtime
            build.define("WNT", None); // Windows target
        }
    }

    // Compile
    build.compile("cadhy_cad_bridge");

    // Set runtime library path for DLLs (Windows only)
    if target_os == "windows" {
        let occt_root = find_occt_root_windows();
        let occt_bin = if cfg!(feature = "debug-occt") {
            occt_root.join("win64/vc14/bind")
        } else {
            occt_root.join("win64/vc14/bin")
        };
        println!("cargo:rustc-env=OCCT_BIN_PATH={}", occt_bin.display());
    }
}

/// Find OCCT on macOS via Homebrew
fn find_occt_macos() -> (PathBuf, PathBuf) {
    // First check environment variable
    if let Ok(root) = env::var("OCCT_ROOT") {
        let path = PathBuf::from(&root);
        if path.exists() {
            return (path.join("include/opencascade"), path.join("lib"));
        }
    }

    // Try to find Homebrew prefix
    let homebrew_prefix = get_homebrew_prefix();

    // Check for opencascade in Homebrew
    let occt_cellar = homebrew_prefix.join("opt/opencascade");
    if occt_cellar.exists() {
        return (
            occt_cellar.join("include/opencascade"),
            occt_cellar.join("lib"),
        );
    }

    // Fallback to standard Homebrew paths
    let inc = homebrew_prefix.join("include/opencascade");
    let lib = homebrew_prefix.join("lib");

    (inc, lib)
}

/// Get Homebrew prefix (handles both Intel and Apple Silicon Macs)
fn get_homebrew_prefix() -> PathBuf {
    // Try running brew --prefix
    if let Ok(output) = Command::new("brew").arg("--prefix").output() {
        if output.status.success() {
            let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return PathBuf::from(prefix);
        }
    }

    // Fallback to common locations
    let apple_silicon = PathBuf::from("/opt/homebrew");
    if apple_silicon.exists() {
        return apple_silicon;
    }

    PathBuf::from("/usr/local") // Intel Mac default
}

/// Find OCCT on Linux
fn find_occt_linux() -> (PathBuf, PathBuf) {
    // Check common Linux paths first (system packages)
    // Ubuntu/Debian put headers in /usr/include/opencascade and libs in /usr/lib/x86_64-linux-gnu
    let paths = [
        ("/usr/include/opencascade", "/usr/lib/x86_64-linux-gnu"),
        ("/usr/include/opencascade", "/usr/lib"),
        ("/usr/local/include/opencascade", "/usr/local/lib"),
    ];

    for (inc, lib) in paths {
        let inc_path = PathBuf::from(inc);
        let lib_path = PathBuf::from(lib);
        // Check if include dir exists AND library exists
        if inc_path.exists() && lib_path.join("libTKernel.so").exists() {
            return (inc_path, lib_path);
        }
    }

    // Check environment variable (for custom installations)
    if let Ok(root) = env::var("OCCT_ROOT") {
        let path = PathBuf::from(&root);
        // If OCCT_ROOT is a library path (contains libTKernel.so), use standard include path
        if path.join("libTKernel.so").exists() {
            let inc_path = PathBuf::from("/usr/include/opencascade");
            if inc_path.exists() {
                return (inc_path, path);
            }
        }
        // If OCCT_ROOT is a proper installation root
        let inc_path = path.join("include/opencascade");
        let lib_path = path.join("lib");
        if inc_path.exists() && lib_path.exists() {
            return (inc_path, lib_path);
        }
    }

    // Return default paths (will fail with helpful message)
    (
        PathBuf::from("/usr/include/opencascade"),
        PathBuf::from("/usr/lib/x86_64-linux-gnu"),
    )
}

/// Find OCCT on Windows (original logic)
fn find_occt_windows() -> (PathBuf, PathBuf) {
    let occt_root = find_occt_root_windows();
    let occt_inc = occt_root.join("inc");
    let occt_lib = if cfg!(feature = "debug-occt") {
        occt_root.join("win64/vc14/libd")
    } else {
        occt_root.join("win64/vc14/lib")
    };
    (occt_inc, occt_lib)
}

/// Find OCCT root directory on Windows
fn find_occt_root_windows() -> PathBuf {
    // Priority order:
    // 1. OCCT_ROOT environment variable
    // 2. deps/occt-7.9.2 relative to workspace root
    // 3. DEP_OCCT_ROOT (for compatibility)

    if let Ok(root) = env::var("OCCT_ROOT") {
        let path = PathBuf::from(root);
        if path.exists() {
            return path;
        }
    }

    // Find workspace root (navigate up from CARGO_MANIFEST_DIR)
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let manifest_path = PathBuf::from(&manifest_dir);

    // Go up to workspace root: rust/cadhy-cad -> rust -> workspace
    let workspace_root = manifest_path
        .parent() // rust/
        .and_then(|p| p.parent()) // workspace/
        .expect("Failed to find workspace root");

    let deps_occt = workspace_root.join("deps/occt-7.9.2");
    if deps_occt.exists() {
        return deps_occt;
    }

    if let Ok(root) = env::var("DEP_OCCT_ROOT") {
        let path = PathBuf::from(root);
        if path.exists() {
            return path;
        }
    }

    panic!(
        "Could not find OCCT installation. Please either:\n\
         1. Run scripts/setup_occt.ps1 to download OCCT\n\
         2. Set OCCT_ROOT environment variable\n\
         3. Place OCCT in deps/occt-7.9.2/"
    );
}
