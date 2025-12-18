//! # GraphCAD Core
//!
//! Core types and utilities for the GraphCAD-AI parametric CAD system.
//! This crate is kernel-agnostic and contains no dependencies on specific geometry engines.
//!
//! ## Modules
//!
//! - [`geometry`] - Basic geometric types (Point3, Vec3, etc.)
//! - [`graph`] - Node graph structures for parametric modeling
//! - [`id`] - Unique identifier types
//! - [`units`] - Unit system support (metric/imperial)

pub mod geometry;
pub mod graph;
pub mod id;
pub mod units;

pub use geometry::*;
pub use graph::*;
pub use id::*;
pub use units::*;
