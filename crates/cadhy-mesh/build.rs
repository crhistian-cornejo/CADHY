//! Build script for cadhy-mesh
//!
//! Simple build script - mesh generation uses cadhy-cad directly,
//! so we don't need to link any additional native libraries.

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    // cadhy-mesh uses cadhy-cad for tessellation,
    // which already handles OCCT linking.
    // No additional native libraries needed.
}
